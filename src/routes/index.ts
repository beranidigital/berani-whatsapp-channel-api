import { Express } from 'express';
import { WhatsAppManager } from '../whatsapp/manager';
import { authMiddleware, AuthRequest, generateToken, validateAdminCredentials } from '../middleware/auth';

export const setupRoutes = (app: Express, whatsappManager: WhatsAppManager) => {
  // Authentication
  app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;

    if (!validateAdminCredentials(username, password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(username);
    res.json({ token });
  });

  // Protected routes
  app.use('/api', authMiddleware);

  // Tenant Management
  app.post('/api/tenants/:tenantId/init', async (req: AuthRequest, res) => {
    try {
      const { tenantId } = req.params;
      await whatsappManager.createClient(tenantId);
      res.json({ message: 'WhatsApp client initialized' });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });

  app.delete('/api/tenants/:tenantId', async (req: AuthRequest, res) => {
    try {
      const { tenantId } = req.params;
      await whatsappManager.removeClient(tenantId);
      res.json({ message: 'WhatsApp client removed' });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });

  app.get('/api/tenants', (req: AuthRequest, res) => {
    const clients = whatsappManager.getAllClients();
    res.json({ clients });
  });

  app.get('/api/tenants/:tenantId/status', (req: AuthRequest, res) => {
    const { tenantId } = req.params;
    const status = whatsappManager.getClientStatus(tenantId);
    res.json({ status });
  });

  // Messaging
  app.post('/api/tenants/:tenantId/messages', async (req: AuthRequest, res) => {
    try {
      const { tenantId } = req.params;
      const { to, message } = req.body;

      if (!to || !message) {
        return res.status(400).json({ error: 'Both "to" and "message" are required' });
      }

      await whatsappManager.sendMessage(tenantId, to, message);
      res.json({ message: 'Message sent successfully' });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });
};