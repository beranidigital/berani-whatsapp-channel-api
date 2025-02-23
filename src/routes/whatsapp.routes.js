const express = require('express');
const router = express.Router();
const whatsappController = require('../controllers/whatsapp.controller');

/**
 * @swagger
 * /clients:
 *   post:
 *     tags: [Clients]
 *     summary: Create a new WhatsApp client
 *     description: Creates and initializes a new WhatsApp Web client instance
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               clientId:
 *                 type: string
 *                 description: Optional custom ID for the client. If not provided, one will be generated.
 *     responses:
 *       200:
 *         description: Client created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 clientId:
 *                   type: string
 *                   description: The ID of the created client
 *       500:
 *         description: Server error
 */
router.post('/clients', whatsappController.createClient.bind(whatsappController));

/**
 * @swagger
 * /clients/{clientId}/qr:
 *   get:
 *     tags: [Clients]
 *     summary: Get QR code for client authentication
 *     description: Retrieves the QR code needed to authenticate the WhatsApp Web client
 *     parameters:
 *       - in: path
 *         name: clientId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the WhatsApp client
 *     responses:
 *       200:
 *         description: QR code data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 qr:
 *                   type: string
 *                   description: Base64 encoded QR code image
 *       404:
 *         description: Client not found
 *       500:
 *         description: Server error
 */
router.get('/clients/:clientId/qr', whatsappController.getQRCode.bind(whatsappController));

/**
 * @swagger
 * /clients:
 *   get:
 *     tags: [Clients]
 *     summary: Get all clients
 *     description: Retrieves status information for all WhatsApp clients
 *     responses:
 *       200:
 *         description: List of clients
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   clientId:
 *                     type: string
 *                   status:
 *                     type: string
 *                     enum: [INITIALIZING, AUTHENTICATED, DISCONNECTED]
 *       500:
 *         description: Server error
 */
router.get('/clients', whatsappController.getAllClients.bind(whatsappController));

/**
 * @swagger
 * /clients/{clientId}:
 *   get:
 *     tags: [Clients]
 *     summary: Get client status
 *     description: Retrieves status information for a specific WhatsApp client
 *     parameters:
 *       - in: path
 *         name: clientId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the WhatsApp client
 *     responses:
 *       200:
 *         description: Client status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 clientId:
 *                   type: string
 *                 status:
 *                   type: string
 *                   enum: [INITIALIZING, AUTHENTICATED, DISCONNECTED]
 *       404:
 *         description: Client not found
 *       500:
 *         description: Server error
 */
router.get('/clients/:clientId', whatsappController.getClientStatus.bind(whatsappController));

/**
 * @swagger
 * /clients/{clientId}/send:
 *   post:
 *     tags: [Clients]
 *     summary: Send a message
 *     description: Sends a WhatsApp message using the specified client
 *     parameters:
 *       - in: path
 *         name: clientId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the WhatsApp client
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - to
 *               - message
 *             properties:
 *               to:
 *                 type: string
 *                 description: The recipient's phone number (with country code)
 *               message:
 *                 type: string
 *                 description: The message to send
 *     responses:
 *       200:
 *         description: Message sent successfully
 *       404:
 *         description: Client not found
 *       500:
 *         description: Server error
 */
router.post('/clients/:clientId/send', whatsappController.sendMessage.bind(whatsappController));

/**
 * @swagger
 * /clients/{clientId}:
 *   delete:
 *     tags: [Clients]
 *     summary: Delete/Disconnect client
 *     description: Disconnects and removes a WhatsApp client instance
 *     parameters:
 *       - in: path
 *         name: clientId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the WhatsApp client
 *     responses:
 *       200:
 *         description: Client deleted successfully
 *       404:
 *         description: Client not found
 *       500:
 *         description: Server error
 */
router.delete('/clients/:clientId', whatsappController.destroyClient.bind(whatsappController));

module.exports = router;