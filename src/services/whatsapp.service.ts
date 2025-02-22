import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode';
import qrcodeTerminal from 'qrcode-terminal';
import { DatabaseService } from '../database';
import { Tenant } from '../types';
import { config } from '../config';

export class WhatsAppService {
    private db: DatabaseService;

    constructor(db: DatabaseService) {
        this.db = db;
    }

    async initializeClient(tenantId: string): Promise<Tenant> {
        const client = new Client({
            authStrategy: new LocalAuth({ clientId: tenantId }),
            puppeteer: {
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            }
        });

        const tenant: Tenant = {
            id: tenantId,
            apiKey: config.apiKey,
            client,
            qrCode: null,
            isReady: false
        };

        // Set up client event handlers
        client.on('qr', async (qr: string) => {
            console.log(`QR Code received for tenant: ${tenantId}`);
            const qrDataUrl = await qrcode.toDataURL(qr);
            await this.db.updateTenantStatus(tenantId, false, qrDataUrl);
            qrcodeTerminal.generate(qr, { small: true });
        });

        client.on('ready', async () => {
            console.log(`Client is ready for tenant: ${tenantId}`);
            await this.db.updateTenantStatus(tenantId, true, null);
        });

        client.on('authenticated', () => {
            console.log(`Client is authenticated for tenant: ${tenantId}`);
        });

        client.on('auth_failure', async (msg: string) => {
            console.error(`Authentication failure for tenant ${tenantId}:`, msg);
            await this.db.updateTenantStatus(tenantId, false);
        });

        // Initialize client
        client.initialize();

        // Store tenant data
        await this.db.setTenant(tenantId, tenant);
        return tenant;
    }

    async sendMessage(tenant: Tenant, number: string, message: string): Promise<void> {
        if (!tenant.client) {
            throw new Error('WhatsApp client not initialized');
        }

        // Format the number
        const formattedNumber = number.replace(/\D/g, '');
        const chatId = `${formattedNumber}@c.us`;

        // Check if number exists on WhatsApp
        const isRegistered = await tenant.client.isRegisteredUser(chatId);
        if (!isRegistered) {
            throw new Error('The provided number is not registered on WhatsApp');
        }

        // Send message
        await tenant.client.sendMessage(chatId, message);
    }

    async destroyClient(tenant: Tenant): Promise<void> {
        if (tenant.client) {
            await tenant.client.destroy();
        }
    }
}