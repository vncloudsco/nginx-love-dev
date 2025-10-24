# Plugin Build Guide

Hướng dẫn build plugins độc lập, không cần compile toàn bộ backend.

---

## 🎯 Philosophy

**Plugins phải là standalone packages:**
- ✅ Build độc lập không phụ thuộc backend
- ✅ Có dependencies riêng trong `package.json`
- ✅ Có build script riêng
- ✅ Output `.js` files ready-to-run
- ✅ Plug & Play - chỉ cần copy vào là chạy

**KHÔNG được:**
- ❌ Yêu cầu compile toàn bộ backend
- ❌ Phụ thuộc vào backend build pipeline
- ❌ Cần manual setup phức tạp

---

## 📦 Plugin Package Structure

```
my-plugin/
├── package.json           # Plugin dependencies & scripts
├── plugin.config.json     # Plugin metadata
├── build.js              # Standalone build script
├── tsconfig.json         # TypeScript config (optional)
├── .gitignore           # Ignore compiled files
├── index.ts             # Main plugin source (TypeScript)
├── index.js             # Compiled output (generated)
├── services/            # Plugin services
│   ├── *.ts            # TypeScript sources
│   └── *.js            # Compiled outputs
├── ui/                  # Plugin UI (optional)
│   ├── index.html      # Standalone HTML
│   └── app.js          # UI logic
└── README.md            # Plugin documentation
```

---

## 🔨 Build Methods

### Method 1: esbuild (Recommended)

**Pros:** Fast, simple, no config needed

**Setup:**

1. **Install esbuild**
```json
// package.json
{
  "devDependencies": {
    "esbuild": "^0.19.0"
  }
}
```

2. **Create build.js**
```javascript
const esbuild = require('esbuild');

const buildPlugin = async () => {
  try {
    console.log('🔨 Building plugin...');
    
    // Build main file
    await esbuild.build({
      entryPoints: ['index.ts'],
      outfile: 'index.js',
      platform: 'node',
      target: 'node18',
      format: 'cjs',
      sourcemap: true,
    });
    
    // Build services
    await esbuild.build({
      entryPoints: ['services/*.ts'],
      outdir: 'services',
      platform: 'node',
      target: 'node18',
      format: 'cjs',
    });
    
    console.log('✅ Build successful!');
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
};

buildPlugin();
```

3. **Add npm script**
```json
{
  "scripts": {
    "build": "node build.js"
  }
}
```

4. **Build**
```bash
cd my-plugin
npm install
npm run build
```

---

### Method 2: TypeScript Compiler

**Pros:** Official, type checking

**Setup:**

1. **Create tsconfig.json**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "outDir": ".",
    "rootDir": ".",
    "strict": false,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "noEmitOnError": false
  },
  "include": ["index.ts", "services/**/*.ts"],
  "exclude": ["node_modules", "**/*.spec.ts"]
}
```

2. **Add npm script**
```json
{
  "scripts": {
    "build": "tsc"
  }
}
```

3. **Build**
```bash
npm run build
```

---

### Method 3: Babel

**Pros:** Flexible, many plugins

**Setup:**

1. **Install babel**
```bash
npm install --save-dev @babel/core @babel/cli @babel/preset-typescript
```

2. **Create .babelrc**
```json
{
  "presets": ["@babel/preset-typescript"]
}
```

3. **Add npm script**
```json
{
  "scripts": {
    "build": "babel index.ts services --out-dir . --extensions '.ts'"
  }
}
```

---

## 🎯 Cloudflare Plugin Example

### File Structure
```
cloudflare-manager/
├── package.json
├── plugin.config.json
├── build.js              ← Standalone build
├── index.ts             ← TypeScript source
├── index.js             ← Compiled (generated)
├── services/
│   ├── cloudflare-client.ts
│   └── cloudflare-client.js  ← Generated
└── ui/
    ├── index.html
    └── app.js
```

### Build Process

**Step 1: Install dependencies**
```bash
cd apps/api/src/plugins/cloudflare-manager
npm install
```

**Step 2: Build plugin**
```bash
npm run build
```

**Output:**
```
🔨 Building Cloudflare Manager Plugin...
✅ Plugin built successfully!
📦 Output files:
   - index.js
   - services/cloudflare-client.js
```

**Step 3: Install to system**
```bash
curl -X POST http://localhost:3001/api/plugins/install \
  -H "Content-Type: application/json" \
  -d '{
    "source": "file",
    "filePath": "E:/GitHub/nginx-love-dev/apps/api/src/plugins/cloudflare-manager"
  }'
```

---

## 📝 package.json Template

```json
{
  "name": "@nginx-love/my-plugin",
  "version": "1.0.0",
  "description": "My awesome plugin",
  "main": "index.js",
  "scripts": {
    "build": "node build.js",
    "dev": "node build.js && node index.js",
    "watch": "nodemon --watch '*.ts' --exec 'npm run build'"
  },
  "keywords": ["nginx", "waf", "plugin"],
  "author": "Your Name <you@example.com>",
  "license": "MIT",
  "dependencies": {
    "axios": "^1.7.2"
  },
  "peerDependencies": {
    "express": "^4.19.2"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.14.12",
    "esbuild": "^0.19.0",
    "typescript": "^5.5.4"
  }
}
```

---

## 🚫 .gitignore

**IMPORTANT:** Không commit compiled `.js` files

```gitignore
# Compiled files
*.js
*.js.map
!build.js        # Keep build script
!ui/*.js         # Keep UI files

# Dependencies
node_modules/

# Logs
*.log

# TypeScript cache
*.tsbuildinfo
```

---

## ✅ Pre-Install Checklist

Trước khi install plugin, đảm bảo:

- [ ] `index.js` exists
- [ ] All TypeScript files compiled
- [ ] `plugin.config.json` valid
- [ ] Dependencies listed in `package.json`
- [ ] README.md có hướng dẫn
- [ ] No TypeScript errors
- [ ] Build script works

**Test:**
```bash
# Check if index.js exists
ls -la index.js

# Validate plugin config
cat plugin.config.json | jq .

# Test import
node -e "require('./index.js')"
```

---

## 🔄 Auto-Build on Change

### Using nodemon

```bash
npm install --save-dev nodemon
```

```json
{
  "scripts": {
    "watch": "nodemon --watch 'index.ts' --watch 'services/**/*.ts' --exec 'npm run build'"
  }
}
```

### Using tsc watch mode

```json
{
  "scripts": {
    "watch": "tsc --watch"
  }
}
```

---

## 🐛 Troubleshooting

### Error: "Plugin validation failed: Plugin package must contain index.js"

**Cause:** TypeScript files không được compile

**Solution:**
```bash
cd plugin-folder
npm run build
ls -la index.js  # Verify exists
```

### Error: "Cannot find module"

**Cause:** Dependencies chưa được install

**Solution:**
```bash
npm install
```

### Error: "Build failed with TypeScript errors"

**Solution 1:** Fix TypeScript errors

**Solution 2:** Disable strict mode
```json
{
  "compilerOptions": {
    "strict": false,
    "noEmitOnError": false
  }
}
```

### Build quá chậm

**Solution:** Switch to esbuild
```bash
npm install --save-dev esbuild
# Use build.js script above
```

---

## 📊 Build Performance

| Method | Speed | Type Check | Config |
|--------|-------|-----------|--------|
| **esbuild** | ⚡⚡⚡ Fast (< 1s) | ❌ No | Simple |
| **TypeScript** | 🐢 Slow (3-10s) | ✅ Yes | Medium |
| **Babel** | 🐢 Slow (5-15s) | ❌ No | Complex |

**Recommendation:** Use **esbuild** for development speed

---

## 🎯 Best Practices

### 1. **Keep dependencies minimal**
```json
{
  "dependencies": {
    "axios": "^1.7.2"  // Only what you need
  }
}
```

### 2. **Use peerDependencies for common packages**
```json
{
  "peerDependencies": {
    "express": "^4.19.2"  // Backend already has this
  }
}
```

### 3. **Separate dev and prod dependencies**
```json
{
  "dependencies": {
    // Runtime deps only
  },
  "devDependencies": {
    // Build tools only
  }
}
```

### 4. **Version lock important packages**
```json
{
  "dependencies": {
    "axios": "1.7.2"  // Exact version
  }
}
```

### 5. **Test after build**
```bash
npm run build && node -e "require('./index.js')"
```

---

## 📦 Distribution

### Method 1: ZIP File

```bash
# Build plugin
npm run build

# Create package
cd ..
zip -r cloudflare-manager.zip cloudflare-manager/ \
  -x "*/node_modules/*" \
  -x "*/.git/*" \
  -x "*.ts"

# Install from ZIP
curl -X POST http://localhost:3001/api/plugins/install \
  -F "file=@cloudflare-manager.zip"
```

### Method 2: Git URL

```bash
curl -X POST http://localhost:3001/api/plugins/install \
  -H "Content-Type: application/json" \
  -d '{
    "source": "url",
    "url": "https://github.com/user/plugin/releases/download/v1.0.0/plugin.zip"
  }'
```

### Method 3: Local Path

```bash
curl -X POST http://localhost:3001/api/plugins/install \
  -H "Content-Type: application/json" \
  -d '{
    "source": "file",
    "filePath": "/path/to/plugin"
  }'
```

---

## 🔍 Validation

System validates:
- ✅ `index.js` or `dist/index.js` exists
- ✅ `plugin.config.json` valid JSON
- ✅ Required metadata fields present
- ✅ Main file exports default class
- ✅ Class extends BasePlugin

**Manual validation:**
```bash
# Check structure
node -e "
const fs = require('fs');
const path = require('path');

const required = ['index.js', 'plugin.config.json', 'package.json'];
const missing = required.filter(f => !fs.existsSync(f));

if (missing.length) {
  console.error('Missing:', missing);
  process.exit(1);
}

console.log('✅ All required files present');
"
```

---

## 🎉 Summary

**For Plugin Developers:**
1. Create `build.js` với esbuild
2. Add `npm run build` script
3. Build trước khi distribute
4. Test plugin locally first

**For Users:**
1. Download/clone plugin
2. `cd plugin-folder`
3. `npm install`
4. `npm run build`
5. Install via API

**No backend compilation needed!** 🚀

---

## 📚 Resources

- [esbuild Documentation](https://esbuild.github.io/)
- [TypeScript Compiler Options](https://www.typescriptlang.org/tsconfig)
- [npm Scripts](https://docs.npmjs.com/cli/v9/using-npm/scripts)
- [Plugin SDK Documentation](./PLUGIN_SDK.md)

---

**Build plugins, not headaches!** 🔨✨
