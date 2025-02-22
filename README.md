# WhatsApp Multi-Tenant API Server

A multi-tenant WhatsApp Web API server that allows managing multiple WhatsApp clients through a REST API and WebSocket interface.

## Features

- Multi-tenant WhatsApp client management
- REST API for client operations
- Real-time updates via WebSocket
- JWT-based authentication
- Admin panel support

## Setup

1. Install dependencies:
```bash
bun install
```

2. Configure environment variables:
```bash
cp .env.example .env
```
Edit the `.env` file with your configuration.

3. Start the server:
```bash
# Development
bun run dev

# Production
bun run start
```

## API Documentation

### Authentication

```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "your-password"
}
```

### Tenant Management

```http
# Initialize new WhatsApp client
POST /api/tenants/:tenantId/init
Authorization: Bearer <token>

# Remove WhatsApp client
DELETE /api/tenants/:tenantId
Authorization: Bearer <token>

# List all clients
GET /api/tenants
Authorization: Bearer <token>

# Get client status
GET /api/tenants/:tenantId/status
Authorization: Bearer <token>
```

### Messaging

```http
POST /api/tenants/:tenantId/messages
Authorization: Bearer <token>
Content-Type: application/json

{
  "to": "phone-number",
  "message": "Hello World!"
}
```

## WebSocket Events

Connect to WebSocket with authentication:
```javascript
const socket = io('http://localhost:3000', {
  auth: {
    token: 'your-jwt-token'
  }
});
```

### Events from Server

- `whatsapp_event`: General WhatsApp events
  - `qr`: New QR code for authentication
  - `ready`: Client is ready
  - `authenticated`: Client authenticated
  - `disconnected`: Client disconnected
- `clients_list`: List of all clients
- `client_status`: Status update for specific client

### Events to Server

- `get_all_clients`: Request list of all clients
- `get_client_status`: Request status for specific client

## Security

- All API endpoints (except login) require JWT authentication
- WebSocket connections require JWT authentication
- Admin credentials are configured via environment variables
- CORS origins must be explicitly configured

## Error Handling

The API returns standard HTTP status codes:
- 200: Success
- 400: Bad Request
- 401: Unauthorized
- 500: Server Error

All error responses include an error message in the format:
```json
{
  "error": "Error message here"
}