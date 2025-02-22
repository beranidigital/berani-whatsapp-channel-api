import { Router } from 'express';
import { TenantController } from '../controllers/tenant.controller';

export const createTenantRouter = (tenantController: TenantController) => {
    const listRouter = Router();
    const protectedRouter = Router();

    // Public routes (no tenant check needed)
    listRouter.get('/', tenantController.listTenants);

    // Protected routes (require tenant check)
    protectedRouter.post('/:tenantId', tenantController.createTenant);
    protectedRouter.get('/status', tenantController.getTenantStatus);
    protectedRouter.get('/qr', tenantController.getQrCode);
    protectedRouter.delete('/:tenantId', tenantController.deleteTenant);

    return { listRouter, protectedRouter };
};