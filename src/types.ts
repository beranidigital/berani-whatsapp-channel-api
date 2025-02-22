import { Request } from 'express';

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

export interface AuthenticatedRequest extends Request {
  headers: {
    'x-api-key'?: string;
  };
}