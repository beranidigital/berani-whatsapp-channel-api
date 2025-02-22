import dotenv from 'dotenv';

dotenv.config();

export interface AppConfig {
    port: number | string;
    apiKey: string;
    allowedOrigins: string[] | string;
    rateLimit: {
        windowMs: number;
        max: number;
    };
}

export const config: AppConfig = {
    port: process.env.PORT || 3000,
    apiKey: process.env.API_KEY || '',
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    rateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100 // limit each IP to 100 requests per windowMs
    }
};