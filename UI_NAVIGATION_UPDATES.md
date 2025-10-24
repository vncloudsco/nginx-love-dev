# UI Navigation Updates - Plugin Management

## ✅ Đã hoàn thành

### 1. Thêm Menu Item "Plugins" vào Sidebar

**File**: `apps/web/src/components/layout/AppSidebar.tsx`

**Changes**:
- ✅ Import icon `Puzzle` từ `lucide-react`
- ✅ Thêm menu item mới trong **System** group:
  ```typescript
  { key: 'plugins', icon: Puzzle, path: '/plugins' }
  ```
- ✅ Xóa unused import `Button`

**Vị trí trong menu**:
```
System
├── Network Manager
├── Backup & Restore
├── User Management
├── Slave Nodes
└── 🆕 Plugins  ← Menu mới
```

### 2. Thêm Translations

**File**: `apps/web/src/lib/i18n.ts`

**English**:
```typescript
'nav.plugins': 'Plugins'
```

**Vietnamese**:
```typescript
'nav.plugins': 'Plugin'
```

---

## 🎨 Kết quả UI

### Sidebar Menu
Khi user mở sidebar, sẽ thấy menu item mới:

```
┌────────────────────────────┐
│  SYSTEM                    │
├────────────────────────────┤
│  🌐 Network Manager        │
│  💾 Backup & Restore       │
│  👥 User Management        │
│  🖥️  Slave Nodes           │
│  🧩 Plugins          ← NEW │
└────────────────────────────┘
```

### Navigation Flow

1. **User clicks "Plugins"** → Navigate to `/plugins`
2. **Plugin List Page** → Show all installed plugins
3. **Click plugin** → Navigate to `/plugins/:pluginId`
4. **Plugin Detail Page** → Show plugin info, config, and UI

### Active State
Menu item sẽ highlight khi user đang ở:
- `/plugins` - Plugin list page
- `/plugins/:pluginId` - Plugin detail page
- `/plugins/*` - Any plugin sub-route

---

## 📁 Files Modified

```
✅ apps/web/src/components/layout/AppSidebar.tsx
   - Thêm Puzzle icon import
   - Thêm 'plugins' menu item
   - Xóa unused Button import

✅ apps/web/src/lib/i18n.ts
   - Thêm 'nav.plugins' translation (EN + VI)
```

---

## 🔍 How to Test

### 1. Run Development Server

```bash
cd apps/web
pnpm dev
```

### 2. Check Navigation

1. Login vào admin portal
2. Mở sidebar (nếu collapsed)
3. Scroll xuống **System** section
4. Tìm menu item **"Plugins"** (hoặc **"Plugin"** nếu dùng tiếng Việt)
5. Click vào "Plugins" → Redirect to `/plugins`

### 3. Verify Active State

- Navigate to `/plugins` → Menu "Plugins" highlight màu xanh
- Navigate to other page → Menu "Plugins" về màu default
- Click menu khác → Active state chuyển sang menu đó

---

## 🌐 Multi-language Support

### English (en)
- Menu label: **"Plugins"**
- Path: `/plugins`

### Vietnamese (vi)
- Menu label: **"Plugin"**
- Path: `/plugins`

Để đổi ngôn ngữ:
1. Click icon 🌐 Languages ở sidebar footer
2. Chọn "English" hoặc "Tiếng Việt"
3. Menu label sẽ tự động update

---

## 🎯 Complete User Journey

### Scenario 1: Install New Plugin

```
Sidebar → Plugins → Plugin List → Install Button → Install Dialog → Success
```

### Scenario 2: Manage Existing Plugin

```
Sidebar → Plugins → Plugin Card → Plugin Detail → Configure/Activate/Deactivate
```

### Scenario 3: View Plugin UI

```
Sidebar → Plugins → Plugin Card → View Details → UI Tab → Plugin custom UI
```

### Scenario 4: Cloudflare Manager Plugin

```
Sidebar → Plugins → Cloudflare Manager → 
  ├── Overview (stats, health)
  ├── Configuration (API token, settings)
  └── UI (zones, DNS, firewall)
```

---

## 🚀 Next Steps

### Option A: Build & Deploy
```bash
cd apps/web
pnpm build
```

### Option B: Commit Changes
```bash
git add apps/web/src/components/layout/AppSidebar.tsx
git add apps/web/src/lib/i18n.ts
git commit -m "Add Plugins navigation menu"
git push
```

### Option C: Test Full Flow
1. Start API server: `cd apps/api && pnpm dev`
2. Start web server: `cd apps/web && pnpm dev`
3. Login as admin
4. Navigate to Plugins
5. Test plugin installation
6. Test Cloudflare plugin

---

## 📊 Summary

| Component | Status | Description |
|-----------|--------|-------------|
| Sidebar Menu | ✅ | Added "Plugins" item in System group |
| Icon | ✅ | Using Puzzle icon from lucide-react |
| Translation EN | ✅ | "Plugins" |
| Translation VI | ✅ | "Plugin" |
| Active State | ✅ | Highlight when on /plugins/* routes |
| Routing | ✅ | Links to /plugins path |
| Lint Errors | ✅ | Fixed unused Button import |

---

## 🎉 Hoàn thành!

Navigation menu đã sẵn sàng! User có thể:
- ✅ Tìm thấy Plugin menu trong sidebar
- ✅ Click để vào Plugin Management page
- ✅ Xem tất cả plugins đã cài đặt
- ✅ Cài đặt plugins mới
- ✅ Quản lý và configure plugins
- ✅ Truy cập UI của từng plugin

**Giao diện đã hoàn chỉnh với navigation menu!** 🎊
