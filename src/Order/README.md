# Order App

A simple web application built with [Fastify](https://fastify.dev/) to demonstrate interactions with the QBil Trade Order API. It bundles three demo pages behind one dashboard: fetching/searching orders, updating orders, and receiving webhook notifications.

## Prerequisites

*   [Node.js](https://nodejs.org/) (v20 or later recommended)
*   [Yarn](https://yarnpkg.com/)

## Running Locally

1.  Navigate to the `Order` directory:
    ```bash
    cd src/Order
    ```

2.  Install the dependencies:
    ```bash
    yarn install
    ```

3.  Start the application:
    ```bash
    node index.js
    ```

    By default the server listens on port `3000`. Set a different port with the `PORT` environment variable, e.g. `PORT=4000 node index.js`.

4.  Open your web browser and go to `http://localhost:3000`.

## Applications

The dashboard at `/` links to three demo pages:

| App | Path | Description |
| --- | --- | --- |
| Fetching Orders and Download Documents | `/order-xml` | Search orders, view responses, and convert them to XML |
| Update Order | `/update-order` | Update order fields via `PATCH` requests — see [UPDATE_ORDER_README.md](UPDATE_ORDER_README.md) |
| Webhook | `/webhook` | Receive webhook notifications and sync the referenced resource from the API |

### How to Use the App

1.  Enter the **API Base URL** for the service you want to test.
2.  Provide your **Authorization Token**.
3.  Use the buttons to fetch all orders, search for specific orders, or retrieve an order by its ID.
4.  The API response will be displayed on the right-hand side, where you can view it in raw JSON, pretty-printed format, or convert it to XML.

## Notes

- API configuration (base URL and token) is kept in server memory and in the browser's `localStorage`; it is not persisted to disk and resets when the server restarts.
- This app is intended for demonstration and local testing purposes — do not expose it publicly without adding authentication and hardening the API configuration endpoints.