import fs from 'fs/promises';
import { Tenant } from './types';

export class DatabaseService {
    private dbPath: string;
    private data: Map<string, Tenant>;

    constructor(dbPath: string = 'database.json') {
        this.dbPath = dbPath;
        this.data = new Map<string, Tenant>();
    }

    async init() {
        try {
            const fileContent = await fs.readFile(this.dbPath, 'utf-8');
            const jsonData = JSON.parse(fileContent);
            this.data = new Map(Object.entries(jsonData));
        } catch (error) {
            // If file doesn't exist, create it with empty data
            await this.save();
        }
    }

    private async save() {
        const jsonData = Object.fromEntries(this.data);
        await fs.writeFile(this.dbPath, JSON.stringify(jsonData, null, 2));
    }

    async getTenant(id: string): Promise<Tenant | undefined> {
        return this.data.get(id);
    }

    async setTenant(id: string, tenant: Tenant): Promise<void> {
        this.data.set(id, tenant);
        await this.save();
    }

    async deleteTenant(id: string): Promise<boolean> {
        const deleted = this.data.delete(id);
        if (deleted) {
            await this.save();
        }
        return deleted;
    }

    async getAllTenants(): Promise<Tenant[]> {
        return Array.from(this.data.values());
    }

    async hasTenant(id: string): Promise<boolean> {
        return this.data.has(id);
    }

    async updateTenantStatus(id: string, isReady: boolean, qrCode?: string | null): Promise<void> {
        const tenant = await this.getTenant(id);
        if (tenant) {
            tenant.isReady = isReady;
            tenant.qrCode = qrCode;
            await this.setTenant(id, tenant);
        }
    }
}