# Plugin System Overview

## Tổng quan

Hệ thống Plugin cho phép mở rộng chức năng của **Nginx WAF Management Platform** mà không cần can thiệp vào mã nguồn gốc. Plugin hoạt động theo chuẩn **Plug and Play**, dễ dàng cài đặt, kích hoạt, vô hiệu hóa và gỡ bỏ.

## Đặc điểm chính

- ✅ **Plug and Play**: Không can thiệp vào mã nguồn gốc
- ✅ **Độc lập**: Mỗi plugin là một module riêng biệt
- ✅ **An toàn**: Sandbox, validation, permission system
- ✅ **Mở rộng**: Dễ dàng thêm chức năng mới
- ✅ **SDK đầy đủ**: TypeScript, type-safe, well-documented
- ✅ **Event-driven**: Hook vào lifecycle events của hệ thống
- ✅ **Storage API**: Persistent storage cho plugin data
- ✅ **Marketplace ready**: Hỗ trợ phân phối và cập nhật tự động

## Các loại Plugin

### 1. Feature Plugin
Thêm chức năng mới vào hệ thống.

**Ví dụ**: 
- Custom monitoring dashboard
- Advanced logging
- Backup automation
- Report generator

### 2. Integration Plugin
Tích hợp với dịch vụ bên thứ ba.

**Ví dụ**:
- Slack/Discord notifications
- PagerDuty alerts
- Datadog/Prometheus metrics
- GitHub/GitLab integration

### 3. UI Plugin
Thêm giao diện/trang mới (frontend).

**Ví dụ**:
- Custom dashboard widgets
- Additional admin pages
- Enhanced visualizations
- Theme customization

### 4. Middleware Plugin
Thêm middleware vào Express pipeline.

**Ví dụ**:
- Custom authentication
- Rate limiting
- Request transformation
- Audit logging

### 5. Hook Plugin
Hook vào lifecycle events của hệ thống.

**Ví dụ**:
- Pre/post domain creation hooks
- Nginx reload hooks
- Configuration change hooks
- User action hooks

## Kiến trúc hệ thống Plugin

### Tổng quan kiến trúc

```
┌─────────────────────────────────────────────────────┐
│         Nginx WAF Management Platform               │
│                                                      │
│  ┌────────────────────────────────────────────────┐ │
│  │          Plugin Manager                        │ │
│  │  ┌──────────────────────────────────────────┐  │ │
│  │  │   Plugin Loader                          │  │ │
│  │  │   - Dynamic loading                      │  │ │
│  │  │   - Module caching                       │  │ │
│  │  │   - Dependency resolution                │  │ │
│  │  └──────────────────────────────────────────┘  │ │
│  │  ┌──────────────────────────────────────────┐  │ │
│  │  │   Plugin Validator                       │  │ │
│  │  │   - Metadata validation                  │  │ │
│  │  │   - Security checks                      │  │ │
│  │  │   - Dependency checks                    │  │ │
│  │  └──────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  ┌────────────────────────────────────────────────┐ │
│  │         Plugin SDK & Context                   │ │
│  │  - PluginContext (app, logger, db)            │ │
│  │  - Storage API (get, set, delete)             │ │
│  │  - Event System (on, emit, off)               │ │
│  │  - Plugin API (routes, middleware, hooks)     │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  ┌────────────────────────────────────────────────┐ │
│  │      Active Plugins (Runtime)                  │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐    │ │
│  │  │Plugin 1  │  │Plugin 2  │  │Plugin N  │    │ │
│  │  │(Feature) │  │(Integr.) │  │(UI)      │    │ │
│  │  └──────────┘  └──────────┘  └──────────┘    │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  ┌────────────────────────────────────────────────┐ │
│  │         Database (Prisma)                      │ │
│  │  - Plugin metadata                             │ │
│  │  - Plugin storage                              │ │
│  │  - Plugin config                               │ │
│  └────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### Cấu trúc thư mục Plugin

```
apps/api/src/plugins/
├── my-awesome-plugin/
│   ├── plugin.config.json    # Plugin metadata & configuration
│   ├── index.ts              # Plugin entry point (main class)
│   ├── index.js              # Compiled JavaScript (for production)
│   ├── routes/               # Custom Express routes (optional)
│   │   └── api.routes.ts
│   ├── services/             # Business logic (optional)
│   │   └── notification.service.ts
│   ├── types/                # TypeScript types (optional)
│   │   └── index.ts
│   ├── utils/                # Utilities (optional)
│   │   └── helpers.ts
│   ├── package.json          # NPM dependencies (optional)
│   └── README.md             # Plugin documentation
```

## Plugin Workflow

### 1. Install Workflow

```
User uploads plugin package
  ↓
Validate plugin structure & metadata
  ↓
Extract to plugins directory
  ↓
Run onInstall() lifecycle hook
  ↓
Store metadata in database
  ↓
Plugin status: INACTIVE
```

### 2. Activate Workflow

```
User activates plugin
  ↓
Load plugin module (dynamic import)
  ↓
Create PluginContext
  ↓
Run onActivate() lifecycle hook
  ↓
Call plugin.initialize(context)
  ↓
Register routes, middleware, hooks
  ↓
Plugin status: ACTIVE
```

### 3. Runtime Workflow

```
Plugin is ACTIVE
  ↓
Listen to system events
  ↓
Handle custom API requests
  ↓
Execute registered hooks
  ↓
Store data via Storage API
  ↓
Emit custom events
```

### 4. Deactivate Workflow

```
User deactivates plugin
  ↓
Run onDeactivate() lifecycle hook
  ↓
Call plugin.destroy()
  ↓
Clean up routes, listeners, timers
  ↓
Unload plugin module
  ↓
Plugin status: INACTIVE
```

### 5. Uninstall Workflow

```
User uninstalls plugin
  ↓
Deactivate plugin (if active)
  ↓
Run onUninstall() lifecycle hook
  ↓
Clean up plugin storage
  ↓
Remove from database
  ↓
Delete plugin files
  ↓
Plugin removed
```

## Security & Permissions

### Permission System

Plugin phải khai báo quyền hạn trong metadata:

```json
{
  "permissions": [
    {
      "resource": "domains",
      "actions": ["read", "write"]
    },
    {
      "resource": "users",
      "actions": ["read"]
    },
    {
      "resource": "nginx",
      "actions": ["read", "reload"]
    }
  ]
}
```

### Sandbox Environment

- Plugin không thể truy cập trực tiếp vào filesystem
- Chỉ được sử dụng API và SDK được cung cấp
- Không được hardcode sensitive data
- Input validation bắt buộc
- Rate limiting cho plugin API calls

### Validation Checks

1. **Metadata validation**: ID, version, author, license
2. **Security checks**: No suspicious files, no vulnerable dependencies
3. **Structure validation**: Required files present
4. **Version compatibility**: Check min/max system version
5. **Dependency validation**: Check npm packages

## Plugin Lifecycle States

```
┌─────────────┐
│ NOT_INSTALLED│
└──────┬──────┘
       │ install
       ↓
┌─────────────┐
│  INSTALLED  │ (status: INACTIVE, enabled: false)
└──────┬──────┘
       │ activate
       ↓
┌─────────────┐
│   ACTIVE    │ (status: ACTIVE, enabled: true)
└──────┬──────┘
       │ deactivate
       ↓
┌─────────────┐
│  INACTIVE   │ (status: INACTIVE, enabled: false)
└──────┬──────┘
       │ uninstall
       ↓
┌─────────────┐
│   REMOVED   │
└─────────────┘

Error states:
┌─────────────┐
│   ERROR     │ (Plugin failed to load/initialize)
└─────────────┘
┌─────────────┐
│ INSTALLING  │ (Temporary state during install)
└─────────────┘
┌─────────────┐
│UNINSTALLING │ (Temporary state during uninstall)
└─────────────┘
```

## Plugin Storage

Mỗi plugin có storage riêng biệt:

- **Persistent**: Dữ liệu lưu trong database (Prisma)
- **Isolated**: Plugin không thể truy cập storage của plugin khác
- **Key-value**: Simple API: get(), set(), delete(), keys()
- **JSON serialization**: Tự động serialize/deserialize
- **Caching**: In-memory cache cho performance

## Event System

### System Events

Plugin có thể listen các events sau:

- `domain:created`, `domain:updated`, `domain:deleted`
- `upstream:created`, `upstream:updated`, `upstream:deleted`
- `nginx:reloaded`, `nginx:config:changed`
- `ssl:renewed`, `ssl:expiring`
- `alert:critical`, `alert:warning`, `alert:info`
- `user:login`, `user:logout`, `user:action`
- `modsec:rule:triggered`, `modsec:attack:detected`

### Custom Events

Plugin có thể emit custom events cho plugin khác:

```typescript
context.events.emit('my-plugin:custom-event', { data: 'value' });
```

## Next Steps

- [Getting Started Guide](./plugin-getting-started.md) - Bắt đầu phát triển plugin đầu tiên
- [SDK Reference](./plugin-sdk-reference.md) - Chi tiết về Plugin SDK API
- [Examples](./plugin-examples.md) - Các ví dụ plugin thực tế
- [Best Practices](./plugin-best-practices.md) - Các nguyên tắc phát triển plugin
