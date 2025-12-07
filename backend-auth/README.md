# Bus Booking Auth Service

Microservice for authentication and authorization in the bus booking system.

## Features

- User Registration (Sign Up)
- User Login
- JWT Token Management (Access & Refresh Tokens)
- Token Refresh
- User Logout (Token Revocation)
- OAuth Integration (Google, GitHub)
- Role-Based Access Control (RBAC)

## Project Structure

```
backend-auth/
├── cmd/api/              # Application entry point
├── internal/
│   ├── delivery/         # HTTP handlers & middleware
│   ├── entities/         # Domain models
│   ├── repositories/     # Data access layer
│   └── usecases/         # Business logic layer
├── .env.example          # Environment variables template
├── go.mod                # Go module file
├── Dockerfile            # Docker configuration
└── README.md             # This file
```

## API Endpoints

### Authentication Routes

#### Sign Up
```
POST /api/v1/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123",
  "phone": "0123456789"
}
```

#### Login
```
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

#### Refresh Token
```
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refresh_token": "eyJhbGc..."
}
```

#### Logout
```
POST /api/v1/auth/logout
Content-Type: application/json

{
  "refresh_token": "eyJhbGc..."
}
```

### OAuth Routes

#### Google Login
```
GET /api/v1/auth/google
```

#### Google Callback
```
GET /api/v1/auth/google/callback?code=...
```

#### GitHub Login
```
GET /api/v1/auth/github
```

#### GitHub Callback
```
GET /api/v1/auth/github/callback?code=...
```

## Setup & Installation

### Prerequisites
- Go 1.24+
- PostgreSQL 12+
- Docker & Docker Compose (optional)

### Environment Configuration

Copy `.env.example` to `.env` and update the values:

```bash
cp .env.example .env
```

### Local Development

1. Install dependencies:
```bash
go mod download
```

2. Start PostgreSQL:
```bash
docker run -d \
  --name postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=bus_booking \
  -p 5432:5432 \
  postgres:15-alpine
```

3. Run the service:
```bash
go run ./cmd/api/main.go
```

The service will start on `http://localhost:8080`

### Docker Deployment

Build and run with Docker:

```bash
docker build -t bus-auth-service .
docker run -p 8080:8080 --env-file .env bus-auth-service
```

## Database Schema

The service uses PostgreSQL and manages two main tables:

- `users` - User accounts with authentication credentials
- `refresh_tokens` - Stored refresh tokens for token management

Migrations run automatically on startup.

## API Documentation

Swagger documentation is available at:
```
http://localhost:8080/swagger/index.html
```

## Authentication Flow

1. **Registration**: User creates account with email and password
2. **Login**: User provides credentials, receives access + refresh tokens
3. **Protected Requests**: Include `Authorization: Bearer {access_token}` header
4. **Token Refresh**: Use refresh token to get new access token
5. **Logout**: Revoke refresh token to invalidate sessions

## Token Expiry

- **Access Token**: 15 minutes (configurable via JWT_ACCESS_EXPIRY)
- **Refresh Token**: 7 days (configurable via JWT_REFRESH_EXPIRY)

## Environment Variables

```env
# Server
PORT=8080
ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=bus_booking
DB_SSL_MODE=disable

# JWT
JWT_SECRET=your-secret-key
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
```

## Error Handling

The service returns standard HTTP status codes:

- `200 OK` - Successful request
- `201 Created` - Resource created (registration)
- `400 Bad Request` - Invalid input
- `401 Unauthorized` - Missing or invalid credentials
- `403 Forbidden` - Insufficient permissions
- `500 Internal Server Error` - Server error

## Security Considerations

1. **Password Hashing**: Uses bcrypt with default cost factor
2. **JWT Signing**: HMAC-SHA256 algorithm
3. **Token Storage**: Refresh tokens stored in database for revocation
4. **CORS**: Configurable cross-origin settings
5. **Rate Limiting**: To be implemented

## E-Ticket System

This service includes automated e-ticket generation and delivery for bus bookings.

### Features

- **PDF Generation**: Professional ticket PDFs with booking details, trip information, and passenger data
- **QR Code Integration**: Each ticket includes a QR code for validation and boarding
- **Email Delivery**: Automatic SMTP email delivery with PDF attachments
- **Bulk Downloads**: Support for downloading all tickets in a booking at once
- **Resend Functionality**: Ability to resend ticket emails if needed

### Implementation

#### Key Components
- `internal/services/ticket_service.go` - PDF and QR code generation using `gofpdf` and `go-qrcode`
- `internal/services/email_service.go` - SMTP email delivery with attachment support
- `internal/delivery/http/handlers/booking_handler.go` - HTTP endpoints for ticket operations

#### Endpoints

**Download All Booking Tickets**
```
GET /api/v1/bookings/{booking_id}/tickets/download
```
Returns PDF with all tickets for the booking.

**Download Single Ticket**
```
GET /api/v1/tickets/{ticket_id}/download
```
Returns PDF for individual ticket.

**Resend Ticket Email**
```
POST /api/v1/bookings/{booking_id}/resend-tickets
```
Re-sends ticket PDFs to the booking contact email.

#### Email Configuration

Add these environment variables for email functionality:

```env
# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password  # For Gmail, use App Password
SMTP_FROM=noreply@busproject.com
```

**Gmail Setup:**
1. Enable 2-Factor Authentication on your Google account
2. Generate an App Password at https://myaccount.google.com/apppasswords
3. Use the App Password (not your regular password) in `SMTP_PASSWORD`

#### Ticket Generation Flow

1. User completes booking via `POST /api/v1/bookings`
2. Backend creates booking and passenger records
3. Ticket service generates:
   - Unique ticket number for each passenger
   - QR code containing ticket validation data (JSON format)
   - PDF with professional layout including trip details, passenger info, and QR code
4. Email service sends PDFs as attachments to contact email
5. Tickets returned in API response with base64-encoded QR codes
6. User can download tickets anytime using booking or ticket ID

#### QR Code Content

Each QR code contains JSON with validation data:
```json
{
  "ticket_number": "BK20251207211857a0-T01",
  "booking_reference": "BK20251207211857a0",
  "passenger_name": "John Doe",
  "trip_origin": "Ho Chi Minh City",
  "trip_destination": "Da Nang",
  "seat_number": "01A",
  "departure_time": "2025-12-08T08:00:00Z"
}
```

#### Dependencies

Required Go packages (already in `go.mod`):
- `github.com/jung-kurt/gofpdf` - PDF generation
- `github.com/skip2/go-qrcode` - QR code creation

## Contributing

Please follow the code structure and conventions established in the project.

## License

MIT License
