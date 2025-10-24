# Quick Install Guide - Cloudflare Manager Plugin

⚡ **3 phút để cài đặt plugin!**

---

## 📋 Prerequisites

- Cloudflare account với API Token
- Nginx Love WAF backend đã chạy
- Node.js 18+ và npm

---

## 🚀 Quick Install (3 steps)

### Step 1: Build Plugin

```bash
cd apps/api/src/plugins/cloudflare-manager
npm install
npm run build
```

**Verify:**
```bash
$ ls -la index.js
-rw-r--r-- 1 user user 25680 Oct 24 11:30 index.js
```

✅ **Plugin built successfully!**

---

### Step 2: Install to System

**Option A: Via API (Recommended)**

```bash
curl -X POST http://localhost:3001/api/plugins/install \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "source": "file",
    "filePath": "E:/GitHub/nginx-love-dev/apps/api/src/plugins/cloudflare-manager"
  }'
```

**Option B: Via Web UI**

1. Login to admin panel: `http://localhost:8080`
2. Sidebar → **Plugins**
3. Click **"Install Plugin"**
4. Select **"From Local Path"**
5. Path: `E:/GitHub/nginx-love-dev/apps/api/src/plugins/cloudflare-manager`
6. Click **"Install"**

---

### Step 3: Configure & Activate

**Get Cloudflare credentials:**

1. **API Token**: https://dash.cloudflare.com/profile/api-tokens
   - Create token with `Zone:DNS:Edit` + `Zone:Firewall:Edit`
2. **Account ID**: Cloudflare dashboard → Any zone → Right sidebar
3. **Zone ID** (optional): Your domain zone → Right sidebar

**Configure via API:**

```bash
curl -X PUT http://localhost:3001/api/plugins/cloudflare-manager/config \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "apiToken": "YOUR_CLOUDFLARE_API_TOKEN",
    "accountId": "YOUR_ACCOUNT_ID",
    "zoneId": "YOUR_ZONE_ID",
    "syncInterval": 30,
    "enableAutoSync": true,
    "logLevel": "info"
  }'
```

**Activate:**

```bash
curl -X POST http://localhost:3001/api/plugins/cloudflare-manager/activate \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## ✅ Verify Installation

### Test API:

```bash
# Health check
curl http://localhost:3001/api/plugins/cloudflare-manager/health

# Get zones
curl http://localhost:3001/api/plugins/cloudflare-manager/zones \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get stats
curl http://localhost:3001/api/plugins/cloudflare-manager/stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test UI:

1. Navigate to: `http://localhost:8080/plugins`
2. Find **"Cloudflare Manager"** card
3. Click **"View Details"**
4. Tab **"UI"** → Access Cloudflare Manager interface

---

## 🎯 Quick Test

### Block an IP:

```bash
curl -X POST http://localhost:3001/api/plugins/cloudflare-manager/firewall/block-ip \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "ip": "192.0.2.100",
    "notes": "Test block"
  }'
```

### Add DNS Record:

```bash
curl -X POST http://localhost:3001/api/plugins/cloudflare-manager/zones/YOUR_ZONE_ID/dns \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "type": "A",
    "name": "test",
    "content": "127.0.0.1",
    "ttl": 3600,
    "proxied": false
  }'
```

---

## 🐛 Troubleshooting

### Build failed?

```bash
# Clean and rebuild
rm -f index.js services/*.js
npm install
npm run build
```

### Install failed: "index.js not found"?

```bash
# Verify build output
ls -la index.js

# If missing, build again
npm run build
```

### Plugin won't activate?

```bash
# Check logs
tail -f ../../../../../../logs/app.log | grep cloudflare

# Test connection
curl http://localhost:3001/api/plugins/cloudflare-manager/health
```

### Configuration not saving?

- Check API token có permissions đúng không
- Verify account ID và zone ID
- Test connection: Click "Test Connection" button trong UI

---

## 📚 Next Steps

- [Full Documentation](./README.md)
- [API Reference](./README.md#api-endpoints)
- [UI Guide](../../../../doc/PLUGIN_UI_GUIDE.md)
- [Build Guide](../../../../doc/PLUGIN_BUILD_GUIDE.md)

---

## 🆘 Need Help?

- 📖 Read [README.md](./README.md)
- 🐛 Report issues on GitHub
- 💬 Join Discord community
- 📧 Email: dev@nginxlove.com

---

**Enjoy managing Cloudflare! ☁️🔥**
