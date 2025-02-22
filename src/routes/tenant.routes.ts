import { Router } from 'express';
import { TenantController } from '../controllers/tenant.controller';

export const createTenantRouter = (tenantController: TenantController): Router => {
    const router = Router();

    router.post('/:tenantId', tenantController.createTenant);
    router.get('/', tenantController.listTenants);
    router.get('/status', tenantController.getTenantStatus);
    router.get('/qr', tenantController.getQrCode);
    router.delete('/:tenantId', tenantController.deleteTenant);

    return router;
};