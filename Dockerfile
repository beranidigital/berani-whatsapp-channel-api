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
    && wget -q https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb \
    && apt-get install -y ./google-chrome-stable_current_amd64.deb \
    && rm google-chrome-stable_current_amd64.deb \
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