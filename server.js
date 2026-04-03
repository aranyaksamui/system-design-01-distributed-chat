import { WebSocketServer } from "ws";
import http from "http";
import fs from "fs";
import path from "path";
import Redis from "ioredis";


const DEFAULT_SERVER_PORT = 8000;
const REDIS_HOST_PORT = 6262;

// Create connections to the Redis container running at REDIS_HOST_PORT
const redisPub = new Redis({ port: REDIS_HOST_PORT });
const redisSub = new Redis({ port: REDIS_HOST_PORT });
// Publisher connection
redisPub.on("connect", () => console.log("Redis is connected!"));
redisPub.on("error", (err) => console.log("Redis connection failed!\n", err));
// Subscriber connection
redisSub.on("connect", () => console.log("Redis is connected!"));
redisSub.on("error", (err) => console.log("Redis connection failed!\n", err));

// The PUB/SUB bridge
// SUBSCRIBE to specific channel
redisSub.subscribe("chat_history", (err, count) => {
    if (err) console.log("Failed to subscribe!\n", err);
    else console.log(`Subscribed to ${count} channels`);
});

// Listen for any messages broadcasted to the servers through the channel
redisSub.on("message", (channel, message) => {
    if (channel === "chat_history") {
        console.log("Message received from Redis: ", message);

        // Pass the message from the server to it's connected clients
        for (const client of clients) if (client.readyState === 1) client.send(message);
    }
});

// Create the HTTP web server to serve the page request
const server = http.createServer((req, res) => {
    if (req.method === "GET" && req.url === "/") {
        const filePath = path.join(import.meta.dirname, "index.html");

        fs.readFile(filePath, (err, content) => {
            if (err) {
                res.writeHead(500, "File could not be read!", { "content-type": "text/plain" });
                res.end("Internal Server Error");
                return;
            }

            res.writeHead(200, { "content-type": "text/html" });
            res.end(content);
        });
    }
    else {
        res.writeHead(404, "Not found", { "content-type": "text/plain" });
        res.end("Not Found");
    }
});

// Intercept the standard HTTP request with Connection: Upgrade (Upgrade the standard HTTP connection to WS)
const wss = new WebSocketServer({ server });

// Clients set stroed in this process of node server (stored in RAM)
const clients = new Set();

// If the ws connection is successful:
// Get the client or new clients request and allocate memory to RAM for them
// If client sends message then save it to the Redis databse then broadcast the message to every open connections
wss.on("connection", async (ws, req) => {
    const clientIp = req.socket.remoteAddress;
    clients.add(ws);
    console.log(`New client IP is: ${clientIp}. Total clients: ${clients.size}`);

    // Fetch the chat history from the Redis database and PUBLISH them to all the new clients that eventually connect to THIS server
    try {
        const history = await redisPub.lrange("chat_history", 0, -1);
        history.reverse().forEach((msg) => ws.send(msg));
    } catch (err) {
        console.log("Could not fetch chat history from Redis!\n", err)
    }

    // If a message comes from a client save it to the Redis database and broadcast
    ws.on("message", async (message) => {
        const msgStr = message.toString();
        console.log("Message recieved: \n ", msgStr);

        // First save the message to the Redis databse, trim the database, before broadcasting it to the rest of the clients
        try {
            // Saving to Redis database
            await redisPub.lpush("chat_history", msgStr);
            await redisPub.ltrim("chat_history", 0, 49);

            // Publish the message to all subscriber servers of the channel that are listening (including the publisher server).
            await redisPub.publish("chat_history", msgStr);
        } catch (err) {
            console.log("Something went wrong while saving the message to Redis database or publishing the message! \n", err);
        }

        for (const client of clients) if (client.readyState === 1) client.send(msgStr);
    });

    ws.on("close", () => {
        clients.delete(ws);
        console.log("Client disconnected. Total clients left: ", clients.size);
    });
});

// Start listening to the defined PORT
server.listen(process.env.PORT || DEFAULT_SERVER_PORT, () => {
    console.log(`Server started at PORT: ${process.env.PORT || DEFAULT_SERVER_PORT}`);
});


