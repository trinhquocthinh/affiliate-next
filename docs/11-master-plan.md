---
doc: master-plan
version: 1.3.0
status: approved
updated: 2026-08-13
owner: Quành (Admin)
upstream: [plan-and-scope, sdd, tech-spec-architecture, test-cases-specification, design-criteria]
downstream: [onboarding-guide]
---

# Master Plan — Shop Quành

| 📄 **Metadata**  | 📑 **Details**                                                                                   |
| :--------------- | :----------------------------------------------------------------------------------------------- |
| **Doc ID**       | `master-plan`                                                                                    |
| **Version**      | `1.3.0`                                                                                          |
| **Status**       | 🟢 **Approved**                                                                                  |
| **Last Updated** | `2026-08-11`                                                                                     |
| **Owner**        | Quành (Admin)                                                                                    |
| **Upstream**     | [plan-and-scope], [sdd], [tech-spec-architecture], [test-cases-specification], [design-criteria] |
| **Downstream**   | [onboarding-guide]                                                                               |

> [!IMPORTANT]
> Tài liệu này mở ra mỗi ngày làm việc. Subtask là đơn vị hoàn thành trong **1–4 giờ một buổi ngồi** — lớn hơn thì bị hoãn vô hạn, đây là bài học từ chính bảng theo dõi công việc cũ của dự án.

## 0. Lệch khỏi khuôn mẫu chuẩn, và vì sao

Khuôn mẫu phase 9 mặc định Epic 0 là scaffold từ đầu và Epic 1 là walking skeleton. Dự án này **brownfield** — repo, CI, và hệ thống đã chạy 4 tháng. Áp nguyên khuôn mẫu nghĩa là dựng lại thứ đã tồn tại, đúng thứ tôi đã từ chối làm từ tech-spec §2.1.

Thay vào đó:

- **Epic 1 đóng vai trò walking skeleton**, nhưng không phải "một luồng giả chạy suốt cho vui" — nó là **F-23**, tính năng thật, nhỏ nhất, có giá trị đo được ngay, và chạy suốt từ UI → route handler → domain → DB → **ra tới cả hệ thống ngoài (Shopee)**. Nó phơi bày sai lầm sớm giống hệt mục đích của walking skeleton gốc, nhưng không lãng phí giờ vào code không ai dùng.
- **Epic 3 đóng vai trò lưới an toàn** (dữ liệu mẫu, Vitest, ESLint luật tầng) — tương đương phần "scaffold" còn thiếu của hệ thống cũ, nhưng đặt sau khi đã có một chiến thắng nhìn thấy được, không phải trước.

Sáu epic còn lại ánh xạ trực tiếp từ G0–G5 ở `06-plan-and-scope.md`, giữ nguyên thứ tự đã có lý do ở đó.

## 1. Bảng tiến độ

Cập nhật tay sau mỗi buổi làm. `[ ]` chưa làm · `[~]` đang làm · `[x]` xong.

| Epic | Tên                                   | Giờ (đệm) | Trạng thái                                                 |
| ---- | ------------------------------------- | --------: | ---------------------------------------------------------- |
| E1   | F-23 tối thiểu — chiến thắng đầu tiên |         8 | `[x]`                                                      |
| E2   | Dò theo ngày                          |        10 | `[x]`                                                      |
| E3   | Lưới an toàn                          |         8 | `[x]`                                                      |
| E4   | Đối soát tự động                      |        23 | `[x]`                                                      |
| E5   | Thẩm quyền                            |        21 | `[x]`                                                      |
| E6   | Chất lượng dữ liệu & hoàn thiện       |        13 | `[x]`                                                      |
| E7   | Dọn dẹp backlog kế thừa               |         7 | `[~]`                                                      |
|      | **Tổng**                              |    **90** | trên quỹ 88 giờ — **vượt 2h, xem cảnh báo ngân sách ở §9** |

> [!NOTE]
> **Cập nhật 2026-08-13 — E6 hoàn thành toàn bộ 7 subtask**, kể cả hai phần dự kiến rơi rụng trước theo §13.3 gốc (E6-S6-T1 — trang chủ theo vai, và nhóm E6-S4 — gợi ý mã đơn/trường số tiền). Ước lượng gốc là 19h thô cho 13h quỹ (đệm); làm xong toàn bộ nghĩa là tốc độ thực tế nhanh hơn ước lượng, không phải thiếu giờ như dự phòng đã tính. Ghi lại độ lệch dương này trước khi ước lượng Epic 5, theo đúng câu hỏi 1 ở §11.
>
> **Trạng thái sau E6:** chỉ còn duy nhất **Epic 5 — Thẩm quyền** (F-06, F-07, F-11, F-12) là chưa làm trong toàn bộ danh sách F-01→F-23 thuộc phạm vi R1/R2/R3.

## 2. Đường găng

Chuỗi dài nhất quyết định ngày xong, không phải tổng giờ:

```
E1-S1 (F-23 tối thiểu, 2h)
  → E1-S2 (di trú lược đồ, 2h)
    → E4-S1 (bảng ReconciliationRun/Row, 3h)
      → E4-S2 (đọc CSV, 4h)
        → E4-S3 (bộ xương ghép qua Sub_ID, 4h)  ★ ĐIỂM DỪNG SP-3
          → E4-S4 (khoá phụ orderId+itemId, 4h)
            → E4-S5 (xuất tệp, 3h)
              → E5-S1..S6 (thẩm quyền, 21h — độc lập dữ liệu nhưng
                           dùng chung nền tảng test ở E3)
```

> [!IMPORTANT]
> E3 (lưới an toàn) không nằm trên đường găng chính nhưng là **điều kiện tiên quyết bắt buộc** của E5 theo tech-spec §5.2 — không được bỏ qua dù không phải đường găng theo giờ.

> [!NOTE]
> **Ngày xong dự kiến của đường găng:** với 4 giờ/tuần, đường găng E1→E4 dài khoảng 16 giờ thô ≈ 4–5 tuần, đặt E4 hoàn tất quanh tuần 13 — đúng khớp với plan-and-scope.

## 3. Epic 1 — F-23 tối thiểu (walking skeleton của đợt này)

> [!CAUTION]
> **Mục tiêu:** một link tạo hôm nay phải mang mã yêu cầu, và tuần sau phải thấy nó trong báo cáo sàn. **Hạn không bù được — mỗi ngày trễ là dữ liệu vĩnh viễn mất khả năng ghép tự động.**

### Story E1-S — Gắn mã yêu cầu vào link

| ID       | Tiêu đề                                                                          | Nguồn                          | Giờ | Phụ thuộc | Định nghĩa xong                                                                       | File chạm                                      |
| -------- | -------------------------------------------------------------------------------- | ------------------------------ | --: | --------- | ------------------------------------------------------------------------------------- | ---------------------------------------------- |
| E1-S1-T1 | Hiện mã yêu cầu + nút sao chép ở màn điền link                                   | SPEC-012 #1, TC-089            |   1 | —         | Bấm nút, mã vào clipboard; test TC-089 pass                                           | `src/app/(affiliate)/queue/[id]/fill-form.tsx` |
| E1-S1-T2 | Ô tích "đã gắn Sub_ID", lưu `subIdStamped`                                       | SPEC-012 #2,#3, TC-090, TC-091 |   1 | E1-S1-T1  | Lưu link không tích vẫn thành công; tích thì `subIdStamped=true`; TC-090, TC-091 pass | cùng file trên                                 |
| E1-S2-T1 | Migration: thêm `subIdStamped`, `productItemId`, `orderIdWarning`, `orderAmount` | tech-spec §3.1                 |   2 | —         | `yarn prisma migrate dev` chạy sạch trên nhánh `uat`; schema khớp erd.md              | `prisma/schema.prisma`, `prisma/migrations/`   |
| E1-S3-T1 | Trích `productItemId` từ URL đã lưu, chạy một lần cho dữ liệu cũ                 | tech-spec §3.3, TR-9           |   1 | E1-S2-T1  | Script chạy xong in ra tỉ lệ trích được; TR-9 coi như giảm thiểu nếu tỉ lệ hợp lý     | `scripts/backfill-item-id.ts`                  |
| E1-S4-T1 | Đo số nền: chạy quy tắc khuôn dạng mã đơn trên toàn bộ dữ liệu hiện có           | KPI-2, R-9, TR-3               |   1 | —         | Có con số cụ thể: % mã đơn không khớp khuôn dạng, ghi vào PRD §7 làm số nền           | `scripts/audit-order-id-format.ts`             |
| E1-S5-T1 | Thống nhất quy trình với 3 affiliate — không phải code                           | PD §12                         | 0.5 | E1-S1-T2  | Nhắn tin/họp ngắn xác nhận cả 3 hiểu và đồng ý dán mã vào Sub_ID                      | —                                              |

**Tổng thô: 6,5h → đệm: 8h.**

**Định nghĩa xong Epic 1:** một link tạo qua quy trình mới có Sub_ID, và ở lần nạp báo cáo kế tiếp (dù còn thủ công), nó xuất hiện với `matchMethod = SUB_ID`.

## 4. Epic 2 — Dò theo ngày

**Mục tiêu:** đợt sale 9/9 lọc được theo ngày; xong trước tuần 4.

| ID       | Tiêu đề                                                      | Nguồn                           | Giờ | Phụ thuộc | Định nghĩa xong                                               | File chạm                                     |
| -------- | ------------------------------------------------------------ | ------------------------------- | --: | --------- | ------------------------------------------------------------- | --------------------------------------------- |
| E2-S1-T1 | Đổi cột ngày sang `dd/mm/yyyy`, tooltip giờ phút — màn Queue | US-010, TC-\*(thị giác)         |   1 | —         | Không còn "x ngày trước" ở Queue                              | `src/app/(affiliate)/queue/columns.tsx`       |
| E2-S1-T2 | Đổi cột ngày — màn My Requests                               | US-010                          |   1 | —         | Tương tự, phía buyer                                          | `src/app/(buyer)/requests/columns.tsx`        |
| E2-S2-T1 | Component bộ lọc khoảng ngày, đồng bộ vào query string       | US-011, SPEC-005 #5             |   2 | —         | Tải lại trang giữ nguyên bộ lọc; TC-044 pass                  | `src/components/date-range-filter.tsx`        |
| E2-S2-T2 | API lọc theo `createdFrom`/`createdTo`, dung sai theo giờ VN | SPEC-005, TC-040..043, 046..048 |   2 | E2-S2-T1  | Toàn bộ TC-040 đến TC-048 pass                                | `src/app/api/affiliate/queue/route.ts`        |
| E2-S3-T1 | Nút xuất tệp, áp đúng bộ lọc đang có                         | US-012, TC-045                  |   2 | E2-S2-T2  | Tệp CSV mở bằng Excel không lỗi phông tiếng Việt; TC-045 pass | `src/app/api/affiliate/queue/export/route.ts` |
| E2-S4-T1 | Gỡ hiệu ứng nền `blur`/`animate-float` toàn cục              | F-08, SPEC-011                  |   1 | —         | TC-083 pass — quan sát 10s không phần tử nào chuyển động      | `src/app/layout.tsx`                          |
| E2-S4-T2 | Giảm bảng màu về đúng 3 nhấn theo design-criteria §2.1       | F-08, SPEC-011, TC-088          |   1 | E2-S4-T1  | Đếm màu nhấn ≤ 3 trên mọi màn hình chính; TC-088 pass         | `src/app/globals.css`, `tailwind.config.ts`   |

**Tổng thô: 8h → đệm: 10h.**

## 5. Epic 3 — Lưới an toàn

**Mục tiêu:** có chỗ đứng an toàn để chạm vào phần rủi ro cao (thẩm quyền) ở Epic 5, và hợp nhất hạ tầng.

| ID       | Tiêu đề                                                                   | Nguồn                        | Giờ | Phụ thuộc | Định nghĩa xong                                                        | File chạm                                 |
| -------- | ------------------------------------------------------------------------- | ---------------------------- | --: | --------- | ---------------------------------------------------------------------- | ----------------------------------------- |
| E3-S1-T1 | Tạo nhánh Neon `uat`, biến môi trường riêng trên Vercel Preview           | tech-spec §6.4               |   1 | —         | Preview Deployment trỏ đúng nhánh `uat`, không đụng `main`             | Vercel Dashboard, Neon Console            |
| E3-S1-T2 | Gỡ Netlify khỏi dự án, xoá `@netlify/plugin-nextjs`                       | tech-spec §6.2               | 0.5 | —         | `yarn build` không còn phụ thuộc Netlify                               | `package.json`, `netlify.toml` (xoá)      |
| E3-S2-T1 | Seed script: 4 tài khoản đủ 4 vai (gồm 1 đã vô hiệu hoá)                  | tech-spec §8, TC-062, TC-077 | 1.5 | E3-S1-T1  | Chạy seed trên `uat`, đăng nhập thử cả 4 vai                           | `prisma/seed.ts`                          |
| E3-S2-T2 | Seed ~20 yêu cầu rải 3 trạng thái, có mã đơn cố tình sai                  | tech-spec §8                 | 1.5 | E3-S2-T1  | Queue hiển thị đủ dạng dữ liệu để thử tay                              | `prisma/seed.ts`                          |
| E3-S3-T1 | Cấu hình Vitest cho `src/domain/`, một test mẫu chạy được                 | tech-spec §8 bước 1          |   1 | —         | `yarn test` chạy xanh                                                  | `vitest.config.ts`                        |
| E3-S3-T2 | ESLint `import/no-restricted-paths` chặn domain import ngược              | tech-spec §8 bước 2          |   1 | E3-S3-T1  | Thử import React vào file domain, lint đỏ                              | `.eslintrc.json`                          |
| E3-S4-T1 | Thử khôi phục Neon từ điểm backup — đóng dòng `[CHƯA THỬ]` ở setup-ops §7 | setup-ops §7                 | 1.5 | E3-S1-T1  | Khôi phục thành công trên nhánh `uat`; cập nhật setup-ops thành đã thử | Neon Console, `10-setup-and-ops-guide.md` |

**Tổng thô: 6h → đệm: 8h.**

## 6. Epic 4 — Đối soát tự động

**Mục tiêu:** đợt 11/11 đối soát dưới 4 giờ, xuống từ 2 ngày. Giai đoạn giá trị cao nhất và dài nhất.

### Story E4-S1 — Bộ khung dữ liệu

| ID       | Tiêu đề                                            | Nguồn                       | Giờ | Phụ thuộc | Định nghĩa xong                             | File chạm              |
| -------- | -------------------------------------------------- | --------------------------- | --: | --------- | ------------------------------------------- | ---------------------- |
| E4-S1-T1 | Migration `ReconciliationRun`, `ReconciliationRow` | tech-spec §3.4, BR-063..067 |   3 | E1-S2-T1  | Migration chạy sạch trên `uat`; khớp erd.md | `prisma/schema.prisma` |

### Story E4-S2 — Đọc tệp

| ID       | Tiêu đề                                                        | Nguồn                    | Giờ | Phụ thuộc | Định nghĩa xong                                                    | File chạm                                    |
| -------- | -------------------------------------------------------------- | ------------------------ | --: | --------- | ------------------------------------------------------------------ | -------------------------------------------- |
| E4-S2-T1 | Hàm thuần parse CSV, đọc 10 cột cần dùng                       | SPEC-013, TC-099, TC-101 |   2 | —         | TC-099 (bỏ cột lạ), TC-101 (thiếu cột bắt buộc) pass               | `src/domain/reconciliation/parse-report.ts`  |
| E4-S2-T2 | Route nhận tệp tải lên, gọi hàm parse, tạo `ReconciliationRun` | E4-S1-T1, E4-S2-T1       |   2 |           | Nạp tệp mẫu thật, tạo được 1 `ReconciliationRun` với `rowCount=91` | `src/app/api/reconciliation/import/route.ts` |

### Story E4-S3 — Bộ xương ghép ★ điểm dừng SP-3

| ID       | Tiêu đề                                                  | Nguồn                                            | Giờ | Phụ thuộc          | Định nghĩa xong                        | File chạm                                           |
| -------- | -------------------------------------------------------- | ------------------------------------------------ | --: | ------------------ | -------------------------------------- | --------------------------------------------------- |
| E4-S3-T1 | Hàm thuần ghép theo `Sub_id1`                            | BR-064 ưu tiên 1, SPEC-013 #1,#2, TC-093, TC-094 |   2 | E4-S2-T1           | TC-093, TC-094 pass                    | `src/domain/reconciliation/match.ts`                |
| E4-S3-T2 | Màn hình hiện ba nhóm A/B/C (bản tối giản, chưa cần đẹp) | US-051, SPEC-013                                 |   2 | E4-S3-T1, E4-S2-T2 | Nạp tệp thật, thấy 3 khối đúng số dòng | `src/app/(dashboard)/admin/reconciliation/page.tsx` |

> [!WARNING]
> **Kiểm tra điểm dừng SP-3 tại đây (plan-and-scope §6):** nếu tới hết tuần 11 mà chưa xong T2, hạ xuống bản thủ công 3 giờ thay vì tiếp tục.

### Story E4-S4 — Khoá phụ

| ID       | Tiêu đề                                                  | Nguồn                            | Giờ | Phụ thuộc | Định nghĩa xong                                        | File chạm                                 |
| -------- | -------------------------------------------------------- | -------------------------------- | --: | --------- | ------------------------------------------------------ | ----------------------------------------- |
| E4-S4-T1 | Bồi ghép theo cặp `orderId + itemId` khi không có Sub_ID | BR-064 ưu tiên 2, TC-095, TC-096 |   3 | E4-S3-T1  | TC-095, TC-096 pass                                    | `src/domain/reconciliation/match.ts`      |
| E4-S4-T2 | Test hồi quy trên tệp mẫu thật 91 dòng                   | TC-102                           |   1 | E4-S4-T1  | TC-102 pass, kết quả ghi lại làm mốc so sánh tương lai | `src/domain/reconciliation/match.test.ts` |

### Story E4-S5 — Xuất

| ID       | Tiêu đề                                               | Nguồn                | Giờ | Phụ thuộc          | Định nghĩa xong                                       | File chạm                                            |
| -------- | ----------------------------------------------------- | -------------------- | --: | ------------------ | ----------------------------------------------------- | ---------------------------------------------------- |
| E4-S5-T1 | Xuất tệp đã ghép, giữ nguyên cột trạng thái đơn       | BR-066, TC-098       |   2 | E4-S3-T2, E4-S4-T1 | Mở bằng Excel, có đủ cột, trạng thái `Đã hủy` vẫn còn | `src/app/api/reconciliation/[runId]/export/route.ts` |
| E4-S5-T2 | Hoàn thiện giao diện 3 khối theo design-criteria §3.6 | design-criteria §3.6 |   1 | E4-S5-T1           | Khớp mô tả 3 khối, màu đúng token                     | `src/app/(dashboard)/admin/reconciliation/page.tsx`  |

**Tổng thô: 18h → đệm: 23h.**

**Định nghĩa xong Epic 4 (mốc kiểm MS-4):** nạp báo cáo thật của đợt 11/11, hệ thống chia đúng ba nhóm, tệp xuất ra mở bằng bảng tính là làm tiếp phần tính tiền ngay — đo KPI-1 thật lần đầu.

## 7. Epic 5 — Thẩm quyền

> [!CAUTION]
> **Thứ tự bên trong bắt buộc theo tech-spec §5.2. Không đảo.**

### Story E5-S1 — Ma trận tương đương

| ID       | Tiêu đề                                                                    | Nguồn                    | Giờ | Phụ thuộc | Định nghĩa xong                              | File chạm                           |
| -------- | -------------------------------------------------------------------------- | ------------------------ | --: | --------- | -------------------------------------------- | ----------------------------------- |
| E5-S1-T1 | Viết `matrix.ts` phản ánh **đúng hành vi hiện tại**, chưa thêm vai mới     | SPEC-006, tech-spec §5.1 |   2 | E3-S3-T1  | Ma trận có 3 vai cũ, 16 định danh có phạm vi | `src/domain/permissions/matrix.ts`  |
| E5-S1-T2 | Viết `resolve.ts`: `hasPermission`, `assertPermission`, `canAccessRequest` | SPEC-006                 |   1 | E5-S1-T1  | Ba hàm export đúng chữ ký ở tech-spec §5.1   | `src/domain/permissions/resolve.ts` |

### Story E5-S2 — Test trước, bắt buộc xanh trước khi đụng route

| ID       | Tiêu đề                               | Nguồn                 | Giờ | Phụ thuộc | Định nghĩa xong                                         | File chạm                                |
| -------- | ------------------------------------- | --------------------- | --: | --------- | ------------------------------------------------------- | ---------------------------------------- |
| E5-S2-T1 | Test TC-049 đến TC-062 cho ma trận cũ | SPEC-006, TC-049..062 |   3 | E5-S1-T2  | **Toàn bộ 14 TC pass trước khi làm S3** — cổng bắt buộc | `src/domain/permissions/resolve.test.ts` |

### Story E5-S3 — Chuyển từng điểm cuối, mỗi lần một commit

| ID       | Tiêu đề                                                                   | Nguồn  | Giờ | Phụ thuộc | Định nghĩa xong                               | File chạm                              |
| -------- | ------------------------------------------------------------------------- | ------ | --: | --------- | --------------------------------------------- | -------------------------------------- |
| E5-S3-T1 | Chuyển nhóm điểm cuối rủi ro thấp: `request.create`, `request.view`       | BR-035 | 1.5 | E5-S2-T1  | Không còn `actor.role ===` trong 2 route này  | `src/app/api/requests/route.ts`        |
| E5-S3-T2 | Chuyển nhóm `affiliate.queue.view`, `affiliate.claim.*`                   | BR-035 | 1.5 | E5-S3-T1  | Tương tự                                      | `src/app/api/affiliate/queue/route.ts` |
| E5-S3-T3 | Chuyển nhóm rủi ro cao: `request.close`, `request.edit`, `affiliate.fill` | BR-035 |   2 | E5-S3-T2  | Tương tự, thử tay cả 3 vai cũ không mất quyền | `src/app/api/requests/[id]/*.ts`       |

### Story E5-S4 — Phía trình duyệt

| ID       | Tiêu đề                                                                | Nguồn                  | Giờ | Phụ thuộc | Định nghĩa xong                                                             | File chạm                             |
| -------- | ---------------------------------------------------------------------- | ---------------------- | --: | --------- | --------------------------------------------------------------------------- | ------------------------------------- |
| E5-S4-T1 | Điểm cuối `/api/me/permissions`                                        | tech-spec §5.3, TC-058 |   1 | E5-S3-T3  | Trả đúng danh sách đã phân giải theo vai                                    | `src/app/api/me/permissions/route.ts` |
| E5-S4-T2 | Ẩn/hiện nút theo thẩm quyền đã phân giải, không định nghĩa lại ma trận | BR-035                 |   1 | E5-S4-T1  | Ẩn nút không thay thế kiểm tra phía máy chủ — thử gọi thẳng API vẫn bị chặn | `src/hooks/use-permissions.ts`        |

### Story E5-S5 — Thêm vai mới

| ID       | Tiêu đề                                            | Nguồn                    | Giờ | Phụ thuộc | Định nghĩa xong                                                      | File chạm                                  |
| -------- | -------------------------------------------------- | ------------------------ | --: | --------- | -------------------------------------------------------------------- | ------------------------------------------ |
| E5-S5-T1 | Migration: thêm `AFFILIATE_MASTER` vào enum `Role` | BR-032, TR-5             |   1 | E5-S3-T3  | Migration chỉ-thêm, chạy sạch trên `uat` trước, không phá dữ liệu cũ | `prisma/schema.prisma`                     |
| E5-S5-T2 | Thêm dòng `AFFILIATE_MASTER` vào ma trận           | SPEC-006, TC-052, TC-061 |   1 | E5-S5-T1  | TC-052, TC-061 pass                                                  | `src/domain/permissions/matrix.ts`         |
| E5-S5-T3 | Admin gán vai qua màn Users                        | US-020                   | 1.5 | E5-S5-T2  | Gán vai cho 1 tài khoản thật, đăng nhập lại thấy quyền mới           | `src/app/(dashboard)/admin/users/page.tsx` |

### Story E5-S6 — Tiếp quản, nhả việc, sửa mã đơn mọi trạng thái

| ID       | Tiêu đề                                                                | Nguồn                 | Giờ | Phụ thuộc | Định nghĩa xong                        | File chạm                                                                                                   |
| -------- | ---------------------------------------------------------------------- | --------------------- | --: | --------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| E5-S6-T1 | API tiếp quản/nhả việc, ghi dấu vết                                    | SPEC-007, TC-063..066 |   2 | E5-S5-T2  | TC-063 đến TC-066 pass, gồm e2e TC-063 | `src/app/api/requests/[id]/claim/route.ts`                                                                  |
| E5-S6-T2 | API sửa `orderId`/`orderAmount` ở mọi trạng thái, qua lại SPEC-001/004 | SPEC-008, TC-067..071 | 2.5 | E5-S6-T1  | TC-067 đến TC-071 pass                 | `src/app/api/requests/[id]/order/route.ts`                                                                  |
| E5-S6-T3 | Ghi dấu vết cho mọi thao tác vượt quyền sở hữu                         | SPEC-009, TC-072..076 | 2.5 | E5-S6-T2  | TC-072 đến TC-076 pass                 | `src/lib/audit.ts` (kế hoạch gốc ghi `audit-log.ts` — module thật tên `audit.ts`, không tạo module thứ hai) |

**Tổng thô: 16h → đệm: 21h.**

**Định nghĩa xong Epic 5 (mốc kiểm MS-5):** người giữ vai `AFFILIATE_MASTER` làm được mọi thao tác nghiệp vụ bất kể ai đang giữ yêu cầu, nhưng bị chặn dứt khoát ở quản lý tài khoản và cấu hình. Không còn dòng nào trong mã nguồn so sánh trực tiếp vai — ESLint xác nhận được.

## 8. Epic 6 — Chất lượng dữ liệu & hoàn thiện

**Danh sách dài hơn quỹ giờ, có chủ ý. Làm theo thứ tự, hết giờ thì dừng — xem điểm dừng SP-4/SP-5 ở plan-and-scope.**

| ID       | Tiêu đề                                                           | Nguồn                 | Giờ | Phụ thuộc               | Định nghĩa xong                                         | File chạm                                           |
| -------- | ----------------------------------------------------------------- | --------------------- | --: | ----------------------- | ------------------------------------------------------- | --------------------------------------------------- |
| E6-S1-T1 | Kiểm tra khuôn dạng mã đơn theo sàn tại chỗ nhập                  | SPEC-001, TC-001..012 |   3 | E1-S4-T1 (đã có số nền) | Toàn bộ TC-001 đến TC-012 pass                          | `src/domain/order-id/validate.ts`                   |
| E6-S2-T1 | Cảnh báo lệch ngày + ghim cờ `orderIdWarning`                     | SPEC-004, TC-031..039 |   3 | E6-S1-T1                | Toàn bộ TC-031 đến TC-039 pass                          | `src/domain/order-id/date-check.ts`                 |
| E6-S3-T1 | Ghi dấu vết đầy đủ cho mọi thao tác vượt quyền còn thiếu          | BR-051                |   2 | E5-S6-T3                | Rà lại bảng truy vết ở test-cases §4, không còn ô trống | rải rác các route                                   |
| E6-S4-T1 | Gợi ý dùng lại mã đơn gần nhất                                    | SPEC-003, TC-023..030 | 1.5 | E6-S1-T1                | TC-023 đến TC-030 pass                                  | `src/app/api/requests/order-id-suggestion/route.ts` |
| E6-S4-T2 | Trường số tiền không bắt buộc                                     | BR-015, TC-018..021   | 0.5 | —                       | TC-018 đến TC-021 pass                                  | form đóng yêu cầu                                   |
| E6-S5-T1 | Cron ẩn danh hoá sau 30 ngày                                      | SPEC-010, TC-077..082 |   4 | E3-S2-T1                | TC-077 đến TC-082 pass, gồm e2e TC-079                  | `src/app/api/cron/anonymize/route.ts`               |
| E6-S6-T1 | Trang chủ theo vai — thiết kế lại theo design-criteria §3.1, §3.7 | US-041, TC-084..087   |   5 | E2-S4-T2                | TC-084 đến TC-087 pass, không lặp bảng Queue            | `src/app/(home)/page.tsx`                           |

**Tổng thô: 19h cho quỹ 13h.** Thứ tự trên **là** thứ tự ưu tiên, **trừ một ngoại lệ: E6-S5-T1 (cron ẩn danh hoá) làm trước tiên**, không còn nằm trong danh sách cắt — lý do ghi ở §13.3. Làm hết giờ thì dừng đúng chỗ đang làm dở nếu subtask đó đã có thể chia nhỏ, hoặc dừng ở ranh giới subtask gần nhất. **E6-S6-T1 gần như chắc chắn bị cắt** — đây là quyết định đã biết trước, không phải tai nạn (plan-and-scope §3 G5).

## 9. Epic 7 — Dọn dẹp backlog kế thừa

> [!NOTE]
> **Mới thêm 2026-08-13**, từ kết quả rà soát bảng theo dõi công việc cũ (`plan-and-scope §8`). Không thuộc G0–G5 gốc ở plan-and-scope — đây là nợ kế thừa từ trước phase 6, không phải mục tiêu M1/M2/M3. **Ưu tiên thấp hơn Epic 5**: chỉ bắt đầu sau khi Epic 5 xong, hoặc chen giữa nếu có tuần rảnh giờ.

### Story E7-S — Xử lý #35 và 3 mục orphan

| ID       | Tiêu đề                                                                                 | Nguồn                  | Giờ | Phụ thuộc | Định nghĩa xong                                                                                                                              | File chạm                                           |
| -------- | --------------------------------------------------------------------------------------- | ---------------------- | --: | --------- | -------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| E7-S1-T1 | Quyết định #35: đóng vì trùng F-06, hay xét lại out-of-scope "thẩm quyền qua deploy"    | Issue cũ #35, PRD §8.1 | 0.5 | —         | Có quyết định bằng văn bản trong issue #35; nếu giữ out-of-scope thì đóng issue, nếu xét lại thì ghi thành SPEC mới trước khi động vào E5-S1 | `11-master-plan.md` §13.2                           |
| E7-S2-T1 | Thêm trường `sourceChannel` (discord/website), ghi tại lúc tạo yêu cầu và lúc điền link | Issue cũ #29           |   2 | —         | Mọi request mới có `sourceChannel` khác rỗng; xem được ở popup chi tiết                                                                      | `prisma/schema.prisma`, route tạo request/điền link |
| E7-S3-T1 | Thêm ô nhập Discord ID cho user ở màn Admin → Users (đã có cột DB, thiếu UI)            | Issue cũ #30           | 1.5 | —         | Admin sửa Discord ID của 1 tài khoản thật, lưu thành công                                                                                    | `src/app/(dashboard)/admin/users/page.tsx`          |
| E7-S4-T1 | Sửa cơ chế fetch cột Queue: chỉ lấy đúng cột config thay vì lấy full rồi lọc            | Issue cũ #33           | 1.5 | —         | Đo lại kích thước response trước/sau, giảm rõ rệt; không đổi hành vi hiển thị                                                                | `src/app/api/affiliate/queue/route.ts`              |

**Tổng thô: 5,5h → đệm: 7h.**

> [!WARNING]
> **Rủi ro ngân sách:** E1–E6 đã dùng 83h trong quỹ 88h, chỉ còn dư **5h**. Epic 7 ước lượng **7h có đệm**, vượt phần dư khoảng 2h — kể cả khi tính thêm phần Epic 6 làm nhanh hơn ước lượng (chưa có số giờ thực tế để xác nhận bù được bao nhiêu). Nếu ngồi hết 5h dư mà chưa xong Epic 7: cắt **E7-S4-T1 trước** (thuần tối ưu hiệu năng, không phục vụ M1/M2/M3), giữ lại E7-S1..S3.

**Định nghĩa xong Epic 7:** #35 có quyết định rõ ràng ghi lại; #29, #30, #33 hoặc đã làm hoặc đã đóng có lý do — không còn mục nào "treo" trong bảng theo dõi cũ.

## 10. Bảng rủi ro thi công

Khác với rủi ro dự án ở problem-definition §11 và rủi ro kỹ thuật ở tech-spec §9 — đây là rủi ro riêng cho **việc thi công theo kế hoạch này**.

| #    | Rủi ro                                         | Dấu hiệu sớm                            | Phản ứng                                                                                                                          |
| ---- | ---------------------------------------------- | --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| MP-1 | E5-S2-T1 (test ma trận cũ) không đạt 100% pass | Bất kỳ TC nào trong 14 TC đỏ            | **Dừng tuyệt đối, không sang E5-S3.** Ma trận chưa tương đương hành vi cũ                                                         |
| MP-2 | Một subtask vượt quá 2× ước lượng              | Ngồi quá 8 giờ cho việc ước lượng 4 giờ | Dừng, chẻ subtask thành 2, ghi lại lý do ước lượng sai để hiệu chỉnh subtask tương tự sau                                         |
| MP-3 | E4-S3-T2 chưa xong ở tuần 11                   | Xem điểm dừng SP-3 ở plan-and-scope §6  | Hạ F-15 xuống bản thủ công, dồn giờ còn lại của E4 sang hoàn thiện bản thủ công                                                   |
| MP-4 | Tỉ lệ `subIdStamped=true` sau 9/9 dưới 50%     | Đo ở đầu tuần sau 9/9                   | Dừng E4, quay lại nói chuyện với nhóm trước khi tiếp tục — xem điểm dừng SP-2                                                     |
| MP-5 | Hai tuần liên tiếp không có commit nào         | Tự quan sát                             | Đây là dấu hiệu mất đà thật, không phải bận đột xuất. Quay lại đọc phần "kiểu thất bại" ở plan-and-scope §1, cân nhắc cắt E6 ngay |

## 11. Điểm kiểm tra sau mỗi epic

Sau khi tick `[x]` một epic ở bảng tiến độ §1, dừng lại hỏi ba câu trước khi sang epic kế:

1. Ước lượng epic vừa xong lệch bao nhiêu so với kế hoạch? Cộng dồn độ lệch vào epic kế tiếp.
2. Có gì học được ở epic này khiến một epic sau **không còn cần thiết** hoặc **cần thêm** không?
3. Quỹ giờ còn lại có còn đủ cho toàn bộ epic còn lại không? Nếu không, epic nào trong E6 bị cắt trước?

## 12. Liên kết ngược

Mọi subtask trong tài liệu này truy được về đúng một SPEC-ID, BR-ID, US-ID, hoặc TC-ID. Không có subtask "tự do" không nguồn gốc — nếu thấy một subtask không có cột Nguồn, đó là lỗi cần sửa trước khi thi công, không phải chi tiết bỏ qua được.

## 13. Ngoài phạm vi & Kế hoạch tiếp theo

Nơi tổng hợp duy nhất. Trước đây thông tin này rải ở 4 chỗ khác nhau — problem-definition §10, PRD §8 và bảng F-20..F-22, plan-and-scope §7, tech-spec §10 — nên mỗi lần lập kế hoạch mới phải lục ngược cả bốn. Từ giờ chỉ cần đọc mục này. Ba nhóm có bản chất khác nhau, đừng gộp chung.

### 12.1 Chờ điều kiện kích hoạt — vào phạm vi ngay khi điều kiện đúng

| #    | Tính năng                                 | Điều kiện kích hoạt                                                                                | Nguồn          |
| ---- | ----------------------------------------- | -------------------------------------------------------------------------------------------------- | -------------- |
| F-16 | Thao tác hàng loạt trên nhiều yêu cầu     | Đợt 11/11 vượt **80 yêu cầu/tuần**                                                                 | PD §13, PRD §4 |
| F-17 | Gán một mã đơn cho nhiều yêu cầu cùng lúc | Ghi nhận **≥3 lần** một đơn gộp nhiều yêu cầu trong cùng đợt sale (đã có 1 lần)                    | PD §13         |
| F-18 | Nhắc người mua đóng yêu cầu còn treo      | Chưa có ngưỡng cụ thể — cần đo tỉ lệ yêu cầu `FILLED` bị bỏ quên trước khi định ra                 | PRD §4         |
| F-19 | Nhóm danh sách theo ngày ở màn người mua  | Chưa có ngưỡng cụ thể — chỉ đáng làm nếu buyer thực sự tạo nhiều yêu cầu một ngày                  | PRD §4         |
| F-21 | Nêu yêu cầu trực tiếp từ Discord          | Chỉ xét lại nếu sau khi cải thiện Queue (E1–E6), **hai affiliate mới vẫn không dùng hệ thống web** | PD §10.2       |

> [!NOTE]
> **Cập nhật 2026-08-13 — 3 mục orphan từ bảng theo dõi cũ đã có epic thực thi:** #29 (log nguồn request discord/website), #30 (UI nhập ID Discord của user), #33 (cải thiện cơ chế fetch cột Queue). Không khớp F-16..F-19/F-21 ở trên cũng không khớp mục cố định ở §13.2 — xếp thành **Epic 7 (§9)** cùng với việc xử lý #35, ưu tiên thấp hơn Epic 5 vì không ảnh hưởng M1/M2/M3.

> [!WARNING]
> **Cách xử lý khi chạm điều kiện:** không tự thêm thẳng vào master-plan đang chạy. Quay lại phase 6 (PRD), đánh giá lại MoSCoW với dữ liệu mới, rồi mới sinh epic mới — đúng quy trình đã dùng cho F-23 và F-15 khi tệp báo cáo mẫu xuất hiện giữa phase 6.

### 12.2 Cố định ngoài phạm vi — quyết định có chủ ý, không xét lại trừ khi ràng buộc gốc đổi

| Hạng mục                                                         | Vì sao                                                                                          | Điều gì phải đổi để xét lại                                                           |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Theo dõi hạn dùng của link                                       | Hoa hồng tính theo lúc bấm link, không theo hạn link; hiện buyer bấm mua ngay                   | Nếu hành vi mua đổi sang "để dành chờ giờ vàng" — PD §10.1                            |
| Trạng thái trung gian "để dành chờ sale"                         | Ghi chú tay hiện đủ dùng                                                                        | Nếu ghi chú tay bắt đầu gây nhầm lẫn thật                                             |
| **F-20 — Tính và lưu tiền hoa hồng**                             | Ranh giới cốt lõi: hệ thống ghép nối, bảng tính tính tiền — PD §10.9, xem mũi tên trong `c4.md` | **Không xét lại** — đây là ranh giới kiến trúc, không phải giới hạn kỹ thuật tạm thời |
| Viết lại cơ chế phát hiện trùng lặp                              | Cơ chế thô hiện tại chưa gây thiệt hại ghi nhận được                                            | Nếu phát sinh thiệt hại thật, cụ thể                                                  |
| Tự động lấy tên/ảnh sản phẩm                                     | Sàn chặn truy cập từ hạ tầng máy chủ; vòng tránh tốn tiền, vi phạm ràng buộc 0₫                 | Nếu ràng buộc ngân sách đổi                                                           |
| Mở hệ thống cho người ngoài nhóm                                 | Mọi quyết định thiết kế giả định <10 người quen biết nhau                                       | Đổi quy mô — kéo theo viết lại phần lớn business-rules                                |
| Đa ngôn ngữ, app di động riêng, theo dõi tiền hoa hồng thực nhận | Ngoài quy mô dự án cá nhân                                                                      | —                                                                                     |
| Giao diện quản lý ma trận thẩm quyền                             | Cố ý bắt đổi thẩm quyền phải qua triển khai, tránh đổi nhầm lúc nửa đêm                         | PRD §8.10                                                                             |
| Thông báo thời gian thực                                         | Cơ chế theo lô hiện tại đủ cho nhịp độ nhóm                                                     | Nếu nhịp độ nhóm tăng hẳn                                                             |
| Lịch sử phiên bản yêu cầu, xem lại được                          | Dấu vết đã ghi, nhưng không xây màn hình duyệt                                                  | Nếu tra `AuditLog` bằng tay trở nên phiền                                             |
| **F-22 — Nạp báo cáo hoa hồng của TikTok Shop**                  | Chưa có tệp mẫu thật — SDD §5                                                                   | Có tệp mẫu, lặp lại đúng quy trình đã làm với Shopee ở tech-spec §11                  |

> [!NOTE]
> **Cập nhật 2026-08-13 — đóng 4 nhóm mục cũ trùng out-of-scope, phát hiện khi rà bảng theo dõi công việc cũ (36 issue):**
>
> | Issue cũ | Tên                                              | Trùng với                                       |
> | -------- | ------------------------------------------------ | ----------------------------------------------- |
> | #2       | Preview link tự động (fetch tên/ảnh sản phẩm)    | "Tự động lấy tên và ảnh sản phẩm" ở trên        |
> | #18      | Thêm trạng thái "Ordered"                        | "Trạng thái trung gian để dành chờ sale" ở trên |
> | #19, #25 | Viết lại logic check duplicate / alert duplicate | "Viết lại cơ chế phát hiện trùng lặp" ở trên    |
> | #22      | TTL của link                                     | "Theo dõi hạn dùng của link" ở trên             |
>
> Đã đổi trạng thái 4 nhóm này sang `Won't do` trong bảng theo dõi, ghi rõ lý do trùng out-of-scope đã chốt.
>
> Quyết định cho issue cũ **#35** ("Load quyền dựa vào file cấu hình thay vì hard code"): **ĐÃ ĐÓNG (Won't do)**. Tính năng này mâu thuẫn trực tiếp với dòng "Giao diện quản lý ma trận thẩm quyền" (cố ý bắt đổi thẩm quyền phải qua triển khai để tránh rủi ro). Toàn bộ quyền đã được bao phủ bởi F-06 và hard code trên `matrix.ts`. (Hoàn thành E7-S1-T1).

### 12.3 Có thể bị cắt vì ngân sách — vẫn trong phạm vi, chỉ chưa chắc đủ giờ

Khác hẳn hai nhóm trên: **không phải** quyết định "không làm", mà là quyết định "làm nếu còn giờ", đã biết trước ở §8.

| Subtask                              | Vị trí | Thứ tự rơi rụng nếu thiếu giờ              |
| ------------------------------------ | ------ | ------------------------------------------ |
| E6-S6-T1 — trang chủ theo vai        | Epic 6 | **1 — rơi trước tiên**, đã ghi nhận ở §8   |
| E6-S4 — gợi ý mã đơn, trường số tiền | Epic 6 | 2                                          |
| ~~E6-S5-T1 — cron ẩn danh hoá~~      | —      | **đã rút khỏi mục này** — xem ghi chú dưới |

> [!IMPORTANT]
> **E6-S5-T1 (cron ẩn danh hoá 30 ngày) không còn là việc "làm nếu còn giờ".**
> Bản kế hoạch gốc xếp nó hạng 2 trong danh sách cắt. Quyết định đó nay được đảo lại: BR-041 là **nghĩa vụ với dữ liệu cá nhân**, không cùng hạng với chất lượng nhập liệu — thiếu giờ thì cắt tính năng, không cắt nghĩa vụ. Vì vậy E6-S5-T1 chuyển thành việc bắt buộc của Epic 6 và **được làm trước** E6-S1..S4.
> Đây là ghi nhận một lần đảo quyết định có chủ ý, không phải sửa lỗi ghi chép — thứ tự ưu tiên ở §8 đọc theo mục này.

Nếu một trong ba rơi khỏi 5 tháng này, chuyển thẳng sang §13.1 ở lần lập kế hoạch kế tiếp — không cần thảo luận lại từ đầu, vì giá trị của chúng đã được xác nhận, chỉ là thiếu giờ.

### 12.4 Quy tắc chung cho mục này

- Không tính năng nào trong §13.1 hay §13.3 được thêm vào bảng tiến độ §1 cho tới khi chạm điều kiện hoặc quỹ giờ đợt sau được xác nhận.
- Sau mỗi đợt sale, cùng lúc đo KPI ở PRD §7, rà lại mục này và cập nhật cột điều kiện nếu có số liệu mới — đặc biệt F-18, F-19 hiện chưa có ngưỡng và cần số liệu thật để định ra.
