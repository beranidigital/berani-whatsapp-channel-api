# WhatsApp Web API Server

A Node.js server that manages multiple WhatsApp Web clients through a REST API interface using the whatsapp-web.js library.

## Features

- Multiple WhatsApp client management
- QR code generation for client authentication
- Message sending capabilities
- Client status monitoring
- Docker support for easy deployment
- Structured logging
- Environment-based configuration

## Prerequisites

- Node.js >= 14.0.0
- Google Chrome (for WhatsApp Web)
- Docker and Docker Compose (for containerized deployment)

## Installation

### Local Development

1. Clone the repository
2. Install dependencies:
```bash
npm install
```
3. Copy the example environment file:
```bash
cp .env.example .env
```
4. Modify the .env file as needed
5. Start the server:
```bash
npm run dev
```

### Docker Deployment

1. Build and start the container:
```bash
docker compose up -d
```

The server will be available at http://localhost:3000

## API Endpoints

### Create New Client
```
POST /api/clients
Content-Type: application/json

{
    "id": "unique-client-id"
}
```

### Get Client QR Code
```
GET /api/clients/{clientId}/qr
```

### Get All Clients Status
```
GET /api/clients
```

### Get Specific Client Status
```
GET /api/clients/{clientId}
```

### Send Message
```
POST /api/clients/{clientId}/send
Content-Type: application/json

{
    "number": "1234567890",
    "message": "Hello World"
}
```

### Delete/Disconnect Client
```
DELETE /api/clients/{clientId}
```

## Configuration

Configuration can be done through environment variables:

- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment (development/production)
- `LOG_LEVEL`: Logging level (default: info)
- `CHROME_PATH`: Path to Chrome executable
- `MAX_CONNECTIONS`: Maximum number of simultaneous WhatsApp connections

## Logging

Logs are stored in the `logs` directory:
- `combined.log`: All logs
- `error.log`: Error logs only

## Directory Structure

```
.
├── src/
│   ├── controllers/
│   ├── routes/
│   ├── services/
│   ├── utils/
│   ├── app.js
│   └── index.js
├── config/
├── logs/
├── .wwebjs_auth/
├── .env
├── Dockerfile
├── docker-compose.yml
└── package.json
```

## Error Handling

The API uses standard HTTP status codes and returns errors in the following format:

```json
{
    "error": "Error message",
    "message": "Additional details (if any)"
}
```

## Production Deployment

For production deployment, make sure to:

1. Set appropriate environment variables
2. Configure proper logging
3. Use a reverse proxy (like Nginx) for SSL termination
4. Set up monitoring and alerting
5. Implement rate limiting and security measures

## License

ISC