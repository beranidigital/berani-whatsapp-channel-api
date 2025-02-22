import { Router } from 'express';
import { MessageController } from '../controllers/message.controller';

export const createMessageRouter = (messageController: MessageController): Router => {
    const router = Router();

    router.post('/send-message', messageController.sendMessage);

    return router;
};