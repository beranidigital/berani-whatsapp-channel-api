# reference https://developers.google.com/web/tools/puppeteer/troubleshooting#setting_up_chrome_linux_sandbox
FROM node:current-alpine

# manually installing chrome
RUN apk add chromium

# skips puppeteer installing chrome and points to correct binary
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app
# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]