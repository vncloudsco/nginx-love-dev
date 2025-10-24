# Plugin System Documentation

Complete guide for developing plugins for Nginx WAF Management Platform.

## 📚 Documentation

### Getting Started

- **[Plugin Overview](./plugin-overview.md)** - Tổng quan về hệ thống plugin, kiến trúc và workflow
- **[Getting Started Guide](./plugin-getting-started.md)** - Hướng dẫn chi tiết từng bước để tạo plugin đầu tiên

### Reference

- **[SDK Reference](./plugin-sdk-reference.md)** - Tài liệu đầy đủ về Plugin SDK API
- **[API Endpoints](./plugin-api-endpoints.md)** - REST API để quản lý plugins

### Advanced

- **[Examples](./plugin-examples.md)** - Các ví dụ plugin thực tế
- **[Best Practices](./plugin-best-practices.md)** - Các nguyên tắc phát triển plugin tốt nhất

---

## 🚀 Quick Start

### 1. Tạo Plugin Mới

```bash
# Create plugin directory
mkdir -p apps/api/src/plugins/my-plugin
cd apps/api/src/plugins/my-plugin
```

### 2. Tạo plugin.config.json

```json
{
  "metadata": {
    "id": "my-plugin",
    "name": "My Plugin",
    "version": "1.0.0",
    "description": "My first plugin",
    "author": {
      "name": "Your Name"
    },
    "type": "feature",
    "license": "MIT"
  },
  "mainFile": "index.js"
}
```

### 3. Tạo index.ts

```typescript
import { BasePlugin, PluginContext, PluginMetadata } from '../../../shared/plugin-sdk';

export default class MyPlugin extends BasePlugin {
  public metadata: PluginMetadata = {
    id: 'my-plugin',
    name: 'My Plugin',
    version: '1.0.0',
    description: 'My first plugin',
    author: { name: 'Your Name' },
    type: 'feature',
    license: 'MIT'
  };

  async initialize(context: PluginContext): Promise<void> {
    this.context = context;
    this.log('info', 'Hello from My Plugin!');
  }

  async destroy(): Promise<void> {
    this.log('info', 'Goodbye!');
    await super.destroy();
  }
}
```

### 4. Build & Install

```bash
# Compile TypeScript
npx tsc index.ts --outDir . --module commonjs --target es2020

# Install via API
curl -X POST http://localhost:3001/api/plugins/install \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"source": "file", "filePath": "/path/to/plugin"}'

# Activate
curl -X POST http://localhost:3001/api/plugins/my-plugin/activate \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📖 Core Concepts

### Plugin Types

| Type | Description | Use Case |
|------|-------------|----------|
| **feature** | Thêm chức năng mới | Monitoring, reporting, automation |
| **integration** | Tích hợp bên thứ ba | Slack, Discord, PagerDuty |
| **ui** | Giao diện mới (frontend) | Custom dashboard, widgets |
| **middleware** | Express middleware | Auth, rate limiting, logging |
| **hook** | Lifecycle hooks | Pre/post actions, events |

### Plugin Lifecycle

```
Install → Activate → (Running) → Deactivate → Uninstall
```

**Lifecycle Hooks:**
- `onInstall()` - Called when installed
- `onActivate()` - Called when activated
- `initialize()` - Setup plugin
- `destroy()` - Cleanup plugin
- `onDeactivate()` - Called when deactivated
- `onUninstall()` - Called when uninstalled

### Plugin Context

```typescript
interface PluginContext {
  app: Application;              // Express app
  logger: Logger;                // Logger with plugin prefix
  db: PrismaClient;              // Database access
  config: PluginConfig;          // Plugin config
  storage: PluginStorage;        // Persistent storage
  events: PluginEventEmitter;    // Event system
  api: PluginAPI;                // System API
}
```

---

## 🔧 Common Tasks

### Register Custom Routes

```typescript
import { Router } from 'express';

async initialize(context: PluginContext): Promise<void> {
  const router = Router();
  
  router.get('/hello', (req, res) => {
    res.json({ message: 'Hello World' });
  });
  
  context.api.registerRoute('', router);
  // Route: /api/plugins/my-plugin/hello
}
```

### Listen to Events

```typescript
async initialize(context: PluginContext): Promise<void> {
  context.events.on('domain:created', (data) => {
    this.log('info', 'Domain created:', data.name);
  });
}
```

### Store Data

```typescript
// Set
await context.storage.set('key', { data: 'value' });

// Get
const data = await context.storage.get('key');

// Delete
await context.storage.delete('key');
```

### Access Database

```typescript
const domains = await context.db.domain.findMany({
  where: { status: 'active' }
});
```

---

## 🎯 Plugin Examples

### Simple Monitoring

Monitor system metrics và log ra console.

→ [View Example](./plugin-examples.md#example-1-simple-monitoring-plugin)

### Slack Notifications

Gửi alerts tới Slack channel.

→ [View Example](./plugin-examples.md#example-2-slack-notification-plugin)

### Custom API

Cung cấp custom REST API endpoints.

→ [View Example](./plugin-examples.md#example-3-custom-api-plugin)

### Background Tasks

Chạy periodic background tasks.

→ [View Example](./plugin-examples.md#example-4-background-task-plugin)

### Database Export

Export database data sang JSON/CSV.

→ [View Example](./plugin-examples.md#example-5-database-export-plugin)

---

## 🔐 Security Best Practices

✅ **DO:**
- Validate all input
- Use config for secrets (never hardcode)
- Handle errors properly
- Clean up resources
- Use TypeScript types
- Write tests

❌ **DON'T:**
- Hardcode API keys or passwords
- Ignore errors
- Leave timers/listeners running
- Block the event loop
- Expose sensitive data in logs
- Skip input validation

→ [Full Best Practices Guide](./plugin-best-practices.md)

---

## 📦 Plugin Structure

```
my-plugin/
├── plugin.config.json    # Plugin metadata
├── index.ts              # Source code
├── index.js              # Compiled (for production)
├── package.json          # NPM dependencies (optional)
├── README.md             # Plugin documentation
├── routes/               # Custom routes (optional)
├── services/             # Business logic (optional)
└── types/                # TypeScript types (optional)
```

---

## 🛠️ Development Tools

### TypeScript Compilation

```bash
npx tsc index.ts --outDir . --module commonjs --target es2020 --esModuleInterop true
```

### Test Plugin Locally

```bash
# Check health
curl http://localhost:3001/api/plugins/my-plugin/health

# View logs
tail -f apps/api/logs/app.log | grep "\[Plugin:my-plugin\]"
```

### Debug Plugin

```typescript
// Add debug logs
this.log('debug', 'Processing item', { id: 123 });

// Check storage
const keys = await context.storage.keys();
console.log('Storage keys:', keys);

// Inspect context
console.log('Plugin context:', {
  hasApp: !!context.app,
  hasDb: !!context.db,
  config: context.config
});
```

---

## 🆘 Troubleshooting

### Plugin won't load

- ✅ Check TypeScript compiled to JavaScript
- ✅ Verify `mainFile` in plugin.config.json
- ✅ Ensure plugin.config.json is valid JSON
- ✅ Check plugin directory name matches ID

### Plugin fails to activate

- ✅ Check logs for error messages
- ✅ Verify dependencies are installed
- ✅ Test health check endpoint
- ✅ Ensure config is valid

### Routes not working

- ✅ Verify route registration
- ✅ Check path: `/api/plugins/{plugin-id}/{route}`
- ✅ Ensure plugin is active

### Events not firing

- ✅ Bind event handlers correctly
- ✅ Check event names match system events
- ✅ Verify plugin is active when event occurs

---

## 📝 API Management

### Install Plugin

```bash
POST /api/plugins/install
```

### Activate/Deactivate

```bash
POST /api/plugins/:id/activate
POST /api/plugins/:id/deactivate
```

### Configure

```bash
PUT /api/plugins/:id/config
```

### Health Check

```bash
GET /api/plugins/:id/health
```

→ [Full API Reference](./plugin-api-endpoints.md)

---

## 🌟 Plugin Ecosystem

### Official Plugins (Coming Soon)

- **Backup Automation** - Automated backup scheduling
- **Metrics Collector** - Collect and export metrics
- **Email Notifications** - Send email alerts
- **Webhook Handler** - Handle incoming webhooks

### Community Plugins

- Submit your plugins to marketplace
- Share with the community
- Get featured

---

## 🤝 Contributing

### Develop a Plugin

1. Follow this documentation
2. Test thoroughly
3. Write documentation
4. Submit to marketplace

### Report Issues

Found a bug in the plugin system?

- Create issue on GitHub
- Include error logs
- Provide reproduction steps

---

## 📚 Additional Resources

### Related Documentation

- [Main API Documentation](../api/)
- [System Architecture](../architecture.md)
- [Database Schema](../database-schema.md)

### External Resources

- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [Prisma Documentation](https://www.prisma.io/docs)

---

## 📞 Support

Need help?

- 📖 Read the documentation
- 💬 Join our Discord community
- 📧 Email: support@example.com
- 🐛 Report issues on GitHub

---

## 📄 License

Plugin system is part of Nginx WAF Management Platform.

Licensed under MIT License.

---

**Happy Plugin Development! 🚀**
