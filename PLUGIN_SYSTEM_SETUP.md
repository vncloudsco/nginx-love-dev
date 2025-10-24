# Plugin System Setup Guide

Hướng dẫn setup và sử dụng hệ thống Plugin cho Nginx WAF Management Platform.

## ✅ Đã hoàn thành

### Backend Plugin System

- ✅ **Plugin SDK** - Types, interfaces, base classes
  - `apps/api/src/shared/plugin-sdk/types.ts`
  - `apps/api/src/shared/plugin-sdk/base-plugin.ts`
  - `apps/api/src/shared/plugin-sdk/plugin-context.ts`
  - `apps/api/src/shared/plugin-sdk/plugin-validator.ts`
  - `apps/api/src/shared/plugin-sdk/plugin-loader.ts`
  - `apps/api/src/shared/plugin-sdk/plugin-manager.ts`

- ✅ **Database Schema** - Prisma models cho plugins
  - `apps/api/prisma/schema.prisma` (đã thêm Plugin và PluginStorage models)

- ✅ **API Endpoints** - REST API để quản lý plugins
  - `apps/api/src/domains/plugins/`
  - Service, Controller, Routes đã tạo
  - Tích hợp vào `apps/api/src/routes/index.ts`
  - Tích hợp vào `apps/api/src/index.ts` (khởi tạo khi server start)

- ✅ **Example Plugin** - Hello World plugin để demo
  - `apps/api/src/plugins/hello-world/`

### Documentation

- ✅ **Plugin Overview** - `apps/docs/guide/plugin-overview.md`
- ✅ **Getting Started** - `apps/docs/guide/plugin-getting-started.md`
- ✅ **SDK Reference** - `apps/docs/guide/plugin-sdk-reference.md`
- ✅ **Examples** - `apps/docs/guide/plugin-examples.md`
- ✅ **Best Practices** - `apps/docs/guide/plugin-best-practices.md`
- ✅ **API Endpoints** - `apps/docs/guide/plugin-api-endpoints.md`
- ✅ **Index/Hub** - `apps/docs/guide/plugins-index.md`

---

## 🚀 Setup Instructions

### Bước 1: Cài đặt Dependencies

```bash
cd apps/api
pnpm install
```

Dependency `semver` đã được thêm vào `package.json`:
```json
{
  "dependencies": {
    "semver": "^7.6.3"
  },
  "devDependencies": {
    "@types/semver": "^7.5.8"
  }
}
```

### Bước 2: Chạy Prisma Migration

```bash
cd apps/api
pnpm prisma:generate
pnpm prisma migrate dev --name add_plugin_system
```

Hoặc:

```bash
npx prisma generate
npx prisma migrate dev --name add_plugin_system
```

Migration sẽ tạo 2 tables:
- `plugins` - Lưu metadata và config của plugins
- `plugin_storage` - Persistent storage cho plugins

### Bước 3: Khởi động Server

```bash
cd apps/api
pnpm dev
```

Server sẽ tự động:
- Khởi tạo Plugin Manager
- Scan và load các plugin đã enable
- Expose REST API tại `/api/plugins`

### Bước 4: Test với Hello World Plugin

#### 4.1. Compile Plugin

```bash
cd apps/api/src/plugins/hello-world
npx tsc index.ts --outDir . --module commonjs --target es2020 --esModuleInterop true
```

#### 4.2. Install Plugin

```bash
curl -X POST http://localhost:3001/api/plugins/install \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "source": "file",
    "filePath": "E:/GitHub/nginx-love-dev/apps/api/src/plugins/hello-world"
  }'
```

**Note**: Thay `YOUR_TOKEN` bằng JWT token hợp lệ.

#### 4.3. Activate Plugin

```bash
curl -X POST http://localhost:3001/api/plugins/hello-world/activate \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 4.4. Test Plugin APIs

```bash
# Test hello endpoint
curl http://localhost:3001/api/plugins/hello-world/hello \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test stats endpoint
curl http://localhost:3001/api/plugins/hello-world/stats \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test greet endpoint
curl -X POST http://localhost:3001/api/plugins/hello-world/greet \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"name": "John"}'

# Test health check
curl http://localhost:3001/api/plugins/hello-world/health \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📁 File Structure

```
apps/api/
├── src/
│   ├── shared/
│   │   └── plugin-sdk/           # Plugin SDK
│   │       ├── types.ts
│   │       ├── base-plugin.ts
│   │       ├── plugin-context.ts
│   │       ├── plugin-validator.ts
│   │       ├── plugin-loader.ts
│   │       ├── plugin-manager.ts
│   │       └── index.ts
│   ├── domains/
│   │   └── plugins/              # Plugin Management Domain
│   │       ├── services/
│   │       │   └── plugin.service.ts
│   │       ├── controllers/
│   │       │   └── plugin.controller.ts
│   │       ├── routes/
│   │       │   └── plugin.routes.ts
│   │       ├── plugins.routes.ts
│   │       └── index.ts
│   ├── plugins/                  # Installed Plugins Directory
│   │   └── hello-world/          # Example Plugin
│   │       ├── plugin.config.json
│   │       ├── index.ts
│   │       ├── index.js
│   │       └── README.md
│   ├── routes/
│   │   └── index.ts              # Main router (đã tích hợp plugin routes)
│   └── index.ts                  # Server entry (đã tích hợp plugin manager)
├── prisma/
│   └── schema.prisma             # Database schema (đã có Plugin models)
└── package.json                  # Dependencies (đã có semver)

apps/docs/guide/                   # Documentation
├── plugins-index.md              # Hub/Index
├── plugin-overview.md
├── plugin-getting-started.md
├── plugin-sdk-reference.md
├── plugin-examples.md
├── plugin-best-practices.md
└── plugin-api-endpoints.md
```

---

## 🔧 Available Commands

### Plugin Management

```bash
# List all plugins
GET /api/plugins

# Get plugin details
GET /api/plugins/:id

# Install plugin
POST /api/plugins/install

# Uninstall plugin
DELETE /api/plugins/:id

# Activate plugin
POST /api/plugins/:id/activate

# Deactivate plugin
POST /api/plugins/:id/deactivate

# Update config
PUT /api/plugins/:id/config

# Health check
GET /api/plugins/:id/health
GET /api/plugins/health/all
```

### Development

```bash
# Compile TypeScript plugin
npx tsc index.ts --outDir . --module commonjs --target es2020

# Watch plugin logs
tail -f apps/api/logs/app.log | grep "\[Plugin:"

# Generate Prisma client
pnpm prisma:generate

# Run migration
pnpm prisma migrate dev

# Open Prisma Studio
pnpm prisma:studio
```

---

## 📖 Documentation Links

### For Users
- [Plugin Overview](apps/docs/guide/plugin-overview.md) - Hiểu về hệ thống plugin
- [Getting Started](apps/docs/guide/plugin-getting-started.md) - Tạo plugin đầu tiên

### For Developers
- [SDK Reference](apps/docs/guide/plugin-sdk-reference.md) - API documentation
- [Examples](apps/docs/guide/plugin-examples.md) - Plugin examples
- [Best Practices](apps/docs/guide/plugin-best-practices.md) - Coding standards

### For API Integration
- [API Endpoints](apps/docs/guide/plugin-api-endpoints.md) - REST API reference

---

## ⚠️ Known Issues

### 1. Semver Import Error

**Error**: `Cannot find module 'semver'`

**Fix**: 
```bash
cd apps/api
pnpm install
# or
npm install
```

### 2. Plugin Routes Not Working

**Issue**: Plugin routes return 503 or 404

**Fix**: 
- Ensure plugin system is initialized (check server logs)
- Verify plugin is active: `GET /api/plugins/:id`
- Check plugin is properly compiled (index.js exists)

### 3. Plugin Not Loading

**Issue**: Plugin fails to load/activate

**Fix**:
- Check TypeScript compilation errors
- Verify plugin.config.json is valid JSON
- Ensure plugin class extends BasePlugin
- Check server logs for detailed error

---

## 🎯 Next Steps

### Recommended Enhancements

1. **Frontend UI** - Tạo giao diện quản lý plugin
   - List plugins with cards
   - Install/uninstall buttons
   - Config form builder
   - Health status indicators

2. **Plugin Marketplace** - Kho plugin trực tuyến
   - Browse plugins
   - Search and filter
   - Download/install từ marketplace
   - Rating và reviews

3. **Plugin SDK npm package** - Publish SDK ra npm
   ```bash
   npm install @nginx-love/plugin-sdk
   ```

4. **Hot Reload** - Reload plugin không cần restart server

5. **Plugin Dependencies** - Hỗ trợ plugin phụ thuộc vào plugin khác

6. **Sandboxing** - Cô lập plugin trong VM hoặc container

7. **Plugin Templates** - CLI tool tạo plugin từ template
   ```bash
   npx @nginx-love/create-plugin my-plugin
   ```

---

## 🤝 Contributing

### Develop Plugin

1. Tạo plugin trong `apps/api/src/plugins/your-plugin/`
2. Follow documentation và best practices
3. Test thoroughly
4. Submit PR hoặc publish to marketplace

### Report Issues

- GitHub Issues: [Create issue](https://github.com/your-repo/issues)
- Include error logs
- Provide reproduction steps

---

## 📝 Checklist

### Before Deployment

- [ ] Cài đặt semver dependency
- [ ] Chạy Prisma migration
- [ ] Test example plugin
- [ ] Verify all API endpoints
- [ ] Check server logs
- [ ] Update environment variables (nếu cần)

### For Production

- [ ] Compile all plugins to JavaScript
- [ ] Remove development plugins
- [ ] Setup plugin backup/restore
- [ ] Configure plugin permissions
- [ ] Enable plugin monitoring
- [ ] Setup alerting for plugin failures

---

## 📞 Support

Cần trợ giúp?

- 📖 Đọc documentation
- 💬 Join Discord community
- 📧 Email: support@nginxlove.com
- 🐛 Report bugs on GitHub

---

**Happy Plugin Development! 🚀**
