import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { WhatsAppManager } from '../whatsapp/manager';

interface AuthenticatedSocket extends Socket {
  user?: {
    username: string;
  };
}

export const setupWebSocket = (io: Server, whatsappManager: WhatsAppManager) => {
  // Authentication middleware for WebSocket connections
  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token, config.jwtSecret) as { username: string };
      socket.user = decoded;
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log('Admin connected:', socket.user?.username);

    // Forward WhatsApp events to admin panel
    const forwardEvent = (event: string, data: any) => {
      socket.emit('whatsapp_event', { event, ...data });
    };

    whatsappManager.on('qr', (data) => forwardEvent('qr', data));
    whatsappManager.on('ready', (data) => forwardEvent('ready', data));
    whatsappManager.on('authenticated', (data) => forwardEvent('authenticated', data));
    whatsappManager.on('disconnected', (data) => forwardEvent('disconnected', data));

    // Handle admin requests
    socket.on('get_all_clients', () => {
      const clients = whatsappManager.getAllClients();
      socket.emit('clients_list', clients);
    });

    socket.on('get_client_status', (tenantId: string) => {
      const status = whatsappManager.getClientStatus(tenantId);
      socket.emit('client_status', { tenantId, status });
    });

    // Clean up on disconnect
    socket.on('disconnect', () => {
      console.log('Admin disconnected:', socket.user?.username);
    });
  });

  // Error handling
  io.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
};