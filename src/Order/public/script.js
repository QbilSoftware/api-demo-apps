let currentResponse = null;
let currentResponseType = 'xml';

// API Configuration
function getApiConfig() {
    return {
        url: document.getElementById('apiUrl').value.trim(),
        token: document.getElementById('apiToken').value.trim()
    };
}


// Show status messages
function showStatus(message, type) {
    const statusDiv = document.getElementById('connectionStatus');
    statusDiv.innerHTML = `<div class="status ${type}">${message}</div>`;
    setTimeout(() => {
        statusDiv.innerHTML = '';
    }, 5000);
}

// Show loader
function showLoader() {
    document.getElementById('loader').classList.remove('hidden');
}

// Hide loader
function hideLoader() {
    document.getElementById('loader').classList.add('hidden');
}

// Get All Orders
async function getAllOrders() {
    showLoader();
    const config = getApiConfig();
    if (!config.url || !config.token) {
        showStatus('Please configure API settings first', 'error');
        hideLoader();
        return;
    }

    try {
        const response = await fetch(`${config.url}/orders`, {
            headers: {
                'Authorization': `Bearer ${config.token}`,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        currentResponse = await response.json();
        showRawOrders('xml');
        // displayOrdersCards(data);
    } catch (error) {
        showStatus(`Error fetching orders: ${error.message}`, 'error');
    } finally {
        hideLoader();
    }
}

// Search Orders
async function searchOrders() {
    showLoader();
    const config = getApiConfig();
    const displayNumber = document.getElementById('searchNumber').value.trim();
    const subsidiary = document.getElementById('searchSubsidiary').value.trim();

    if (!config.url || !config.token) {
        showStatus('Please configure API settings first', 'error');
        hideLoader();
        return;
    }

    if (!displayNumber && !subsidiary) {
        showStatus('Please enter search criteria', 'error');
        hideLoader();
        return;
    }

    const params = new URLSearchParams();
    if (displayNumber) params.append('displayNumber', displayNumber);
    if (subsidiary) params.append('subsidiary', subsidiary);

    try {
        const response = await fetch(`${config.url}/orders?${params}`, {
            headers: {
                'Authorization': `Bearer ${config.token}`,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        currentResponse = await response.json();
        showRawOrders('xml');
        showStatus(`Found ${Array.isArray(currentResponse) ? data.length : (currentResponse['hydra:member'] ? currentResponse['hydra:member'].length : 1)} orders`, 'success');
    } catch (error) {
        showStatus(`Error searching orders: ${error.message}`, 'error');
    } finally {
        hideLoader();
    }
}

// Get Order by ID
async function getOrderById() {
    showLoader();
    const config = getApiConfig();
    const orderId = document.getElementById('orderId').value.trim();

    if (!config.url || !config.token) {
        showStatus('Please configure API settings first', 'error');
        hideLoader();
        return;
    }

    if (!orderId) {
        showStatus('Please enter an order ID', 'error');
        hideLoader();
        return;
    }

    try {
        const url = `${config.url}/orders/${orderId}`;
        const response = await fetch(`${url}`, {
            headers: {
                'Authorization': `Bearer ${config.token}`,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        currentResponse = await response.json();
        showRawOrders('xml');
        // displayOrdersCards([data]);
        showStatus('Order retrieved successfully', 'success');
    } catch (error) {
        showStatus(`Error fetching order: ${error.message}`, 'error');
    } finally {
        hideLoader();
    }
}

// Display Orders as Cards
function displayOrdersCards(data) {
    const ordersDisplay = document.getElementById('ordersDisplay');
    const ordersList = document.getElementById('ordersList');

    // Handle API Platform format
    const orders = Array.isArray(data) ? data : (data['hydra:member'] || [data]);

    if (orders.length === 0) {
        ordersList.innerHTML = '<p>No orders found.</p>';
        ordersDisplay.style.display = 'block';
        return;
    }

    const ordersHTML = orders.map(order => {
        return `
        <div class="bg-white rounded-xl shadow p-4 mb-4 border border-gray-200 flex flex-col gap-2">
            <div class="flex justify-between items-center mb-2">
                <span class="font-bold text-lg text-gray-800">${order.displayNumber || 'N/A'}</span>
                <span class="px-2 py-1 rounded bg-gray-100 text-xs text-gray-600">${order.type || 'Unknown'}</span>
            </div>
            <div class="grid grid-cols-2 gap-2 text-sm">
                <div><span class="font-semibold text-gray-600">ID:</span> ${order.id || 'N/A'}</div>
                <div><span class="font-semibold text-gray-600">BL Number:</span> ${order.blNumber || 'N/A'}</div>
                <div><span class="font-semibold text-gray-600">Delivery Mode:</span> ${order.orderDeliveryMode || 'N/A'}</div>
                <div><span class="font-semibold text-gray-600">License Plate:</span> ${order.licensePlate || 'N/A'}</div>
                <div><span class="font-semibold text-gray-600">Transporter:</span> ${order.transporterName || 'N/A'}</div>
                <div><span class="font-semibold text-gray-600">Arrival Date:</span> ${order.arrivalDate ? new Date(order.arrivalDate).toLocaleDateString() : 'N/A'}</div>
                <div><span class="font-semibold text-gray-600">Departure Date:</span> ${order.departureDate ? new Date(order.departureDate).toLocaleDateString() : 'N/A'}</div>
                <div><span class="font-semibold text-gray-600">Responsible Users:</span> ${order.usersResponsible ? order.usersResponsible.join(', ') : 'None'}</div>
            </div>
            ${order.notes ? `<div class="mt-2 text-gray-700"><span class="font-semibold">Notes:</span> ${order.notes}</div>` : ''}
            ${order.customFields && order.customFields.length > 0 ? `<div class="mt-2"><span class="font-semibold">Custom Fields:</span> ${order.customFields.map(field => `<span class="ml-2 bg-gray-50 px-2 py-1 rounded text-xs">${field.key}: ${field.value}</span>`).join('')}</div>` : ''}
        </div>
        `;
    }).join('');

    ordersList.innerHTML = ordersHTML;
    ordersDisplay.style.display = 'block';
}

// Convert to XML
function convertToXML() {
    if (!currentResponse) return;

    function jsonToXml(obj, rootName = 'root') {
        let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<${rootName}>\n`;

        function convertValue(value, key, indent = 2) {
            const spaces = ' '.repeat(indent);

            if (value === null || value === undefined) {
                return `${spaces}<${key} />\n`;
            } else if (typeof value === 'object') {
                if (Array.isArray(value)) {
                    let result = `${spaces}<${key}>\n`;
                    value.forEach((item, index) => {
                        result += convertValue(item, 'item', indent + 2);
                    });
                    result += `${spaces}</${key}>\n`;
                    return result;
                } else {
                    let result = `${spaces}<${key}>\n`;
                    for (const [k, v] of Object.entries(value)) {
                        result += convertValue(v, k, indent + 2);
                    }
                    result += `${spaces}</${key}>\n`;
                    return result;
                }
            } else {
                return `${spaces}<${key}>${String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</${key}>\n`;
            }
        }

        if (Array.isArray(currentResponse)) {
            xml += '  <orders>\n';
            currentResponse.forEach(order => {
                xml += convertValue(order, 'order', 4);
            });
            xml += '  </orders>\n';
        } else if (currentResponse['hydra:member']) {
            xml += '  <orders>\n';
            currentResponse['hydra:member'].forEach(order => {
                xml += convertValue(order, 'order', 4);
            });
            xml += '  </orders>\n';
        } else {
            for (const [key, value] of Object.entries(currentResponse)) {
                xml += convertValue(value, key);
            }
        }

        xml += `</${rootName}>`;
        return xml;
    }

    const xmlContent = jsonToXml(currentResponse, 'orderData');
    document.getElementById('responseContent').textContent = xmlContent;
    currentResponseType = 'xml';
    showStatus('Response converted to XML', 'success');
}

// Copy Response
function copyResponse() {
    const content = document.getElementById('responseContent').textContent;
    navigator.clipboard.writeText(content).then(() => {
        showStatus('Response copied to clipboard', 'success');
    });
}

// Download Response
function downloadResponse() {
    const content = document.getElementById('responseContent').textContent;
    const extension = currentResponseType === 'xml' ? 'xml' : 'json';
    const mimeType = currentResponseType === 'xml' ? 'application/xml' : 'application/json';

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders_response.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showStatus(`Response downloaded as ${extension.toUpperCase()}`, 'success');
}

function showRawOrders(format) {
    document.getElementById('ordersDisplay').style.display = 'none';
    document.getElementById('responseSection').style.display = 'block';
    if(format === 'xml') {
        convertToXML();
        return;
    }
    document.getElementById('responseContent').textContent = JSON.stringify(currentResponse, null, 2);
    currentResponseType = 'json';
}

function pretifyOrders() {
    document.getElementById('responseSection').style.display = 'none';
    document.getElementById('ordersDisplay').style.display = 'block';
    displayOrdersCards(currentResponse);
}
