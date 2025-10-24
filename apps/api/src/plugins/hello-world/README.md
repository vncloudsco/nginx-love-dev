# Hello World Plugin

Example plugin demonstrating the plugin system capabilities of Nginx WAF Management Platform.

## Features

- ✅ Custom REST API endpoints
- ✅ Event listeners (domain created)
- ✅ Persistent storage
- ✅ Health checks
- ✅ Configuration management
- ✅ Lifecycle hooks
- ✅ Statistics tracking

## Installation

### 1. Compile TypeScript

```bash
cd apps/api/src/plugins/hello-world
npx tsc index.ts --outDir . --module commonjs --target es2020 --esModuleInterop true
```

### 2. Install via API

```bash
curl -X POST http://localhost:3001/api/plugins/install \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "source": "file",
    "filePath": "'/$(pwd)/apps/api/src/plugins/hello-world'"
  }'
```

### 3. Activate Plugin

```bash
curl -X POST http://localhost:3001/api/plugins/hello-world/activate \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Configuration

Update plugin configuration:

```bash
curl -X PUT http://localhost:3001/api/plugins/hello-world/config \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "greeting": "Hey",
    "enabled": true
  }'
```

### Config Options

- `greeting` (string): Custom greeting message (default: "Hello")
- `enabled` (boolean): Enable or disable plugin (default: true)

## API Endpoints

### GET /api/plugins/hello-world/hello

Get a simple hello message.

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Hello World!",
    "plugin": "Hello World Plugin",
    "version": "1.0.0"
  }
}
```

### GET /api/plugins/hello-world/stats

Get plugin statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "plugin": "Hello World Plugin",
    "version": "1.0.0",
    "initializationCount": 3,
    "domainsCreatedSinceInit": 5,
    "totalDomains": 10,
    "initializedAt": "2024-01-01T00:00:00.000Z",
    "uptime": 3600
  }
}
```

### POST /api/plugins/hello-world/greet

Greet a specific person.

**Request:**
```json
{
  "name": "John"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Hello, John!"
  }
}
```

## Testing

### Test Hello Endpoint

```bash
curl http://localhost:3001/api/plugins/hello-world/hello \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test Stats Endpoint

```bash
curl http://localhost:3001/api/plugins/hello-world/stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test Greet Endpoint

```bash
curl -X POST http://localhost:3001/api/plugins/hello-world/greet \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"name": "John"}'
```

### Test Health Check

```bash
curl http://localhost:3001/api/plugins/hello-world/health \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Events

The plugin listens to the following events:

- `domain:created` - Logs when a new domain is created and increments counter

## Storage

The plugin uses persistent storage to track:

- `initialized_at` - Timestamp when plugin was initialized
- `initialization_count` - Number of times plugin has been initialized
- `domain_count` - Number of domains created since initialization
- `install_date` - Date when plugin was installed

## Lifecycle Hooks

### onInstall

Called when plugin is first installed. Sets up initial storage values.

### onActivate

Called when plugin is activated. Logs activation message.

### onDeactivate

Called when plugin is deactivated. Logs deactivation message.

### onUninstall

Called before plugin is uninstalled. Clears all storage data.

### onConfigChange

Called when plugin configuration is updated. Logs old and new greeting values.

## Development

### Project Structure

```
hello-world/
├── plugin.config.json    # Plugin metadata
├── index.ts              # Source code
├── index.js              # Compiled (generated)
└── README.md             # This file
```

### Modify Plugin

1. Edit `index.ts`
2. Recompile: `npx tsc index.ts --outDir . --module commonjs --target es2020`
3. Deactivate: `curl -X POST http://localhost:3001/api/plugins/hello-world/deactivate -H "Authorization: Bearer TOKEN"`
4. Activate: `curl -X POST http://localhost:3001/api/plugins/hello-world/activate -H "Authorization: Bearer TOKEN"`

### View Logs

```bash
tail -f apps/api/logs/app.log | grep "\[Plugin:hello-world\]"
```

## Troubleshooting

### Plugin won't activate

Check logs for errors:
```bash
tail -f apps/api/logs/app.log
```

### Routes return 404

Ensure plugin is active:
```bash
curl http://localhost:3001/api/plugins/hello-world -H "Authorization: Bearer TOKEN"
```

### Health check fails

Check plugin config:
```bash
curl http://localhost:3001/api/plugins/hello-world -H "Authorization: Bearer TOKEN"
```

Ensure `enabled` is `true` in config.

## License

MIT
