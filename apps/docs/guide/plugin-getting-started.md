# Getting Started with Plugin Development

## Prerequisites

- Node.js >= 18
- TypeScript knowledge
- Basic understanding of Express.js
- Familiarity with Prisma ORM

## Step 1: Create Plugin Structure

### Create Plugin Directory

```bash
cd apps/api/src/plugins
mkdir my-awesome-plugin
cd my-awesome-plugin
```

### Create plugin.config.json

```json
{
  "metadata": {
    "id": "my-awesome-plugin",
    "name": "My Awesome Plugin",
    "version": "1.0.0",
    "description": "A plugin that does awesome things",
    "author": {
      "name": "Your Name",
      "email": "your.email@example.com",
      "url": "https://yourwebsite.com"
    },
    "type": "feature",
    "category": "monitoring",
    "tags": ["monitoring", "alerts", "automation"],
    "icon": "https://example.com/icon.png",
    "homepage": "https://github.com/yourusername/my-awesome-plugin",
    "repository": "https://github.com/yourusername/my-awesome-plugin",
    "license": "MIT",
    "minSystemVersion": "1.0.0",
    "permissions": [
      {
        "resource": "domains",
        "actions": ["read"]
      }
    ],
    "configSchema": {
      "type": "object",
      "properties": {
        "apiKey": {
          "type": "string",
          "description": "API Key for external service"
        },
        "interval": {
          "type": "number",
          "description": "Check interval in seconds",
          "default": 60
        },
        "enabled": {
          "type": "boolean",
          "default": true
        }
      },
      "required": ["apiKey"]
    }
  },
  "mainFile": "index.js"
}
```

## Step 2: Create Plugin Class

### Create index.ts

```typescript
import { BasePlugin, PluginContext, PluginMetadata } from '../../../shared/plugin-sdk';

export default class MyAwesomePlugin extends BasePlugin {
  public metadata: PluginMetadata = {
    id: 'my-awesome-plugin',
    name: 'My Awesome Plugin',
    version: '1.0.0',
    description: 'A plugin that does awesome things',
    author: {
      name: 'Your Name',
      email: 'your.email@example.com'
    },
    type: 'feature',
    license: 'MIT'
  };

  /**
   * Initialize plugin
   * Called when plugin is activated
   */
  async initialize(context: PluginContext): Promise<void> {
    this.context = context;
    
    this.log('info', 'Initializing My Awesome Plugin...');

    // Get plugin configuration
    const config = this.getConfig();
    this.log('info', 'Plugin config:', config);

    // Register custom routes
    await this.registerRoutes();

    // Setup event listeners
    this.setupEventListeners();

    // Save initialization timestamp
    await context.storage.set('initialized_at', new Date().toISOString());

    this.log('info', 'My Awesome Plugin initialized successfully');
  }

  /**
   * Register custom routes
   */
  private async registerRoutes(): Promise<void> {
    const { Router } = await import('express');
    const router = Router();

    // GET /api/plugins/my-awesome-plugin/status
    router.get('/status', (req, res) => {
      res.json({
        success: true,
        data: {
          status: 'running',
          version: this.metadata.version
        }
      });
    });

    // POST /api/plugins/my-awesome-plugin/action
    router.post('/action', async (req, res) => {
      try {
        const { action } = req.body;
        this.log('info', `Action requested: ${action}`);
        
        // Your logic here
        
        res.json({ success: true, message: 'Action completed' });
      } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    this.context?.api.registerRoute('', router);
    this.log('info', 'Routes registered');
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    if (!this.context) return;

    // Listen to domain creation
    this.context.events.on('domain:created', this.handleDomainCreated.bind(this));

    // Listen to nginx reload
    this.context.events.on('nginx:reloaded', this.handleNginxReloaded.bind(this));
  }

  /**
   * Handle domain created event
   */
  private async handleDomainCreated(data: any): Promise<void> {
    this.log('info', 'Domain created:', data.name);
    
    // Store domain info
    await this.context?.storage.set(`domain:${data.id}`, {
      name: data.name,
      createdAt: new Date().toISOString()
    });
  }

  /**
   * Handle nginx reloaded event
   */
  private async handleNginxReloaded(data: any): Promise<void> {
    this.log('info', 'Nginx reloaded');
    
    // Update last reload time
    await this.context?.storage.set('last_nginx_reload', new Date().toISOString());
  }

  /**
   * Destroy plugin
   * Called when plugin is deactivated
   */
  async destroy(): Promise<void> {
    this.log('info', 'Destroying My Awesome Plugin...');
    
    // Remove event listeners
    if (this.context) {
      this.context.events.off('domain:created', this.handleDomainCreated.bind(this));
      this.context.events.off('nginx:reloaded', this.handleNginxReloaded.bind(this));
    }

    await super.destroy();
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ healthy: boolean; message?: string }> {
    try {
      const initialized = await this.context?.storage.has('initialized_at');
      
      if (!initialized) {
        return { healthy: false, message: 'Plugin not properly initialized' };
      }

      const config = this.getConfig();
      if (!config?.enabled) {
        return { healthy: false, message: 'Plugin is disabled' };
      }

      return { healthy: true, message: 'Plugin is healthy' };
    } catch (error: any) {
      return { healthy: false, message: error.message };
    }
  }

  /**
   * Lifecycle: On Install
   */
  async onInstall(context: PluginContext): Promise<void> {
    this.log('info', 'Plugin installed');
    await context.storage.set('install_date', new Date().toISOString());
  }

  /**
   * Lifecycle: On Uninstall
   */
  async onUninstall(context: PluginContext): Promise<void> {
    this.log('info', 'Plugin uninstalling, cleaning up...');
    await context.storage.clear();
  }

  /**
   * Lifecycle: On Activate
   */
  async onActivate(context: PluginContext): Promise<void> {
    this.log('info', 'Plugin activated');
  }

  /**
   * Lifecycle: On Deactivate
   */
  async onDeactivate(context: PluginContext): Promise<void> {
    this.log('info', 'Plugin deactivated');
  }

  /**
   * Lifecycle: On Config Change
   */
  async onConfigChange(context: PluginContext, oldConfig: any, newConfig: any): Promise<void> {
    this.log('info', 'Plugin config changed');
    this.log('debug', 'Old config:', oldConfig);
    this.log('debug', 'New config:', newConfig);
  }
}
```

## Step 3: Build Plugin

### Compile TypeScript

```bash
# In plugin directory
npx tsc index.ts --outDir . --module commonjs --target es2020 --esModuleInterop true
```

### Verify Build

Your plugin directory should now have:

```
my-awesome-plugin/
├── plugin.config.json
├── index.ts          # Source
├── index.js          # Compiled ✅
```

## Step 4: Install Plugin

### Using API

```bash
curl -X POST http://localhost:3001/api/plugins/install \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "source": "file",
    "filePath": "/absolute/path/to/apps/api/src/plugins/my-awesome-plugin"
  }'
```

### Response

```json
{
  "success": true,
  "data": {
    "id": "my-awesome-plugin",
    "name": "My Awesome Plugin",
    "version": "1.0.0",
    "type": "feature"
  },
  "message": "Plugin installed successfully"
}
```

## Step 5: Activate Plugin

```bash
curl -X POST http://localhost:3001/api/plugins/my-awesome-plugin/activate \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Response

```json
{
  "success": true,
  "message": "Plugin activated successfully"
}
```

## Step 6: Configure Plugin

```bash
curl -X PUT http://localhost:3001/api/plugins/my-awesome-plugin/config \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "apiKey": "your-api-key-here",
    "interval": 120,
    "enabled": true
  }'
```

## Step 7: Test Plugin

### Test Custom Route

```bash
curl http://localhost:3001/api/plugins/my-awesome-plugin/status \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Response

```json
{
  "success": true,
  "data": {
    "status": "running",
    "version": "1.0.0"
  }
}
```

### Test Health Check

```bash
curl http://localhost:3001/api/plugins/my-awesome-plugin/health \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Response

```json
{
  "success": true,
  "data": {
    "healthy": true,
    "message": "Plugin is healthy"
  }
}
```

## Step 8: Monitor Plugin Logs

```bash
# View plugin logs
tail -f apps/api/logs/app.log | grep "\[Plugin:my-awesome-plugin\]"
```

## Common Tasks

### Add Dependencies

Create `package.json` in plugin directory:

```json
{
  "name": "my-awesome-plugin",
  "version": "1.0.0",
  "dependencies": {
    "axios": "^1.6.0",
    "lodash": "^4.17.21"
  }
}
```

Install dependencies:

```bash
npm install
```

Use in plugin:

```typescript
import axios from 'axios';
import _ from 'lodash';

// Use in your plugin code
const response = await axios.get('https://api.example.com');
```

### Add Custom Middleware

```typescript
async initialize(context: PluginContext): Promise<void> {
  // Register global middleware
  context.api.registerMiddleware((req, res, next) => {
    console.log('Request:', req.method, req.path);
    next();
  });
}
```

### Register Hooks

```typescript
async initialize(context: PluginContext): Promise<void> {
  // Register hook
  context.api.registerHook('before:nginx:reload', async () => {
    this.log('info', 'Nginx is about to reload');
    // Prepare for reload
  });
}
```

### Access Database

```typescript
async initialize(context: PluginContext): Promise<void> {
  // Query database
  const domains = await context.db.domain.findMany({
    where: { status: 'active' }
  });
  
  this.log('info', `Found ${domains.length} active domains`);
}
```

## Troubleshooting

### Plugin fails to load

**Error**: `Plugin main file not found`

**Solution**: Make sure you compiled TypeScript to JavaScript:
```bash
npx tsc index.ts --outDir . --module commonjs --target es2020
```

### Plugin fails to initialize

**Error**: `Plugin does not implement IPlugin interface`

**Solution**: Ensure your plugin class extends `BasePlugin` and implements required methods:
```typescript
export default class MyPlugin extends BasePlugin {
  async initialize(context: PluginContext): Promise<void> {
    // Implementation
  }
}
```

### Routes not accessible

**Error**: `404 Not Found`

**Solution**: Check route registration:
```typescript
// Correct
context.api.registerRoute('', router);
// Routes will be at: /api/plugins/my-awesome-plugin/{your-routes}

// Wrong
context.api.registerRoute('/custom', router);
// Routes will be at: /api/plugins/my-awesome-plugin/custom/{your-routes}
```

### Plugin not receiving events

**Solution**: Make sure you bind event handlers correctly:
```typescript
// Correct
context.events.on('event:name', this.handleEvent.bind(this));

// Wrong (loses 'this' context)
context.events.on('event:name', this.handleEvent);
```

### Config not persisting

**Solution**: Use `updatePluginConfig` API method:
```typescript
// Correct
await context.api.updatePluginConfig(this.metadata.id, newSettings);

// Wrong (won't persist)
this.context.config.settings = newSettings;
```

## Next Steps

- [SDK Reference](./plugin-sdk-reference.md) - Explore all available SDK APIs
- [Examples](./plugin-examples.md) - Learn from real-world examples
- [Best Practices](./plugin-best-practices.md) - Write better plugins
- [API Endpoints](./plugin-api-endpoints.md) - Full API documentation
