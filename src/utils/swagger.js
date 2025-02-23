const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'WhatsApp Web API',
      version: '1.0.0',
      description: 'API for managing multiple WhatsApp Web clients',
      license: {
        name: 'ISC',
      },
    },
    servers: [
      {
        url: '/',
        description: 'Local server',
      },
    ],
    tags: [
      {
        name: 'Clients',
        description: 'WhatsApp client management endpoints',
      },
    ],
  },
  apis: ['./src/routes/*.js'], // Path to the API routes
};

const specs = swaggerJsdoc(options);
module.exports = specs;