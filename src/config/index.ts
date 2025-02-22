import dotenv from 'dotenv';

dotenv.config();

export const config = {
    port: process.env.PORT || 3000,
    apiKey: process.env.API_KEY || '',
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    rateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100 // limit each IP to 100 requests per windowMs
    }
};