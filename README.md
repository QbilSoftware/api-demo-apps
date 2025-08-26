# API Demo Apps

This repository contains a collection of sample applications demonstrating how to integrate and use various APIs. Each application is self-contained within its own directory.

## Available Applications

### 1. Order  App

A simple web application built with Fastify to demonstrate interactions with an Order Management API.

#### Prerequisites

*   [Node.js](https://nodejs.org/) (v20 or later recommended)
*   [Yarn](https://yarnpkg.com/)

#### Running Locally

1.  Navigate to the `Order` directory:
    ```bash
    cd Order
    ```

2.  Install the dependencies:
    ```bash
    yarn install
    ```

3.  Start the application:
    ```bash
    node index.js
    ```

4.  Open your web browser and go to `http://localhost:3000`.

#### Running with Docker

1.  Navigate to the `Order` directory.

2.  Build the Docker image:
    ```bash
    docker build -t order-app .
    ```

3.  Run the container:
    ```bash
    docker run -p 3000:3000 order-app
    ```

4.  Open your web browser and go to `http://localhost:3000`.

#### How to Use the App

1.  Enter the **API Base URL** for the service you want to test.
2.  Provide your **Authorization Token**
3.  Use the buttons to fetch all orders, search for specific orders, or retrieve an order by its ID.
4.  The API response will be displayed on the right-hand side, where you can view it in raw JSON, pretty-printed format, or convert it to XML.