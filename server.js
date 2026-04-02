import { WebSocketServer } from "ws";
import http from "http";
import fs from "fs";
import path from "path";

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
// If client sends message then broadcast the message to every open connections
wss.on("connection", (ws, req) => {
    const clientIp = req.socket.remoteAddress;
    clients.add(ws);
    console.log(`New client IP is: ${clientIp}. Total clients: ${clients.size}`);

    ws.on("message", (message) =>  {
        const msgStr = message.toString();
        console.log("Message recieved: \n ", msgStr);

        for (const client of clients) if (client.readyState === 1) client.send(msgStr);
    });

    ws.on("close", () => { 
        clients.delete(ws);
        console.log("Client disconnected. Total clients left: ", clients.size);
    });
});

// Start listening to the PORT
const PORT = 8000;
server.listen(PORT, () => {
    console.log(`Server started at PORT: ${PORT}`);
});


