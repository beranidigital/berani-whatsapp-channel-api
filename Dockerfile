# Use Node.js LTS (Long Term Support) as base image
FROM node:18-bullseye-slim

# Set working directory
WORKDIR /app

# Install Chrome dependencies and Chrome itself
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    procps \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Create directories for logs and sessions
RUN mkdir -p logs .wwebjs_auth

# Environment variables
ENV NODE_ENV=production \
    PORT=3000 \
    CHROME_PATH=/usr/bin/google-chrome

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]