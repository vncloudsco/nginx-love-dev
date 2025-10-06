# Backup & Restore with SSL Certificates

## Tổng quan

Hệ thống backup đã được nâng cấp để hỗ trợ **backup và restore đầy đủ SSL certificates**, cho phép bạn di chuyển cấu hình giữa các máy chủ một cách hoàn chỉnh.

## Những gì được backup

### 1. **Database Records**
- Domain configurations
- SSL certificate metadata (issuer, validity, SANs)
- ModSecurity rules (CRS + Custom)
- ACL rules
- Alert rules & notification channels
- Nginx configurations

### 2. **SSL Certificate Files** ✨ (NEW)
Cho mỗi domain có SSL enabled, hệ thống sẽ backup:
- **Certificate file** (.crt) - Public certificate
- **Private key file** (.key) - Private key (được mã hóa an toàn)
- **Certificate chain** (.chain.crt) - Intermediate certificates (nếu có)

## Cách hoạt động

### Export/Backup

Khi bạn export configuration hoặc chạy backup:

```typescript
// Backend tự động:
1. Đọc metadata SSL từ database
2. Đọc SSL certificate files từ /etc/nginx/ssl/
3. Include nội dung files vào backup JSON
4. Tạo file backup hoàn chỉnh
```

**File backup JSON structure:**
```json
{
  "version": "1.0",
  "timestamp": "2025-10-06T10:30:00Z",
  "ssl": [
    {
      "domainName": "example.com",
      "commonName": "example.com",
      "sans": ["example.com", "www.example.com"],
      "issuer": "Let's Encrypt",
      "autoRenew": true,
      "files": {
        "certificate": "-----BEGIN CERTIFICATE-----\n...",
        "privateKey": "-----BEGIN PRIVATE KEY-----\n...",
        "chain": "-----BEGIN CERTIFICATE-----\n..."
      }
    }
  ]
}
```

### Import/Restore

Khi bạn import backup trên máy chủ mới:

```typescript
// Backend tự động:
1. Parse backup JSON
2. Restore domains vào database
3. Restore SSL metadata vào database
4. Write SSL certificate files vào /etc/nginx/ssl/
5. Set permissions (private key = 600)
6. Restore các cấu hình khác
```

## Sử dụng

### 1. Export Configuration

**Từ UI:**
```
Backup & Restore → Export Configuration → Download
```

**Kết quả:** File JSON chứa toàn bộ cấu hình + SSL certificates

### 2. Import Configuration

**Trên máy chủ mới:**
```
Backup & Restore → Import Configuration → Select file
```

**Hệ thống sẽ:**
- ✅ Restore domains
- ✅ Restore SSL certificates (cả metadata và files)
- ✅ Restore ACL rules
- ✅ Restore ModSecurity rules
- ✅ Restore alert configurations

**Toast notification sẽ hiển thị:**
```
Restored: 5 domains, 3 SSL certs (3 with files), 10 ACL rules, 25 ModSec rules
```

## Bảo mật

### Private Keys
- Private keys được lưu trong backup JSON
- **QUAN TRỌNG:** Bảo vệ file backup như bạn bảo vệ private keys
- Khuyến nghị: Mã hóa file backup trước khi lưu trữ
- Set permission 600 cho private keys khi restore

### Best Practices

1. **Lưu trữ an toàn:**
   ```bash
   # Encrypt backup file
   gpg -c nginx-config-2025-10-06.json
   
   # Decrypt when needed
   gpg -d nginx-config-2025-10-06.json.gpg > nginx-config-2025-10-06.json
   ```

2. **Backup định kỳ:**
   - Sử dụng scheduled backups
   - Lưu trữ off-site
   - Kiểm tra backup thường xuyên

3. **Test restore:**
   - Test restore trên môi trường staging
   - Xác minh SSL certificates hoạt động
   - Kiểm tra tất cả domains

## API Endpoints

### Export
```bash
GET /api/backup/export
Authorization: Bearer <token>
```

### Import
```bash
POST /api/backup/import
Authorization: Bearer <token>
Content-Type: application/json

{
  "version": "1.0",
  "ssl": [...],
  "domains": [...],
  ...
}
```

## File Locations

### SSL Certificates
```
/etc/nginx/ssl/
├── example.com.crt
├── example.com.key  (chmod 600)
├── example.com.chain.crt
├── another-domain.com.crt
├── another-domain.com.key  (chmod 600)
└── another-domain.com.chain.crt
```

### Backups
```
/var/backups/nginx-love/
├── backup-2025-10-06T10-30-00.json
├── backup-2025-10-05T02-00-00.json
└── ...
```

## Troubleshooting

### SSL files không được restore

**Nguyên nhân:** Domain chưa tồn tại trong database

**Giải pháp:**
1. Import sẽ tự động tạo domains trước
2. Sau đó restore SSL certificates
3. Check logs: `/home/nginx-love-dev/apps/api/logs/combined.log`

### Permission denied khi restore

**Nguyên nhân:** Không có quyền ghi vào /etc/nginx/ssl/

**Giải pháp:**
```bash
sudo mkdir -p /etc/nginx/ssl
sudo chown -R <app-user>:nginx /etc/nginx/ssl
sudo chmod 755 /etc/nginx/ssl
```

### Certificate không valid sau restore

**Nguyên nhân:** 
- File bị corrupt trong quá trình backup/restore
- Certificate đã hết hạn

**Giải pháp:**
```bash
# Verify certificate
openssl x509 -in /etc/nginx/ssl/example.com.crt -text -noout

# Check private key
openssl rsa -in /etc/nginx/ssl/example.com.key -check

# Verify cert matches key
openssl x509 -noout -modulus -in /etc/nginx/ssl/example.com.crt | openssl md5
openssl rsa -noout -modulus -in /etc/nginx/ssl/example.com.key | openssl md5
```

## Migration Example

### Máy chủ cũ (Production):
```bash
1. Login vào UI
2. Navigate to Backup & Restore
3. Click "Export Configuration"
4. Download: nginx-config-2025-10-06.json
5. Encrypt (optional): gpg -c nginx-config-2025-10-06.json
```

### Máy chủ mới (Staging/New Production):
```bash
1. Setup nginx-love application
2. Run migrations: npx prisma migrate deploy
3. Start services
4. Login vào UI
5. Navigate to Backup & Restore
6. Click "Import Configuration"
7. Select: nginx-config-2025-10-06.json
8. Wait for import to complete
9. Verify: Check domains, SSL certs, và configurations
10. Test: Access domains qua HTTPS
```

## Notes

- ✅ SSL certificates được backup **BẢN ĐẦY ĐỦ** (không chỉ metadata)
- ✅ Private keys được bảo mật trong backup file
- ✅ Hỗ trợ certificate chains (intermediate certs)
- ✅ Tự động set permissions cho private keys
- ✅ Compatible với Let's Encrypt, self-signed, và commercial certificates
- ⚠️ **Bảo vệ backup files như bạn bảo vệ private keys**
- ⚠️ Backup files có thể rất lớn nếu có nhiều SSL certificates

## Version History

- **v1.0** (2025-10-06): Initial release với SSL certificate backup support
