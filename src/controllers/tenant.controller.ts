import { Request, Response } from 'express';
import { ApiResponse, AuthenticatedRequest, StatusResponse, TenantsResponse } from '../types';
import { DatabaseService } from '../database';
import { WhatsAppService } from '../services/whatsapp.service';

export class TenantController {
    private db: DatabaseService;
    private whatsappService: WhatsAppService;

    constructor(db: DatabaseService, whatsappService: WhatsAppService) {
        this.db = db;
        this.whatsappService = whatsappService;
    }

    createTenant = async (req: Request, res: Response): Promise<Response> => {
        const { tenantId } = req.params;
        
        // Validate tenantId format
        if (!/^[\w-]+$/.test(tenantId)) {
            const response: ApiResponse = {
                status: 'error',
                message: 'Invalid tenant ID. Only alphanumeric characters, underscores and hyphens are allowed.'
            };
            return res.status(400).json(response);
        }
        
        if (await this.db.hasTenant(tenantId)) {
            const response: ApiResponse = {
                status: 'error',
                message: 'Tenant already exists'
            };
            return res.status(400).json(response);
        }

        await this.whatsappService.initializeClient(tenantId);
        const response: ApiResponse = {
            status: 'success',
            message: 'Tenant created successfully'
        };
        return res.status(201).json(response);
    };

    listTenants = async (req: Request, res: Response): Promise<Response> => {
        const tenants = await this.db.getAllTenants();
        const tenantsArray = tenants.map(({ id, isReady }) => ({ id, isReady }));
        const response: TenantsResponse = {
            status: 'success',
            tenants: tenantsArray
        };
        return res.json(response);
    };

    getTenantStatus = async (req: Request, res: Response): Promise<Response> => {
        const tenant = await this.db.getTenant((req as AuthenticatedRequest).tenant!);
        
        if (!tenant) {
            const response: ApiResponse = {
                status: 'error',
                message: 'Tenant not found'
            };
            return res.status(404).json(response);
        }

        const response: StatusResponse = {
            status: 'success',
            message: 'WhatsApp client status',
            isReady: tenant.isReady
        };
        return res.json(response);
    };

    getQrCode = async (req: Request, res: Response): Promise<Response> => {
        const tenant = await this.db.getTenant((req as AuthenticatedRequest).tenant!);
        
        if (!tenant) {
            const response: ApiResponse = {
                status: 'error',
                message: 'Tenant not found'
            };
            return res.status(404).json(response);
        }

        if (tenant.qrCode) {
            return res.json({
                status: 'success',
                qr: tenant.qrCode
            });
        } else {
            return res.status(404).json({
                status: 'error',
                message: 'QR code not available'
            });
        }
    };

    deleteTenant = async (req: Request, res: Response): Promise<Response> => {
        const { tenantId } = req.params;
        const tenant = await this.db.getTenant(tenantId);
        
        if (!tenant) {
            const response: ApiResponse = {
                status: 'error',
                message: 'Tenant not found'
            };
            return res.status(404).json(response);
        }

        try {
            await this.whatsappService.destroyClient(tenant);
            await this.db.deleteTenant(tenantId);
            
            const response: ApiResponse = {
                status: 'success',
                message: 'Tenant deleted successfully'
            };
            return res.json(response);
        } catch (error) {
            console.error(`Error deleting tenant ${tenantId}:`, error);
            const response: ApiResponse = {
                status: 'error',
                message: 'Failed to delete tenant'
            };
            return res.status(500).json(response);
        }
    };
}