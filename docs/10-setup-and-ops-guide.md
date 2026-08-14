---
doc: setup-and-ops-guide
version: 1.0.0
status: approved
updated: 2026-08-11
owner: Quành (Admin)
upstream: [tech-spec-architecture]
downstream: [master-plan]
---

# Setup & Ops Guide — Shop Quành

| 📄 **Metadata**  | 📑 **Details**           |
| :--------------- | :----------------------- |
| **Doc ID**       | `setup-and-ops-guide`    |
| **Version**      | `1.0.0`                  |
| **Status**       | 🟢 **Approved**          |
| **Last Updated** | `2026-08-11`             |
| **Owner**        | Quành (Admin)            |
| **Upstream**     | [tech-spec-architecture] |
| **Downstream**   | [master-plan]            |

Viết cho bạn của sáu tháng sau, người đã quên sạch mọi quyết định trong 12 tài liệu trước. Nếu một lệnh ở đây không copy-paste chạy được thẳng, tài liệu này đã thất bại.

## 1. Yêu cầu môi trường

| Công cụ | Phiên bản                                | Kiểm tra bằng   |
| ------- | ---------------------------------------- | --------------- |
| Node.js | 20 LTS trở lên                           | `node -v`       |
| yarn    | 1.22 trở lên (Classic, không phải Berry) | `yarn -v`       |
| Git     | bất kỳ bản gần đây                       | `git --version` |

**Không cần** cài Postgres cục bộ — Neon là dịch vụ từ xa, kể cả lúc phát triển ở máy cá nhân.

## 2. Cài đặt lần đầu

```bash
git clone <repo-url>
cd shop-quanh
yarn install
cp .env.example .env.local
# điền các biến ở bảng §3 vào .env.local
yarn prisma generate
yarn prisma migrate dev
yarn dev
```

Mở `http://localhost:3000`. Nếu trang trắng, kiểm tra terminal — thường là thiếu biến môi trường.

## 3. Biến môi trường

Không bao giờ ghi giá trị thật vào tài liệu này hay vào git. Bảng dưới chỉ nói **lấy ở đâu**.

| Tên                  | Bắt buộc           | Lấy ở đâu                                                                   | Ví dụ hình dạng                             |
| -------------------- | ------------------ | --------------------------------------------------------------------------- | ------------------------------------------- |
| `DATABASE_URL`       | Có                 | Neon Console → nhánh `main` hoặc `uat` → Connection string                  | `postgresql://user:***@ep-xxx.neon.tech/db` |
| `AUTH_SECRET`        | Có                 | Sinh bằng `npx auth secret`, mỗi môi trường một giá trị riêng               | chuỗi ngẫu nhiên 32+ ký tự                  |
| `NEXTAUTH_URL`       | Có                 | URL của môi trường: `http://localhost:3000` cục bộ, URL Vercel ở triển khai |                                             |
| `DISCORD_BOT_TOKEN`  | Có (cho thông báo) | Discord Developer Portal → ứng dụng bot đã tạo                              |                                             |
| `DISCORD_CHANNEL_ID` | Có                 | Chuột phải kênh trong Discord → Copy Channel ID (cần bật Developer Mode)    | chuỗi số                                    |
| `CRON_SECRET`        | Có                 | Tự sinh, dùng để xác thực lệnh gọi cron từ bên ngoài vào `/api/cron/*`      |                                             |

`.env.example` trong kho mã liệt kê đúng các tên này với giá trị rỗng — copy từ đó, không gõ tay tên biến để tránh gõ sai.

## 4. Lệnh thường dùng

| Lệnh                         | Việc gì                                                                      |
| ---------------------------- | ---------------------------------------------------------------------------- |
| `yarn dev`                   | Chạy máy chủ phát triển                                                      |
| `yarn build`                 | Build production, chạy trước khi tin một thay đổi lớn                        |
| `yarn test`                  | Chạy Vitest, toàn bộ `src/domain/`                                           |
| `yarn test:watch`            | Vitest ở chế độ theo dõi, dùng khi đang sửa                                  |
| `yarn lint`                  | ESLint, gồm cả luật `import/no-restricted-paths` chặn `domain/` import ngược |
| `yarn tsc --noEmit`          | Kiểm tra kiểu không sinh file                                                |
| `yarn prisma studio`         | Giao diện xem/sửa dữ liệu trực tiếp — **cẩn thận khi trỏ vào nhánh `main`**  |
| `yarn prisma migrate dev`    | Tạo và áp migration mới, dùng lúc phát triển                                 |
| `yarn prisma migrate deploy` | Áp migration đã có lên môi trường thật, không tạo migration mới              |

## 5. Quy trình triển khai

Cả hai môi trường trên **Vercel** — quyết định đã chốt ở tech-spec §6, đảo lại so với lúc dự án còn dùng Netlify cho môi trường thử.

| Bước            | Môi trường thử                                                             | Môi trường thật            |
| --------------- | -------------------------------------------------------------------------- | -------------------------- |
| Kích hoạt       | Mở pull request hoặc đẩy nhánh bất kỳ                                      | Merge vào `main`           |
| Build           | Tự động, Vercel Preview Deployment                                         | Tự động, Vercel Production |
| Cơ sở dữ liệu   | Neon nhánh `uat`                                                           | Neon nhánh `main`          |
| URL             | Sinh ngẫu nhiên theo mỗi PR, xem trong tab Deployments                     | Tên miền chính             |
| Trước khi merge | Thử tay trên URL preview, đối chiếu Definition of Done ở plan-and-scope §4 | —                          |

**Không có bước thủ công nào.** Nếu thấy mình đang gõ lệnh deploy tay, có gì đó đã lệch khỏi thiết kế — dừng lại và kiểm tra kết nối GitHub-Vercel trước khi tiếp tục.

## 6. Migration và rollback

```bash
# Tạo migration mới (chạy cục bộ, trỏ DATABASE_URL vào nhánh uat)
yarn prisma migrate dev --name mo_ta_ngan_gon

# Xem trước migration sẽ chạy trên production mà CHƯA áp
yarn prisma migrate diff \
  --from-schema-datamodel prisma/schema.prisma \
  --to-schema-datasource prisma/schema.prisma \
  --script

# Áp lên production (Vercel tự chạy lệnh này khi merge vào main,
# xem cấu hình trong package.json script "postinstall" hoặc CI)
yarn prisma migrate deploy
```

**Rollback:** Prisma Migrate không có lệnh "undo" tự động. Cách làm thật:

1. Nếu migration mới chỉ **thêm** cột/bảng (trường hợp phổ biến nhất ở đợt này — xem tech-spec §3.1, mọi thay đổi đều là thêm): revert code về commit trước, migration cũ vẫn còn nguyên trong lược đồ, không gây lỗi vì cột thừa không được code cũ dùng tới.
2. Nếu migration **xoá hoặc đổi kiểu** cột: viết migration mới đảo ngược thủ công, test trên nhánh `uat` trước. Không sửa lại migration đã áp.
3. Trường hợp khẩn: Neon giữ lịch sử điểm khôi phục theo thời gian ở gói miễn phí trong vài ngày gần nhất — xem Neon Console → Branches → Restore.

## 7. Backup

| Gì                       | Tần suất                                                    | Nơi lưu                                                       | Cách khôi phục                                                                                                                                                    |
| ------------------------ | ----------------------------------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cơ sở dữ liệu            | Neon tự chụp liên tục ở gói miễn phí, giữ vài ngày gần nhất | Neon Console                                                  | Branches → chọn thời điểm → Restore. **[CHƯA THỬ]** — bắt buộc thử một lần khi dựng nhánh `uat` ở G2 (plan-and-scope), trước khi tin tưởng nó cho môi trường thật |
| Mã nguồn                 | Mỗi lần đẩy                                                 | GitHub                                                        | `git checkout <commit>`                                                                                                                                           |
| Cấu hình biến môi trường | Không tự động                                               | Ghi tay vào trình quản lý mật khẩu cá nhân, **không** vào git | Nhập lại tay vào Vercel Settings                                                                                                                                  |

Một bản backup chưa từng thử khôi phục thì coi như không có. Dòng `[CHƯA THỬ]` ở trên là một việc còn nợ, không phải chi tiết vô hại — nó phải được gạch bỏ bằng hành động thật trong G2, không phải bằng cách sửa câu chữ trong tài liệu này.

## 8. Sự cố thường gặp

| Triệu chứng                                 | Nguyên nhân thường gặp                                                                | Xử lý                                                                                                                |
| ------------------------------------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Trang trắng lúc `yarn dev`                  | Thiếu biến môi trường                                                                 | Xem log terminal, đối chiếu §3                                                                                       |
| `403` ở một thao tác trước đây vẫn làm được | Ma trận thẩm quyền vừa đổi (tech-spec §5.2)                                           | Kiểm tra `src/domain/permissions/matrix.ts`, so với hành vi mong đợi trong SDD SPEC-006                              |
| Mã đơn hợp lệ bị hệ thống từ chối           | Khuôn dạng thật của sàn đã đổi (rủi ro TR-3)                                          | Đối chiếu mẫu thật với `SHOPEE_ORDER_ID_PATTERN` / `TIKTOK_ORDER_ID_PATTERN` trong `src/domain/order-id/validate.ts` |
| Cảnh báo lệch ngày xuất hiện tràn lan       | Dung sai múi giờ bị sửa nhầm                                                          | Kiểm tra `date-check.ts` vẫn giữ dung sai ±1 ngày (tech-spec §11.3)                                                  |
| Thông báo Discord ngừng chạy                | Token bot hết hạn hoặc cron ngoài ngừng gọi                                           | Kiểm tra `DISCORD_BOT_TOKEN` còn hiệu lực; kiểm tra log của dịch vụ cron ngoài                                       |
| Preview Deployment không tạo dữ liệu mẫu    | Nhánh `uat` của Neon bị xoá hoặc `DATABASE_URL` ở Vercel Preview trỏ nhầm sang `main` | Vercel → Settings → Environment Variables → kiểm tra biến chỉ áp cho "Preview"                                       |
| Nạp báo cáo báo lỗi định dạng dù tệp đúng   | Sàn đổi tên cột trong CSV xuất ra                                                     | So tên cột thực tế với danh sách 10 cột cần dùng ở SDD SPEC-013                                                      |
| Test integration chạy chậm hoặc treo        | Đang trỏ nhầm vào nhánh `main` thay vì `uat`                                          | Kiểm tra biến môi trường lúc chạy `yarn test`                                                                        |

## 9. Hạn mức free tier

| Dịch vụ                              | Giới hạn                                                                 | Mức dùng hiện tại                                                  | Khi vượt                                                                                                                                                    |
| ------------------------------------ | ------------------------------------------------------------------------ | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vercel Hobby                         | Băng thông và số lượt build theo tháng, xem Vercel Dashboard → Usage     | 10 người dùng, đỉnh 50 yêu cầu/tuần — dưới 1% hạn mức thông thường | Dự án bị tạm dừng tới kỳ sau, không phát sinh hoá đơn (tech-spec §6.3, TR-7)                                                                                |
| Vercel Hobby — điều khoản thương mại | Không giới hạn số, mà là điều khoản sử dụng                              | Rủi ro đã chấp nhận có ghi chú (tech-spec TR-7)                    | Dấu hiệu: email từ Vercel, hoặc site bị tạm dừng bất thường ngoài lý do hạn mức. Phương án dự phòng: chuyển sang Netlify, cấu hình cũ còn trong lịch sử git |
| Neon Free                            | Dung lượng lưu trữ và giờ tính toán theo tháng, xem Neon Console → Usage | 110 yêu cầu sau 4 tháng — rất xa hạn mức                           | Chỉ đọc được tới kỳ sau, không mất dữ liệu                                                                                                                  |
| GitHub Actions                       | Không giới hạn cho repo công khai                                        | Vài phút mỗi lần đẩy mã                                            | —                                                                                                                                                           |
| Cron ngoài (thông báo Discord)       | Theo gói đang dùng                                                       | 96 lượt gọi/ngày                                                   | Xem lại gói nếu đổi dịch vụ                                                                                                                                 |

Kiểm tra bảng này mỗi quý — xem việc định kỳ ở §10.

## 10. Việc định kỳ

| Việc                            | Tần suất                                         | Ghi chú                                                                              |
| ------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------ |
| Kiểm tra hạn mức free tier (§9) | Mỗi quý                                          | Đặt lịch nhắc riêng, đừng trông vào trí nhớ                                          |
| Xoay `AUTH_SECRET`              | Mỗi 6 tháng, hoặc ngay khi nghi lộ               | Sinh giá trị mới, cập nhật ở Vercel, mọi phiên đăng nhập cũ sẽ bị đăng xuất          |
| Rà bảng theo dõi công việc      | Trước mỗi lần lập kế hoạch mới                   | Đã phát hiện việc ghi "chưa xong" nhưng thực ra đã xong — xem problem-definition R-6 |
| Kiểm tra dependency lỗi thời    | Khi có giờ rảnh, không ưu tiên trong 5 tháng này | tech-spec §9 cố tình ghim phiên bản Next.js trong đợt này (TR-4)                     |
| Thử khôi phục backup            | Mỗi 6 tháng                                      | Không chỉ tin vào tài liệu — thử thật một lần trên nhánh `uat`                       |
| Đối chiếu KPI-1, KPI-2, KPI-3   | Sau mỗi đợt sale                                 | Số liệu nằm ở PRD §7, đây là cách duy nhất biết dự án có đang đi đúng hướng          |
