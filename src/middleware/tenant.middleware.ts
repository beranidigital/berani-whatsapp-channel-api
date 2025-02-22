import { Request, Response, NextFunction } from 'express';
import { ApiResponse, AuthenticatedRequest } from '../types';
import { DatabaseService } from '../database';

export class TenantMiddleware {
    private db: DatabaseService;

    constructor(db: DatabaseService) {
        this.db = db;
    }

    checkTenant = async (
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void | Response> => {
        const tenantId = req.header('x-tenant-id');

        if (!tenantId) {
            const response: ApiResponse = {
                status: 'error',
                message: 'Tenant ID is required'
            };
            return res.status(400).json(response);
        }

        const tenant = await this.db.getTenant(tenantId);
        if (!tenant) {
            const response: ApiResponse = {
                status: 'error',
                message: 'Tenant not found'
            };
            return res.status(404).json(response);
        }

        (req as AuthenticatedRequest).tenant = tenantId;
        next();
    };
}