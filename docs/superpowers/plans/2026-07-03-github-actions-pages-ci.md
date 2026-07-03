# GitHub Actions Pages CI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add GitHub Actions CI for the static site and deploy `index.html` plus `data.js` to GitHub Pages after successful `main` pushes.

**Architecture:** Keep the site dependency-free and static. Add one workflow at `.github/workflows/pages.yml`, and add a small Node built-in validator so CI workflow structure is covered without introducing `package.json` or npm dependencies.

**Tech Stack:** GitHub Actions, GitHub Pages Actions, YAML workflow text, Node.js built-ins, existing `node tests/validate-html.mjs` smoke validation.

---

## File Structure

- Create: `.github/workflows/pages.yml`
  - Responsibility: run CI on pull requests and deploy GitHub Pages on `main`.
- Create: `tests/validate-workflow.mjs`
  - Responsibility: static validation of the workflow file using Node built-ins.
- Do not modify: `index.html`
  - Responsibility: site entry point already covered by `tests/validate-html.mjs`.
- Do not modify: `data.js`
  - Responsibility: site data source already covered by `tests/validate-html.mjs`.
- Create: `.gitignore`
  - Responsibility: ignore local brainstorming output with `.superpowers/`.
  - Current state: this file is already present locally but untracked from the prior user request; include it in the implementation commit.
- Do not stage: `README.md`
  - It is an existing unrelated dirty file in this checkout.

---

### Task 1: Add Failing Workflow Validation

**Files:**
- Create: `tests/validate-workflow.mjs`
- Test: `tests/validate-workflow.mjs`

- [ ] **Step 1: Create the workflow validator**

Create `tests/validate-workflow.mjs` with this content:

```js
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import assert from "node:assert/strict";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const workflowPath = join(root, ".github", "workflows", "pages.yml");

assert.equal(existsSync(workflowPath), true, "Missing GitHub Pages workflow");

const workflow = readFileSync(workflowPath, "utf8");

const expectations = [
  ["workflow name", /^name:\s*CI and Deploy GitHub Pages/m],
  ["push main trigger", /push:\s*\n\s*branches:\s*\n\s*-\s*main/],
  ["pull request main trigger", /pull_request:\s*\n\s*branches:\s*\n\s*-\s*main/],
  ["manual trigger", /workflow_dispatch:/],
  ["contents read permission", /contents:\s*read/],
  ["pages write permission", /pages:\s*write/],
  ["id-token write permission", /id-token:\s*write/],
  ["test job", /^\s*test:\s*$/m],
  ["deploy job", /^\s*deploy:\s*$/m],
  ["deploy depends on test", /needs:\s*test/],
  ["deploy only main", /if:\s*github\.ref\s*==\s*'refs\/heads\/main'/],
  ["github pages environment", /name:\s*github-pages/],
  ["checkout action", /uses:\s*actions\/checkout@v4/],
  ["setup node action", /uses:\s*actions\/setup-node@v4/],
  ["node 24", /node-version:\s*24/],
  ["html validation", /node tests\/validate-html\.mjs/],
  ["workflow validation", /node tests\/validate-workflow\.mjs/],
  ["configure pages", /uses:\s*actions\/configure-pages@v5/],
  ["upload pages artifact", /uses:\s*actions\/upload-pages-artifact@v4/],
  ["deploy pages", /uses:\s*actions\/deploy-pages@v4/],
  ["publish directory", /path:\s*\.\/_site/],
  ["copy index", /cp index\.html _site\/index\.html/],
  ["copy data", /cp data\.js _site\/data\.js/],
];

for (const [label, pattern] of expectations) {
  assert.match(workflow, pattern, `Missing ${label}`);
}

const forbiddenArtifactCopies = [
  ["tests artifact", /cp\s+-R\s+tests\b|cp\s+tests\b|rsync[\s\S]*tests/],
  ["docs artifact", /cp\s+-R\s+docs\b|cp\s+docs\b|rsync[\s\S]*docs/],
  ["superpowers artifact", /\.superpowers/],
  ["git metadata artifact", /\.git\b/],
];

for (const [label, pattern] of forbiddenArtifactCopies) {
  assert.doesNotMatch(workflow, pattern, `Unexpected ${label}`);
}
```

- [ ] **Step 2: Run the workflow validator and confirm it fails**

Run:

```bash
node tests/validate-workflow.mjs
```

Expected: fails with:

```text
Missing GitHub Pages workflow
```

Do not commit this failing state yet.

---

### Task 2: Add Pages Workflow

**Files:**
- Create: `.github/workflows/pages.yml`
- Test: `tests/validate-workflow.mjs`

- [ ] **Step 1: Create the workflow directory**

Run:

```bash
mkdir -p .github/workflows
```

- [ ] **Step 2: Create `.github/workflows/pages.yml`**

Create `.github/workflows/pages.yml` with this content:

```yaml
name: CI and Deploy GitHub Pages

on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  test:
    name: Validate static site
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 24

      - name: Validate HTML behavior
        run: node tests/validate-html.mjs

      - name: Validate workflow
        run: node tests/validate-workflow.mjs

  deploy:
    name: Deploy GitHub Pages
    if: github.ref == 'refs/heads/main'
    needs: test
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Pages
        uses: actions/configure-pages@v5

      - name: Prepare static artifact
        run: |
          rm -rf _site
          mkdir -p _site
          cp index.html _site/index.html
          cp data.js _site/data.js

      - name: Upload Pages artifact
        uses: actions/upload-pages-artifact@v4
        with:
          path: ./_site

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 3: Run the workflow validator and confirm it passes**

Run:

```bash
node tests/validate-workflow.mjs
```

Expected: no stdout. The command exits with code `0`.

Do not commit yet; Task 3 runs the full local validation set first.

---

### Task 3: Full Verification And Commit

**Files:**
- Create: `.github/workflows/pages.yml`
- Create: `tests/validate-workflow.mjs`
- Create: `.gitignore`

- [ ] **Step 1: Run HTML validation**

Run:

```bash
node tests/validate-html.mjs
```

Expected: no stdout. The command exits with code `0`.

- [ ] **Step 2: Run workflow validation**

Run:

```bash
node tests/validate-workflow.mjs
```

Expected: no stdout. The command exits with code `0`.

- [ ] **Step 3: Check formatting and whitespace**

Run:

```bash
git diff --check -- .github/workflows/pages.yml tests/validate-workflow.mjs .gitignore
```

Expected: no stdout. The command exits with code `0`.

- [ ] **Step 4: Confirm only intended files are staged**

Run:

```bash
git status --short
```

Expected before staging:

```text
 M README.md
?? .github/
?? .gitignore
?? tests/validate-workflow.mjs
```

The untracked `.gitignore` file should be included because it is the prior user-requested `.superpowers/` ignore rule. Do not stage `README.md`.

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/pages.yml tests/validate-workflow.mjs .gitignore
git commit -m "Add GitHub Pages CI workflow"
```

Expected:

```text
[main <commit>] Add GitHub Pages CI workflow
```

Do not stage `README.md`.

---

### Task 4: Post-Commit Verification

**Files:**
- Verify: `.github/workflows/pages.yml`
- Verify: `tests/validate-workflow.mjs`

- [ ] **Step 1: Run all local validators after commit**

Run:

```bash
node tests/validate-html.mjs
node tests/validate-workflow.mjs
```

Expected: both commands exit with code `0` and print no stdout.

- [ ] **Step 2: Verify final status**

Run:

```bash
git status --short
```

Expected:

```text
 M README.md
```

`.superpowers/` should not appear because `.gitignore` is tracked with the `.superpowers/` rule.

- [ ] **Step 3: Note GitHub repository setting requirement**

Record this manual follow-up in the final implementation summary:

```text
GitHub Pages must be set to Settings -> Pages -> Build and deployment -> Source -> GitHub Actions.
```
