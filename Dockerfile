# Base image: Alpine Node v24
FROM node:24-alpine

# Working directory to keep the project
WORKDIR /app

# Copy package manager files first
COPY package.json pnpm-lock.yaml* ./

# Run npm install to install the packages defined by package.json
RUN npm install

# Copy the rest of the project files (example: index.html)
COPY . .

# Default port to listen to the server container
EXPOSE 8000

# Finally run the server (during container runtime)
CMD [ "node", "server.js" ]