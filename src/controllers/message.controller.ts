import { Request, Response } from 'express';
import { ApiResponse, AuthenticatedRequest, MessageRequest } from '../types';
import { DatabaseService } from '../database';
import { WhatsAppService } from '../services/whatsapp.service';

export class MessageController {
    private db: DatabaseService;
    private whatsappService: WhatsAppService;

    constructor(db: DatabaseService, whatsappService: WhatsAppService) {
        this.db = db;
        this.whatsappService = whatsappService;
    }

    sendMessage = async (req: Request, res: Response): Promise<Response> => {
        try {
            const tenant = await this.db.getTenant((req as AuthenticatedRequest).tenant!);
            
            if (!tenant || !tenant.client) {
                const response: ApiResponse = {
                    status: 'error',
                    message: 'Tenant not found'
                };
                return res.status(404).json(response);
            }

            const { number, message } = req.body as MessageRequest;
            
            if (!number || !message) {
                const response: ApiResponse = {
                    status: 'error',
                    message: 'Number and message are required'
                };
                return res.status(400).json(response);
            }

            console.log(`Sending message to: ${number} for tenant: ${(req as AuthenticatedRequest).tenant}`);
            console.log('Message:', message);
            
            await this.whatsappService.sendMessage(tenant, number, message);
            
            const response: ApiResponse = {
                status: 'success',
                message: 'Message sent successfully'
            };
            return res.json(response);
        } catch (error) {
            console.error('Error sending message:', error);
            const response: ApiResponse = {
                status: 'error',
                message: error instanceof Error ? error.message : 'Failed to send message'
            };
            return res.status(500).json(response);
        }
    };
}