# reference https://developers.google.com/web/tools/puppeteer/troubleshooting#setting_up_chrome_linux_sandbox
FROM node:20.11-alpine

# Add non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Install chromium and other dependencies
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    dbus \
    curl \
    # Add packages for security
    dumb-init

# Create required directories and set permissions
RUN mkdir -p /var/run/dbus && \
    mkdir -p /app/.wwebjs_auth/session-kls/Default/Code\ Cache/js && \
    mkdir -p /app/.wwebjs_auth/session-kls/Default/Code\ Cache/wasm && \
    chown -R appuser:appgroup /app

# Set npm version
RUN npm install -g npm@10.2.4

# Set environment variables
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    NODE_ENV=production \
    CHROME_NO_SANDBOX=true \
    CHROME_DISABLE_GPU=true \
    DISABLE_SETUID_SANDBOX=true

# Set working directory
WORKDIR /app

# Switch to non-root user
USER appuser

# Copy package files with correct ownership
COPY --chown=appuser:appgroup package*.json ./

# Install dependencies
RUN npm ci

# Copy source code with correct ownership
COPY --chown=appuser:appgroup . .

# Expose port
EXPOSE 3000

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Use dumb-init as entrypoint
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Start the application with additional chrome flags
CMD ["node", "--unhandled-rejections=strict", "src/index.js", "--disable-dev-shm-usage", "--no-sandbox", "--disable-gpu", "--disable-software-rasterizer"]