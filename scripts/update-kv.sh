#!/usr/bin/env bash
set -euo pipefail

CF_ACCOUNT_ID="${CF_ACCOUNT_ID:-c68b03611a15725be10387985041e8a0}"
KV_NAMESPACE_ID="${KV_NAMESPACE_ID:-38612c3037d44f66b7f7edf8614fec4b}"
KV_KEY="${KV_KEY:-entries}"
WORKER_URL="${WORKER_URL:-https://daily-sport-data-api.dermot-c68.workers.dev/entries}"

usage() {
  cat <<'USAGE'
Usage:
  CF_API_TOKEN=... scripts/update-kv.sh entries.json
  CF_API_TOKEN=... scripts/update-kv.sh --from-data-js

Environment overrides:
  CF_ACCOUNT_ID     Cloudflare account ID
  KV_NAMESPACE_ID   Workers KV namespace ID
  KV_KEY            KV key to update, default: entries
  WORKER_URL        Worker endpoint used for verification
USAGE
}

die() {
  printf 'Error: %s\n' "$1" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || die "Missing required command: $1"
}

validate_entries_json() {
  local json_file="$1"

  node - "$json_file" <<'NODE'
const fs = require("node:fs");
const file = process.argv[2];
const entries = JSON.parse(fs.readFileSync(file, "utf8"));

if (!Array.isArray(entries)) {
  throw new Error("KV payload must be a JSON array");
}

const requiredFields = ["id", "date", "title", "url", "thumbnail", "description"];

entries.forEach((entry, index) => {
  if (entry == null || typeof entry !== "object" || Array.isArray(entry)) {
    throw new Error(`Entry ${index + 1} must be an object`);
  }

  for (const field of requiredFields) {
    if (typeof entry[field] !== "string" || entry[field].trim() === "") {
      throw new Error(`Entry ${index + 1} is missing non-empty string field: ${field}`);
    }
  }
});

process.stdout.write(JSON.stringify({ count: entries.length }));
NODE
}

extract_from_data_js() {
  local output_file="$1"

  node - "$output_file" <<'NODE'
const fs = require("node:fs");
const vm = require("node:vm");
const outputFile = process.argv[2];
const context = { window: {} };

vm.runInNewContext(fs.readFileSync("data.js", "utf8"), context, {
  filename: "data.js",
});

if (!Array.isArray(context.window.dailySportEntries)) {
  throw new Error("data.js did not assign window.dailySportEntries");
}

fs.writeFileSync(outputFile, `${JSON.stringify(context.window.dailySportEntries, null, 2)}\n`);
NODE
}

main() {
  if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
    usage
    exit 0
  fi

  [[ -n "${CF_API_TOKEN:-}" ]] || die "CF_API_TOKEN is required"

  require_command curl
  require_command node

  local input_file="${1:-}"
  local temp_dir=""

  if [[ -z "$input_file" ]]; then
    usage >&2
    exit 1
  fi

  if [[ "$input_file" == "--from-data-js" ]]; then
    temp_dir="$(mktemp -d)"
    input_file="$temp_dir/entries.json"
    extract_from_data_js "$input_file"
  fi

  [[ -f "$input_file" ]] || die "Input file not found: $input_file"

  local validation
  validation="$(validate_entries_json "$input_file")"

  local kv_url="https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/storage/kv/namespaces/${KV_NAMESPACE_ID}/values/${KV_KEY}"
  local backup_file
  backup_file="$(mktemp "/tmp/daily-sport-kv-${KV_KEY}.backup.XXXXXX.json")"

  printf 'Backing up current KV value to %s\n' "$backup_file"
  curl -fsS \
    -H "Authorization: Bearer ${CF_API_TOKEN}" \
    "$kv_url" \
    > "$backup_file"

  printf 'Updating KV key "%s" with %s\n' "$KV_KEY" "$validation"
  curl -fsS -X PUT \
    -H "Authorization: Bearer ${CF_API_TOKEN}" \
    -H "Content-Type: application/json" \
    --data-binary "@${input_file}" \
    "$kv_url" \
    >/dev/null

  printf 'Verifying Worker endpoint: %s\n' "$WORKER_URL"
  local verify_file
  verify_file="$(mktemp "/tmp/daily-sport-kv-${KV_KEY}.verify.XXXXXX.json")"

  curl -fsS "$WORKER_URL" > "$verify_file"

  node - "$input_file" "$verify_file" <<'NODE'
const fs = require("node:fs");
const expected = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const actual = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));

if (JSON.stringify(actual) !== JSON.stringify(expected)) {
  throw new Error("Worker endpoint payload does not match uploaded KV payload");
}

process.stdout.write(`Verified ${actual.length} entries from Worker endpoint\n`);
NODE

  rm -f "$verify_file"

  if [[ -n "$temp_dir" ]]; then
    rm -rf "$temp_dir"
  fi
}

main "$@"
