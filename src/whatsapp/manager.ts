import { Client, LocalAuth } from 'whatsapp-web.js';
import QRCode from 'qrcode';
import { EventEmitter } from 'events';

interface WhatsAppClient {
  client: Client;
  tenantId: string;
  status: 'initializing' | 'authenticated' | 'disconnected';
}

export class WhatsAppManager extends EventEmitter {
  private clients: Map<string, WhatsAppClient>;

  constructor() {
    super();
    this.clients = new Map();
  }

  async createClient(tenantId: string): Promise<void> {
    if (this.clients.has(tenantId)) {
      throw new Error(`Client for tenant ${tenantId} already exists`);
    }

    const client = new Client({
      authStrategy: new LocalAuth({ clientId: tenantId }),
      puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      }
    });

    const whatsappClient: WhatsAppClient = {
      client,
      tenantId,
      status: 'initializing'
    };

    this.clients.set(tenantId, whatsappClient);

    client.on('qr', async (qr) => {
      const qrCodeDataUrl = await QRCode.toDataURL(qr);
      this.emit('qr', { tenantId, qrCode: qrCodeDataUrl });
    });

    client.on('ready', () => {
      whatsappClient.status = 'authenticated';
      this.emit('ready', { tenantId });
    });

    client.on('authenticated', () => {
      whatsappClient.status = 'authenticated';
      this.emit('authenticated', { tenantId });
    });

    client.on('disconnected', () => {
      whatsappClient.status = 'disconnected';
      this.emit('disconnected', { tenantId });
    });

    await client.initialize();
  }

  async removeClient(tenantId: string): Promise<void> {
    const client = this.clients.get(tenantId);
    if (!client) {
      throw new Error(`Client for tenant ${tenantId} not found`);
    }

    await client.client.destroy();
    this.clients.delete(tenantId);
  }

  getClient(tenantId: string): WhatsAppClient | undefined {
    return this.clients.get(tenantId);
  }

  getClientStatus(tenantId: string): string {
    const client = this.clients.get(tenantId);
    return client ? client.status : 'not_found';
  }

  async sendMessage(tenantId: string, to: string, message: string): Promise<void> {
    const client = this.clients.get(tenantId);
    if (!client) {
      throw new Error(`Client for tenant ${tenantId} not found`);
    }

    await client.client.sendMessage(to, message);
  }

  async closeAll(): Promise<void> {
    const promises = Array.from(this.clients.values()).map(client => 
      client.client.destroy()
    );
    await Promise.all(promises);
    this.clients.clear();
  }

  getAllClients(): Array<{ tenantId: string; status: string }> {
    return Array.from(this.clients.entries()).map(([tenantId, client]) => ({
      tenantId,
      status: client.status
    }));
  }
}