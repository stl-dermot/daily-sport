import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import assert from "node:assert/strict";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const workflowPath = join(root, ".github", "workflows", "pages.yml");

assert.equal(existsSync(workflowPath), true, "Missing GitHub Pages workflow");

const workflow = readFileSync(workflowPath, "utf8");

function getJobBlock(jobName) {
  const heading = new RegExp(`^  ${jobName}:\\s*$`, "m");
  const match = workflow.match(heading);
  assert.ok(match, `Missing ${jobName} job`);

  const start = match.index;
  const rest = workflow.slice(start + match[0].length);
  const nextJob = rest.search(/\n  [A-Za-z0-9_-]+:\s*(?:\n|$)/);
  return nextJob === -1 ? workflow.slice(start) : workflow.slice(start, start + match[0].length + nextJob);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getStepBlock(jobBlock, stepName) {
  const heading = new RegExp(`^      - name: ${escapeRegExp(stepName)}\\s*$`, "m");
  const match = jobBlock.match(heading);
  assert.ok(match, `Missing ${stepName} step`);

  const start = match.index;
  const rest = jobBlock.slice(start + match[0].length);
  const nextStep = rest.search(/\n      - name:\s*/);
  return nextStep === -1 ? jobBlock.slice(start) : jobBlock.slice(start, start + match[0].length + nextStep);
}

function getTopLevelBlock(blockName) {
  const heading = new RegExp(`^${blockName}:\\s*$`, "m");
  const match = workflow.match(heading);
  assert.ok(match, `Missing top-level ${blockName} block`);

  const start = match.index;
  const rest = workflow.slice(start + match[0].length);
  const nextTopLevel = rest.search(/\n[A-Za-z0-9_-]+:\s*(?:\n|$)/);
  return nextTopLevel === -1 ? workflow.slice(start) : workflow.slice(start, start + match[0].length + nextTopLevel);
}

const expectations = [
  ["workflow name", /^name:\s*CI and Deploy GitHub Pages/m],
  ["push main trigger", /push:\s*\n\s*branches:\s*\n\s*-\s*main/],
  ["pull request main trigger", /pull_request:\s*\n\s*branches:\s*\n\s*-\s*main/],
  ["manual trigger", /workflow_dispatch:/],
  ["contents read permission", /contents:\s*read/],
  ["test job", /^\s*test:\s*$/m],
  ["deploy job", /^\s*deploy:\s*$/m],
];

for (const [label, pattern] of expectations) {
  assert.match(workflow, pattern, `Missing ${label}`);
}

const topLevelPermissions = getTopLevelBlock("permissions");
assert.match(topLevelPermissions, /contents:\s*read/, "Missing workflow contents read permission");
assert.doesNotMatch(topLevelPermissions, /pages:\s*write/, "Unexpected workflow pages write permission");
assert.doesNotMatch(topLevelPermissions, /id-token:\s*write/, "Unexpected workflow id-token write permission");

const testJob = getJobBlock("test");
const deployJob = getJobBlock("deploy");
const nonDeployWorkflow = workflow.replace(deployJob, "");

const testExpectations = [
  ["test checkout action", /uses:\s*actions\/checkout@v7/],
  ["test setup node action", /uses:\s*actions\/setup-node@v6/],
  ["test node 24", /node-version:\s*24/],
  ["test html validation", /node tests\/validate-html\.mjs/],
  ["test workflow validation", /node tests\/validate-workflow\.mjs/],
];

for (const [label, pattern] of testExpectations) {
  assert.match(testJob, pattern, `Missing ${label}`);
}

const forbiddenTestPermissions = [
  ["test pages write permission", /pages:\s*write/],
  ["test id-token write permission", /id-token:\s*write/],
  ["test contents write permission", /contents:\s*write/],
  ["test write-all permission", /permissions:\s*write-all/],
];

for (const [label, pattern] of forbiddenTestPermissions) {
  assert.doesNotMatch(testJob, pattern, `Unexpected ${label}`);
}

const forbiddenNonDeployPermissions = [
  ["non-deploy pages write permission", /^\s*pages:\s*write/m],
  ["non-deploy id-token write permission", /^\s*id-token:\s*write/m],
  ["non-deploy contents write permission", /^\s*contents:\s*write/m],
  ["non-deploy write-all permission", /^\s*permissions:\s*write-all/m],
];

for (const [label, pattern] of forbiddenNonDeployPermissions) {
  assert.doesNotMatch(nonDeployWorkflow, pattern, `Unexpected ${label}`);
}

const deployExpectations = [
  ["deploy depends on test", /needs:\s*test/],
  ["deploy only main", /if:\s*github\.ref\s*==\s*'refs\/heads\/main'/],
  ["deploy contents read permission", /contents:\s*read/],
  ["deploy pages write permission", /pages:\s*write/],
  ["deploy id-token write permission", /id-token:\s*write/],
  ["github pages environment", /name:\s*github-pages/],
  ["deploy checkout action", /uses:\s*actions\/checkout@v7/],
  ["configure pages", /uses:\s*actions\/configure-pages@v6/],
  ["upload pages artifact", /uses:\s*actions\/upload-pages-artifact@v5/],
  ["deploy pages", /uses:\s*actions\/deploy-pages@v5/],
  ["publish directory", /path:\s*\.\/_site/],
  ["create assets directory", /mkdir -p _site\/assets/],
  ["copy index", /cp index\.html _site\/index\.html/],
  ["copy data", /cp data\.js _site\/data\.js/],
  ["copy banner asset", /cp assets\/banner-cats-gym\.png _site\/assets\/banner-cats-gym\.png/],
];

for (const [label, pattern] of deployExpectations) {
  assert.match(deployJob, pattern, `Missing ${label}`);
}

const prepareArtifactStep = getStepBlock(deployJob, "Prepare static artifact");
const artifactCommands = prepareArtifactStep
  .split("\n")
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith("- name:") && !line.startsWith("run:"));
const expectedArtifactCommands = [
  "rm -rf _site",
  "mkdir -p _site/assets",
  "cp index.html _site/index.html",
  "cp data.js _site/data.js",
  "cp assets/banner-cats-gym.png _site/assets/banner-cats-gym.png",
];

assert.deepEqual(artifactCommands, expectedArtifactCommands, "Pages artifact must only include deployable site files");

const deployCopyCommands = deployJob
  .split("\n")
  .map((line) => line.trim())
  .filter((line) => /^(cp|rsync)\b/.test(line));

assert.deepEqual(
  deployCopyCommands,
  [
    "cp index.html _site/index.html",
    "cp data.js _site/data.js",
    "cp assets/banner-cats-gym.png _site/assets/banner-cats-gym.png",
  ],
  "Pages artifact copy commands must only publish deployable site files",
);

const forbiddenArtifactCopies = [
  ["root copy artifact", /\bcp\b[^\n]*(?:-\S*\s+)*(?:["']?\.\/?["']?)\s+(?:\.\/)?_site(?:\b|\/)/],
  ["root rsync artifact", /\brsync\b[^\n]*(?:["']?\.\/?["']?)\s+(?:\.\/)?_site(?:\b|\/)/],
  [
    "broad assets copy artifact",
    /^\s*cp\b(?!\s+assets\/banner-cats-gym\.png\s+_site\/assets\/banner-cats-gym\.png\s*$)[^\n]*(?:["']?\.\/?)?assets(?:\b|\/)/m,
  ],
  ["assets rsync artifact", /\brsync\b[^\n]*(?:["']?\.\/?)?assets(?:\b|\/)/],
  ["tests copy artifact", /\bcp\b[^\n]*(?:["']?\.\/)?tests(?:\b|\/)/],
  ["docs copy artifact", /\bcp\b[^\n]*(?:["']?\.\/)?docs(?:\b|\/)/],
  ["superpowers copy artifact", /\bcp\b[^\n]*(?:["']?\.\/)?\.superpowers(?:\b|\/)/],
  ["git metadata copy artifact", /\bcp\b[^\n]*(?:["']?\.\/)?\.git(?:\b|\/)/],
  ["tests rsync artifact", /\brsync\b[^\n]*(?:["']?\.\/)?tests(?:\b|\/)/],
  ["docs rsync artifact", /\brsync\b[^\n]*(?:["']?\.\/)?docs(?:\b|\/)/],
  ["superpowers rsync artifact", /\brsync\b[^\n]*(?:["']?\.\/)?\.superpowers(?:\b|\/)/],
  ["git metadata rsync artifact", /\brsync\b[^\n]*(?:["']?\.\/)?\.git(?:\b|\/)/],
];

for (const [label, pattern] of forbiddenArtifactCopies) {
  assert.doesNotMatch(workflow, pattern, `Unexpected ${label}`);
}
