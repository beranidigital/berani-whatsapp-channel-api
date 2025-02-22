# WhatsApp Server API

A secure REST API server that enables sending WhatsApp messages programmatically using WhatsApp Web as a backend.

## Features

- 🔒 Secure authentication with API keys
- 🚀 Express-based REST API
- 📱 WhatsApp Web client integration
- 🔍 QR code generation for WhatsApp Web authentication
- 🛡️ Built-in security features (rate limiting, CORS, Helmet)
- 📝 TypeScript for type safety

## Prerequisites

- Node.js (v14 or higher)
- npm or pnpm
- A WhatsApp account

## Installation

1. Clone the repository
2. Install dependencies:
```bash
pnpm install
```
3. Create a `.env` file in the root directory with the following variables:
```env
PORT=3000
API_KEY=your_secure_api_key_here
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com
```

## Development

```bash
# Start development server with hot reload
pnpm dev

# Build the project
pnpm build

# Start production server
pnpm start
```

## Authentication

The server uses API key authentication. Include your API key in requests using the `x-api-key` header:

```http
x-api-key: your_secure_api_key_here
```

## API Endpoints

### Get Server Status
```http
GET /api/status
```
Returns the current status of the WhatsApp client.

**Response**
```json
{
  "status": "success",
  "message": "WhatsApp client is running",
  "isReady": true
}
```

### Get QR Code
```http
GET /api/qr
```
Returns the QR code for WhatsApp Web authentication.

**Response**
```json
{
  "status": "success",
  "qr": "data:image/png;base64,..."
}
```

### Send Message
```http
POST /api/send-message
Content-Type: application/json

{
  "number": "1234567890",
  "message": "Hello from WhatsApp API!"
}
```

**Parameters**
- `number`: Phone number in international format (without + or spaces)
- `message`: Text message to send

**Response**
```json
{
  "status": "success",
  "message": "Message sent successfully"
}
```

## Security Features

1. **Rate Limiting**: Limits each IP to 100 requests per 15 minutes
2. **CORS Protection**: Configurable allowed origins through environment variables
3. **Helmet**: HTTP headers for security
4. **API Key Authentication**: Required for all API endpoints

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port number | 3000 |
| API_KEY | API key for authentication | Required |
| ALLOWED_ORIGINS | Comma-separated list of allowed CORS origins | * |

## Error Handling

The API returns consistent error responses in the following format:

```json
{
  "status": "error",
  "message": "Error description"
}
```

Common HTTP status codes:
- 400: Bad Request (missing parameters)
- 401: Unauthorized (invalid API key)
- 404: Not Found (QR code not available or invalid phone number)
- 429: Too Many Requests (rate limit exceeded)
- 500: Internal Server Error

## TypeScript Types

The project includes TypeScript definitions for all request/response types:

```typescript
interface ApiResponse {
  status: 'success' | 'error';
  message?: string;
}

interface StatusResponse extends ApiResponse {
  isReady: boolean;
}

interface QrResponse extends ApiResponse {
  qr?: string;
}

interface MessageRequest {
  number: string;
  message: string;
}
```

