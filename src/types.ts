import { Request } from 'express';
import { Client } from 'whatsapp-web.js';

export interface ApiResponse {
  status: 'success' | 'error';
  message?: string;
}

export interface StatusResponse extends ApiResponse {
  isReady: boolean;
}

export interface QrResponse extends ApiResponse {
  qr?: string;
}

export interface MessageRequest {
  number: string;
  message: string;
}

// Extend the Express Request type properly
export interface AuthenticatedRequest extends Request {
  tenant?: string;
}

export interface Tenant {
  id: string;
  apiKey: string;
  client?: Client;
  qrCode?: string | null;
  isReady: boolean;
}

export interface TenantsResponse extends ApiResponse {
  tenants: Array<{
    id: string;
    isReady: boolean;
  }>;
}