import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { config } from './config';
import { setupRoutes } from './routes';
import { WhatsAppManager } from './whatsapp/manager';
import { setupWebSocket } from './websocket';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: config.corsOrigins,
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: config.corsOrigins,
  credentials: true
}));
app.use(express.json());

// Initialize WhatsApp Manager
const whatsappManager = new WhatsAppManager();

// Setup routes and websocket
setupRoutes(app, whatsappManager);
setupWebSocket(io, whatsappManager);

// Start server
httpServer.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM. Performing graceful shutdown...');
  await whatsappManager.closeAll();
  process.exit(0);
});