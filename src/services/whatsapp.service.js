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

            // Handle disconnections
            client.on('disconnected', (reason) => {
                logger.warn(`Client ${clientId} was disconnected:`, reason);
                this.clients.set(clientId, {
                    client,
                    status: 'disconnected'
                });
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


    async sendMessage(clientId, number, message) {
        const clientData = this.clients.get(clientId);
        if (!clientData || clientData.status !== 'connected') {
            throw new Error('Client not found or not connected');
        }

        const formattedNumber = number.includes('@c.us') ? number : `${number}@c.us`;
        await clientData.client.sendMessage(formattedNumber, message);
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

        return {
            status: clientData.status,
            needsQR: this.qrCodes.has(clientId)
        };
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