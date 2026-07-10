# API Demo Apps

This repository contains a collection of sample applications demonstrating how to integrate and use various APIs. Each application is self-contained within its own directory.

## Available Applications

### 1. Order App

A Fastify-based demo app showing how to fetch, update, and sync orders through the QBil Trade API. It includes four sub-apps served from a single dashboard:

- **Fetching Orders and Download Documents** — search orders, view responses, and convert them to XML
- **Update Order** — update order fields (delivery mode, dates, notes, etc.) via `PATCH` requests
- **Webhook** — receive and monitor webhook notifications, and sync the referenced resource from the API
- **CSV Export** — fetch orders from the API and deliver them as a downloadable CSV file with selectable columns

Documentation: [src/Order/README.md](src/Order/README.md)

## Contributing

Issues and pull requests are welcome. Please avoid committing dependency folders (`node_modules`) or lockfiles for environments other than your own — see each app's `.gitignore`.

## License

See individual application directories for license information.