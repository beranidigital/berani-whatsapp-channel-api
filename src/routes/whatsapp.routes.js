const express = require('express');
const router = express.Router();
const whatsappController = require('../controllers/whatsapp.controller');

// Create new WhatsApp client
router.post('/clients', whatsappController.createClient.bind(whatsappController));

// Get QR code for specific client
router.get('/clients/:clientId/qr', whatsappController.getQRCode.bind(whatsappController));

// Get status of all clients
router.get('/clients', whatsappController.getAllClients.bind(whatsappController));

// Get status of specific client
router.get('/clients/:clientId', whatsappController.getClientStatus.bind(whatsappController));

// Send message from specific client
router.post('/clients/:clientId/send', whatsappController.sendMessage.bind(whatsappController));

// Delete/Disconnect client
router.delete('/clients/:clientId', whatsappController.destroyClient.bind(whatsappController));

module.exports = router;