# Cloudflare Manager Plugin

Plugin quản lý Cloudflare DNS records và Firewall IP rules trực tiếp từ Nginx WAF Management Platform.

## 🌟 Features

### DNS Management
- ✅ List tất cả DNS records theo zone
- ✅ Tạo DNS record mới (A, AAAA, CNAME, MX, TXT, NS)
- ✅ Sửa DNS record
- ✅ Xóa DNS record
- ✅ Hỗ trợ Cloudflare Proxy (Orange Cloud)
- ✅ Custom TTL

### Firewall Management
- ✅ List tất cả IP access rules
- ✅ Block IP address
- ✅ Whitelist IP address
- ✅ Challenge / JS Challenge
- ✅ Hỗ trợ IP, IP Range, Country, ASN
- ✅ Quick Block IP với một click

### Additional Features
- ✅ Multi-zone support
- ✅ Auto-sync với Cloudflare API
- ✅ Statistics tracking
- ✅ Health monitoring
- ✅ Custom UI (Vue.js)

---

## 📋 Requirements

- Cloudflare account
- Cloudflare API Token với quyền:
  - `Zone.DNS` - Edit
  - `Zone.Firewall Services` - Edit
- Cloudflare Account ID
- Cloudflare Zone ID (optional)

---

## 🚀 Installation

### 1. Get Cloudflare Credentials

#### API Token
1. Đăng nhập vào [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Vào **My Profile** → **API Tokens**
3. Click **Create Token**
4. Chọn template **Edit zone DNS** hoặc tạo custom token với permissions:
   - `Zone:DNS:Edit`
   - `Zone:Firewall Services:Edit`
5. Copy API Token

#### Account ID
1. Vào Cloudflare Dashboard
2. Chọn bất kỳ zone nào
3. Scroll xuống sidebar bên phải
4. Copy **Account ID**

#### Zone ID (Optional)
1. Vào domain bạn muốn quản lý
2. Scroll xuống sidebar bên phải
3. Copy **Zone ID**

### 2. Compile Plugin

```bash
cd apps/api/src/plugins/cloudflare-manager
npx tsc index.ts --outDir . --module commonjs --target es2020 --esModuleInterop true
npx tsc services/cloudflare-client.ts --outDir services --module commonjs --target es2020
```

### 3. Install via API

```bash
curl -X POST http://localhost:3001/api/plugins/install \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "source": "file",
    "filePath": "E:/GitHub/nginx-love-dev/apps/api/src/plugins/cloudflare-manager"
  }'
```

### 4. Configure Plugin

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

### 5. Activate Plugin

```bash
curl -X POST http://localhost:3001/api/plugins/cloudflare-manager/activate \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🎨 UI Access

Plugin có giao diện riêng được render từ `ui/index.html`.

Truy cập tại: **Plugin Detail Page** trong plugin management UI.

### UI Screenshots

#### Zones Management
- Hiển thị tất cả Cloudflare zones
- Click vào zone để quản lý DNS

#### DNS Records
- Table view tất cả DNS records
- Add/Edit/Delete DNS records
- Hỗ trợ proxy status (Orange/Gray cloud)
- Real-time validation

#### Firewall Rules
- Table view tất cả IP access rules
- Color-coded theo mode (Block=Red, Whitelist=Green)
- Quick Block IP button
- Add/Edit/Delete rules

---

## 📡 API Endpoints

### Zones

```bash
# Get all zones
GET /api/plugins/cloudflare-manager/zones

# Get single zone
GET /api/plugins/cloudflare-manager/zones/:zoneId
```

### DNS Records

```bash
# List DNS records
GET /api/plugins/cloudflare-manager/zones/:zoneId/dns

# Get single DNS record
GET /api/plugins/cloudflare-manager/zones/:zoneId/dns/:recordId

# Create DNS record
POST /api/plugins/cloudflare-manager/zones/:zoneId/dns
{
  "type": "A",
  "name": "subdomain",
  "content": "192.168.1.1",
  "ttl": 3600,
  "proxied": true
}

# Update DNS record
PUT /api/plugins/cloudflare-manager/zones/:zoneId/dns/:recordId
{
  "content": "192.168.1.2",
  "ttl": 7200
}

# Delete DNS record
DELETE /api/plugins/cloudflare-manager/zones/:zoneId/dns/:recordId
```

### Firewall Rules

```bash
# List firewall rules
GET /api/plugins/cloudflare-manager/firewall/rules?zoneId=xxx

# Get single firewall rule
GET /api/plugins/cloudflare-manager/firewall/rules/:ruleId?zoneId=xxx

# Create firewall rule
POST /api/plugins/cloudflare-manager/firewall/rules?zoneId=xxx
{
  "mode": "block",
  "configuration": {
    "target": "ip",
    "value": "192.168.1.100"
  },
  "notes": "Malicious IP"
}

# Update firewall rule
PUT /api/plugins/cloudflare-manager/firewall/rules/:ruleId?zoneId=xxx
{
  "mode": "challenge",
  "notes": "Suspicious activity"
}

# Delete firewall rule
DELETE /api/plugins/cloudflare-manager/firewall/rules/:ruleId?zoneId=xxx

# Quick block IP
POST /api/plugins/cloudflare-manager/firewall/block-ip
{
  "ip": "192.168.1.100",
  "notes": "Blocked by admin",
  "zoneId": "optional-zone-id"
}

# Quick whitelist IP
POST /api/plugins/cloudflare-manager/firewall/whitelist-ip
{
  "ip": "192.168.1.200",
  "notes": "Trusted IP",
  "zoneId": "optional-zone-id"
}
```

### Stats & Sync

```bash
# Get statistics
GET /api/plugins/cloudflare-manager/stats

# Manual sync
POST /api/plugins/cloudflare-manager/sync
```

---

## ⚙️ Configuration

### Config Schema

```json
{
  "apiToken": "string (required)",
  "accountId": "string (required)",
  "zoneId": "string (optional)",
  "syncInterval": "number (default: 30 minutes)",
  "enableAutoSync": "boolean (default: true)",
  "logLevel": "debug|info|warn|error (default: info)"
}
```

### Config via UI

1. Vào Plugin Detail Page
2. Tab "Configuration"
3. Điền form
4. Click "Save Configuration"

---

## 🔍 Use Cases

### 1. Tự động block IPs tấn công

```javascript
// Trong WAF alert handler
async function blockMaliciousIP(ip) {
  await fetch('/api/plugins/cloudflare-manager/firewall/block-ip', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ip: ip,
      notes: `Auto-blocked: DDoS attack detected at ${new Date().toISOString()}`
    })
  });
}
```

### 2. Dynamic DNS updates

```javascript
// Update A record khi server IP thay đổi
async function updateDNS(hostname, newIP) {
  const records = await fetch(`/api/plugins/cloudflare-manager/zones/${ZONE_ID}/dns`);
  const record = records.find(r => r.name === hostname);
  
  if (record) {
    await fetch(`/api/plugins/cloudflare-manager/zones/${ZONE_ID}/dns/${record.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: newIP })
    });
  }
}
```

### 3. Temporary whitelist

```javascript
// Whitelist IP trong 1 giờ
async function temporaryWhitelist(ip, duration = 3600000) {
  const result = await fetch('/api/plugins/cloudflare-manager/firewall/whitelist-ip', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ip: ip,
      notes: `Temporary whitelist - expires in 1 hour`
    })
  });
  
  const ruleId = result.data.id;
  
  // Auto-remove sau duration
  setTimeout(async () => {
    await fetch(`/api/plugins/cloudflare-manager/firewall/rules/${ruleId}`, {
      method: 'DELETE'
    });
  }, duration);
}
```

---

## 🐛 Troubleshooting

### Plugin fails to activate

**Error**: "Failed to connect to Cloudflare API"

**Solution**:
- Kiểm tra API Token có đúng không
- Verify permissions của token (Zone:DNS:Edit, Zone:Firewall:Edit)
- Test token tại: `https://api.cloudflare.com/client/v4/user/tokens/verify`

### DNS record creation fails

**Error**: "Failed to create DNS record"

**Possible causes**:
- DNS record name đã tồn tại
- Invalid IP address format
- TTL value không hợp lệ (min: 60, max: 86400)
- Zone không active

### Firewall rule not working

**Check**:
- Rule mode có đúng không (block/whitelist/challenge)
- IP format phải chính xác (IPv4: `192.168.1.1`, IPv6: `2001:db8::1`)
- IP range format: `192.168.1.0/24`

---

## 📊 Statistics

Plugin tracks các metrics sau:

- **DNS Records Created**: Tổng số DNS records đã tạo
- **Firewall Rules Created**: Tổng số firewall rules
- **IPs Blocked**: Số IPs đã block
- **IPs Whitelisted**: Số IPs đã whitelist
- **Last Sync**: Lần sync cuối cùng

Xem stats:
```bash
curl /api/plugins/cloudflare-manager/stats
```

---

## 🔒 Security

### Best Practices

1. **Never commit API Token**
   - Store trong plugin config (encrypted in database)
   - Không hardcode trong code

2. **Restrict API Token scope**
   - Chỉ cấp permissions cần thiết
   - Không dùng Global API Key

3. **Rate limiting**
   - Cloudflare API có rate limit: 1200 requests/5 minutes
   - Plugin tự động handle rate limiting

4. **Log sensitive operations**
   - Tất cả DNS/Firewall changes được log
   - Audit trail trong plugin logs

---

## 📝 Development

### Project Structure

```
cloudflare-manager/
├── plugin.config.json       # Plugin metadata
├── index.ts                  # Main plugin code
├── index.js                  # Compiled (generated)
├── services/
│   ├── cloudflare-client.ts  # Cloudflare API wrapper
│   └── cloudflare-client.js  # Compiled
├── ui/
│   ├── index.html            # Vue.js UI
│   └── app.js                # Vue app logic
└── README.md                 # This file
```

### Local Development

1. Edit TypeScript files
2. Compile: `npx tsc index.ts --outDir . --module commonjs --target es2020`
3. Deactivate plugin
4. Activate plugin (reload changes)

### Testing

```bash
# Test connection
curl /api/plugins/cloudflare-manager/health

# Test zones API
curl /api/plugins/cloudflare-manager/zones

# Test DNS creation
curl -X POST /api/plugins/cloudflare-manager/zones/ZONE_ID/dns \
  -H "Content-Type: application/json" \
  -d '{"type":"A","name":"test","content":"127.0.0.1","ttl":3600,"proxied":false}'
```

---

## 📄 License

MIT

---

## 🤝 Support

Need help?
- 📖 Read the documentation
- 🐛 Report issues on GitHub
- 💬 Join our Discord community
- 📧 Email: dev@nginxlove.com

---

**Enjoy managing your Cloudflare infrastructure! ☁️🔥**
