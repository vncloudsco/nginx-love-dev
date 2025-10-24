# Cloudflare Manager Plugin - Quick Setup

Plugin demo hoàn chỉnh để quản lý Cloudflare DNS và Firewall từ Nginx WAF Platform.

## ✅ Plugin đã hoàn thành

### Backend (API)
- ✅ Cloudflare API Client với full features
- ✅ DNS Records CRUD (Create, Read, Update, Delete)
- ✅ Firewall Rules CRUD
- ✅ Quick Block/Whitelist IP
- ✅ Multi-zone support
- ✅ Auto-sync mechanism
- ✅ Statistics tracking
- ✅ Health monitoring

### Frontend (UI)
- ✅ Vue.js application với TailwindCSS
- ✅ Zone management page
- ✅ DNS records table với search & filters
- ✅ Firewall rules table
- ✅ Modal forms cho Add/Edit
- ✅ Quick Block IP dialog
- ✅ Real-time stats dashboard

### Documentation
- ✅ README.md đầy đủ
- ✅ API documentation
- ✅ Configuration guide
- ✅ Use cases & examples

---

## 📁 File Structure

```
apps/api/src/plugins/cloudflare-manager/
├── plugin.config.json               # Plugin metadata & config schema
├── package.json                     # NPM dependencies
├── index.ts                         # Main plugin code (TypeScript)
├── index.js                         # Compiled (will be generated)
├── services/
│   ├── cloudflare-client.ts         # Cloudflare API wrapper
│   └── cloudflare-client.js         # Compiled (will be generated)
├── ui/
│   ├── index.html                   # Vue.js UI (standalone)
│   └── app.js                       # Vue application logic
└── README.md                        # Full documentation
```

**Total: 8 files created**

---

## 🚀 Quick Setup (5 phút)

### Bước 1: Get Cloudflare Credentials

#### 1.1. API Token
1. Vào https://dash.cloudflare.com/profile/api-tokens
2. Click "Create Token"
3. Chọn template "Edit zone DNS" hoặc custom với permissions:
   - `Zone:DNS:Edit`
   - `Zone:Firewall Services:Edit`
4. Copy token

#### 1.2. Account ID
1. Vào https://dash.cloudflare.com/
2. Chọn bất kỳ zone nào
3. Scroll sidebar bên phải → Copy **Account ID**

#### 1.3. Zone ID (Optional)
1. Trong zone dashboard
2. Scroll sidebar → Copy **Zone ID**

### Bước 2: Compile Plugin

```bash
cd apps/api/src/plugins/cloudflare-manager

# Compile main plugin
npx tsc index.ts --outDir . --module commonjs --target es2020 --esModuleInterop true

# Compile Cloudflare client
npx tsc services/cloudflare-client.ts --outDir services --module commonjs --target es2020 --esModuleInterop true
```

Hoặc dùng npm script:
```bash
npm run build
```

### Bước 3: Install Plugin via API

```bash
curl -X POST http://localhost:3001/api/plugins/install \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "source": "file",
    "filePath": "E:/GitHub/nginx-love-dev/apps/api/src/plugins/cloudflare-manager"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Plugin installed successfully"
}
```

### Bước 4: Configure Plugin

```bash
curl -X PUT http://localhost:3001/api/plugins/cloudflare-manager/config \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "apiToken": "YOUR_CLOUDFLARE_API_TOKEN",
    "accountId": "YOUR_CLOUDFLARE_ACCOUNT_ID",
    "zoneId": "YOUR_ZONE_ID",
    "syncInterval": 30,
    "enableAutoSync": true,
    "logLevel": "info"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Plugin configuration updated"
}
```

### Bước 5: Activate Plugin

```bash
curl -X POST http://localhost:3001/api/plugins/cloudflare-manager/activate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "message": "Plugin activated successfully"
}
```

### Bước 6: Test Plugin

```bash
# Check health
curl http://localhost:3001/api/plugins/cloudflare-manager/health \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Get zones
curl http://localhost:3001/api/plugins/cloudflare-manager/zones \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Get stats
curl http://localhost:3001/api/plugins/cloudflare-manager/stats \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 🎨 UI Features

### 1. Zones Tab
- **List all Cloudflare zones**
- Grid view với status badges
- Click to select zone for DNS management

### 2. DNS Records Tab
- **Full CRUD operations**
- Table view với columns:
  - Type (A, AAAA, CNAME, MX, TXT, NS)
  - Name (hostname)
  - Content (IP/target)
  - TTL (Auto or custom)
  - Proxy status (Orange/Gray cloud)
  - Actions (Edit/Delete)
- Add Record button → Modal form
- Edit Record → Pre-filled modal
- Delete với confirmation

### 3. Firewall Rules Tab
- **IP Access Rules management**
- Table view với columns:
  - Mode (Block, Whitelist, Challenge)
  - Target (IP, IP Range, Country, ASN)
  - Value (actual value)
  - Notes (optional description)
  - Actions (Edit/Delete)
- Quick Block IP button → Fast blocking
- Add Rule → Full form với options
- Color-coded modes:
  - 🔴 Block = Red
  - 🟢 Whitelist = Green
  - 🟡 Challenge = Yellow

### 4. Stats Dashboard
- **Real-time metrics**:
  - DNS Records Created (Blue)
  - Firewall Rules Created (Orange)
  - IPs Blocked (Red)
  - IPs Whitelisted (Green)
- Sync button để refresh data

---

## 📡 API Endpoints Reference

### Zones
```
GET    /api/plugins/cloudflare-manager/zones
GET    /api/plugins/cloudflare-manager/zones/:zoneId
```

### DNS Records
```
GET    /api/plugins/cloudflare-manager/zones/:zoneId/dns
GET    /api/plugins/cloudflare-manager/zones/:zoneId/dns/:recordId
POST   /api/plugins/cloudflare-manager/zones/:zoneId/dns
PUT    /api/plugins/cloudflare-manager/zones/:zoneId/dns/:recordId
DELETE /api/plugins/cloudflare-manager/zones/:zoneId/dns/:recordId
```

### Firewall Rules
```
GET    /api/plugins/cloudflare-manager/firewall/rules?zoneId=xxx
GET    /api/plugins/cloudflare-manager/firewall/rules/:ruleId?zoneId=xxx
POST   /api/plugins/cloudflare-manager/firewall/rules?zoneId=xxx
PUT    /api/plugins/cloudflare-manager/firewall/rules/:ruleId?zoneId=xxx
DELETE /api/plugins/cloudflare-manager/firewall/rules/:ruleId?zoneId=xxx
```

### Quick Actions
```
POST   /api/plugins/cloudflare-manager/firewall/block-ip
POST   /api/plugins/cloudflare-manager/firewall/whitelist-ip
```

### Utils
```
GET    /api/plugins/cloudflare-manager/stats
POST   /api/plugins/cloudflare-manager/sync
```

---

## 🎯 Use Cases

### Use Case 1: Quick Block Malicious IP

```bash
curl -X POST http://localhost:3001/api/plugins/cloudflare-manager/firewall/block-ip \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "ip": "192.168.1.100",
    "notes": "DDoS attack detected"
  }'
```

### Use Case 2: Add DNS Record

```bash
curl -X POST http://localhost:3001/api/plugins/cloudflare-manager/zones/ZONE_ID/dns \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "type": "A",
    "name": "api",
    "content": "192.168.1.50",
    "ttl": 3600,
    "proxied": true
  }'
```

### Use Case 3: Whitelist Trusted IP

```bash
curl -X POST http://localhost:3001/api/plugins/cloudflare-manager/firewall/whitelist-ip \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "ip": "203.0.113.10",
    "notes": "Office IP - trusted"
  }'
```

---

## 🔧 Development

### Hot Reload

```bash
# Watch TypeScript files
npx tsc index.ts --outDir . --module commonjs --target es2020 --watch

# In another terminal, deactivate và activate plugin
curl -X POST http://localhost:3001/api/plugins/cloudflare-manager/deactivate
curl -X POST http://localhost:3001/api/plugins/cloudflare-manager/activate
```

### View Logs

```bash
tail -f apps/api/logs/app.log | grep "\[Plugin:cloudflare-manager\]"
```

---

## 🐛 Troubleshooting

### Plugin fails to activate

**Error**: "Failed to connect to Cloudflare API"

**Check**:
1. API Token có đúng không?
2. Token có permissions Zone:DNS:Edit và Zone:Firewall:Edit?
3. Account ID có đúng không?

**Test manually**:
```bash
curl https://api.cloudflare.com/client/v4/user/tokens/verify \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### DNS record creation fails

**Common issues**:
- DNS name already exists → Update instead
- Invalid IP format → Use valid IPv4/IPv6
- TTL out of range → Use 60-86400

### UI not loading

**Check**:
1. Plugin đã activate chưa?
2. File `ui/index.html` tồn tại?
3. Browser console có errors?

**Fix**: 
- Clear browser cache
- Check plugin status: `GET /api/plugins/cloudflare-manager`

---

## 📊 Statistics

Plugin tracks metrics trong storage:

```javascript
{
  "dns_records_created": 42,
  "firewall_rules_created": 18,
  "ips_blocked": 12,
  "ips_whitelisted": 6,
  "last_sync": "2024-10-24T10:30:00Z",
  "initialized_at": "2024-10-24T08:00:00Z"
}
```

---

## 🔐 Security

### Best Practices

✅ **DO:**
- Store API token trong plugin config (encrypted)
- Restrict token permissions
- Enable auto-sync để phát hiện changes
- Log all firewall changes
- Use notes field để track reasons

❌ **DON'T:**
- Hardcode API token
- Use Global API Key
- Share tokens publicly
- Skip validation

---

## 🎉 Demo Workflow

### Scenario: Block attacker IP và update DNS

```bash
# 1. Phát hiện IP tấn công từ logs
ATTACKER_IP="198.51.100.50"

# 2. Quick block IP
curl -X POST http://localhost:3001/api/plugins/cloudflare-manager/firewall/block-ip \
  -H "Content-Type: application/json" \
  -d "{\"ip\":\"$ATTACKER_IP\",\"notes\":\"SQL injection attempt\"}"

# 3. Update DNS để redirect traffic
curl -X POST http://localhost:3001/api/plugins/cloudflare-manager/zones/$ZONE_ID/dns \
  -H "Content-Type: application/json" \
  -d '{
    "type": "A",
    "name": "backup",
    "content": "192.0.2.10",
    "ttl": 300,
    "proxied": true
  }'

# 4. Check stats
curl http://localhost:3001/api/plugins/cloudflare-manager/stats
```

---

## 📝 Summary

### Features Implemented

✅ **Backend (TypeScript)**
- Complete Cloudflare API client
- DNS CRUD operations
- Firewall CRUD operations
- Multi-zone support
- Auto-sync với configurable interval
- Health checks
- Statistics tracking
- Error handling & logging

✅ **Frontend (Vue.js)**
- Responsive UI với TailwindCSS
- Zones management
- DNS records table
- Firewall rules table
- Modal forms
- Real-time stats
- Loading states
- Error notifications

✅ **Documentation**
- Full README
- API reference
- Setup guide
- Use cases
- Troubleshooting

### Files Created: **8 files**

```
✅ plugin.config.json       - Metadata & schema
✅ package.json             - Dependencies
✅ index.ts                 - Main plugin logic
✅ services/cloudflare-client.ts - API client
✅ ui/index.html            - Vue UI
✅ ui/app.js                - Vue logic
✅ README.md                - Documentation
✅ CLOUDFLARE_PLUGIN_SETUP.md - This guide
```

---

## 🚀 Ready to Use!

Plugin đã sẵn sàng để:
1. ✅ Install vào hệ thống
2. ✅ Configure với Cloudflare credentials
3. ✅ Activate và sử dụng
4. ✅ Quản lý DNS records
5. ✅ Quản lý Firewall rules
6. ✅ Block/Whitelist IPs
7. ✅ Track statistics

**Chỉ cần compile và install là có thể dùng ngay!** 🎊
