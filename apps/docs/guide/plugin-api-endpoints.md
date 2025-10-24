# Plugin Management API Endpoints

## Base URL

```
http://localhost:3001/api/plugins
```

All endpoints require authentication with Bearer token in Authorization header.

---

## Get All Plugins

Get list of all installed plugins.

### Request

```http
GET /api/plugins
Authorization: Bearer <token>
```

### Response

```json
{
  "success": true,
  "data": [
    {
      "id": "my-plugin",
      "name": "My Plugin",
      "version": "1.0.0",
      "description": "Plugin description",
      "author": "{\"name\":\"Developer\",\"email\":\"dev@example.com\"}",
      "type": "feature",
      "status": "active",
      "enabled": true,
      "metadata": "{...}",
      "config": "{\"apiKey\":\"...\"}",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### Status Codes

- `200 OK` - Success
- `401 Unauthorized` - Missing or invalid token
- `500 Internal Server Error` - Server error

---

## Get Plugin by ID

Get details of a specific plugin.

### Request

```http
GET /api/plugins/:id
Authorization: Bearer <token>
```

### Parameters

- `id` (string) - Plugin ID

### Response

```json
{
  "success": true,
  "data": {
    "id": "my-plugin",
    "name": "My Plugin",
    "version": "1.0.0",
    "description": "Plugin description",
    "type": "feature",
    "status": "active",
    "enabled": true,
    "metadata": {
      "id": "my-plugin",
      "name": "My Plugin",
      "version": "1.0.0",
      "author": {
        "name": "Developer",
        "email": "dev@example.com"
      },
      "permissions": [
        {
          "resource": "domains",
          "actions": ["read"]
        }
      ]
    },
    "config": {
      "apiKey": "secret-key",
      "enabled": true
    },
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### Status Codes

- `200 OK` - Success
- `404 Not Found` - Plugin not found
- `500 Internal Server Error` - Server error

---

## Install Plugin

Install a new plugin from various sources.

### Request

```http
POST /api/plugins/install
Authorization: Bearer <token>
Content-Type: application/json

{
  "source": "file",
  "filePath": "/absolute/path/to/plugin",
  "force": false,
  "skipValidation": false
}
```

### Body Parameters

- `source` (string, required) - Installation source: `file`, `npm`, `url`, `marketplace`
- `filePath` (string) - Path to plugin directory (for `source: file`)
- `packageName` (string) - NPM package name (for `source: npm`)
- `url` (string) - Download URL (for `source: url`)
- `version` (string) - Specific version to install
- `force` (boolean) - Force reinstall if already exists
- `skipValidation` (boolean) - Skip validation checks (not recommended)

### Response

```json
{
  "success": true,
  "data": {
    "id": "my-plugin",
    "name": "My Plugin",
    "version": "1.0.0",
    "type": "feature"
  },
  "message": "Plugin installed successfully"
}
```

### Status Codes

- `200 OK` - Plugin installed
- `400 Bad Request` - Invalid parameters
- `409 Conflict` - Plugin already exists (use `force: true` to override)
- `500 Internal Server Error` - Installation failed

---

## Uninstall Plugin

Remove a plugin from the system.

### Request

```http
DELETE /api/plugins/:id
Authorization: Bearer <token>
```

### Parameters

- `id` (string) - Plugin ID

### Response

```json
{
  "success": true,
  "message": "Plugin uninstalled successfully"
}
```

### Status Codes

- `200 OK` - Plugin uninstalled
- `404 Not Found` - Plugin not found
- `500 Internal Server Error` - Uninstallation failed

---

## Activate Plugin

Activate an installed plugin.

### Request

```http
POST /api/plugins/:id/activate
Authorization: Bearer <token>
```

### Parameters

- `id` (string) - Plugin ID

### Response

```json
{
  "success": true,
  "message": "Plugin activated successfully"
}
```

### Status Codes

- `200 OK` - Plugin activated
- `404 Not Found` - Plugin not found
- `500 Internal Server Error` - Activation failed

### Notes

- Plugin must be installed before activation
- If activation fails, plugin status will be set to `error`
- Check logs for detailed error messages

---

## Deactivate Plugin

Deactivate an active plugin.

### Request

```http
POST /api/plugins/:id/deactivate
Authorization: Bearer <token>
```

### Parameters

- `id` (string) - Plugin ID

### Response

```json
{
  "success": true,
  "message": "Plugin deactivated successfully"
}
```

### Status Codes

- `200 OK` - Plugin deactivated
- `404 Not Found` - Plugin not found
- `500 Internal Server Error` - Deactivation failed

---

## Update Plugin Config

Update plugin configuration settings.

### Request

```http
PUT /api/plugins/:id/config
Authorization: Bearer <token>
Content-Type: application/json

{
  "apiKey": "new-secret-key",
  "interval": 120,
  "enabled": true,
  "customOption": "value"
}
```

### Parameters

- `id` (string) - Plugin ID

### Body

Plugin-specific configuration object. Structure depends on plugin's `configSchema`.

### Response

```json
{
  "success": true,
  "message": "Plugin config updated successfully"
}
```

### Status Codes

- `200 OK` - Config updated
- `400 Bad Request` - Invalid config (doesn't match schema)
- `404 Not Found` - Plugin not found
- `500 Internal Server Error` - Update failed

### Notes

- If plugin is active, `onConfigChange` lifecycle hook will be called
- Config is validated against plugin's `configSchema` if defined

---

## Get Plugin Health

Check health status of a specific plugin.

### Request

```http
GET /api/plugins/:id/health
Authorization: Bearer <token>
```

### Parameters

- `id` (string) - Plugin ID

### Response

```json
{
  "success": true,
  "data": {
    "healthy": true,
    "message": "Plugin is running normally"
  }
}
```

### Status Codes

- `200 OK` - Health check completed
- `404 Not Found` - Plugin not found
- `500 Internal Server Error` - Health check failed

### Notes

- Only active plugins can be health checked
- Result depends on plugin's `healthCheck()` implementation

---

## Get All Plugins Health

Check health status of all active plugins.

### Request

```http
GET /api/plugins/health/all
Authorization: Bearer <token>
```

### Response

```json
{
  "success": true,
  "data": [
    {
      "pluginId": "plugin-1",
      "healthy": true,
      "message": "Plugin is healthy"
    },
    {
      "pluginId": "plugin-2",
      "healthy": false,
      "message": "API connection failed"
    }
  ]
}
```

### Status Codes

- `200 OK` - Health checks completed
- `500 Internal Server Error` - Failed to check health

---

## Discover Plugins

Scan plugins directory for new plugins.

### Request

```http
POST /api/plugins/discover
Authorization: Bearer <token>
```

### Response

```json
{
  "success": true,
  "message": "Plugin discovery not yet implemented"
}
```

### Status Codes

- `200 OK` - Discovery completed
- `500 Internal Server Error` - Discovery failed

### Notes

- Currently not implemented
- Will scan `/apps/api/src/plugins/` for valid plugins

---

## Plugin Custom Routes

Each active plugin can register custom routes under:

```
/api/plugins/:pluginId/*
```

### Example

If plugin `my-plugin` registers route `/status`:

```http
GET /api/plugins/my-plugin/status
Authorization: Bearer <token>
```

Response depends on plugin implementation.

---

## Error Responses

All endpoints may return error responses:

### Validation Error

```json
{
  "success": false,
  "error": "source is required"
}
```

### Not Found Error

```json
{
  "success": false,
  "error": "Plugin not found"
}
```

### Server Error

```json
{
  "success": false,
  "error": "Failed to activate plugin: Error message"
}
```

---

## cURL Examples

### Install Plugin

```bash
curl -X POST http://localhost:3001/api/plugins/install \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "source": "file",
    "filePath": "/path/to/plugin"
  }'
```

### Activate Plugin

```bash
curl -X POST http://localhost:3001/api/plugins/my-plugin/activate \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get Plugin Info

```bash
curl http://localhost:3001/api/plugins/my-plugin \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Update Config

```bash
curl -X PUT http://localhost:3001/api/plugins/my-plugin/config \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "new-key",
    "enabled": true
  }'
```

### Check Health

```bash
curl http://localhost:3001/api/plugins/my-plugin/health \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Deactivate Plugin

```bash
curl -X POST http://localhost:3001/api/plugins/my-plugin/deactivate \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Uninstall Plugin

```bash
curl -X DELETE http://localhost:3001/api/plugins/my-plugin \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## JavaScript/Axios Examples

### Install Plugin

```javascript
import axios from 'axios';

const response = await axios.post(
  'http://localhost:3001/api/plugins/install',
  {
    source: 'file',
    filePath: '/path/to/plugin'
  },
  {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
);

console.log('Plugin installed:', response.data);
```

### Activate Plugin

```javascript
const response = await axios.post(
  'http://localhost:3001/api/plugins/my-plugin/activate',
  {},
  {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
);

console.log('Plugin activated:', response.data);
```

### Update Config

```javascript
const response = await axios.put(
  'http://localhost:3001/api/plugins/my-plugin/config',
  {
    apiKey: 'new-key',
    interval: 120
  },
  {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
);

console.log('Config updated:', response.data);
```

### Get All Plugins

```javascript
const response = await axios.get(
  'http://localhost:3001/api/plugins',
  {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
);

const plugins = response.data.data;
console.log(`Found ${plugins.length} plugins`);
```

---

## Rate Limiting

Currently no rate limiting is enforced on plugin endpoints, but it's recommended to:

- Limit plugin installation requests
- Throttle health check requests
- Implement plugin-level rate limiting in custom routes

---

## Authentication

All plugin management endpoints require authentication:

1. **Bearer Token**: Pass JWT token in Authorization header
2. **Admin Role**: Only admin users can install/uninstall plugins
3. **Permissions**: Some operations may require specific permissions

Example:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Webhooks (Future)

Planned webhook support for plugin events:

- `plugin.installed`
- `plugin.activated`
- `plugin.deactivated`
- `plugin.uninstalled`
- `plugin.config.updated`
- `plugin.error`

---

## Versioning

Current API version: `v1`

All endpoints are under `/api/plugins`.

Future versions may be namespaced: `/api/v2/plugins`
