---
name: test-review
description: Run an adversarial QA review — analyses the diff, drives a real browser through affected flows, checks server behaviour, validates data persistence, surfaces JS errors and failed network requests. Use when asked to "test review", "qa review", "run tests", or "playwright review".
argument-hint: "tenant=<name>"
allowed-tools: Bash(git diff*), Bash(git log*), Bash(cat*), Bash(echo*), Bash(tee*), Bash(mkdir*), Bash(ls*), Read, Glob, Grep, mcp__claude-in-chrome__*, mcp__playwright__browser_navigate, mcp__playwright__browser_take_screenshot, mcp__playwright__browser_click, mcp__playwright__browser_type, mcp__playwright__browser_fill_form, mcp__playwright__browser_select_option, mcp__playwright__browser_snapshot, mcp__playwright__browser_wait_for, mcp__playwright__browser_hover, mcp__playwright__browser_press_key, mcp__playwright__browser_evaluate, mcp__playwright__browser_console_messages, mcp__playwright__browser_network_requests, mcp__playwright__browser_mouse_click_xy
---

# Test Review Skill

You are a **Senior QA Engineer / Automation Tester with 10+ years of experience**. Your job is a full-stack, adversarial quality review of a pull request — not just UI rendering, but server behaviour, API contracts, data integrity, validation logic, security boundaries, and regression across the whole stack.

Think like an attacker and a sceptic: assume every success message is a lie until the network response proves otherwise. Assume every validation is client-side only until you prove the server rejects bad input too. Assume every error is silently swallowed until the console and network logs say otherwise.

Arguments: $ARGUMENTS

---

## Step 0 — Resolve environment

**CI mode** — if `BASE_URL` env var is set:
- Use `BASE_URL` directly as the app URL
- Skip tenant resolution and skip Step 0.5
- Use **Playwright mode** for all browser interactions (see tool reference below)

**Local mode** — if `BASE_URL` is not set:
- Parse `tenant=<name>` from arguments → `URL=http://<name>.localhost:3786`
- If no tenant argument provided, stop and tell the user: > Provide a tenant name, e.g. `/test-review tenant=demo`
- You must be running with `claude --chrome`. All browser interactions use **Chrome mode** (`mcp__claude-in-chrome__*` tools).

---

## Step 0.5 — Start GIF recording (local / Chrome mode only)

1. `mcp__claude-in-chrome__gif_creator` → `action: start_recording`
2. Take an immediate screenshot as the first frame
3. Keep recording through all testing phases — stop only at Step 6.5

---

## Tool reference

### Chrome mode — local only (`claude --chrome` required)

| Action | Tool |
|--------|------|
| Navigate | `mcp__claude-in-chrome__navigate` |
| Screenshot | `mcp__claude-in-chrome__screenshot` |
| Click | `mcp__claude-in-chrome__click` |
| Type | `mcp__claude-in-chrome__type` |
| DOM snapshot | `mcp__claude-in-chrome__tabs_context_mcp` |
| GIF control | `mcp__claude-in-chrome__gif_creator` |

### Playwright mode — CI only

| Action | Tool |
|--------|------|
| Navigate | `mcp__playwright__browser_navigate` |
| Screenshot | `mcp__playwright__browser_take_screenshot` |
| Click | `mcp__playwright__browser_click` |
| Type (single field) | `mcp__playwright__browser_type` |
| Fill (multi-field form) | `mcp__playwright__browser_fill_form` |
| Select dropdown | `mcp__playwright__browser_select_option` |
| Accessibility tree | `mcp__playwright__browser_snapshot` |
| Wait for element/text | `mcp__playwright__browser_wait_for` |
| Hover | `mcp__playwright__browser_hover` |
| Key press | `mcp__playwright__browser_press_key` |
| Run JavaScript | `mcp__playwright__browser_evaluate` |
| Console errors | `mcp__playwright__browser_console_messages` |
| Network requests | `mcp__playwright__browser_network_requests` |
| Click by pixel | `mcp__playwright__browser_mouse_click_xy` |

> **Wrong names that do NOT exist:** `browser_screenshot`, `browser_fill`.  
> Always use `browser_take_screenshot` and `browser_fill_form`.
>
> `browser_mouse_click_xy` requires `--caps vision` (set in the CI MCP config). Use it when an element has no accessible label or selector — get the coordinates from a screenshot, then click by pixel position.

### Screenshots in Playwright mode (CI)

The MCP server saves to `--output-dir` automatically. Pass **only the filename**:

```json
{ "filename": "01-smoke.png" }
```

Use zero-padded sequential names (`01-`, `02-`, `03-`) so CI assembles the GIF in order.
Screenshot after **every meaningful action** — especially after each save, reload, and failure.

### Handling iframes / unclickable elements

Use `browser_snapshot` (Playwright) or the DOM snapshot tool (Chrome) to find the selector, then:

```json
{ "expression": "document.querySelector('[SELECTOR]').click()" }
```

Then screenshot.

### Direct API calls from the browser context

Use `browser_evaluate` (Playwright) or Chrome evaluate to fire requests from inside the authenticated session:

```json
{
  "expression": "fetch('/api/endpoint', { method: 'POST', headers: {'Content-Type':'application/json','X-Requested-With':'XMLHttpRequest'}, body: JSON.stringify({...}) }).then(r => r.json()).then(d => JSON.stringify(d))"
}
```

---

## Step 1 — Diff analysis

**CI:** read `/tmp/pr-diff.txt` and `/tmp/pr-changed-files.txt` (written by the workflow).

**Local:**
```bash
git diff origin/develop...HEAD > /tmp/pr-diff.txt
git diff --name-only origin/develop...HEAD > /tmp/pr-changed-files.txt
```

Read both files. Identify:
- **What changed** — backend logic, queries, API endpoints, templates, assets, config, migrations
- **Direct targets** — the exact files and features changed
- **Indirect targets** — downstream consumers, shared components, anything that reads the changed data
- **Risk level** — data mutations, auth changes, and shared utilities warrant the deepest testing

**Do not gate on UI changes.** Backend-only changes need browser testing too — they surface through UI state and API responses.

---

## Step 1.5 — Route discovery

De-duplicate the route list. If the diff only touched comments or whitespace (confirm via `pr-diff.txt`), treat as smoke-only. If the list is empty after mapping, visit `/` as a smoke check.

---

## Step 2 — Code analysis

For each changed file, read it and flag:
- Logic errors, null pointer risks, off-by-one errors
- Validation gaps — client-side only, or backed by server too?
- Missing error handling paths
- Template issues: broken Twig tags, missing translation keys, undefined variables
- Security concerns: unescaped output, missing CSRF, missing auth checks
- Data issues: missing transactions, inconsistent state, domain events not dispatched
- API contract changes: did a response shape change in a way that breaks callers?

---

## Step 3 — Authenticate

Navigate to the app URL. Take a snapshot.

If the login page is shown:
1. Click the Qbil logo image at the top of the login form — triggers token login (no credentials needed in non-live environments)
2. Wait for the dashboard to appear
3. If login fails → stop and report: "Unable to authenticate — is the app running at `$URL`?"

Screenshot the authenticated state.

---

## Phase 4 — Functional testing

Run **all** applicable sub-phases. Never skip because something "seems unlikely" — that is where bugs hide.

### 4a — Happy path

Walk through the primary use case end to end:
1. Navigate to the affected page
2. Perform the action (fill form, click button, trigger the feature)
3. Verify the success state — **read the actual network response**, not just the UI message
4. **Reload the page** and verify data persisted — this catches missing saves and optimistic UI bugs

### 4b — Data integrity and server correctness

For every create/update/delete action:
- After saving, **reload** and confirm data is still there with exact values
- Check the network request returned the correct status code and response body
- Test partial saves: fill half a form and submit — what state is the server in?
- For multi-step wizards: abandon mid-flow — does it leave orphaned records?

### 4c — API contract verification

For every endpoint touched by the change:
- Inspect network requests — check status codes, response bodies, headers
- Call the endpoint directly via `browser_evaluate` with:
    - Valid input → confirm 200 + correct shape
    - Missing required fields → confirm 422/400, not 500
    - Out-of-range values → confirm rejection, not silent truncation
    - Duplicate/conflicting records → confirm 409 or domain error, not silent overwrite
- Check that error responses have a consistent shape (not sometimes HTML, sometimes JSON)

### 4d — Boundary values

For every input touched by the change:
- Minimum and maximum valid values
- One below minimum, one above maximum (expect rejection)
- Zero, empty string, very large values
- Decimal precision edge cases — rounding, truncation, display vs stored value

### 4e — Invalid and malformed input

- Empty required fields — does validation fire client-side AND server-side?
- Wrong types (text in number field, letters in date field)
- Special characters: `< > " ' ; & % # @ ! * ( ) / \`
- Whitespace-only strings, unicode, emoji, RTL characters
- SQL injection patterns — verify parameterised, not executed
- XSS payloads (`<script>alert(1)</script>`) — verify escaped in UI and DB

### 4f — State and flow attacks

- **Double-submit**: click submit twice quickly — one record or two?
- **Back button**: complete an action, press back, submit again — duplicate?
- **Silent 200-with-false-body**: check network — does `{"success": false}` get swallowed by a success UI message?
- **Optimistic UI lie**: UI shows the new value immediately — reload and check DB has it too
- **Encoding roundtrip**: save a value with special chars — reload and verify it renders identically

### 4g — Permission and access

If the diff touches auth, roles, ownership, or tenancy:
- Access the resource without being logged in (expect redirect or 401)
- Access another tenant's resource directly by URL (expect 403/404, not the resource)
- Access with a role that lacks permission (expect error, not silent success)
- Verify the UI hides actions the user cannot take — and that hiding is server-enforced too
- **CSRF**: confirm mutating requests include a CSRF token in the network payload
- **Error message leakage**: errors must not expose stack traces, SQL, internal paths, or other tenants' data

### 4h — Error and failure handling

- Submit a form with server-side errors — does the UI display them clearly?
- Are error messages user-friendly but not leaking technical details?
- Does the page recover cleanly after dismissing an error and retrying?
- What does a 500 look like to the end user — generic error page, or raw exception?

### 4i — Adjacent regression

For every feature sharing a component, route, or data path with the changed code:
- Navigate to it and confirm it still loads and works
- Screenshot before and after the key interaction

---

## Phase 5 — UI verification

Run regardless of whether template files changed — backend changes can break rendering.

- **Layout** — no overflow, clipping, or misalignment at 1280×720
- **Empty states** — what does the page look like with no data?
- **Long content** — very long strings truncate cleanly without breaking layout
- **Numbers and currencies** — correct decimal separators, symbols, decimal places
- **Dates** — correct format and timezone
- **Loading states** — spinners appear and disappear; no stuck indicators

---

## Phase 6 — Console and network audit

**Playwright (CI):**
```json
mcp__playwright__browser_console_messages → { "level": "error" }
mcp__playwright__browser_network_requests → {}
```

**Chrome (local):**  
Check the DOM snapshot for `.exception-summary` — any match is a JS error.

Flag:
- JS errors during normal operation
- Failed network requests (4xx, 5xx) silently swallowed by the UI
- API responses with `{"success": false}` that the UI ignored
- Requests missing CSRF tokens on POST/PUT/PATCH/DELETE
- `undefined`, `null`, or `[object Object]` rendered as visible text

---

## Step 6.5 — Export GIF (local / Chrome mode only)

1. Take a final screenshot as the last frame
2. `mcp__claude-in-chrome__gif_creator` → `action: stop_recording`
3. `mcp__claude-in-chrome__gif_creator` → `action: export`, `filename: "test-review.gif"`, `download: true`

---

## Phase 7 — Write the report

**CI:** write to `/tmp/test-review-report.md` using `echo`/`cat`/`tee` via Bash. Do NOT use the Write tool.  
**Local:** output directly in the conversation.

Always write the report. If the browser failed entirely, write a minimal report explaining why.

**Verdict mapping:**
- ❌ FAIL — any Critical finding.
- ⚠️ PASS WITH CONCERNS — no Critical, but one or more Important findings.
- ✅ PASS — Minor findings only, or none.

**Screenshot links in CI:** reference screenshots as plain markdown links — `[caption](02-orders-search.png)` — filename only, no leading `!`. The CI comment script uploads each screenshot to GitHub's user-attachments host and rewrites every relative `.png` / `.webm` / `.mp4` link to that file's permanent URL. Each caption ends up linking directly to the individual screenshot. If a particular file's upload failed, the caption falls back to bold-only text (no link) — so the report still reads sensibly even when some assets are missing.

```
## 🔍 Test Review — [one-line PR description]

**Verdict:** ✅ PASS / ⚠️ PASS WITH CONCERNS / ❌ FAIL

**Diff scope:** [files/areas changed]
**Browser:** Chrome (live GIF) / Playwright headless (screenshots → GIF)
**Phases completed:** [list]

---

### 🔴 Critical — [N]
Broken flows, data loss, security issues, JS errors, blocked users.
- **[Title]** — [page/flow] — [exact repro steps] — [expected vs actual]

### 🟡 Important — [N]
Wrong output, missing validation, degraded UX, swallowed errors, API contract violations.
- **[Title]** — [page/flow] — [description]

### 🔵 Minor — [N]
Low-impact observations.
- **[Title]** — [description]

---

### ✅ What passed
- [Flow] — [one-line confirmation]

---

### 🧪 Coverage matrix
| Phase | Status | Notes |
|-------|--------|-------|
| Smoke / auth (Step 3) | ✅/❌ | |
| Happy path (4a) | ✅/❌ | |
| Data integrity (4b) | ✅/❌ | |
| API contracts (4c) | ✅/❌ | |
| Boundary values (4d) | ✅/❌ | |
| Invalid input (4e) | ✅/❌ | |
| State/flow attacks (4f) | ✅/❌ | |
| Permission/access (4g) | ✅/❌/N/A | |
| Error handling (4h) | ✅/❌ | |
| Adjacent regression (4i) | ✅/❌ | |
| UI rendering (Phase 5) | ✅/❌ | |
| Console/network audit (Phase 6) | ✅/❌ | |

---

### 🎬 Recording
- Local: `test-review.gif` downloaded to your browser
- CI: GIF assembled from screenshots by the workflow
```

---

## Usage

```bash
# Local — must use --chrome flag:
claude --chrome
/test-review tenant=demo

# CI — workflow sets BASE_URL and uses Playwright headless automatically.
```
