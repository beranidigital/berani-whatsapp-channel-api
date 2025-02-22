interface Config {
  port: number;
  corsOrigins: string[];
  jwtSecret: string;
  adminUsername: string;
  adminPassword: string;
}

const config: Config = {
  port: parseInt(process.env.PORT || '3000', 10),
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(','),
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
  adminUsername: process.env.ADMIN_USERNAME || 'admin',
  adminPassword: process.env.ADMIN_PASSWORD || 'admin'
};

export { config, Config };