# Plugin Management - UI User Guide

Hướng dẫn sử dụng giao diện quản lý Plugin cho Nginx WAF Platform.

---

## 📍 Truy cập Plugin Management

### Bước 1: Đăng nhập Admin Portal
```
URL: http://localhost:8080
Username: admin
Password: (your password)
```

### Bước 2: Mở Sidebar Menu
- Sidebar nằm bên trái màn hình
- Nếu collapsed, click icon ☰ để mở rộng

### Bước 3: Navigate to Plugins
```
Sidebar → System → 🧩 Plugins
```

Hoặc truy cập trực tiếp:
```
http://localhost:8080/plugins
```

---

## 🎨 Plugin List Page (`/plugins`)

### Layout Overview

```
┌─────────────────────────────────────────────────────────────┐
│  📊 Stats Cards                                             │
│  ┌───────────┬───────────┬───────────┬───────────┐         │
│  │ Total: 5  │ Active: 3 │ Inactive:2│ Updates:1 │         │
│  └───────────┴───────────┴───────────┴───────────┘         │
│                                                              │
│  🔍 Search & Filters                 [+ Install Plugin]     │
│  ┌──────────────────────────────────────────────────┐      │
│  │ Search plugins...                                 │      │
│  └──────────────────────────────────────────────────┘      │
│                                                              │
│  📦 Plugin Cards                                            │
│  ┌────────────────────────────────────────────────┐        │
│  │ 🧩 Cloudflare Manager               v1.0.0     │        │
│  │ Manage Cloudflare DNS & Firewall               │        │
│  │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━     │        │
│  │ Status: 🟢 Active    Type: Integration         │        │
│  │ Author: Nginx Love Team                        │        │
│  │                                                  │        │
│  │ [View Details] [Configure] [⚙️] [Deactivate]  │        │
│  └────────────────────────────────────────────────┘        │
│                                                              │
│  ┌────────────────────────────────────────────────┐        │
│  │ 🧩 Slack Notifications              v1.2.0     │        │
│  │ Send alerts to Slack channels                  │        │
│  │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━     │        │
│  │ Status: ⚫ Inactive   Type: Notification        │        │
│  │ Author: Community                              │        │
│  │                                                  │        │
│  │ [View Details] [Configure] [⚙️] [Activate]    │        │
│  └────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

### Features

#### Stats Cards
- **Total Plugins**: Tổng số plugins đã cài
- **Active**: Plugins đang hoạt động
- **Inactive**: Plugins đã tắt
- **Updates Available**: Plugins có bản cập nhật

#### Search & Filter
- Search by name, description, author
- Filter by:
  - Status (Active/Inactive)
  - Type (Integration/Security/Monitoring/Notification)
  - Category

#### Plugin Cards
Mỗi card hiển thị:
- **Icon & Name**: Plugin identity
- **Version**: Phiên bản hiện tại
- **Description**: Mô tả ngắn
- **Status Badge**: 🟢 Active / ⚫ Inactive
- **Type**: Plugin category
- **Author**: Tác giả/Team
- **Action Buttons**:
  - `View Details` - Xem chi tiết
  - `Configure` - Cấu hình
  - `⚙️` - Settings dropdown
  - `Activate/Deactivate` - Bật/Tắt

#### Install Plugin Button
Click để mở Install Dialog

---

## 📝 Plugin Detail Page (`/plugins/:pluginId`)

### Layout Overview

```
┌─────────────────────────────────────────────────────────────┐
│  ← Back to Plugins                                          │
│                                                              │
│  🧩 Cloudflare Manager                           v1.0.0     │
│  Manage Cloudflare DNS records and Firewall rules          │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━     │
│  Status: 🟢 Active    Health: ✅ Healthy                    │
│  Author: Nginx Love Team <dev@nginxlove.com>               │
│                                                              │
│  ┌─────────────────────────────────────────────┐           │
│  │ [Overview] [Configuration] [UI] [Logs]      │  Tabs     │
│  └─────────────────────────────────────────────┘           │
│                                                              │
│  📊 OVERVIEW TAB                                            │
│  ┌──────────────────────────────────────────────┐          │
│  │  Plugin Information                          │          │
│  │  • ID: cloudflare-manager                    │          │
│  │  • Version: 1.0.0                            │          │
│  │  • License: MIT                              │          │
│  │  • Homepage: github.com/...                  │          │
│  │                                               │          │
│  │  Statistics                                   │          │
│  │  • DNS Records Created: 42                   │          │
│  │  • Firewall Rules: 18                        │          │
│  │  • IPs Blocked: 12                           │          │
│  │  • Last Sync: 2 minutes ago                  │          │
│  │                                               │          │
│  │  Dependencies                                 │          │
│  │  • axios: ^1.7.2                             │          │
│  │  • express: ^4.19.2                          │          │
│  │                                               │          │
│  │  Permissions Required                         │          │
│  │  • External API access (read, write, delete) │          │
│  └──────────────────────────────────────────────┘          │
│                                                              │
│  Action Buttons:                                            │
│  [⏸️ Deactivate] [🔄 Restart] [🗑️ Uninstall] [⚙️ Settings]│
└─────────────────────────────────────────────────────────────┘
```

### Tabs

#### 1. **Overview Tab**
Hiển thị:
- Plugin metadata (ID, version, author, license)
- Real-time statistics
- Dependencies list
- Required permissions
- Installation date
- Last updated

#### 2. **Configuration Tab**
```
┌─────────────────────────────────────────────┐
│  Configuration                              │
│                                              │
│  Cloudflare API Token *                     │
│  ┌────────────────────────────────────────┐ │
│  │ ••••••••••••••••••••••••••••••••••••••│ │
│  └────────────────────────────────────────┘ │
│  Your Cloudflare API token with permissions │
│                                              │
│  Account ID *                                │
│  ┌────────────────────────────────────────┐ │
│  │ abc123def456                           │ │
│  └────────────────────────────────────────┘ │
│                                              │
│  Default Zone ID (Optional)                  │
│  ┌────────────────────────────────────────┐ │
│  │ zone789xyz                             │ │
│  └────────────────────────────────────────┘ │
│                                              │
│  Sync Interval (minutes)                     │
│  ┌────────────────────────────────────────┐ │
│  │ 30                       [slider]      │ │
│  └────────────────────────────────────────┘ │
│                                              │
│  ☑️ Enable Auto Sync                        │
│                                              │
│  Log Level                                   │
│  ┌────────────────────────────────────────┐ │
│  │ info ▼                                 │ │
│  └────────────────────────────────────────┘ │
│                                              │
│  [Test Connection] [Save Configuration]     │
└─────────────────────────────────────────────┘
```

Features:
- Form validation với required fields
- Password masking cho sensitive data
- Test connection button
- Save button với confirmation
- Reset to defaults option

#### 3. **UI Tab** (Plugin Custom UI)
```
┌─────────────────────────────────────────────┐
│  🔗 Plugin Custom Interface                 │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                              │
│  [Embedded iframe hoặc React component]     │
│                                              │
│  (Hiển thị ui/index.html của plugin)        │
│                                              │
│  Example: Cloudflare Manager UI              │
│  • Zones management                          │
│  • DNS records table                         │
│  • Firewall rules management                 │
│  • Quick Block IP                            │
└─────────────────────────────────────────────┘
```

Load plugin UI từ:
- `ui/index.html` (standalone HTML)
- React component (nếu plugin export)
- Iframe (isolated sandbox)

#### 4. **Logs Tab**
```
┌─────────────────────────────────────────────┐
│  Plugin Logs                  [🔄 Refresh]  │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                              │
│  Filters:                                    │
│  [All ▼] [Last Hour ▼] [Search...]          │
│                                              │
│  ┌────────────────────────────────────────┐ │
│  │ [INFO] 2024-10-24 11:00:00             │ │
│  │ Connected to Cloudflare API            │ │
│  │                                         │ │
│  │ [INFO] 2024-10-24 11:05:23             │ │
│  │ DNS record created: api.example.com    │ │
│  │                                         │ │
│  │ [WARN] 2024-10-24 11:10:45             │ │
│  │ Rate limit approaching (900/1200)      │ │
│  │                                         │ │
│  │ [ERROR] 2024-10-24 11:15:12            │ │
│  │ Failed to block IP: Invalid format     │ │
│  └────────────────────────────────────────┘ │
│                                              │
│  [Download Logs] [Clear Logs]               │
└─────────────────────────────────────────────┘
```

Features:
- Real-time log streaming
- Filter by level (DEBUG/INFO/WARN/ERROR)
- Time range filter
- Search functionality
- Download logs
- Clear logs option

---

## ➕ Install Plugin Dialog

### Trigger
Click **"Install Plugin"** button trên Plugin List page.

### Dialog Layout

```
┌───────────────────────────────────────────────┐
│  Install New Plugin                     [✕]   │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                │
│  Installation Method                           │
│  ┌──────────────────────────────────────────┐ │
│  │ ⦿ Upload File (ZIP)                     │ │
│  │ ○ From URL                               │ │
│  │ ○ From Local Path                        │ │
│  │ ○ From Marketplace                       │ │
│  └──────────────────────────────────────────┘ │
│                                                │
│  Upload Plugin Package (ZIP)                   │
│  ┌──────────────────────────────────────────┐ │
│  │  📦 Drag & drop or click to browse      │ │
│  │                                          │ │
│  │  Supported: .zip files only              │ │
│  │  Max size: 50 MB                         │ │
│  └──────────────────────────────────────────┘ │
│                                                │
│  ☑️ Activate plugin after installation        │
│  ☐ Configure plugin now                       │
│                                                │
│  [Cancel]                    [Install Plugin] │
└───────────────────────────────────────────────┘
```

### Installation Methods

#### 1. Upload File (ZIP)
- Drag & drop `.zip` file
- Hoặc click để browse
- Max 50 MB
- Validate package structure

#### 2. From URL
```
Plugin URL:
┌────────────────────────────────────────┐
│ https://github.com/user/plugin/releases│
│ /download/v1.0.0/plugin.zip            │
└────────────────────────────────────────┘
```

#### 3. From Local Path
```
Local Path:
┌────────────────────────────────────────┐
│ E:/GitHub/nginx-love-dev/apps/api/src/ │
│ plugins/cloudflare-manager             │
└────────────────────────────────────────┘
[Browse...]
```

#### 4. From Marketplace (Future)
- Browse plugin marketplace
- One-click install
- Auto-updates

### Installation Flow

```
1. Select method
   ↓
2. Provide plugin source
   ↓
3. Validate plugin
   ├─ Check structure
   ├─ Verify metadata
   ├─ Check dependencies
   └─ Scan permissions
   ↓
4. Confirm installation
   ↓
5. Install plugin
   ├─ Extract files
   ├─ Install dependencies
   ├─ Register plugin
   └─ Initialize storage
   ↓
6. (Optional) Activate
   ↓
7. (Optional) Configure
   ↓
8. Done! ✅
```

---

## ⚙️ Plugin Actions

### Dropdown Menu (⚙️)

Click icon ⚙️ trên plugin card để xem menu:

```
┌─────────────────────────┐
│ View Details            │
│ ──────────────────────  │
│ ✏️ Configure            │
│ 🔄 Restart              │
│ 📊 View Logs            │
│ 📈 View Statistics      │
│ ──────────────────────  │
│ ⬆️ Update Available     │ (nếu có)
│ ──────────────────────  │
│ ⏸️ Deactivate           │ (nếu active)
│ ▶️ Activate             │ (nếu inactive)
│ ──────────────────────  │
│ 🗑️ Uninstall            │
└─────────────────────────┘
```

### Action Confirmations

#### Deactivate
```
┌───────────────────────────────────┐
│  Deactivate Plugin?               │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                    │
│  Are you sure you want to         │
│  deactivate "Cloudflare Manager"? │
│                                    │
│  Plugin will stop processing but  │
│  configuration will be preserved.  │
│                                    │
│  [Cancel]         [Deactivate]    │
└───────────────────────────────────┘
```

#### Uninstall
```
┌───────────────────────────────────┐
│  ⚠️ Uninstall Plugin?             │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                    │
│  Are you sure you want to         │
│  uninstall "Cloudflare Manager"?  │
│                                    │
│  This action will:                 │
│  • Remove all plugin files         │
│  • Delete configuration            │
│  • Clear plugin data               │
│                                    │
│  ⚠️ This action cannot be undone! │
│                                    │
│  Type plugin name to confirm:      │
│  ┌─────────────────────────────┐  │
│  │                             │  │
│  └─────────────────────────────┘  │
│                                    │
│  [Cancel]           [Uninstall]   │
└───────────────────────────────────┘
```

---

## 🎯 Common Tasks

### Task 1: Install Cloudflare Plugin

```
1. Sidebar → Plugins
2. Click "Install Plugin"
3. Select "From Local Path"
4. Path: E:/GitHub/nginx-love-dev/apps/api/src/plugins/cloudflare-manager
5. ✅ Activate after installation
6. Click "Install Plugin"
7. Wait for success message
8. Click plugin card
9. Tab "Configuration"
10. Fill Cloudflare API credentials
11. Click "Save Configuration"
12. Tab "UI" → Access Cloudflare Manager
```

### Task 2: Configure Plugin

```
1. Plugins → Click plugin card
2. Tab "Configuration"
3. Edit settings
4. Click "Test Connection" (if available)
5. Click "Save Configuration"
6. Confirmation message appears
```

### Task 3: View Plugin UI

```
1. Plugins → Click plugin card
2. Tab "UI"
3. Plugin custom interface loads
4. Interact with plugin features
```

### Task 4: Troubleshoot Plugin

```
1. Plugins → Click plugin card
2. Check "Status" badge
   - 🟢 Green = Healthy
   - 🟡 Yellow = Warning
   - 🔴 Red = Error
3. Tab "Logs"
4. Filter by ERROR
5. Identify issue
6. Fix configuration or contact support
```

---

## 📱 Responsive Design

### Desktop (>1024px)
- Full sidebar visible
- Plugin cards grid (3 columns)
- All tabs visible

### Tablet (768-1024px)
- Collapsible sidebar
- Plugin cards grid (2 columns)
- Tabs scrollable

### Mobile (<768px)
- Hamburger menu
- Plugin cards stack (1 column)
- Tabs as dropdown

---

## 🎨 Design System

### Colors

#### Status Colors
- 🟢 **Active/Healthy**: `bg-green-100 text-green-800`
- ⚫ **Inactive**: `bg-gray-100 text-gray-800`
- 🟡 **Warning**: `bg-yellow-100 text-yellow-800`
- 🔴 **Error**: `bg-red-100 text-red-800`
- 🔵 **Info**: `bg-blue-100 text-blue-800`

#### Type Colors
- Integration: Blue
- Security: Red
- Monitoring: Orange
- Notification: Purple
- Utility: Gray

### Icons
- Plugin: 🧩 Puzzle
- Active: ▶️ Play
- Inactive: ⏸️ Pause
- Settings: ⚙️ Gear
- Delete: 🗑️ Trash
- Refresh: 🔄 Sync
- Health: ✅ Check / ⚠️ Warning

---

## 🔒 Permissions & Security

### Plugin Permissions
Khi install, plugin request permissions:
- ✅ **External API**: Call external services
- ✅ **File System**: Read/write files
- ✅ **Database**: Query/modify data
- ✅ **Network**: Network access

### Security Features
- ✅ Plugin sandboxing
- ✅ Permission validation
- ✅ Code signing (future)
- ✅ Security scanning
- ✅ Audit logs

---

## 🆘 Support

### Need Help?
- 📖 **Documentation**: Read plugin README
- 💬 **Community**: Discord/Forum
- 🐛 **Bug Report**: GitHub Issues
- 📧 **Email**: dev@nginxlove.com

### Common Issues

#### Plugin Won't Activate
- Check dependencies installed
- Verify configuration
- Review logs for errors
- Ensure permissions granted

#### Configuration Not Saving
- Check required fields filled
- Validate input formats
- Test connection first
- Review error messages

#### Plugin UI Not Loading
- Check browser console
- Verify plugin activated
- Clear browser cache
- Check CORS settings

---

## 🎉 Summary

Plugin Management UI cung cấp:
- ✅ **Easy Discovery**: Browse và search plugins
- ✅ **Quick Install**: Multiple installation methods
- ✅ **Simple Config**: User-friendly configuration forms
- ✅ **Custom UI**: Each plugin có UI riêng
- ✅ **Monitoring**: Logs, stats, health checks
- ✅ **Management**: Activate/deactivate/uninstall

**Happy plugin managing! 🚀**
