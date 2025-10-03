# API Documentation

## Base URL
```
http://localhost:3001/api
```

## Authentication

### Login
**POST** `/auth/login`

Request:
```json
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
      "lastLogin": "2025-09-30T14:18:03.449Z"
    },
    "accessToken": "eyJhbG...",
    "refreshToken": "eyJhbG...",
    "requires2FA": false
  }
}
```

### Logout
**POST** `/auth/logout`

Headers:
```
Authorization: Bearer <accessToken>
```

Response:
```json
{
  "success": true,
  "message": "Logout successful"
}
```

### Refresh Token
**POST** `/auth/refresh`

Request:
```json
{
  "refreshToken": "eyJhbG..."
}
```

Response:
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbG...",
    "refreshToken": "eyJhbG..."
  }
}
```

## Account Management

### Get Profile
**GET** `/account/profile`

Headers:
```
Authorization: Bearer <accessToken>
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "...",
    "username": "admin",
    "email": "admin@example.com",
    "fullName": "System Administrator",
    "role": "admin",
    "avatar": "...",
    "phone": "+84 123 456 789",
    "timezone": "Asia/Ho_Chi_Minh",
    "language": "vi",
    "createdAt": "2025-09-30T14:18:03.456Z",
    "lastLogin": "2025-09-30T14:18:37.868Z",
    "twoFactorEnabled": false
  }
}
```

### Update Profile
**PUT** `/account/profile`

Headers:
```
Authorization: Bearer <accessToken>
```

Request:
```json
{
  "fullName": "New Name",
  "email": "newemail@example.com",
  "phone": "+84 987 654 321",
  "timezone": "Asia/Bangkok",
  "language": "en"
}
```

Response:
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": { /* updated user object */ }
}
```

### Change Password
**POST** `/account/change-password`

Headers:
```
Authorization: Bearer <accessToken>
```

Request:
```json
{
  "currentPassword": "admin123",
  "newPassword": "NewPassword@123",
  "confirmPassword": "NewPassword@123"
}
```

Response:
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

### Get Activity Logs
**GET** `/account/activity-logs?page=1&limit=10`

Headers:
```
Authorization: Bearer <accessToken>
```

Response:
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "...",
        "action": "User logged in",
        "type": "login",
        "ip": "192.168.1.100",
        "userAgent": "Mozilla/5.0...",
        "timestamp": "2025-09-30T14:18:03.456Z",
        "details": null,
        "success": true
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "totalPages": 3
    }
  }
}
```

## Two-Factor Authentication (2FA)

### Enable 2FA
**POST** `/account/2fa/enable`

Headers:
```
Authorization: Bearer <accessToken>
```

Response:
```json
{
  "success": true,
  "data": {
    "secret": "JBSWY3DPEHPK3PXP",
    "qrCode": "data:image/png;base64,...",
    "backupCodes": [
      "1234-5678-9012",
      "3456-7890-1234",
      ...
    ]
  }
}
```

### Verify 2FA
**POST** `/account/2fa/verify`

Headers:
```
Authorization: Bearer <accessToken>
```

Request:
```json
{
  "token": "123456"
}
```

Response:
```json
{
  "success": true,
  "message": "2FA enabled successfully"
}
```

### Disable 2FA
**POST** `/account/2fa/disable`

Headers:
```
Authorization: Bearer <accessToken>
```

Request:
```json
{
  "password": "admin123"
}
```

Response:
```json
{
  "success": true,
  "message": "2FA disabled successfully"
}
```

### Verify 2FA Token (during login)
**POST** `/auth/verify-2fa`

Request:
```json
{
  "userId": "...",
  "token": "123456"
}
```

Response:
```json
{
  "success": true,
  "message": "2FA verification successful",
  "data": {
    "accessToken": "...",
    "refreshToken": "..."
  }
}
```

## Test Credentials

### Admin Account
- **Username**: `admin`
- **Password**: `admin123`
- **Role**: `admin`
- **Email**: `admin@example.com`

### Operator Account
- **Username**: `operator`
- **Password**: `operator123`
- **Role**: `moderator`
- **Email**: `operator@example.com`

### Viewer Account
- **Username**: `viewer`
- **Password**: `viewer123`
- **Role**: `viewer`
- **Email**: `viewer@example.com`

## Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "message": "Error message here",
  "errors": [ /* validation errors if any */ ]
}
```

Common HTTP Status Codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error
