# Plugin Development Best Practices

## Security

### 1. Never Hardcode Secrets

❌ **BAD:**
```typescript
const API_KEY = 'secret-key-12345';
const DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
```

✅ **GOOD:**
```typescript
const config = this.getConfig();
const apiKey = config.apiKey;

// Or use environment variables for system-level config
const databaseUrl = process.env.DATABASE_URL;
```

### 2. Validate All Input

❌ **BAD:**
```typescript
router.post('/data', async (req, res) => {
  const data = req.body;
  await context.storage.set('data', data);
  res.json({ success: true });
});
```

✅ **GOOD:**
```typescript
router.post('/data', async (req, res) => {
  const { key, value } = req.body;
  
  // Validate input
  if (!key || typeof key !== 'string') {
    return res.status(400).json({ error: 'Invalid key' });
  }
  
  if (!value) {
    return res.status(400).json({ error: 'Invalid value' });
  }
  
  // Sanitize key
  const sanitizedKey = key.replace(/[^a-zA-Z0-9_-]/g, '');
  
  await context.storage.set(sanitizedKey, value);
  res.json({ success: true });
});
```

### 3. Use Parameterized Queries

❌ **BAD:**
```typescript
// SQL injection risk
const userId = req.params.id;
const query = `SELECT * FROM users WHERE id = '${userId}'`;
```

✅ **GOOD:**
```typescript
// Use Prisma (already safe)
const user = await context.db.user.findUnique({
  where: { id: userId }
});
```

### 4. Limit API Rate

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

router.post('/action', limiter, async (req, res) => {
  // Handle request
});
```

### 5. Sanitize Output

```typescript
// Don't expose sensitive data
router.get('/users', async (req, res) => {
  const users = await context.db.user.findMany({
    select: {
      id: true,
      username: true,
      email: true,
      role: true
      // Don't include: password, refreshTokens, etc.
    }
  });
  
  res.json({ success: true, data: users });
});
```

---

## Error Handling

### 1. Always Use Try-Catch

❌ **BAD:**
```typescript
async initialize(context: PluginContext): Promise<void> {
  const data = await this.fetchData();
  await context.storage.set('data', data);
}
```

✅ **GOOD:**
```typescript
async initialize(context: PluginContext): Promise<void> {
  try {
    const data = await this.fetchData();
    await context.storage.set('data', data);
    this.log('info', 'Data fetched and stored');
  } catch (error: any) {
    this.log('error', 'Failed to initialize:', error);
    throw error; // Re-throw to let plugin manager handle it
  }
}
```

### 2. Handle Async Errors Properly

❌ **BAD:**
```typescript
// Unhandled promise rejection
setInterval(() => {
  this.checkStatus(); // async function, no await or catch
}, 60000);
```

✅ **GOOD:**
```typescript
setInterval(async () => {
  try {
    await this.checkStatus();
  } catch (error: any) {
    this.log('error', 'Status check failed:', error);
  }
}, 60000);
```

### 3. Provide Meaningful Error Messages

❌ **BAD:**
```typescript
throw new Error('Failed');
```

✅ **GOOD:**
```typescript
throw new Error(`Failed to fetch data from API: ${error.message}`);
```

### 4. Log Errors Appropriately

```typescript
try {
  await this.criticalOperation();
} catch (error: any) {
  // Log with context
  this.log('error', 'Critical operation failed', {
    operation: 'criticalOperation',
    error: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  });
  
  // Store error for debugging
  await this.context?.storage.set('last_error', {
    message: error.message,
    timestamp: new Date().toISOString()
  });
}
```

---

## Resource Management

### 1. Clean Up Resources

❌ **BAD:**
```typescript
async initialize(context: PluginContext): Promise<void> {
  setInterval(() => this.doWork(), 60000);
}

async destroy(): Promise<void> {
  // Timer keeps running!
}
```

✅ **GOOD:**
```typescript
private timer: NodeJS.Timeout | null = null;

async initialize(context: PluginContext): Promise<void> {
  this.timer = setInterval(() => this.doWork(), 60000);
}

async destroy(): Promise<void> {
  if (this.timer) {
    clearInterval(this.timer);
    this.timer = null;
  }
  await super.destroy();
}
```

### 2. Remove Event Listeners

❌ **BAD:**
```typescript
async initialize(context: PluginContext): Promise<void> {
  context.events.on('domain:created', this.handleEvent.bind(this));
}

async destroy(): Promise<void> {
  // Listeners still active!
}
```

✅ **GOOD:**
```typescript
private handlers: Map<string, Function> = new Map();

async initialize(context: PluginContext): Promise<void> {
  const handler = this.handleEvent.bind(this);
  this.handlers.set('domain:created', handler);
  context.events.on('domain:created', handler);
}

async destroy(): Promise<void> {
  for (const [event, handler] of this.handlers) {
    this.context?.events.off(event, handler);
  }
  this.handlers.clear();
  await super.destroy();
}
```

### 3. Close External Connections

```typescript
private httpClient: any = null;

async initialize(context: PluginContext): Promise<void> {
  const axios = require('axios');
  this.httpClient = axios.create({
    baseURL: 'https://api.example.com',
    timeout: 30000
  });
}

async destroy(): Promise<void> {
  if (this.httpClient) {
    // Clean up any pending requests
    this.httpClient = null;
  }
  await super.destroy();
}
```

---

## Performance

### 1. Use Caching

```typescript
private cache: Map<string, { data: any; expires: number }> = new Map();

async getData(key: string): Promise<any> {
  // Check cache
  const cached = this.cache.get(key);
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }
  
  // Fetch data
  const data = await this.fetchData(key);
  
  // Cache for 5 minutes
  this.cache.set(key, {
    data,
    expires: Date.now() + 5 * 60 * 1000
  });
  
  return data;
}
```

### 2. Batch Database Queries

❌ **BAD:**
```typescript
for (const domain of domains) {
  const upstreams = await context.db.upstream.findMany({
    where: { domainId: domain.id }
  });
}
```

✅ **GOOD:**
```typescript
const domains = await context.db.domain.findMany({
  include: { upstreams: true }
});
```

### 3. Limit Query Results

```typescript
// Always use pagination
const domains = await context.db.domain.findMany({
  take: 100,
  skip: page * 100,
  orderBy: { createdAt: 'desc' }
});
```

### 4. Debounce Frequent Operations

```typescript
import { debounce } from 'lodash';

class MyPlugin extends BasePlugin {
  private debouncedCheck = debounce(
    () => this.checkStatus(),
    5000, // Wait 5 seconds
    { leading: false, trailing: true }
  );

  async initialize(context: PluginContext): Promise<void> {
    // This will only run once even if called multiple times
    context.events.on('domain:updated', () => {
      this.debouncedCheck();
    });
  }
}
```

---

## Code Quality

### 1. Use TypeScript Types

❌ **BAD:**
```typescript
const config = this.getConfig();
const value = config.someValue; // No type checking
```

✅ **GOOD:**
```typescript
interface MyPluginConfig {
  apiKey: string;
  interval: number;
  enabled: boolean;
  options?: {
    retry: boolean;
    timeout: number;
  };
}

const config = this.getConfig<MyPluginConfig>();
const value = config.apiKey; // Type-safe
```

### 2. Document Your Code

```typescript
/**
 * Fetch data from external API
 * @param endpoint - API endpoint to call
 * @param options - Request options
 * @returns Fetched data
 * @throws Error if API call fails
 */
private async fetchData(
  endpoint: string,
  options?: RequestOptions
): Promise<ApiResponse> {
  // Implementation
}
```

### 3. Keep Functions Small

❌ **BAD:**
```typescript
async initialize(context: PluginContext): Promise<void> {
  // 200 lines of code...
}
```

✅ **GOOD:**
```typescript
async initialize(context: PluginContext): Promise<void> {
  this.context = context;
  await this.setupRoutes();
  await this.registerEvents();
  await this.initializeStorage();
  this.log('info', 'Plugin initialized');
}

private async setupRoutes(): Promise<void> {
  // Route setup logic
}

private async registerEvents(): Promise<void> {
  // Event registration logic
}

private async initializeStorage(): Promise<void> {
  // Storage initialization logic
}
```

### 4. Use Constants

```typescript
// Define constants at class level
private readonly CHECK_INTERVAL = 60 * 1000; // 1 minute
private readonly MAX_RETRIES = 3;
private readonly TIMEOUT = 30000; // 30 seconds
private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async initialize(context: PluginContext): Promise<void> {
  setInterval(() => this.check(), this.CHECK_INTERVAL);
}
```

---

## Configuration

### 1. Provide Defaults

```typescript
interface PluginConfig {
  apiKey: string;
  interval?: number;
  retryCount?: number;
  timeout?: number;
}

private getConfigWithDefaults(): Required<PluginConfig> {
  const config = this.getConfig<PluginConfig>();
  
  return {
    apiKey: config.apiKey,
    interval: config.interval ?? 60,
    retryCount: config.retryCount ?? 3,
    timeout: config.timeout ?? 30000
  };
}
```

### 2. Validate Configuration

```typescript
async onConfigChange(
  context: PluginContext,
  oldConfig: any,
  newConfig: any
): Promise<void> {
  // Validate new config
  if (!newConfig.apiKey) {
    throw new Error('apiKey is required');
  }
  
  if (newConfig.interval < 10) {
    throw new Error('interval must be at least 10 seconds');
  }
  
  // Apply new config
  this.log('info', 'Config updated, reinitializing...');
  await this.destroy();
  await this.initialize(context);
}
```

### 3. Use Config Schema

In `plugin.config.json`:

```json
{
  "configSchema": {
    "type": "object",
    "properties": {
      "apiKey": {
        "type": "string",
        "description": "API key for external service",
        "minLength": 10
      },
      "interval": {
        "type": "number",
        "description": "Check interval in seconds",
        "minimum": 10,
        "default": 60
      },
      "enabled": {
        "type": "boolean",
        "default": true
      }
    },
    "required": ["apiKey"]
  }
}
```

---

## Testing

### 1. Write Unit Tests

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import MyPlugin from './index';

describe('MyPlugin', () => {
  let plugin: MyPlugin;
  let mockContext: any;

  beforeEach(() => {
    plugin = new MyPlugin();
    mockContext = {
      logger: {
        info: vi.fn(),
        error: vi.fn()
      },
      storage: {
        get: vi.fn(),
        set: vi.fn()
      }
    };
  });

  it('should initialize successfully', async () => {
    await expect(plugin.initialize(mockContext)).resolves.not.toThrow();
  });

  it('should handle errors gracefully', async () => {
    mockContext.storage.set.mockRejectedValue(new Error('Storage error'));
    await expect(plugin.initialize(mockContext)).rejects.toThrow();
  });
});
```

### 2. Test Error Cases

```typescript
describe('Error handling', () => {
  it('should handle missing config', async () => {
    mockContext.config = {};
    await expect(plugin.initialize(mockContext)).rejects.toThrow('apiKey is required');
  });

  it('should handle API failures', async () => {
    vi.spyOn(plugin as any, 'fetchData').mockRejectedValue(new Error('API error'));
    const result = await plugin.checkStatus();
    expect(result.healthy).toBe(false);
  });
});
```

### 3. Mock External Dependencies

```typescript
import axios from 'axios';
import { vi } from 'vitest';

vi.mock('axios');

describe('External API calls', () => {
  it('should fetch data from API', async () => {
    (axios.get as any).mockResolvedValue({
      data: { status: 'ok' }
    });

    const data = await plugin.fetchData();
    expect(data.status).toBe('ok');
  });
});
```

---

## Logging Best Practices

### 1. Use Appropriate Log Levels

```typescript
// DEBUG: Detailed debug info
this.log('debug', 'Processing item', { id: 123, data: item });

// INFO: Normal operation
this.log('info', 'Plugin started successfully');

// WARN: Something unexpected but not critical
this.log('warn', 'API rate limit approaching', { remaining: 10 });

// ERROR: Error occurred
this.log('error', 'Failed to process item', { error: error.message });
```

### 2. Include Context

```typescript
// ❌ BAD
this.log('error', 'Failed');

// ✅ GOOD
this.log('error', 'Failed to send notification', {
  recipient: user.email,
  error: error.message,
  retryCount: 3
});
```

### 3. Don't Log Sensitive Data

```typescript
// ❌ BAD
this.log('debug', 'User data', { 
  password: user.password,
  apiKey: config.apiKey 
});

// ✅ GOOD
this.log('debug', 'User data', { 
  userId: user.id,
  username: user.username,
  hasApiKey: !!config.apiKey
});
```

---

## Deployment

### 1. Version Your Plugin

Use semantic versioning:
- `1.0.0` - Initial release
- `1.0.1` - Bug fix
- `1.1.0` - New feature (backward compatible)
- `2.0.0` - Breaking change

### 2. Document Changes

Maintain a CHANGELOG.md:

```markdown
# Changelog

## [1.1.0] - 2024-01-15
### Added
- New API endpoint for bulk operations
- Support for custom webhooks

### Fixed
- Memory leak in event listeners
- Race condition in storage access

## [1.0.0] - 2024-01-01
- Initial release
```

### 3. Test Before Release

```bash
# Build plugin
npm run build

# Run tests
npm test

# Test installation
curl -X POST http://localhost:3001/api/plugins/install \
  -d '{"source": "file", "filePath": "/path/to/plugin"}'

# Test activation
curl -X POST http://localhost:3001/api/plugins/my-plugin/activate

# Test health
curl http://localhost:3001/api/plugins/my-plugin/health
```

---

## Common Pitfalls

### 1. Memory Leaks

❌ **BAD:**
```typescript
// Event listeners not removed
// Timers not cleared
// Large objects kept in memory
```

✅ **GOOD:**
```typescript
// Clean up everything in destroy()
async destroy(): Promise<void> {
  // Clear timers
  if (this.timer) clearInterval(this.timer);
  
  // Remove listeners
  this.removeAllListeners();
  
  // Clear cache
  this.cache.clear();
  
  await super.destroy();
}
```

### 2. Blocking Operations

❌ **BAD:**
```typescript
// Synchronous file operations
const data = fs.readFileSync('/large/file.json');
```

✅ **GOOD:**
```typescript
// Async operations
const data = await fs.promises.readFile('/large/file.json', 'utf-8');
```

### 3. Race Conditions

❌ **BAD:**
```typescript
let counter = await this.context?.storage.get('counter') || 0;
counter++;
await this.context?.storage.set('counter', counter);
```

✅ **GOOD:**
```typescript
// Use atomic operations or locks
const current = await this.context?.storage.get('counter') || 0;
await this.context?.storage.set('counter', current + 1);
```

---

## Summary Checklist

- [ ] No hardcoded secrets
- [ ] All input validated
- [ ] Error handling with try-catch
- [ ] Resources cleaned up in destroy()
- [ ] Event listeners removed
- [ ] TypeScript types used
- [ ] Functions documented
- [ ] Unit tests written
- [ ] Appropriate log levels
- [ ] Config validated
- [ ] Health check implemented
- [ ] Versioning follows semver
- [ ] CHANGELOG maintained
