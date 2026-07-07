# Update Order API Demo

A simple web application to demonstrate updating order fields using the QBil Trade API.

## Features

- 🔐 API Configuration with Bearer Token authentication
- 📥 Load existing order data
- ✏️ Update order fields (delivery mode, dates, notes, etc.)
- 📋 View API responses in formatted JSON
- 💾 Persistent configuration storage
- 🎨 Modern, responsive UI matching existing apps

## Getting Started

1. Navigate to the Order directory:
   ```bash
   cd src/Order
   ```

2. Install dependencies (if not already installed):
   ```bash
   npm install
   # or
   yarn install
   ```

3. Start the server:
   ```bash
   node index.js
   ```

4. Open your browser and navigate to:
   ```
   http://localhost:3000/update-order
   ```

## How to Use

### 1. Configure API Settings
- Enter your API Base URL (e.g., `https://demo.qbiltrade.com/api/v1/orders`)
- Enter your Bearer Token
- Click "Save Config" to persist settings

### 2. Load an Order (Optional)
- Enter an Order ID
- Click "Load Order" to fetch and populate the form with existing data

### 3. Update Order Fields
- Fill in the fields you want to update:
  - Order Numbering Type
  - Delivery Mode (Pallet, Container, Truck, Bulk)
  - BL Number
  - Notes
  - Transporter Booking Number
  - License Plate
  - Intra Communicator
  - Various dates (Arrival, Departure, BL, Loading, Unloading)
- Click "Update Order" to send the PATCH request
- View the API response in the response panel

### 4. Additional Actions
- **Clear Form**: Reset all form fields
- **Copy Response**: Copy the API response to clipboard
- **Clear Response**: Hide the response panel
- **Home**: Return to the main dashboard

## API Endpoint

The app uses the following API endpoint:

```
PATCH https://demo.qbiltrade.com/api/v1/orders/:id
```

### Headers
- `Content-Type: application/merge-patch+json`
- `Accept: application/json`
- `Authorization: Bearer <API User Token>`

### Request Body
The app only sends fields that have values, following the merge-patch pattern.

## UI Features

- **Responsive Design**: Works on desktop, tablet, and mobile
- **Loading Indicators**: Visual feedback during API calls
- **Status Messages**: Success/error notifications with auto-dismiss
- **JSON Formatting**: Pretty-printed API responses
- **Persistent Config**: Saves API settings in browser localStorage

## Technical Details

- **Framework**: Vanilla JavaScript (no dependencies in frontend)
- **Backend**: Fastify server serving static files
- **CSS**: Custom styling matching existing app theme
- **HTTP Method**: PATCH with `application/merge-patch+json`

## Notes

- Only non-empty fields are sent in the update request
- The app supports partial updates (you don't need to fill all fields)
- Configuration is stored in browser localStorage for convenience
- The response panel shows the complete API response for debugging

## Integration with Other Apps

This app is part of the API Sample Apps suite:
- **Fetching Orders and Download Documents** (`/order-xml`)
- **Data syncing with Webhook** (`/webhook`)
- **Updating Orders** (`/update-order`) ← You are here

Access all apps from the main dashboard at `http://localhost:3000/`
