# Distributed Pub/Sub Chat Node

This repository contains a lightweight, horizontally scalable real-time chat server. It is built using Node.js, WebSockets, and Redis.

The primary objective of this project is to demonstrate core system design principles, specifically how to transition a stateful monolithic application into a stateless, distributed system. By decoupling the compute layer (Node.js) from the data layer (Redis), the architecture supports running multiple server instances concurrently without losing data or isolating users.

## Architecture Overview

The system is broken down into three main components:

1. **The Client (Frontend)**
A simple HTML and vanilla JavaScript interface that utilizes the browser's native WebSocket API. It maintains a persistent two-way connection with the backend to send and receive messages in real time without polling.
2. **The Compute Layer (Node.js Servers)**
The backend uses Node.js native modules (`http`, `fs`, `path`) to serve the static frontend, and the `ws` library to handle WebSocket upgrades and framing. The servers act as stateless message routers. They hold active network connections in memory but do not store the application data or chat history.
3. **The Data & Message Broker Layer (Redis)**
Redis serves two critical functions in this architecture:
    - **State Persistence:** Chat history is stored in a Redis List, ensuring that if a Node server crashes or restarts, the data is preserved and instantly served to new connections.
    - **Message Routing (Pub/Sub):** Because multiple Node servers run concurrently, users on Server A cannot directly talk to users on Server B. Redis acts as the central message bridge. When a message is sent to Server A, it is published to a Redis channel, which Server B is subscribed to, allowing Server B to broadcast the message to its respective users.

## Prerequisites

To run this project locally, you will need the following installed on your machine:

- Node.js (v16 or higher recommended)
- pnpm (Package manager)
- Docker Desktop (To run the Redis instance)

## Installation and Setup

1. **Clone the repository**
Download or clone the project files to your local machine and navigate into the project directory.
2. **Install dependencies**
Use pnpm to install the required Node modules.
    
    ```bash
    pnpm install
    ```
    
3. **Start the Redis Database**
You will need a running Redis instance. The easiest way to set this up is through Docker. Run the following command to spin up a containerized Redis server in the background:
    
    ```bash
    docker run -d --name chat-redis -p 6379:6379 redis:alpine
    ```
    
    *Note: If port 6379 is blocked on your system, you can map it to a different port (e.g., `-p 6262:6379`) and update your Redis connection settings in the server code accordingly.*
    

## Running the Application

Once your dependencies are installed and your Redis container is running, you can start the application.

1. Start the Node.js server:
    
    ```bash
    node server.js
    ```
    
2. Open your web browser and navigate to `http://localhost:8000`.
3. Open a second browser tab or window to the same address. You can now send messages back and forth in real time.

To test the persistence of the system, you can stop the Node.js server process in your terminal, restart it, and refresh your browser. The chat history will immediately repopulate from the Redis database.

## Key Concepts Demonstrated

- **Stateful vs. Stateless Protocols:** Upgrading standard HTTP requests to persistent TCP WebSockets.
- **Decoupling:** Separating the application runtime from the data storage to prevent in-memory bottlenecks.
- **In-Memory Data Stores:** Using Redis for sub-millisecond read/write operations suitable for real-time systems.
- **Publish/Subscribe Architecture:** Fanning out messages across isolated server nodes to ensure high availability and cross-server communication.
- **Containerization:** Using Docker to isolate infrastructure and prevent host operating system conflicts.