---
name: test-review
description: QA-review a PR by driving the changed pages of the Order demo app in a real browser via Playwright MCP, then writing a screenshot-rich markdown report.
---

# test-review

## When to use

Invoked from CI by the `claude-pr-test` workflow on PRs labeled `test`.
The caller has already warmed up the browser with
`mcp__playwright__browser_navigate` and started recording with
`mcp__playwright__browser_start_video`. You drive everything in between.

## Inputs you can rely on

- `BASE_URL` env var, e.g. `http://localhost:8080`
- `/tmp/pr-diff.txt` — unified diff for this PR
- `/tmp/pr-changed-files.txt` — newline-separated paths

## Route map

The Order app under `src/Order/` serves four HTML pages. Map changed
files to routes:

| Changed file                                | Route           |
|---------------------------------------------|-----------------|
| `src/Order/public/index.html`               | `/`             |
| `src/Order/public/update-order.html`        | `/update-order` |
| `src/Order/public/webhook.html`             | `/webhook`      |
| `src/Order/public/xml-conversion.html`      | `/order-xml`    |
| `src/Order/index.js`                        | all four        |

If the diff touches `src/Order/index.js` alone, visit `/` only — the
other routes serve static files unchanged by server edits.

## Procedure

1. Read `/tmp/pr-changed-files.txt`. Build the de-duplicated list of
   routes to test using the table above. If the list is empty (PR only
   touched workflow / docs), visit `/` as a smoke check.

2. For each route, in order:
   - `mcp__playwright__browser_navigate` with `url: "${BASE_URL}${route}"`
   - `mcp__playwright__browser_snapshot` (records the a11y tree in the
     trace; you don't need to read its output unless interacting)
   - `mcp__playwright__browser_take_screenshot` with a zero-padded
     filename like `01-update-order-initial.png`. Keep a running
     counter across all routes so filenames stay globally ordered.

3. Light smoke interaction for routes with forms (`/update-order`,
   `/webhook`, `/order-xml`):
   - Identify visible inputs from the snapshot.
   - Fill safe placeholder values via `mcp__playwright__browser_fill_form`
     (`apiUrl: "http://example.invalid/api"`,
     `apiToken: "ci-placeholder-token"`, etc.).
   - **Do NOT click any submit / load / save button.** The app proxies
     to `qbiltrade.com`; we have no real token in CI and a submit would
     either hang or post junk upstream.
   - Take a follow-up screenshot showing the filled form.

4. After each route, capture diagnostics:
   - `mcp__playwright__browser_console_messages`
   - `mcp__playwright__browser_network_requests`
   - Note any `error`-level console entries and any local
     (`localhost:8080`) responses with status >= 400.

5. Write the report. Use `tee` from Bash:
   ```bash
   tee /tmp/test-review-report.md <<'MARKDOWN'
   ...report body...
   MARKDOWN
   ```
   Structure:
   - First line: `**Status:** PASS` / `WARN` / `FAIL`
     - FAIL = any local 5xx or uncaught console error
     - WARN = console warnings or 4xx responses
     - PASS = everything else
   - One `## /route` section per visited route, with the screenshots
     inlined as `![caption](01-update-order-initial.png)` (filename
     only — the workflow rewrites these to absolute URLs).
   - A `## Diagnostics` section per route listing any console errors
     / failed local requests in fenced code blocks.
   - A trailing `## Files reviewed` section echoing
     `/tmp/pr-changed-files.txt`.

## Constraints

- **Do NOT** call `mcp__playwright__browser_start_video`,
  `mcp__playwright__browser_stop_video`, or
  `mcp__playwright__browser_close` — the top-level prompt owns those.
- **Do NOT** submit any form. The app's only outbound calls go to
  `qbiltrade.com`, which we cannot reach with a valid token in CI.
- Screenshot filenames MUST be zero-padded (`01-`, `02-`, …) — the
  workflow's `flatten()` in the github-script step preserves ordering
  via filename sort.
- Stay within the Bash allowlist granted by the workflow: `git diff`,
  `git log`, `cat`, `echo`, `tee`, `mkdir`, `ls`, `find`. Do not try
  `curl` / `node` / `npm` — they will be denied.
