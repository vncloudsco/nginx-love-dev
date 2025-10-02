# Nginx WAF Admin Portal - Backend API

Backend API for Nginx + ModSecurity Admin Portal built with Node.js, TypeScript, Express, and Prisma.

## 🚀 Features

- **Authentication**: JWT-based authentication with refresh tokens
- **Account Management**: User profile, password change, 2FA
- **Activity Logging**: Track all user activities
- **Session Management**: Manage active user sessions
- **Role-Based Access Control (RBAC)**: Admin, Moderator, Viewer roles
- **Two-Factor Authentication**: TOTP-based 2FA with backup codes
- **Security**: bcrypt password hashing, helmet security headers, CORS

## 📋 Prerequisites

- Node.js 18+ 
- PostgreSQL 14+
- npm or yarn

## 🛠️ Installation

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env
```

Edit `.env` file with your configuration. Database credentials are already configured from `.env.db`.

4. Generate Prisma Client:
```bash
npm run prisma:generate
```

5. Run database migrations:
```bash
npm run prisma:migrate
```

6. Seed database with test data:
```bash
npm run prisma:seed
```

## 🏃 Running the Application

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm run build
npm start
```

## 📚 API Documentation

### Base URL
```
http://localhost:3001/api
```

### Authentication Endpoints

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

Response:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "...",
      "username": "admin",
      "email": "admin@example.com",
      "fullName": "System Administrator",
      "role": "admin",
      "avatar": "...",
      "phone": "+84 123 456 789",
      "timezone": "Asia/Ho_Chi_Minh",
      "language": "vi",
      "lastLogin": "2025-09-30T..."
    },
    "accessToken": "eyJhbGci...",
    "refreshToken": "eyJhbGci...",
    "requires2FA": false
  }
}
```

#### Refresh Token
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGci..."
}
```

#### Logout
```http
POST /api/auth/logout
Content-Type: application/json

{
  "refreshToken": "eyJhbGci..."
}
```

### Account Endpoints (Authenticated)

All account endpoints require `Authorization: Bearer <accessToken>` header.

#### Get Profile
```http
GET /api/account/profile
Authorization: Bearer <accessToken>
```

#### Update Profile
```http
PUT /api/account/profile
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "fullName": "New Name",
  "email": "newemail@example.com",
  "phone": "+84 999 888 777",
  "timezone": "Asia/Bangkok",
  "language": "en"
}
```

#### Change Password
```http
POST /api/account/password
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "currentPassword": "admin123",
  "newPassword": "NewSecure@123",
  "confirmPassword": "NewSecure@123"
}
```

#### Setup 2FA
```http
POST /api/account/2fa/setup
Authorization: Bearer <accessToken>
```

Response includes QR code and backup codes.

#### Enable 2FA
```http
POST /api/account/2fa/enable
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "token": "123456"
}
```

#### Disable 2FA
```http
POST /api/account/2fa/disable
Authorization: Bearer <accessToken>
```

#### Get Activity Logs
```http
GET /api/account/activity?page=1&limit=20
Authorization: Bearer <accessToken>
```

#### Get Active Sessions
```http
GET /api/account/sessions
Authorization: Bearer <accessToken>
```

#### Revoke Session
```http
DELETE /api/account/sessions/:sessionId
Authorization: Bearer <accessToken>
```

## 🧪 Test Credentials

After running the seed script, you can use these credentials:

### Admin
- Username: `admin`
- Password: `admin123`
- Email: `admin@example.com`
- Role: `admin`

### Operator
- Username: `operator`
- Password: `operator123`
- Email: `operator@example.com`
- Role: `moderator`

### Viewer
- Username: `viewer`
- Password: `viewer123`
- Email: `viewer@example.com`
- Role: `viewer`

## 📁 Project Structure

```
backend/
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── seed.ts           # Database seed script
├── src/
│   ├── config/
│   │   ├── database.ts   # Prisma client
│   │   └── index.ts      # App configuration
│   ├── controllers/
│   │   ├── auth.controller.ts    # Authentication logic
│   │   └── account.controller.ts # Account management logic
│   ├── middleware/
│   │   ├── auth.ts           # JWT authentication
│   │   ├── errorHandler.ts  # Error handling
│   │   └── validation.ts    # Request validation
│   ├── routes/
│   │   ├── auth.routes.ts    # Auth routes
│   │   ├── account.routes.ts # Account routes
│   │   └── index.ts         # Route aggregator
│   ├── utils/
│   │   ├── jwt.ts           # JWT utilities
│   │   ├── password.ts      # Password hashing
│   │   ├── twoFactor.ts     # 2FA utilities
│   │   └── logger.ts        # Winston logger
│   └── index.ts            # App entry point
├── .env                    # Environment variables
├── .env.example           # Environment variables template
├── package.json
└── tsconfig.json
```

## 🔐 Security Features

- **Password Hashing**: bcrypt with configurable rounds
- **JWT Tokens**: Separate access and refresh tokens
- **Token Revocation**: Refresh tokens can be revoked
- **2FA Support**: TOTP-based two-factor authentication
- **Activity Logging**: All user actions are logged
- **Session Management**: Track and revoke active sessions
- **CORS Protection**: Configurable CORS origin
- **Helmet**: Security headers
- **Input Validation**: express-validator

## 🗄️ Database Schema

### User
- Basic user information
- Password (hashed)
- Role (admin, moderator, viewer)
- Status (active, inactive, suspended)
- Timezone & language preferences

### UserProfile
- Extended user information
- Bio, location, website

### TwoFactorAuth
- 2FA configuration
- Secret key
- Backup codes

### ActivityLog
- User activity tracking
- Login/logout events
- Configuration changes
- Security events

### RefreshToken
- JWT refresh tokens
- Expiration tracking
- Revocation support

### UserSession
- Active sessions
- Device and location info
- Last active timestamp

## 🔧 Environment Variables

See `.env.example` for all available configuration options.

Key variables:
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_ACCESS_SECRET`: Secret for access tokens
- `JWT_REFRESH_SECRET`: Secret for refresh tokens
- `CORS_ORIGIN`: Allowed frontend origin
- `PORT`: API server port (default: 3001)

## 📝 License

MIT
