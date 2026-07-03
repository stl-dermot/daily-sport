# GitHub Actions CI And Pages Deployment Design

## Goal

Add GitHub Actions automation for the static daily sport site:

- Pull requests to `main` run CI only.
- Pushes to `main` run CI and deploy the site to GitHub Pages.
- Manual `workflow_dispatch` runs the same workflow and can deploy when run on `main`.

## Current Context

- The repository is a static site with root-level `index.html` and `data.js`.
- There is no `package.json` and no dependency installation step.
- The existing validation command is `node tests/validate-html.mjs`.
- `tests/validate-html.mjs` uses only Node built-ins.
- GitHub remote is `git@github.com:stl-dermot/daily-sport.git`.
- The repository currently has unrelated local `README.md` edits.
- `.superpowers/` is local brainstorming output and must not be deployed.

## Approved Workflow Design

Create one workflow file:

- `.github/workflows/pages.yml`

The workflow has two jobs:

1. `test`
   - Runs on every trigger.
   - Checks out the repository.
   - Sets up Node.
   - Runs `node tests/validate-html.mjs`.

2. `deploy`
   - Runs only after `test`.
   - Runs only when the ref is `refs/heads/main`.
   - Uses the GitHub Pages custom workflow actions.
   - Uploads a minimal static artifact.
   - Deploys that artifact to the `github-pages` environment.

## Triggers

Use:

- `pull_request` targeting `main`.
- `push` targeting `main`.
- `workflow_dispatch`.

Pull requests should not deploy. They only verify the static validation command.

Pushes to `main` should deploy only after CI passes.

Manual runs should use the same safety gate: if run against `main`, they can deploy after CI passes; if run against another ref, they should only run CI because the deploy job checks `github.ref == 'refs/heads/main'`.

## Permissions

Set workflow-level permissions to the minimum needed by the two jobs:

- `contents: read`
- `pages: write`
- `id-token: write`

GitHub Pages deployment through `actions/deploy-pages` requires `pages: write` and `id-token: write`. The workflow also needs `contents: read` to check out the repository.

## Artifact Contents

Do not upload the whole repository root directly. Create a temporary publish directory and copy only files needed by the site:

- `index.html`
- `data.js`

This keeps tests, docs, GitHub workflow files, local brainstorming output, and unrelated repository metadata out of the public Pages artifact.

If future assets are added, the publish-copy step can include those asset paths explicitly.

## GitHub Pages Settings Requirement

The repository Pages source must be configured in GitHub:

- Settings -> Pages -> Build and deployment -> Source -> GitHub Actions

Without this setting, the workflow file may exist but Pages may not deploy as the intended publishing source.

## Error Handling

- If CI fails, deployment must not run because the deploy job depends on `test`.
- If the workflow runs on a pull request, deployment must not run because the deploy job is limited to `refs/heads/main`.
- If Pages is not configured for GitHub Actions, the workflow failure should surface in the deploy job and the repository setting must be corrected.

## Testing Plan

Before committing implementation:

- Run `node tests/validate-html.mjs` locally.
- Validate workflow YAML syntax by inspecting `.github/workflows/pages.yml`.
- Confirm the workflow includes the selected triggers.
- Confirm the deploy job has `needs: test`.
- Confirm the deploy job has `if: github.ref == 'refs/heads/main'`.
- Confirm the publish artifact includes `index.html` and `data.js`.
- Confirm `.superpowers/`, `tests/`, and `docs/` are not copied into the artifact.

## References

- GitHub Docs: Using custom workflows with GitHub Pages
  - `https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages`
- GitHub Docs: Configuring a publishing source for GitHub Pages
  - `https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site`
- `actions/deploy-pages`
  - `https://github.com/actions/deploy-pages`
