## Đề xuất phát triển hệ thống Plugin cho Nginx WAF Management Platform (Monorepo Node.js/Express/React)

### 1. Kiến trúc & Tích hợp
- Plugin hoạt động theo chuẩn plug and play, không can thiệp vào mã nguồn gốc phần mềm chính.
- Mỗi plugin là một module độc lập, lưu trữ tại `/apps/api/src/plugins/` (backend) hoặc `/apps/web/src/plugins/` (frontend).
- Cấu hình plugin lưu tại file riêng biệt trong thư mục plugin, ví dụ: `plugin.config.json`.
- Hỗ trợ đa dạng loại plugin: giao diện (UI), chức năng (feature), tích hợp bên thứ ba (integration).
- Cung cấp API và SDK chuẩn (TypeScript) cho nhà phát triển bên thứ ba, tài liệu tại `/apps/docs/guide/plugins.md`.
- Cơ chế cập nhật plugin tự động từ kho lưu trữ trực tuyến (npm registry, GitHub, custom repo).
- Giao diện quản lý plugin thân thiện, cho phép plugin tự định nghĩa UI/form cấu hình qua schema.
- Hệ thống plugin có khả năng mở rộng, dễ dàng thêm loại plugin mới.
- Tích hợp marketplace plugin: cho phép người dùng duyệt, tìm kiếm, cài đặt, cập nhật và tải về các plugin từ kho trực tuyến hoặc nội bộ.
- Cho phép người dùng upload file zip plugin lên hệ thống để cài đặt hoặc tải về plugin dưới dạng file zip.

### 2. Bảo mật & Quản lý
- Kiểm tra, xác thực plugin trước khi cài đặt: kiểm tra chữ ký, version, dependency, tương thích hệ thống.
- Phân quyền quản lý plugin: chỉ admin hoặc user có quyền mới được cài đặt/gỡ plugin.
- Cơ chế backup & restore cấu hình plugin, tránh mất mát dữ liệu khi sự cố.
- Hệ thống thông báo cập nhật, lỗi, trạng thái plugin qua dashboard và email.
- Thiết kế plugin sandbox, tránh xung đột và rò rỉ dữ liệu giữa plugin và phần mềm chính.

### 3. Quy trình phát triển & Kiểm thử
- Phân tích yêu cầu, thiết kế kiến trúc plugin phù hợp với DDD, RESTful API, React component.
- Lập trình, triển khai plugin sử dụng Node.js/Express (backend), React/TypeScript (frontend).
- Kiểm thử plugin: unit test, integration test với Vitest, mock external dependencies.
- Tài liệu hướng dẫn sử dụng và phát triển plugin cho user/dev tại `/apps/docs/guide/plugins.md`.
- Đảm bảo plugin tích hợp nhanh, không gián đoạn hoạt động phần mềm chính.
- Mọi plugin tuân thủ tiêu chuẩn chung: plug and play, không can thiệp mã nguồn gốc.

### 4. Tiêu chuẩn kỹ thuật
- Sử dụng TypeScript, Express, React, Prisma, Docker phù hợp với kiến trúc hiện tại.
- SDK plugin cung cấp đầy đủ hàm, interface, type cho dev bên thứ ba.
- Đảm bảo bảo mật: không hardcode secret, kiểm soát input, kiểm tra dependency, log an toàn.
- Đảm bảo hiệu năng: plugin không gây chậm hệ thống, hỗ trợ lazy load, code splitting.

### 5. Tài liệu & Hỗ trợ
- Cung cấp tài liệu chi tiết cho user/dev: cài đặt, phát triển, kiểm thử, API, SDK.
- Hỗ trợ hệ thống thông báo, cập nhật, trạng thái plugin qua UI và email.
- Đảm bảo quy trình phát triển plugin minh bạch, dễ mở rộng, bảo trì lâu dài.

### 6. Quy tắc kiểm soát AI khi phát triển
- AI không được tạo các file test/debug hoặc file không cần thiết gây rác hệ thống.
- Không sinh code lỗi, code lặp, code không dùng hoặc code không tuân thủ tiêu chuẩn dự án.
- Mọi lệnh thực thi, thao tác file, hoặc thay đổi hệ thống phải được kiểm tra an toàn, không gây rủi ro bảo mật hoặc ảnh hưởng đến dữ liệu.
- Review code AI sinh ra phải đảm bảo không có lỗ hổng bảo mật, không hardcode secret, không để lộ thông tin nhạy cảm, không sinh các lệnh nguy hiểm.
- Ưu tiên sinh code sạch, tối ưu, dễ bảo trì, tuân thủ kiến trúc và quy trình dự án.
- Mọi tính năng, API, thao tác file, cấu hình, hoặc thay đổi hệ thống do AI sinh ra phải đảm bảo:
	- Được kiểm tra input đầu vào, chống injection, XSS, SSRF, và các lỗ hổng phổ biến.
	- Không ghi đè, xóa, hoặc thay đổi dữ liệu quan trọng nếu chưa xác thực quyền và backup.
	- Không sinh các lệnh thực thi hệ thống nguy hiểm hoặc thao tác trực tiếp với hệ thống file ngoài phạm vi cho phép.
	- Đảm bảo mọi thay đổi đều có thể rollback, log đầy đủ, và audit được.
	- Không để lộ thông tin nhạy cảm, secret, hoặc cấu hình bảo mật ra ngoài log, UI, API.
