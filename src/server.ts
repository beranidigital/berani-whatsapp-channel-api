import express, { Request, Response, NextFunction } from 'express';
import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import qrcodeTerminal from 'qrcode-terminal';
import cors from 'cors';
import dotenv from 'dotenv';
import { ApiResponse, AuthenticatedRequest, MessageRequest, QrResponse, StatusResponse } from './types';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*'
}));
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Initialize WhatsApp client
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

// Store QR code
let qrCode: string | null = null;

// WhatsApp client events
client.on('qr', async (qr: string) => {
    console.log('QR Code received');
    qrCode = await qrcode.toDataURL(qr);
    qrcodeTerminal.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('Client is ready!');
});

client.on('authenticated', () => {
    console.log('Client is authenticated!');
});

client.on('auth_failure', (msg: string) => {
    console.error('Authentication failure:', msg);
});

client.initialize();

// Error handling middleware
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
    console.error(err.stack);
    const response: ApiResponse = {
        status: 'error',
        message: 'Internal server error'
    };
    res.status(500).json(response);
});

// Authentication middleware
const authenticateRequest = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || apiKey !== process.env.API_KEY) {
        const response: ApiResponse = {
            status: 'error',
            message: 'Unauthorized'
        };
        return res.status(401).json(response);
    }
    next();
};

// Routes
app.get('/api/status', authenticateRequest, (req: Request, res: Response) => {
    const response: StatusResponse = {
        status: 'success',
        message: 'WhatsApp client is running',
        isReady: client.pupPage ? true : false
    };
    res.json(response);
});

app.get('/api/qr', authenticateRequest, (req: Request, res: Response) => {
    if (qrCode) {
        const response: QrResponse = {
            status: 'success',
            qr: qrCode
        };
        res.json(response);
    } else {
        const response: QrResponse = {
            status: 'error',
            message: 'QR code not available'
        };
        res.status(404).json(response);
    }
});

app.post('/api/send-message', authenticateRequest, async (req: Request, res: Response) => {
    try {
        const { number, message } = req.body as MessageRequest;
        
        if (!number || !message) {
            const response: ApiResponse = {
                status: 'error',
                message: 'Number and message are required'
            };
            return res.status(400).json(response);
        }

        // Format the number
        const formattedNumber = number.replace(/\D/g, '');
        const chatId = `${formattedNumber}@c.us`;

        console.log('Sending message to:', chatId);
        console.log('Message:', message);
        
        // Check if number exists on WhatsApp
        const isRegistered = await client.isRegisteredUser(chatId);
        if (!isRegistered) {
            const response: ApiResponse = {
                status: 'error',
                message: 'The provided number is not registered on WhatsApp'
            };
            return res.status(404).json(response);
        }

        // Send message
        await client.sendMessage(chatId, message);
        
        const response: ApiResponse = {
            status: 'success',
            message: 'Message sent successfully'
        };
        res.json(response);
    } catch (error) {
        console.error('Error sending message:', error);
        const response: ApiResponse = {
            status: 'error',
            message: 'Failed to send message'
        };
        res.status(500).json(response);
    }
});

// Start server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});