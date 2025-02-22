import { Request, Response, NextFunction } from 'express';
import { ApiResponse, AuthenticatedRequest } from '../types';
import { DatabaseService } from '../database';
import { config } from '../config';

export class AuthMiddleware {
    private db: DatabaseService;

    constructor(db: DatabaseService) {
        this.db = db;
    }

    authenticate = async (
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void | Response> => {
        const apiKey = req.header('x-api-key');
        const tenantId = req.header('x-tenant-id');

        if (!apiKey || apiKey !== config.apiKey) {
            const response: ApiResponse = {
                status: 'error',
                message: 'Unauthorized'
            };
            return res.status(401).json(response);
        }

        if (!tenantId) {
            const response: ApiResponse = {
                status: 'error',
                message: 'Tenant ID is required'
            };
            return res.status(400).json(response);
        }

        // Skip tenant existence check for tenant creation and listing endpoints
        if (req.path !== '/api/tenants' && !req.path.startsWith('/api/tenants/')) {
            const tenant = await this.db.getTenant(tenantId);
            if (!tenant) {
                const response: ApiResponse = {
                    status: 'error',
                    message: 'Tenant not found'
                };
                return res.status(404).json(response);
            }
        }

        (req as AuthenticatedRequest).tenant = tenantId;
        next();
    };
}

export const errorHandler = (err: Error, req: Request, res: Response, _next: NextFunction): void => {
    console.error(err.stack);
    const response: ApiResponse = {
        status: 'error',
        message: 'Internal server error'
    };
    res.status(500).json(response);
};