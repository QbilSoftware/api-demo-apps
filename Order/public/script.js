let currentResponse = null;
let currentResponseType = 'json';

// API Configuration
function getApiConfig() {
    return {
        url: document.getElementById('apiUrl').value.trim(),
        token: document.getElementById('apiToken').value.trim()
    };
}

// Test API Connection
async function testConnection() {
    const config = getApiConfig();
    const button = document.getElementById('testStatus');
    const statusDiv = document.getElementById('connectionStatus');

    if (!config.url || !config.token) {
        showStatus('Please enter both API URL and token', 'error');
        return;
    }

    button.innerHTML = '<span class="loading"></span>Testing...';
    button.disabled = true;

    try {
        const response = await fetch(`${config.url}/orders`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${config.token}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            showStatus('✅ Connection successful! API is accessible.', 'success');
        } else {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
    } catch (error) {
        showStatus(`❌ Connection failed: ${error.message}`, 'error');
    } finally {
        button.innerHTML = 'Test Connection';
        button.disabled = false;
    }
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

        const data = await response.json();
        displayResponse(data);
        displayOrdersCards(data);
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

        const data = await response.json();
        displayResponse(data);
        displayOrdersCards(data);
        showStatus(`Found ${Array.isArray(data) ? data.length : (data['hydra:member'] ? data['hydra:member'].length : 1)} orders`, 'success');
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
        const response = await fetch(`${config.url}/orders/${orderId}`, {
            headers: {
                'Authorization': `Bearer ${config.token}`,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        displayResponse(data);
        displayOrdersCards([data]);
        showStatus('Order retrieved successfully', 'success');
    } catch (error) {
        showStatus(`Error fetching order: ${error.message}`, 'error');
    } finally {
        hideLoader();
    }
}

// Display API Response
function displayResponse(data) {
    currentResponse = data;
    currentResponseType = 'json';

    document.getElementById('responseSection').style.display = 'none';
    document.getElementById('responseContent').textContent = JSON.stringify(data, null, 2);
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

    const ordersHTML = orders.map(order => `
            <div class="order-card">
                <div class="order-header">
                    <span class="order-number">${order.displayNumber || 'N/A'}</span>
                    <span class="order-type">${order.type || 'Unknown'}</span>
                </div>
                <div class="order-details">
                    <div class="detail-item">
                        <span class="detail-label">ID</span>
                        <span class="detail-value">${order.id || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">BL Number</span>
                        <span class="detail-value">${order.blNumber || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Delivery Mode</span>
                        <span class="detail-value">${order.orderDeliveryMode || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">License Plate</span>
                        <span class="detail-value">${order.licensePlate || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Transporter</span>
                        <span class="detail-value">${order.transporterName || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Arrival Date</span>
                        <span class="detail-value">${order.arrivalDate ? new Date(order.arrivalDate).toLocaleDateString() : 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Departure Date</span>
                        <span class="detail-value">${order.departureDate ? new Date(order.departureDate).toLocaleDateString() : 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Responsible Users</span>
                        <span class="detail-value">${order.usersResponsible ? order.usersResponsible.join(', ') : 'None'}</span>
                    </div>
                </div>
                ${order.notes ? `
                    <div class="detail-item" style="margin-top: 15px;">
                        <span class="detail-label">Notes</span>
                        <span class="detail-value">${order.notes}</span>
                    </div>
                ` : ''}
                ${order.customFields && order.customFields.length > 0 ? `
                    <div class="custom-fields">
                        <span class="detail-label">Custom Fields:</span>
                        ${order.customFields.map(field => `
                            <span class="custom-field">${field.key}: ${field.value}</span>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `).join('');

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

function showRawOrders() {
    document.getElementById('ordersDisplay').style.display = 'none';
    document.getElementById('responseSection').style.display = 'block';
    document.getElementById('responseContent').textContent = JSON.stringify(currentResponse, null, 2);
    currentResponseType = 'json';
}

function pretifyOrders() {
    document.getElementById('responseSection').style.display = 'none';
    document.getElementById('ordersDisplay').style.display = 'block';
    displayOrdersCards(currentResponse);
}
