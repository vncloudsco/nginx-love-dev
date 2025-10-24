# Plugin SDK Reference

## PluginContext

Context object được inject vào plugin, cung cấp các API để tương tác với hệ thống.

```typescript
interface PluginContext {
  app: Application;              // Express app instance
  logger: Logger;                // Logger với plugin prefix
  db: PrismaClient;              // Database client (Prisma)
  config: PluginConfig;          // Plugin configuration
  storage: PluginStorage;        // Persistent storage API
  events: PluginEventEmitter;    // Event system
  api: PluginAPI;                // System API
}
```

---

## Logger API

Logger tự động thêm plugin ID vào mọi log message.

### Methods

#### `logger.info(message, ...args)`

Log thông tin thông thường.

```typescript
context.logger.info('Plugin started');
context.logger.info('Processing domain:', domainName);
context.logger.info('Stats:', { requests: 100, errors: 2 });
```

#### `logger.warn(message, ...args)`

Log cảnh báo.

```typescript
context.logger.warn('API rate limit approaching');
context.logger.warn('Deprecated feature used:', featureName);
```

#### `logger.error(message, ...args)`

Log lỗi.

```typescript
context.logger.error('Failed to send notification:', error);
context.logger.error('Database query failed:', error.message);
```

#### `logger.debug(message, ...args)`

Log debug info (chỉ hiển thị ở development mode).

```typescript
context.logger.debug('Request payload:', payload);
context.logger.debug('Processing step 1 complete');
```

### Example

```typescript
async initialize(context: PluginContext): Promise<void> {
  context.logger.info('Initializing plugin...');
  
  try {
    const config = this.getConfig();
    context.logger.debug('Config loaded:', config);
    
    // Do something
    context.logger.info('Plugin initialized successfully');
  } catch (error: any) {
    context.logger.error('Initialization failed:', error);
    throw error;
  }
}
```

---

## Storage API

Persistent key-value storage cho plugin. Data được lưu vào database và tự động serialize/deserialize.

### Methods

#### `storage.set(key, value): Promise<void>`

Lưu giá trị vào storage.

```typescript
// Store simple value
await context.storage.set('counter', 42);

// Store object
await context.storage.set('config', {
  lastRun: new Date(),
  count: 10
});

// Store array
await context.storage.set('domains', ['example.com', 'test.com']);
```

#### `storage.get(key): Promise<any>`

Lấy giá trị từ storage.

```typescript
const counter = await context.storage.get('counter');
// Returns: 42

const config = await context.storage.get('config');
// Returns: { lastRun: '2024-01-01T00:00:00Z', count: 10 }

const notExist = await context.storage.get('not-exist');
// Returns: undefined
```

#### `storage.has(key): Promise<boolean>`

Kiểm tra key có tồn tại không.

```typescript
const exists = await context.storage.has('counter');
// Returns: true

const notExists = await context.storage.has('not-exist');
// Returns: false
```

#### `storage.delete(key): Promise<void>`

Xóa key khỏi storage.

```typescript
await context.storage.delete('counter');
```

#### `storage.keys(): Promise<string[]>`

Lấy danh sách tất cả keys.

```typescript
const keys = await context.storage.keys();
// Returns: ['counter', 'config', 'domains']
```

#### `storage.clear(): Promise<void>`

Xóa tất cả data trong storage.

```typescript
await context.storage.clear();
```

### Example

```typescript
async initialize(context: PluginContext): Promise<void> {
  // Check if first run
  const initialized = await context.storage.has('initialized');
  
  if (!initialized) {
    context.logger.info('First run, initializing...');
    await context.storage.set('initialized', true);
    await context.storage.set('install_date', new Date().toISOString());
    await context.storage.set('run_count', 0);
  }
  
  // Increment run count
  const count = await context.storage.get('run_count') || 0;
  await context.storage.set('run_count', count + 1);
  
  context.logger.info(`Plugin run count: ${count + 1}`);
}
```

---

## Event System

Event-driven architecture cho phép plugin listen và emit events.

### Methods

#### `events.on(eventName, handler)`

Listen to một event.

```typescript
context.events.on('domain:created', (data) => {
  console.log('Domain created:', data.name);
});
```

#### `events.once(eventName, handler)`

Listen to event một lần duy nhất.

```typescript
context.events.once('nginx:reloaded', (data) => {
  console.log('Nginx reloaded for the first time');
});
```

#### `events.off(eventName, handler)`

Remove event listener.

```typescript
const handler = (data) => console.log(data);

// Add listener
context.events.on('domain:created', handler);

// Remove listener
context.events.off('domain:created', handler);
```

#### `events.emit(eventName, ...args)`

Emit một event.

```typescript
context.events.emit('my-plugin:custom-event', {
  message: 'Hello from plugin',
  timestamp: new Date()
});
```

### System Events

Các events có sẵn từ hệ thống:

#### Domain Events
- `domain:created` - Domain được tạo
- `domain:updated` - Domain được cập nhật
- `domain:deleted` - Domain bị xóa

#### Upstream Events
- `upstream:created` - Upstream được thêm
- `upstream:updated` - Upstream được cập nhật
- `upstream:deleted` - Upstream bị xóa
- `upstream:status:changed` - Status của upstream thay đổi

#### Nginx Events
- `nginx:reloaded` - Nginx được reload
- `nginx:config:changed` - Nginx config thay đổi

#### SSL Events
- `ssl:renewed` - SSL certificate được renew
- `ssl:expiring` - SSL certificate sắp hết hạn
- `ssl:expired` - SSL certificate đã hết hạn

#### Alert Events
- `alert:critical` - Critical alert
- `alert:warning` - Warning alert
- `alert:info` - Info alert

#### User Events
- `user:login` - User login
- `user:logout` - User logout
- `user:action` - User thực hiện action

#### ModSecurity Events
- `modsec:rule:triggered` - ModSec rule triggered
- `modsec:attack:detected` - Attack detected

### Example

```typescript
private handlers: Map<string, Function> = new Map();

async initialize(context: PluginContext): Promise<void> {
  // Create bound handlers
  const domainHandler = this.handleDomainCreated.bind(this);
  const alertHandler = this.handleCriticalAlert.bind(this);
  
  // Store handlers for cleanup
  this.handlers.set('domain:created', domainHandler);
  this.handlers.set('alert:critical', alertHandler);
  
  // Register listeners
  context.events.on('domain:created', domainHandler);
  context.events.on('alert:critical', alertHandler);
}

async destroy(): Promise<void> {
  // Clean up listeners
  for (const [event, handler] of this.handlers) {
    this.context?.events.off(event, handler);
  }
  this.handlers.clear();
  
  await super.destroy();
}

private async handleDomainCreated(data: any): Promise<void> {
  this.log('info', 'Domain created:', data.name);
  // Handle event
}

private async handleCriticalAlert(data: any): Promise<void> {
  this.log('error', 'Critical alert:', data.message);
  // Send notification
}
```

---

## Plugin API

API để plugin tương tác với hệ thống.

### Methods

#### `api.registerRoute(path, router)`

Register Express router cho plugin.

```typescript
import { Router } from 'express';

const router = Router();

router.get('/hello', (req, res) => {
  res.json({ message: 'Hello World' });
});

router.post('/data', async (req, res) => {
  const { key, value } = req.body;
  await context.storage.set(key, value);
  res.json({ success: true });
});

// Register router
context.api.registerRoute('', router);

// Routes accessible at:
// GET  /api/plugins/my-plugin/hello
// POST /api/plugins/my-plugin/data
```

**With path prefix:**

```typescript
context.api.registerRoute('/v1', router);

// Routes accessible at:
// GET  /api/plugins/my-plugin/v1/hello
// POST /api/plugins/my-plugin/v1/data
```

#### `api.registerMiddleware(middleware)`

Register global Express middleware.

```typescript
// Log all requests
context.api.registerMiddleware((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Add custom header
context.api.registerMiddleware((req, res, next) => {
  res.setHeader('X-Plugin', 'my-plugin');
  next();
});

// Authentication middleware
context.api.registerMiddleware(async (req, res, next) => {
  const token = req.headers.authorization;
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  // Verify token
  next();
});
```

#### `api.registerHook(hookName, handler)`

Register hook vào system lifecycle.

```typescript
// Before nginx reload
context.api.registerHook('before:nginx:reload', async () => {
  console.log('Nginx is about to reload');
  // Prepare for reload
});

// After domain creation
context.api.registerHook('after:domain:create', async (domain) => {
  console.log('Domain created:', domain.name);
  // Post-creation tasks
});

// Before plugin uninstall
context.api.registerHook('before:plugin:uninstall', async (pluginId) => {
  console.log('Plugin uninstalling:', pluginId);
  // Cleanup tasks
});
```

#### `api.callHook(hookName, ...args): Promise<any[]>`

Call registered hooks và lấy kết quả.

```typescript
// Call custom hook
const results = await context.api.callHook('my-plugin:process', data);

// results = array of return values from all registered handlers
console.log('Hook results:', results);
```

#### `api.getSystemConfig(): Promise<object>`

Lấy system configuration (safe, không bao gồm sensitive data).

```typescript
const systemConfig = await context.api.getSystemConfig();

console.log('System version:', systemConfig.version);
console.log('Environment:', systemConfig.nodeEnv);
```

#### `api.getPluginConfig(pluginId): Promise<PluginConfig | null>`

Lấy config của plugin khác (nếu có quyền).

```typescript
const otherPluginConfig = await context.api.getPluginConfig('other-plugin');

if (otherPluginConfig) {
  console.log('Other plugin enabled:', otherPluginConfig.enabled);
  console.log('Other plugin settings:', otherPluginConfig.settings);
}
```

#### `api.updatePluginConfig(pluginId, config): Promise<void>`

Cập nhật config của plugin.

```typescript
await context.api.updatePluginConfig(this.metadata.id, {
  enabled: true,
  settings: {
    apiKey: 'new-key',
    interval: 120
  }
});
```

---

## Database Access

Plugin có thể truy cập database thông qua Prisma Client.

### Available Models

```typescript
// Users
const users = await context.db.user.findMany();

// Domains
const domains = await context.db.domain.findMany({
  where: { status: 'active' },
  include: { upstreams: true }
});

// Upstreams
const upstreams = await context.db.upstream.findMany({
  where: { domainId: 'domain-id' }
});

// SSL Certificates
const certs = await context.db.sSLCertificate.findMany({
  where: { status: 'expiring' }
});

// ModSec Rules
const rules = await context.db.modSecRule.findMany({
  where: { enabled: true }
});

// Alerts
const alerts = await context.db.alertHistory.findMany({
  where: { 
    severity: 'critical',
    acknowledged: false
  }
});

// Activity Logs
const logs = await context.db.activityLog.findMany({
  take: 100,
  orderBy: { timestamp: 'desc' }
});

// Backups
const backups = await context.db.backupFile.findMany();

// Slave Nodes (for cluster)
const nodes = await context.db.slaveNode.findMany();
```

### Example: Query Data

```typescript
async initialize(context: PluginContext): Promise<void> {
  // Get all active domains
  const domains = await context.db.domain.findMany({
    where: { status: 'active' },
    include: {
      upstreams: true,
      sslCertificate: true
    }
  });

  context.logger.info(`Found ${domains.length} active domains`);

  // Check SSL expiry
  for (const domain of domains) {
    if (domain.sslCertificate) {
      const daysUntilExpiry = Math.floor(
        (domain.sslCertificate.validTo.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysUntilExpiry < 30) {
        context.logger.warn(`SSL for ${domain.name} expires in ${daysUntilExpiry} days`);
      }
    }
  }
}
```

### Example: Create Data

```typescript
// Create activity log
await context.db.activityLog.create({
  data: {
    userId: user.id,
    action: 'plugin_action',
    type: 'system',
    ip: req.ip,
    userAgent: req.headers['user-agent'] || '',
    details: JSON.stringify({ plugin: this.metadata.id }),
    success: true
  }
});
```

---

## BasePlugin Helper Methods

### `log(level, message, ...args)`

Shortcut cho `context.logger[level]`.

```typescript
this.log('info', 'Message');
this.log('warn', 'Warning');
this.log('error', 'Error', error);
this.log('debug', 'Debug info');
```

### `getConfig<T>(): T`

Lấy plugin config với type safety.

```typescript
interface MyPluginConfig {
  apiKey: string;
  interval: number;
  enabled: boolean;
}

const config = this.getConfig<MyPluginConfig>();
console.log(config.apiKey);
console.log(config.interval);
```

### `setConfig(settings): Promise<void>`

Cập nhật plugin settings.

```typescript
await this.setConfig({
  apiKey: 'new-key',
  interval: 120,
  enabled: true
});
```

---

## Type Definitions

### PluginMetadata

```typescript
interface PluginMetadata {
  id: string;
  name: string;
  version: string;
  description: string;
  author: {
    name: string;
    email?: string;
    url?: string;
  };
  type: PluginType;
  category?: string;
  tags?: string[];
  icon?: string;
  homepage?: string;
  repository?: string;
  license: string;
  dependencies?: Record<string, string>;
  minSystemVersion?: string;
  maxSystemVersion?: string;
  permissions?: PluginPermission[];
  configSchema?: Record<string, any>;
}
```

### PluginType

```typescript
enum PluginType {
  FEATURE = 'feature',
  INTEGRATION = 'integration',
  UI = 'ui',
  MIDDLEWARE = 'middleware',
  HOOK = 'hook'
}
```

### PluginConfig

```typescript
interface PluginConfig {
  enabled: boolean;
  settings?: Record<string, any>;
}
```

### PluginPermission

```typescript
interface PluginPermission {
  resource: string;
  actions: string[];
}
```

---

## Complete Example

```typescript
import { BasePlugin, PluginContext, PluginMetadata } from '../../../shared/plugin-sdk';
import { Router } from 'express';

interface MyPluginConfig {
  apiKey: string;
  checkInterval: number;
  notifyOn: string[];
}

export default class MyPlugin extends BasePlugin {
  public metadata: PluginMetadata = {
    id: 'my-plugin',
    name: 'My Plugin',
    version: '1.0.0',
    description: 'Example plugin',
    author: { name: 'Developer' },
    type: 'feature',
    license: 'MIT'
  };

  private timer: NodeJS.Timeout | null = null;

  async initialize(context: PluginContext): Promise<void> {
    this.context = context;
    const config = this.getConfig<MyPluginConfig>();

    // Register routes
    const router = Router();
    router.get('/status', (req, res) => {
      res.json({ status: 'ok' });
    });
    context.api.registerRoute('', router);

    // Register events
    context.events.on('domain:created', this.onDomainCreated.bind(this));

    // Register hooks
    context.api.registerHook('before:nginx:reload', this.beforeNginxReload.bind(this));

    // Start background task
    this.timer = setInterval(() => this.checkTask(), config.checkInterval * 1000);

    await context.storage.set('initialized', true);
    this.log('info', 'Plugin initialized');
  }

  async destroy(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    if (this.context) {
      this.context.events.off('domain:created', this.onDomainCreated.bind(this));
    }

    await super.destroy();
  }

  private async onDomainCreated(data: any): Promise<void> {
    this.log('info', 'Domain created:', data.name);
    await this.context?.storage.set(`domain:${data.id}`, data);
  }

  private async beforeNginxReload(): Promise<void> {
    this.log('info', 'Nginx about to reload');
  }

  private async checkTask(): Promise<void> {
    const domains = await this.context?.db.domain.count();
    this.log('debug', `Total domains: ${domains}`);
  }
}
```
