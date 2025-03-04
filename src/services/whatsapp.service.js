const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const config = require('../../config');
const logger = require('../utils/logger');

class WhatsAppService {
    constructor() {
        this.clients = new Map();
        this.qrCodes = new Map();
        this.initializationLock = new Map();

    }

   

    async initializeClient(clientId) {
        // Check if initialization is already in progress
        if (this.initializationLock.get(clientId)) {
            throw new Error('Client initialization already in progress');
        }

        // Set initialization lock
        this.initializationLock.set(clientId, true);

        try {
            // Check if client already exists
            if (this.clients.has(clientId)) {
                this.initializationLock.delete(clientId);
                throw new Error('Client ID already exists');
            }

            // Check maximum connections
            if (this.clients.size >= config.whatsapp.maxConnections) {
                this.initializationLock.delete(clientId);
                throw new Error('Maximum number of connections reached');
            }

            const client = new Client({
                authStrategy: new LocalAuth({
                    clientId: clientId,
                    dataPath: config.whatsapp.sessionPath
                }),
                puppeteer: {
                    ...config.whatsapp.puppeteerOptions,
                    executablePath: config.whatsapp.chromePath,
                    args: ['--no-sandbox', '--disable-setuid-sandbox'],
                }
            });

            // Set initial state before setting up event handlers
            this.clients.set(clientId, {
                client,
                status: 'initializing'
            });

            // Handle QR Code generation
            client.on('qr', async (qr) => {
                logger.info(`New QR Code generated for client ${clientId}`);
                try {
                    const qrDataURL = await qrcode.toDataURL(qr);
                    this.qrCodes.set(clientId, qrDataURL);
                } catch (err) {
                    logger.error(`Failed to generate QR code for ${clientId}:`, err);
                }
            });

            // Handle client ready state
            client.on('ready', () => {
                logger.info(`Client ${clientId} is ready!`);
                this.clients.set(clientId, {
                    client,
                    status: 'connected'
                });
                this.qrCodes.delete(clientId);
            });

            // Handle incoming messages
            client.on('message', async (message) => {
                logger.info(`[${clientId}] Message from ${message.from}: ${message.body}`);
            });

            // Handle authentication failures
            client.on('auth_failure', (msg) => {
                logger.error(`Authentication failed for ${clientId}:`, msg);
                this.clients.set(clientId, {
                    client,
                    status: 'auth_failed'
                });
            });

            // Handle disconnections with automatic reconnection
            client.on('disconnected', async (reason) => {
                logger.warn(`Client ${clientId} was disconnected:`, reason);
                this.clients.set(clientId, {
                    client,
                    status: 'disconnected',
                    lastDisconnect: new Date(),
                    disconnectReason: reason
                });

                // Attempt automatic reconnection if it wasn't a deliberate logout
                if (!reason.includes('logout')) {
                    logger.info(`Attempting automatic reconnection for client ${clientId}`);
                    try {
                        await this.reconnectClient(clientId);
                    } catch (err) {
                        logger.error(`Auto-reconnection failed for client ${clientId}:`, err);
                    }
                }
            });

            // Monitor connection state
            client.on('change_state', async (state) => {
                logger.info(`Client ${clientId} state changed to: ${state}`);
                const currentData = this.clients.get(clientId);
                if (currentData) {
                    this.clients.set(clientId, {
                        ...currentData,
                        lastStateChange: new Date(),
                        state: state
                    });
                }
            });

            // Enhanced connection monitoring
            client.on('loading_screen', (percent, message) => {
                logger.info(`Client ${clientId} loading: ${percent}% - ${message}`);
            });

            // Handle unexpected errors
            client.on('error', async (error) => {
                logger.error(`Client ${clientId} encountered error:`, error);
                const currentData = this.clients.get(clientId);
                if (currentData) {
                    this.clients.set(clientId, {
                        ...currentData,
                        lastError: new Date(),
                        lastErrorMessage: error.message
                    });
                }
            });

            try {
                await client.initialize();
                return client;
            } catch (err) {
                logger.error(`Failed to initialize client ${clientId}:`, err);
                this.clients.set(clientId, {
                    client,
                    status: 'failed'
                });
                throw err;
            }
        } finally {
            // Always remove the initialization lock
            this.initializationLock.delete(clientId);
        }
    }


    async sendMessage(clientId, number, message, retries = 3) {
        const clientData = this.clients.get(clientId);
        if (!clientData) {
            throw new Error('Client not found');
        }

        // Check if client needs reconnection
        if (clientData.status === 'disconnected' || clientData.status === 'failed') {
            logger.info(`Attempting to reconnect client ${clientId}`);
            try {
                await this.reconnectClient(clientId);
            } catch (err) {
                logger.error(`Failed to reconnect client ${clientId}:`, err);
                throw new Error('Failed to reconnect client');
            }
        }

        if (clientData.status !== 'connected') {
            throw new Error(`Client is not connected (status: ${clientData.status})`);
        }

        const formattedNumber = number.includes('@c.us') ? number : `${number}@c.us`;
        
        try {
            await clientData.client.sendMessage(formattedNumber, message);
        } catch (err) {
            if (err.message.includes('Protocol error') || err.message.includes('Session closed')) {
                logger.warn(`Session closed for client ${clientId}, attempting recovery...`);
                
                if (retries > 0) {
                    logger.info(`Retrying message send (${retries} attempts remaining)`);
                    try {
                        await this.reconnectClient(clientId);
                        return this.sendMessage(clientId, number, message, retries - 1);
                    } catch (reconnectErr) {
                        logger.error(`Failed to recover session for ${clientId}:`, reconnectErr);
                        throw new Error('Failed to recover session');
                    }
                }
            }
            throw err;
        }
    }

    async reconnectClient(clientId) {
        const clientData = this.clients.get(clientId);
        if (!clientData) {
            throw new Error('Client not found');
        }

        try {
            // Destroy existing client instance
            await clientData.client.destroy();
        } catch (err) {
            logger.warn(`Error destroying client ${clientId}:`, err);
        }

        // Initialize new client instance
        await this.initializeClient(clientId);
        
        // Wait for client to be ready
        const maxWaitTime = 30000; // 30 seconds
        const startTime = Date.now();
        
        while (Date.now() - startTime < maxWaitTime) {
            const status = this.getClientStatus(clientId);
            if (status && status.status === 'connected') {
                logger.info(`Client ${clientId} reconnected successfully`);
                return;
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        throw new Error('Reconnection timeout');
    }

    async destroyClient(clientId) {
        const clientData = this.clients.get(clientId);
        if (!clientData) {
            throw new Error('Client not found');
        }

        try {
            await clientData.client.destroy();
            this.clients.delete(clientId);
            this.qrCodes.delete(clientId);
            logger.info(`Client ${clientId} destroyed successfully`);
        } catch (err) {
            logger.error(`Failed to destroy client ${clientId}:`, err);
            throw err;
        }
    }

    getClientStatus(clientId) {
        const clientData = this.clients.get(clientId);
        if (!clientData) {
            return null;
        }

        const status = {
            status: clientData.status,
            needsQR: this.qrCodes.has(clientId),
            state: clientData.state || 'unknown',
            lastStateChange: clientData.lastStateChange || null,
            lastError: clientData.lastError || null,
            lastErrorMessage: clientData.lastErrorMessage || null,
            lastDisconnect: clientData.lastDisconnect || null,
            disconnectReason: clientData.disconnectReason || null
        };

        // Add client info if available
        if (clientData.client?.info) {
            status.info = {
                platform: clientData.client.info.platform,
                pushname: clientData.client.info.pushname,
                connected: clientData.client.info.connected
            };
        }

        return status;
    }

    getAllClientsStatus() {
        const status = {};
        this.clients.forEach((clientData, id) => {
            status[id] = this.getClientStatus(id);
        });
        return status;
    }

    getQRCode(clientId) {
        return this.qrCodes.get(clientId);
    }
}

// Export singleton instance
module.exports = new WhatsAppService();