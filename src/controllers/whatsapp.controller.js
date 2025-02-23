const whatsappService = require('../services/whatsapp.service');
const logger = require('../utils/logger');

class WhatsAppController {
    async createClient(req, res) {
        try {
            const { id = `client_${Date.now()}` } = req.body;
            
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
                return res.status(409).json({ error: error.message });
            }
            
            if (error.message === 'Maximum number of connections reached') {
                return res.status(429).json({ error: error.message });
            }
            
            res.status(500).json({ error: 'Failed to initialize client' });
        }
    }

    async getQRCode(req, res) {
        try {
            const { clientId } = req.params;
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
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async getAllClients(req, res) {
        try {
            const status = whatsappService.getAllClientsStatus();
            res.json(status);
        } catch (error) {
            logger.error('Failed to get clients status:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async getClientStatus(req, res) {
        try {
            const { clientId } = req.params;
            const status = whatsappService.getClientStatus(clientId);
            
            if (!status) {
                return res.status(404).json({ error: 'Client not found' });
            }

            res.json(status);
        } catch (error) {
            logger.error('Failed to get client status:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async sendMessage(req, res) {
        try {
            const { clientId } = req.params;
            const { number, message } = req.body;

            if (!number || !message) {
                return res.status(400).json({ 
                    error: 'Missing required fields',
                    required: ['number', 'message']
                });
            }

            await whatsappService.sendMessage(clientId, number, message);
            logger.info(`Message sent successfully from client ${clientId} to ${number}`);
            
            res.json({ 
                success: true, 
                message: 'Message sent successfully' 
            });
        } catch (error) {
            logger.error('Failed to send message:', error);
            
            if (error.message === 'Client not found or not connected') {
                return res.status(404).json({ error: error.message });
            }
            
            res.status(500).json({ error: 'Failed to send message' });
        }
    }

    async destroyClient(req, res) {
        try {
            const { clientId } = req.params;
            await whatsappService.destroyClient(clientId);
            
            res.json({ 
                success: true, 
                message: 'Client destroyed successfully' 
            });
        } catch (error) {
            logger.error('Failed to destroy client:', error);
            
            if (error.message === 'Client not found') {
                return res.status(404).json({ error: error.message });
            }
            
            res.status(500).json({ error: 'Failed to destroy client' });
        }
    }
}

module.exports = new WhatsAppController();