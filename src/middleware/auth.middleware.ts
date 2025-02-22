import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../types';
import { config } from '../config';

export class AuthMiddleware {
    authenticate = async (
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void | Response> => {
        const apiKey = req.header('x-api-key');

        if (!apiKey || apiKey !== config.apiKey) {
            const response: ApiResponse = {
                status: 'error',
                message: 'Unauthorized'
            };
            return res.status(401).json(response);
        }

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