const whatsappService = require('../services/whatsapp.service');
const logger = require('../utils/logger');

class WhatsAppController {
    async createClient(req, res) {
        const { id = `client_${Date.now()}` } = req.body;
        try {
            // Check if client already exists
            const existingClient = whatsappService.getClientStatus(id);
            if (existingClient) {
                logger.info(`Returning existing client with ID: ${id}`);
                return res.json({
                    success: true,
                    message: 'Retrieved existing client',
                    clientId: id,
                    status: existingClient
                });
            }
            
            await whatsappService.initializeClient(id);
            logger.info(`Client initialization started for ID: ${id}`);
            
            res.json({
                success: true,
                message: 'Client initialization started',
                clientId: id
            });
        } catch (error) {
            logger.error('Failed to create client:', error);
            
            if (error.message === 'Client ID already exists') {
                return res.status(409).json({
                    error: error.message,
                    code: 'CLIENT_EXISTS',
                    details: `Client with ID '${id}' already exists in the system`,
                    suggestion: 'Try using a different client ID or destroy the existing client first'
                });
            }
            
            if (error.message === 'Maximum number of connections reached') {
                return res.status(429).json({
                    error: error.message,
                    code: 'MAX_CONNECTIONS',
                    details: 'The server has reached its maximum allowed WhatsApp client connections',
                    suggestion: 'Try destroying unused clients to free up connection slots'
                });
            }
            
            res.status(500).json({
                error: 'Failed to initialize client',
                code: 'INIT_FAILED',
                details: error.message || 'An unexpected error occurred during client initialization',
                requestId: id
            });
        }
    }

    async getQRCode(req, res) {
        const { clientId } = req.params;

        try {
            const qrCode = whatsappService.getQRCode(clientId);
            
            if (!qrCode) {
                return res.status(404).json({
                    error: 'QR code not available',
                    message: 'Client might be already authenticated or not initialized'
                });
            }

            res.json({ qrCode });
        } catch (error) {
            logger.error('Failed to get QR code:', error);
            res.status(500).json({
                error: 'Failed to retrieve QR code',
                code: 'QR_RETRIEVAL_ERROR',
                details: error.message || 'An unexpected error occurred while retrieving the QR code',
                clientId: clientId,
                suggestion: 'Ensure the client is properly initialized and not already authenticated'
            });
        }
    }

    async getAllClients(req, res) {
        try {
            const status = whatsappService.getAllClientsStatus();
            res.json(status);
        } catch (error) {
            logger.error('Failed to get clients status:', error);
            res.status(500).json({
                error: 'Failed to retrieve clients status',
                code: 'CLIENT_STATUS_ERROR',
                details: error.message || 'An unexpected error occurred while retrieving clients status',
                suggestion: 'Check server logs for more information about the underlying issue'
            });
        }
    }

    async getClientStatus(req, res) {
        const { clientId } = req.params;
        try {
            const status = whatsappService.getClientStatus(clientId);
            
            if (!status) {
                return res.status(404).json({
                    error: 'Client not found',
                    code: 'CLIENT_NOT_FOUND',
                    details: `No client exists with ID '${clientId}'`,
                    suggestion: 'Verify the client ID and ensure it has been properly initialized'
                });
            }

            res.json(status);
        } catch (error) {
            logger.error('Failed to get client status:', error);
            res.status(500).json({
                error: 'Failed to get client status',
                code: 'CLIENT_STATUS_ERROR',
                details: error.message || 'An unexpected error occurred while retrieving client status',
                clientId: clientId,
                suggestion: 'Check server logs for more information about the underlying issue'
            });
        }
    }

    async sendMessage(req, res) {
        const { clientId } = req.params;
        const { number, message } = req.body;

        // Validate payload presence
        if (!number || !message) {
            return res.status(400).json({
                error: 'Missing required fields',
                code: 'INVALID_REQUEST',
                details: 'The request is missing one or more required fields',
                required: ['number', 'message'],
                received: {
                    number: number || undefined,
                    message: message || undefined
                },
                suggestion: 'Please provide both number and message fields in the request body'
            });
        }

        // Validate payload types
        if (typeof number !== 'string' || typeof message !== 'string') {
            return res.status(400).json({
                error: 'Invalid data types',
                code: 'INVALID_PAYLOAD',
                details: 'Both number and message must be strings',
                received: {
                    number: typeof number,
                    message: typeof message
                },
                suggestion: 'Ensure that both number and message are provided as strings'
            });
        }

        // Optional: Validate phone number format using a regex
        const phoneRegex = /^[0-9()+\-.\s]+$/;
        if (!phoneRegex.test(number)) {
            return res.status(400).json({
                error: 'Invalid phone number format',
                code: 'INVALID_PHONE_NUMBER',
                details: 'The number provided does not match a valid phone number format',
                received: number,
                suggestion: 'Provide a valid phone number'
            });
        }

        try {
            await whatsappService.sendMessage(clientId, number, message);
            logger.info(`Message sent successfully from client ${clientId} to ${number}`);
            
            res.json({ 
                success: true, 
                message: 'Message sent successfully' 
            });
        } catch (error) {
            logger.error('Failed to send message:', error);
            
            if (error.message === 'Client not found or not connected') {
                return res.status(404).json({
                    error: error.message,
                    code: 'CLIENT_NOT_AVAILABLE',
                    details: `Client '${clientId}' is either not found or not properly connected`,
                    suggestion: 'Ensure the client exists and is authenticated before sending messages'
                });
            }
            
            res.status(500).json({
                error: 'Failed to send message',
                code: 'MESSAGE_SEND_ERROR',
                details: error.message || 'An unexpected error occurred while sending the message',
                clientId: clientId,
                recipient: number,
                suggestion: 'Verify the recipient number format and client connection status'
            });
        }
    }

    async destroyClient(req, res) {
        const { clientId } = req.params;
        try {
            await whatsappService.destroyClient(clientId);
            
            res.json({ 
                success: true, 
                message: 'Client destroyed successfully' 
            });
        } catch (error) {
            logger.error('Failed to destroy client:', error);
            
            if (error.message === 'Client not found') {
                return res.status(404).json({
                    error: error.message,
                    code: 'CLIENT_NOT_FOUND',
                    details: `No client exists with ID '${clientId}'`,
                    suggestion: 'Verify the client ID is correct'
                });
            }
            
            res.status(500).json({
                error: 'Failed to destroy client',
                code: 'CLIENT_DESTROY_ERROR',
                details: error.message || 'An unexpected error occurred while destroying the client',
                clientId: clientId,
                suggestion: 'Check server logs for more information about the underlying issue'
            });
        }
    }
}

module.exports = new WhatsAppController();