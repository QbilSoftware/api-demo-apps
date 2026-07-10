let orders = [];        // normalized array of order objects fetched from the API
let columns = [];       // discovered column keys (flattened, dotted paths)
let selected = new Set(); // currently selected column keys

// ---------------------------------------------------------------------------
// API configuration (same convention as the other Order demo pages)
// ---------------------------------------------------------------------------
function getApiConfig() {
    const tenant = document.getElementById('tenant')?.value.trim();
    const env = document.getElementById('environment')?.value.trim();
    const portInput = document.getElementById('port');
    const token = document.getElementById('apiToken')?.value.trim();

    let url = '';
    if (tenant && env) {
        if (env === 'localhost') {
            const port = portInput ? portInput.value.trim() : '3786';
            url = `http://${tenant}.localhost:${port}`;
        } else if (env === 'test' || env === 'staging') {
            url = `https://${tenant}.${env}.qbiltrade.com`;
        }
    }
    return { url, token };
}

(function initEnvironmentPortToggle() {
    const envSelect = document.getElementById('environment');
    const portInput = document.getElementById('port');
    const portField = document.getElementById('portField');
    if (!envSelect || !portInput || !portField) return;
    const toggle = () => {
        if (envSelect.value === 'localhost') {
            portField.style.display = 'block';
            portInput.disabled = false;
            if (!portInput.value) portInput.value = '3786';
        } else {
            portField.style.display = 'none';
            portInput.disabled = true;
        }
    };
    envSelect.addEventListener('change', toggle);
    toggle();
})();

function showStatus(message, type) {
    const statusDiv = document.getElementById('connectionStatus');
    const color = type === 'error' ? 'text-red-600' : type === 'success' ? 'text-green-700' : 'text-gray-600';
    // escapeHtml the message: it can carry server-controlled text (e.g. an
    // error's statusText), and it is inserted via innerHTML.
    statusDiv.innerHTML = `<div class="${color}">${escapeHtml(message)}</div>`;
    setTimeout(() => { statusDiv.innerHTML = ''; }, 5000);
}

function showLoader() { document.getElementById('loader').classList.remove('hidden'); }
function hideLoader() { document.getElementById('loader').classList.add('hidden'); }

// ---------------------------------------------------------------------------
// Fetch orders from the API
// ---------------------------------------------------------------------------
async function loadOrders(useFilters = false) {
    const config = getApiConfig();
    if (!config.url || !config.token) {
        showStatus('Please configure API settings first', 'error');
        return;
    }

    let endpoint = `${config.url}/api/v1/orders`;
    if (useFilters) {
        const displayNumber = document.getElementById('searchNumber').value.trim();
        const subsidiary = document.getElementById('searchSubsidiary').value.trim();
        const params = new URLSearchParams();
        if (displayNumber) params.append('displayNumber', displayNumber);
        if (subsidiary) params.append('subsidiary', subsidiary);
        if ([...params].length) endpoint += `?${params}`;
    }

    // The QBil Trade API is built on API Platform, which returns collections
    // one page at a time. A real export must follow the "next" links so the
    // CSV covers every order, not just the first page. We request
    // `application/ld+json` so the pagination link is carried in the body
    // (`hydra:view.hydra:next`) — plain `application/json` puts it in the
    // `Link` HTTP header instead, which cross-origin JS often cannot read.
    // A Link-header fallback is kept for servers that ignore the ld+json ask.
    // MAX_PAGES is a safety net against an unbounded loop.
    const MAX_PAGES = 200;
    const headers = {
        'Authorization': `Bearer ${config.token}`,
        'Accept': 'application/ld+json, application/json;q=0.9',
    };

    showLoader();
    try {
        const collected = [];
        let nextUrl = endpoint;
        let pages = 0;
        let truncated = false;
        let foreignNext = false;

        while (nextUrl) {
            const response = await fetch(nextUrl, { headers });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const data = await response.json();
            for (const order of normalizeOrders(data)) collected.push(order);
            pages++;

            const next = (data && data['hydra:view'] && data['hydra:view']['hydra:next'])
                || parseNextFromLinkHeader(response.headers.get('Link'));
            if (!next || typeof next !== 'string') {
                nextUrl = null;
            } else if (pages >= MAX_PAGES) {
                truncated = true;
                nextUrl = null;
            } else {
                const resolved = next.startsWith('http') ? next : `${config.url}${next}`;
                // Only follow pagination links that stay on the configured API
                // origin, so the Authorization token is never sent elsewhere.
                if (sameOrigin(resolved, config.url)) {
                    nextUrl = resolved;
                } else {
                    foreignNext = true;
                    nextUrl = null;
                }
            }
        }

        orders = collected;

        if (orders.length === 0) {
            showStatus('No orders returned by the API', 'error');
            resetView();
            return;
        }

        columns = discoverColumns(orders);
        selected = new Set(columns);
        renderColumnPicker();
        renderPreview();
        showSummary();

        const pageInfo = pages > 1 ? ` across ${pages} page(s)` : '';
        if (truncated) {
            showStatus(`Loaded ${orders.length} order(s)${pageInfo} — stopped at the ${MAX_PAGES}-page safety cap; more orders remain and were NOT exported`, 'error');
        } else if (foreignNext) {
            showStatus(`Loaded ${orders.length} order(s)${pageInfo} — a pagination link pointed to a different host and was not followed (token safety); more orders may remain`, 'error');
        } else {
            showStatus(`Loaded ${orders.length} order(s)${pageInfo}`, 'success');
        }
    } catch (error) {
        showStatus(`Error fetching orders: ${error.message}`, 'error');
    } finally {
        hideLoader();
    }
}

// True when both URLs resolve to the same origin (scheme + host + port).
function sameOrigin(candidate, baseUrl) {
    try {
        return new URL(candidate).origin === new URL(baseUrl).origin;
    } catch (e) {
        return false;
    }
}

// Extract the rel="next" URL from an RFC 5988 `Link` header, e.g.
// `</api/v1/orders?page=2>; rel="next", </api/v1/orders?page=9>; rel="last"`.
// Used as a fallback when the API answers with plain JSON (no hydra:view).
function parseNextFromLinkHeader(linkHeader) {
    if (!linkHeader) return null;
    for (const part of linkHeader.split(',')) {
        const m = part.match(/<([^>]+)>\s*;\s*rel\s*=\s*"?next"?/i);
        if (m) return m[1];
    }
    return null;
}

// API Platform may return a bare array, a { "hydra:member": [...] } collection,
// or a single order object. Normalize all three into an array.
function normalizeOrders(data) {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data['hydra:member'])) return data['hydra:member'];
    if (data && typeof data === 'object') return [data];
    return [];
}

// ---------------------------------------------------------------------------
// Column discovery + value flattening
// ---------------------------------------------------------------------------
// Flatten a nested object into dotted keys, e.g. { a: { b: 1 } } -> { "a.b": 1 }.
// Arrays of scalars are joined; arrays of objects and other complex values are
// JSON-stringified so a cell always holds a single printable value.
function flatten(obj, prefix = '', out = {}) {
    for (const [key, value] of Object.entries(obj || {})) {
        const path = prefix ? `${prefix}.${key}` : key;
        if (value === null || value === undefined) {
            out[path] = '';
        } else if (Array.isArray(value)) {
            if (value.every(v => typeof v !== 'object' || v === null)) {
                out[path] = value.join(' | ');
            } else {
                out[path] = JSON.stringify(value);
            }
        } else if (typeof value === 'object') {
            flatten(value, path, out);
        } else {
            out[path] = value;
        }
    }
    return out;
}

// Collect the union of all keys across every order, preserving first-seen order.
function discoverColumns(list) {
    const seen = [];
    const set = new Set();
    for (const order of list) {
        for (const key of Object.keys(flatten(order))) {
            if (!set.has(key)) { set.add(key); seen.push(key); }
        }
    }
    return seen;
}

// ---------------------------------------------------------------------------
// UI rendering
// ---------------------------------------------------------------------------
function renderColumnPicker() {
    const list = document.getElementById('columnList');
    list.innerHTML = columns.map(col => `
        <label class="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2 cursor-pointer hover:bg-gray-100">
            <input type="checkbox" data-col="${escapeHtml(col)}" ${selected.has(col) ? 'checked' : ''}
                   class="rounded border-gray-300 text-[#2e8555] focus:ring-[#2e8555]" />
            <span class="truncate" title="${escapeHtml(col)}">${escapeHtml(col)}</span>
        </label>
    `).join('');
    list.querySelectorAll('input[data-col]').forEach(input => {
        input.addEventListener('change', () => {
            const col = input.getAttribute('data-col');
            if (input.checked) selected.add(col); else selected.delete(col);
            renderPreview();
        });
    });
    document.getElementById('columnPicker').classList.remove('hidden');
}

function toggleAllColumns(on) {
    selected = on ? new Set(columns) : new Set();
    renderColumnPicker();
    renderPreview();
}

function activeColumns() {
    return columns.filter(c => selected.has(c));
}

function renderPreview() {
    const cols = activeColumns();
    const head = document.getElementById('previewHead');
    const body = document.getElementById('previewBody');
    const section = document.getElementById('previewSection');

    if (cols.length === 0) {
        section.classList.add('hidden');
        return;
    }

    head.innerHTML = `<tr>${cols.map(c => `<th class="text-left font-semibold text-gray-700 px-3 py-2 whitespace-nowrap">${escapeHtml(c)}</th>`).join('')}</tr>`;

    const limit = 50;
    const rows = orders.slice(0, limit).map(order => {
        const flat = flatten(order);
        return `<tr class="hover:bg-gray-50">${cols.map(c => `<td class="px-3 py-2 whitespace-nowrap text-gray-600 max-w-xs truncate" title="${escapeHtml(String(flat[c] ?? ''))}">${escapeHtml(String(flat[c] ?? ''))}</td>`).join('')}</tr>`;
    }).join('');
    body.innerHTML = rows;

    document.getElementById('previewNote').textContent =
        orders.length > limit ? `Showing first ${limit} of ${orders.length} rows` : `${orders.length} row(s)`;
    section.classList.remove('hidden');
}

function showSummary() {
    document.getElementById('emptyState').classList.add('hidden');
    document.getElementById('summary').classList.remove('hidden');
    document.getElementById('summaryText').textContent =
        `${orders.length} order(s) · ${columns.length} available column(s)`;
}

function resetView() {
    ['summary', 'columnPicker', 'previewSection'].forEach(id => document.getElementById(id).classList.add('hidden'));
    document.getElementById('emptyState').classList.remove('hidden');
}

// ---------------------------------------------------------------------------
// CSV generation
// ---------------------------------------------------------------------------
function getDelimiter() {
    const raw = document.getElementById('delimiter').value;
    return raw === '\\t' ? '\t' : raw;
}

// Escape a single CSV field per RFC 4180: wrap in quotes if it contains the
// delimiter, a quote, or a newline; double up any embedded quotes.
function escapeCsvField(value, delimiter) {
    const str = String(value ?? '');
    if (str.includes(delimiter) || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

// Guard against CSV / formula injection: a spreadsheet treats a cell that
// begins with = @ TAB or CR — or with + / - that isn't part of a number — as a
// formula, so `=HYPERLINK(...)` or `=cmd|...` in an order note could execute on
// open. Prefixing such a cell with a single quote neutralizes it. Well-formed
// numbers (e.g. -100.50) are left untouched so monetary values stay numeric.
function sanitizeForInjection(value) {
    const str = String(value ?? '');
    if (str === '') return str;
    const first = str[0];
    if (first === '=' || first === '@' || first === '\t' || first === '\r') return `'${str}`;
    // A leading + or - is only safe when the entire cell is a well-formed
    // number (e.g. -100.50, +3.1e4); otherwise it may be a formula like
    // "+1+HYPERLINK(...)", so neutralize it.
    if ((first === '+' || first === '-') && !/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(str)) {
        return `'${str}`;
    }
    return str;
}

function buildCsv() {
    const cols = activeColumns();
    if (cols.length === 0) return null;
    const delimiter = getDelimiter();
    const guard = document.getElementById('guardInjection')?.checked;
    const cell = v => escapeCsvField(guard ? sanitizeForInjection(v) : v, delimiter);

    const header = cols.map(c => cell(c)).join(delimiter);
    const lines = orders.map(order => {
        const flat = flatten(order);
        return cols.map(c => cell(flat[c] ?? '')).join(delimiter);
    });
    return [header, ...lines].join('\r\n');
}

function downloadCsv() {
    const csv = buildCsv();
    if (csv === null) {
        showStatus('Select at least one column to export', 'error');
        return;
    }
    const bom = document.getElementById('includeBom').checked ? '\uFEFF' : '';
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    let name = document.getElementById('filename').value.trim() || 'orders-export.csv';
    if (!/\.csv$/i.test(name)) name += '.csv';
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showStatus(`CSV exported (${orders.length} rows)`, 'success');
}

function copyCsv() {
    const csv = buildCsv();
    if (csv === null) {
        showStatus('Select at least one column to export', 'error');
        return;
    }
    navigator.clipboard.writeText(csv).then(
        () => showStatus('CSV copied to clipboard', 'success'),
        () => showStatus('Clipboard copy failed', 'error')
    );
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
