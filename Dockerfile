# Use official Puppeteer image
FROM ghcr.io/puppeteer/puppeteer:latest

# Set working directory
WORKDIR /app

# Set XDG environment variables
ENV XDG_CONFIG_HOME=/tmp/.chromium \
    XDG_CACHE_HOME=/tmp/.chromium \
    NODE_ENV=production \
    PORT=3000

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Create directories for logs and sessions
RUN mkdir -p logs .wwebjs_auth

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]