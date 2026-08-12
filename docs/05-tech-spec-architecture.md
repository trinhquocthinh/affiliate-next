---
doc: tech-spec-architecture
version: 2.1.0
status: draft
updated: 2026-08-11
owner: Quành (Admin)
upstream: [sdd, prd, business-rules]
downstream: [diagrams, setup-and-ops-guide, plan-and-scope]
---

# Tech Spec & Architecture — Shop Quành

| 📄 **Metadata** | 📑 **Details** |
|:---|:---|
| **Doc ID** | `tech-spec-architecture` |
| **Version** | `2.1.0` |
| **Status** | 🟡 **Draft** |
| **Last Updated** | `2026-08-11` |
| **Owner** | Quành (Admin) |
| **Upstream** | [sdd], [prd], [business-rules] |
| **Downstream** | [diagrams], [setup-and-ops-guide], [plan-and-scope] |


> [!IMPORTANT]
> **Bối cảnh quyết định mọi thứ trong tài liệu này: đây là brownfield.** Hệ thống đã chạy 4 tháng với người dùng thật. Quỹ thời gian là 85 giờ trong 5 tháng. Vì vậy tài liệu này ưu tiên **thay đổi tối thiểu có chủ đích** thay vì kiến trúc lý tưởng. Mỗi chỗ lệch khỏi baseline đều ghi rõ lý do.

## 1. Tech stack

Stack hiện tại giữ nguyên. Cột cuối ghi **thứ ta từ bỏ** khi chọn — tài liệu không ghi trade-off là tài liệu quảng cáo.

| Hạng mục | Lựa chọn | Vì sao | Chi phí | Từ bỏ điều gì |
| --- | --- | --- | --- | --- |
| Package manager | yarn | Theo baseline, đã dùng sẵn | 0₫ | — |
| Framework | Next.js 16 App Router + TypeScript | Đã chạy, fullstack một repo | 0₫ | Bị ràng buộc vào hệ sinh thái React; nâng cấp lớn theo lịch của họ |
| Database | Neon Postgres (free) | Serverless, có branching cho môi trường thử | 0₫ | Kết nối lạnh chậm hơn Postgres thường; phụ thuộc một nhà cung cấp |
| ORM | Prisma 7 | Đã dùng, có migration, type-safe | 0₫ | Gói cài đặt nặng; truy vấn phức tạp phải viết SQL thô |
| Auth | Auth.js v5, đăng nhập bằng mật khẩu | Đã chạy, nhóm nội bộ | 0₫ | Tự gánh việc quản lý mật khẩu, khoá tài khoản, đặt lại mật khẩu |
| UI | Tailwind v4 + shadcn/ui | Đã dùng | 0₫ | Lớp CSS dài trong JSX; nâng cấp shadcn phải làm tay |
| Test | Vitest | Theo baseline, nhanh | 0₫ | Hệ sinh thái nhỏ hơn Jest |
| **Hosting** | **Vercel cho cả hai môi trường** | Theo baseline; hợp nhất một nền tảng để môi trường thử và thật dựng cùng một cách. Xem §6 | 0₫ | Gói Hobby có điều khoản phi thương mại — rủi ro đã chấp nhận, xem TR-7 |
| CI | GitHub Actions | Free cho repo | 0₫ | — |

> [!WARNING]
> **Không thêm thư viện mới nào** cho toàn bộ đợt này. Mọi tính năng trong PRD đều làm được bằng những gì đã có. Với 85 giờ, mỗi phụ thuộc mới là một khoản nợ không cần thiết.

## 2. Kiến trúc

### 2.1 Thực trạng và mức độ áp dụng

Baseline yêu cầu Clean Architecture chia theo feature. Mã hiện tại tổ chức theo kiểu Next.js mặc định: `src/app`, `src/components`, `src/lib`.

> [!IMPORTANT]
> **Quyết định: không tái cấu trúc toàn bộ.** Chuyển 4 tháng mã nguồn sang cấu trúc mới sẽ ngốn phần lớn 85 giờ mà không tạo giá trị nào cho người dùng, và làm điều đó trên hệ thống đang chạy giữa mùa sale là rủi ro không đáng.

**Áp dụng có chọn lọc, chỉ cho hai vùng mới:**

```
src/
├── domain/                      ← MỚI. Hàm thuần, không import gì bên ngoài.
│   ├── order-id/
│   │   ├── validate.ts          SPEC-001
│   │   ├── validate.test.ts
│   │   ├── date-check.ts        SPEC-004
│   │   └── date-check.test.ts
│   └── permissions/
│       ├── matrix.ts            SPEC-006 — nguồn chuẩn duy nhất
│       ├── resolve.ts
│       └── resolve.test.ts
│
├── config/
│   └── permissions.ts           ← điểm vào công khai, tái xuất từ domain/permissions
│
├── lib/            (giữ nguyên)
├── components/     (giữ nguyên)
└── app/            (giữ nguyên)
```

**Luật phụ thuộc, chỉ áp cho `src/domain/`:**

```
app / components  →  lib  →  domain
                              ↑
                     domain không import ngược lên bất cứ đâu
```

`src/domain/` **không được** import React, Prisma, Next.js, hay biến môi trường. Chỉ TypeScript thuần. Đây là ranh giới duy nhất được thực thi nghiêm, và nó đủ để đạt mục tiêu: hai vùng logic dễ sai nhất trở thành hàm thuần, test được không cần mock, chạy được ở cả máy chủ lẫn trình duyệt.

Gắn luật này vào ESLint bằng `import/no-restricted-paths` để máy tự chặn thay vì trông vào kỷ luật con người.

> [!NOTE]
> **Lệch khỏi baseline, ghi rõ:** không chia theo feature, không có tầng `application/` và `infrastructure/` riêng. Lý do: brownfield, quỹ giờ hạn chế, và ở quy mô 10 người thì lợi ích của việc tách tầng đầy đủ không bù được chi phí chuyển đổi.

### 2.2 Vì sao hai vùng này, không phải vùng khác

> [!WARNING]
> Cả hai đều là loại lỗi **im lặng**: sai mà không có thông báo lỗi nào. Mã đơn sai chỉ lộ ra sau vài tuần khi đối soát; thẩm quyền sai có thể không bao giờ lộ ra cho tới khi có người làm điều họ không nên làm được. Mọi phần khác của hệ thống khi hỏng đều báo lỗi ngay, nên chúng không cần mức bảo vệ này.

## 3. Mô hình dữ liệu

Chỉ ghi **phần thay đổi**. Lược đồ hiện tại giữ nguyên.

### 3.1 Thay đổi

| Đối tượng | Thay đổi | Nguồn |
| --- | --- | --- |
| `Role` | Thêm giá trị `AFFILIATE_MASTER`, đặt giữa `AFFILIATE` và `ADMIN` | BR-032 |
| `Request` | Thêm `orderAmount Decimal(12,2)?` — cho phép rỗng, không mặc định | BR-015 |
| `User` | Thêm `deactivatedAt DateTime?` | BR-040 |
| `User` | Thêm `anonymizedAt DateTime?` | BR-041 |
| `AuditAction` | Thêm `EDIT_ORDER_ID`, `EDIT_ORDER_AMOUNT`, `OVERRIDE_CLAIM`, `ANONYMIZE_USER` | BR-051, BR-052 |
| `Request` | Thêm chỉ mục tổ hợp `(status, createdAt)` | SPEC-005 |
| `Request` | Thêm `subIdStamped Boolean @default(false)` — cộng tác viên xác nhận đã gắn mã yêu cầu vào link | BR-061, SPEC-012 |
| `Request` | Thêm `orderIdWarning Boolean @default(false)` — cờ ghim khi mã đơn đáng ngờ | SPEC-004, §10 phương án B |
| `Request` | Thêm `productItemId String?` — mã sản phẩm trích từ URL, dùng làm khoá ghép phụ | BR-064 |
| `Request` | Thêm chỉ mục `(productItemId)` | BR-064 |

**Không** thêm cột lưu trạng thái `stale` (BR-026 nói rõ là giá trị suy dẫn).

`productItemId` được trích từ `productUrlRaw` bằng biểu thức chính quy trên khuôn URL của sàn, tính **một lần lúc tạo yêu cầu** và lưu lại. Trích lúc ghép thì phải quét toàn bộ mỗi lần, còn trích lúc tạo thì lập chỉ mục được. Nếu không trích được, để rỗng và chấp nhận yêu cầu đó chỉ ghép được qua `Sub_ID`.

### 3.4 Bảng mới cho việc đối soát

Việc nạp báo cáo cần lưu vết, nếu không thì mỗi lần nạp lại phải làm lại từ đầu và không so sánh được giữa các đợt.

| Bảng | Cột chính | Ghi chú |
| --- | --- | --- |
| `ReconciliationRun` | `id`, `platform`, `fileName`, `importedAt`, `importedById`, `rowCount`, `matchedCount` | Một lần nạp tệp |
| `ReconciliationRow` | `id`, `runId`, `orderId`, `itemId`, `itemName`, `orderedAt`, `orderStatus`, `affiliateStatus`, `price`, `orderValue`, `netCommission`, `subId1`, `matchedRequestId?`, `matchMethod` | Một dòng báo cáo, giữ nguyên như tệp gốc |

`matchMethod` nhận `SUB_ID`, `ORDER_ITEM`, hoặc `NONE` — đây là cột cho phép đo KPI-2 mà không cần tính lại.

Hai bảng này **chỉ đọc từ `Request`**, không có khoá ngoại nào đi theo chiều ngược lại (BR-067). Xoá toàn bộ dữ liệu đối soát không ảnh hưởng gì tới nghiệp vụ chính — đó là chủ ý, để phần này luôn có thể bỏ đi và làm lại.

### 3.2 Kiểu dữ liệu của số tiền

`Decimal(12,2)`, không dùng số thực dấu phẩy động. Tiền mà lưu bằng số thực thì sai số tích luỹ, và đây là dữ liệu dùng để dò khớp với báo cáo sàn — sai một đồng là không khớp. Giới hạn 12 chữ số đủ cho mọi đơn hàng thực tế.

### 3.3 Ẩn danh hoá

Ẩn danh hoá là **cập nhật tại chỗ**, không phải xoá dòng:

- `email` → `anonymized-<id rút gọn>@deleted.local`, giữ tính duy nhất
- `displayName` → `Người dùng đã rời nhóm`
- `passwordHash` → chuỗi không dùng được
- `discordId` → rỗng
- `anonymizedAt` → thời điểm hiện tại
- Toàn bộ khoá ngoại từ `Request` và `AuditLog` **giữ nguyên**

Cách này thoả BR-042 mà không cần đụng tới ràng buộc khoá ngoại. Không có thao tác nào trong hệ thống thực hiện `DELETE` trên `User`.

## 4. Thiết kế API

Điểm cuối mới hoặc thay đổi. Phần còn lại giữ nguyên.

| Method | Đường dẫn | Mục đích | Thẩm quyền | SPEC |
| --- | --- | --- | --- | --- |
| `GET` | `/api/me/permissions` | Trả danh sách thẩm quyền đã phân giải cho phía trình duyệt | đã đăng nhập | SPEC-006 |
| `GET` | `/api/affiliate/queue?createdFrom=&createdTo=` | Lọc theo khoảng ngày | `affiliate.queue.view` | SPEC-005 |
| `GET` | `/api/requests?createdFrom=&createdTo=` | Lọc theo khoảng ngày cho người mua | `request.view` | SPEC-005 |
| `PATCH` | `/api/requests/:id/order` | Sửa mã đơn và số tiền ở mọi trạng thái | `request.order_id.edit_any_status` | SPEC-008 |
| `POST` | `/api/requests/:id/claim` | Thêm cờ `override` | `affiliate.claim.override` | SPEC-007 |
| `GET` | `/api/requests/order-id-suggestion?platform=` | Gợi ý mã đơn gần nhất | đã đăng nhập | SPEC-003 |
| `POST` | `/api/admin/users/:id/anonymize` | Ẩn danh hoá sau 30 ngày | `user.manage` | SPEC-010 |
| `POST` | `/api/reconciliation/import` | Nạp tệp báo cáo, chạy ghép | `affiliate.queue.view` + phạm vi `any` | SPEC-013 |
| `GET` | `/api/reconciliation/:runId` | Xem ba nhóm kết quả ghép | như trên | SPEC-013 |
| `GET` | `/api/reconciliation/:runId/export` | Xuất tệp đã ghép cho bảng tính | như trên | SPEC-013, BR-066 |

**Quy tắc áp cho mọi điểm cuối được bảo vệ:** gọi `assertPermission` **trước** khi đọc dữ liệu. Kiểm tra xác thực đi trước kiểm tra thẩm quyền. Không điểm cuối nào được so sánh trực tiếp `actor.role === ...` hay `actor.isAdmin` — mọi so sánh kiểu đó bị coi là lỗi và phải bị ESLint chặn.

## 5. Xác thực & phân quyền

### 5.1 Hình dạng module

```ts
// src/domain/permissions/matrix.ts — nguồn chuẩn duy nhất
export const PERMISSIONS = [...] as const;
export type Permission = typeof PERMISSIONS[number];
export type Scope = "own" | "any";

export const MATRIX: Record<Role, Partial<Record<Permission, true | Scope>>> = { ... };
```

> [!TIP]
> Dùng `as const` và kiểu suy dẫn để **định danh lạ gây lỗi lúc biên dịch**, không phải lúc chạy — đây là yêu cầu tường minh trong `requirement.md` và là điều kiện chấp nhận số 6 của tài liệu đó.

### 5.2 Thứ tự chuyển đổi, bắt buộc theo đúng trình tự này

1. Viết `matrix.ts` phản ánh **đúng hành vi hiện tại**, chưa có `AFFILIATE_MASTER`.
2. Viết test cho ma trận. **Test phải xanh trước khi đụng vào bất kỳ điểm cuối nào.**
3. Thay từng điểm cuối một, từ ít rủi ro tới nhiều rủi ro. Mỗi lần thay là một commit.
4. Chỉ khi mọi điểm cuối đã dùng module chung, mới thêm `AFFILIATE_MASTER` vào ma trận.

Bước 1 và 2 là lưới an toàn. Chúng bắt ma trận mới phải chứng minh mình tương đương hành vi cũ, **trước khi** hành vi mới được thêm vào. Làm ngược thứ tự này thì khi có lỗi bạn sẽ không biết do chuyển đổi hay do vai mới.

### 5.3 Phía trình duyệt

Phía trình duyệt nhận danh sách thẩm quyền đã phân giải từ `/api/me/permissions` và chỉ dùng để **ẩn hiện**. Nó không được chứa bản sao của ma trận. Việc ẩn một nút không bao giờ được coi là cấp phép (BR-035).

## 6. Triển khai — hợp nhất về một nền tảng

### 6.1 Vấn đề đang có

Hiện tại: Netlify cho môi trường thử, Vercel cho môi trường thật. Hai đường dựng bản chạy khác nhau cho cùng một ứng dụng Next.js — middleware, edge runtime, tối ưu ảnh đều có hành vi lệch nhau. Hệ quả: **môi trường thử báo xanh không còn bảo đảm môi trường thật xanh**, tức là mất luôn tác dụng chính của việc có môi trường thử.

Vấn đề cần giải là *chạy song song hai nền tảng*, không phải nền tảng cụ thể nào.

### 6.2 Quyết định: Vercel cho cả hai môi trường

Đúng theo baseline. Môi trường thử dùng **Vercel Preview Deployment** thay vì một site riêng: mỗi nhánh và mỗi pull request tự có URL riêng, và quan trọng nhất là **dựng bằng đúng pipeline của môi trường thật**. Đó chính xác là thứ môi trường thử cần.

Gỡ Netlify và `@netlify/plugin-nextjs` khỏi dự án. Giữ lại `@vercel/analytics` và `@vercel/speed-insights` — chúng hoạt động đúng trên nền tảng này.

### 6.3 Rủi ro đã chấp nhận

Gói Hobby của Vercel giới hạn ở mục đích phi thương mại, và định nghĩa của họ rộng hơn cách hiểu thông thường. Hệ thống này sinh hoa hồng affiliate nhưng chỉ phục vụ một nhóm dưới 10 người quen biết, không bán gì cho ai, không quảng cáo, không nhận đóng góp. Chủ dự án đã cân nhắc và **chấp nhận rủi ro này** — xem TR-7 để biết dấu hiệu cảnh báo sớm và phương án dự phòng.

### 6.4 Cấu hình môi trường

| Môi trường | Nền tảng | Nhánh | Cơ sở dữ liệu |
| --- | --- | --- | --- |
| Thật | Vercel Production | `main` | Neon, nhánh `main` |
| Thử | Vercel Preview Deployment | mọi nhánh và pull request | Neon, nhánh `uat` |

Neon có phân nhánh cơ sở dữ liệu ở gói miễn phí: nhánh `uat` cùng lược đồ, dữ liệu tách biệt, và đây là chỗ dữ liệu mẫu nằm. Biến môi trường trỏ tới nhánh cơ sở dữ liệu nào được đặt riêng theo từng môi trường trên Vercel.

## 7. Chi phí

| Dịch vụ | Gói | Hạn mức | Mức dùng dự kiến | Khi vượt |
| --- | --- | --- | --- | --- |
| Netlify | Free | <cite index="26-1">100 GB băng thông, 300 phút dựng, 125.000 lượt gọi hàm, 1 triệu lượt hàm biên, 10 GB lưu trữ mỗi tháng</cite> | 10 người dùng, đỉnh 50 yêu cầu/tuần — dưới 1% hạn mức | Site bị dừng tới kỳ sau, không phát sinh hoá đơn |
| Neon | Free | Đủ cho lượng dữ liệu ở quy mô này | 110 yêu cầu sau 4 tháng | Chỉ đọc tới kỳ sau |
| GitHub Actions | Free | Repo công khai không giới hạn | Vài phút mỗi lần đẩy mã | — |
| Cron ngoài | Free | Đã dùng cho thông báo | 96 lượt/ngày | — |

**Tổng: 0₫/tháng.** Với lưu lượng của 10 người, mọi hạn mức đều dư hai bậc độ lớn. Rủi ro chi phí ở dự án này bằng không; rủi ro thật nằm ở điều khoản sử dụng, đã xử lý ở §6.

## 8. Chất lượng

Áp dụng dần, không dựng hết một lượt. Thứ tự theo tỉ lệ giá trị trên công sức:

| Bước | Công cụ | Khi nào | Chặn cái gì |
| --- | --- | --- | --- |
| 1 | Vitest cho `src/domain/` | Ngay tuần đầu | Logic mã đơn và thẩm quyền sai |
| 2 | ESLint `import/no-restricted-paths` | Cùng lúc | `domain/` lỡ import ra ngoài |
| 3 | ESLint chặn `actor.role ===`, `actor.isAdmin` | Khi bắt đầu chuyển đổi §5.2 | Kiểm tra vai còn sót ngoài module chung |
| 4 | TypeScript `--noEmit` trong CI | Tuần 2 | Lỗi kiểu |
| 5 | Dữ liệu mẫu | Trước khi chuyển đổi thẩm quyền | Không có gì để thử |
| 6 | Prettier, commitlint, husky | Khi tiện | Nhiễu về định dạng |
| 7 | jscpd, knip | Cuối, nếu còn giờ | Trùng lặp và mã chết |

**Ngưỡng phủ test:** 80% số dòng cho `src/domain/`. Không đặt ngưỡng cho phần còn lại — ép phủ test ở tầng giao diện chỉ sinh ra test rác.

**Dữ liệu mẫu phải có trước bước chuyển đổi thẩm quyền.** Cụ thể: 4 tài khoản đủ 4 vai, khoảng 20 yêu cầu rải đủ ba trạng thái, có cả yêu cầu đã có người giữ lẫn chưa ai giữ, và vài mã đơn cố tình sai khuôn dạng để thử. Không có bộ này thì không kiểm chứng được 63 kịch bản trong SDD.

## 9. Rủi ro kỹ thuật

| # | Rủi ro | Mức | Giảm thiểu |
| --- | --- | --- | --- |
| TR-1 | Chuyển đổi thẩm quyền làm sai quyền trên hệ thống đang chạy, không có thông báo lỗi | **Cao** | Thứ tự bắt buộc ở §5.2: ma trận tương đương + test xanh trước, rồi mới thay từng điểm cuối, rồi mới thêm vai mới |
| TR-2 | Gỡ Netlify khỏi dự án gây gián đoạn môi trường thử | Thấp | Môi trường thật vốn đã ở Vercel nên không đụng tới; chỉ việc dựng Preview Deployment rồi tắt site Netlify |
| TR-3 | Ràng buộc khuôn dạng mã đơn chặn cả trường hợp hợp lệ mà ta chưa biết | Trung bình | Đo dữ liệu hiện có trước: nếu có mã đúng thật mà sai khuôn dạng giả định, phải nới quy tắc trước khi bật |
| TR-4 | Netlify chậm hỗ trợ bản Next.js mới | Thấp | Ghim phiên bản Next.js; không nâng cấp trong 5 tháng này |
| TR-5 | Thêm giá trị vào kiểu liệt kê `Role` yêu cầu di trú cơ sở dữ liệu trên hệ thống đang chạy | Thấp | Thêm giá trị vào kiểu liệt kê Postgres là thao tác chỉ thêm, không phá vỡ dữ liệu cũ; chạy khi ít người dùng |
| TR-6 | Cột `orderAmount` để rỗng gần hết nên vô dụng | Trung bình | Chấp nhận theo thiết kế (PD §10.9). Xem thêm §11.4: số tiền người mua trả **không bằng** giá trị đơn trong báo cáo sàn, nên giá trị của nó như khoá nối còn thấp hơn dự kiến ban đầu |
| TR-8 | `subIdStamped` là khai báo của người dùng, hệ thống không kiểm chứng được | **Cao** | Không có cách kỹ thuật nào xác minh, vì link rút gọn của sàn không lộ tham số. Cách kiểm chứng duy nhất là **hậu kiểm**: sau đợt sale đầu tiên, so tỉ lệ `subIdStamped = true` với tỉ lệ dòng báo cáo thật sự có `Sub_id1`. Lệch lớn nghĩa là quy trình chưa được tuân thủ, và đó là vấn đề con người chứ không phải phần mềm |
| TR-9 | Trích `productItemId` từ URL sai khuôn với một số dạng link | Trung bình | Chạy thử biểu thức trên toàn bộ URL đã có trước khi bật; để rỗng khi không trích được thay vì đoán |
| TR-7 | Điều khoản phi thương mại của gói Hobby | Trung bình | Dấu hiệu cảnh báo: email từ nhà cung cấp, hoặc dự án bị tạm dừng ngoài dự kiến. Phương án dự phòng: Netlify cho phép dùng thương mại ở gói miễn phí — giữ tệp cấu hình Netlify trong kho mã dưới dạng lịch sử git để chuyển lại trong vòng một buổi nếu cần |

## 10. Quyết định đã chốt

**Ghim cờ cảnh báo lệch ngày.** Khi mã đơn Shopee có phần ngày nằm ngoài vòng đời yêu cầu (SPEC-004), hệ thống cảnh báo nhưng vẫn cho lưu. Câu hỏi là **sau khi người dùng bấm lưu, cảnh báo đó đi đâu**:

| Phương án | Cách làm | Được | Mất |
| --- | --- | --- | --- |
| A — chỉ ghi dấu vết | Ghi vào `AuditLog` một bản ghi có cờ cảnh báo | Không đổi lược đồ | Muốn tìm lại các yêu cầu đáng ngờ phải lục toàn bộ dấu vết; không lọc được, không đếm được |
| B — ghim lên yêu cầu | Thêm cột `orderIdWarning boolean` trên `Request` | Lọc ra được ngay "cho tôi xem các yêu cầu có mã đơn đáng ngờ" — đúng lúc đối soát cần | Thêm một cột, và cột đó phải được tính lại mỗi khi mã đơn đổi |

Mục đích của phương án B: lúc đối soát, thay vì dò 100% số dòng, người đối soát mở danh sách đã lọc sẵn những dòng hệ thống từng nghi ngờ và xử lý trước. Cờ này là **cách hệ thống chuyển lời cảnh báo từ người nhập sang người đối soát**, vượt qua khoảng cách vài tuần giữa hai người.

> [!IMPORTANT]
> **Đã chốt: phương án B.** Thêm cột `orderIdWarning` ở §3.1. Lý do quyết: §11.3 cho thấy quy tắc ngày cần dung sai ±1 ngày, nghĩa là sau khi nới, mọi cảnh báo còn lại đều đáng xem — nên chúng xứng đáng được lưu lại để lọc.

## 11. Phân tích báo cáo sàn — dựa trên tệp mẫu thật

Nguồn: `AffiliateCommissionReport202605081008.csv`, 91 dòng, 47 cột.

### 11.1 Cấu trúc

Báo cáo ở **mức dòng sản phẩm**, không phải mức đơn hàng: 91 dòng nhưng chỉ 65 mã đơn duy nhất, 17 mã đơn xuất hiện nhiều lần. Điều này xác nhận BR-004 bằng dữ liệu thật.

**Hệ quả quan trọng cho việc ghép:** một `Request` trên hệ thống tương ứng một **sản phẩm**, còn một mã đơn tương ứng nhiều sản phẩm. Vậy khoá ghép đúng không phải mã đơn mà là **cặp (mã đơn + sản phẩm)**. Ghép chỉ bằng mã đơn sẽ cho ra quan hệ một-nhiều và vẫn phải dò tay để biết dòng nào ứng với yêu cầu nào.

### 11.2 Khuôn dạng mã đơn — đã kiểm chứng

**65/65 mã đơn khớp đúng `^[0-9]{6}[A-Z0-9]{8}$`, độ dài đều bằng 14.** BR-011 và SPEC-001 được xác nhận bằng dữ liệu thật, không còn là suy đoán từ ảnh chụp màn hình. TR-3 coi như đã giảm thiểu ở phía Shopee.

### 11.3 Phần ngày trong mã đơn lệch múi giờ

5 trong 91 dòng có phần `YYMMDD` khác ngày đặt hàng ghi trong báo cáo. Cả 5 đều đặt lúc **23:24–23:26 ngày 30/03**, còn mã đơn ghi `260331`. Kết luận: **mã đơn đánh ngày theo UTC+8, còn cột thời gian trong báo cáo theo UTC+7.**

SPEC-004 phải sửa theo: khi so sánh phần ngày, cộng dung sai **±1 ngày**, hoặc quy đổi về UTC+8 trước khi so. Không có dung sai này thì mọi đơn đặt sau 23:00 giờ Việt Nam đều bị cảnh báo oan.

### 11.4 Số tiền không dùng làm khoá nối được

Báo cáo có `Giá(₫)` và `Giá trị đơn hàng (₫)`, và hai cột này **khác nhau** — ví dụ 329.990 so với 260.856, do phân bổ khuyến mãi. Số người mua nhớ mình đã trả sẽ không khớp chính xác cột nào cả. Giá trị của `orderAmount` như khoá nối phụ vì thế **thấp hơn giả định ban đầu**; nó chỉ còn dùng để dò áng chừng.

### 11.5 Hai khoá nối tốt hơn hẳn, không cần gõ tay

| Cột trong báo cáo | Ghép với | Nhận xét |
| --- | --- | --- |
| `Item id` | Mã sản phẩm nằm sẵn trong URL sản phẩm mà người mua đã dán | Không cần ai gõ gì. Trích được bằng biểu thức chính quy từ dữ liệu đã có |
| `Sub_id1` … `Sub_id5` | Mã yêu cầu, nếu được gắn vào link affiliate lúc tạo | **Khoá hoàn hảo**: báo cáo trả về kèm đúng mã yêu cầu |

Trong tệp mẫu, `Sub_id1` **gần như trống — chỉ 1 trong 91 dòng có giá trị.** Nghĩa là công cụ này đang có sẵn nhưng chưa được dùng.

### 11.6 Trạng thái đơn ảnh hưởng số tiền

84 dòng `Hoàn thành`, 6 `Đã hủy`, 1 `Đang chờ xử lý`. Chênh lệch hoa hồng giữa "tính tất cả" và "chỉ tính hoàn thành" là 17.485₫ trên tổng 2.186.001₫. Việc ghép phải giữ nguyên cột trạng thái để bên bảng tính lọc, chứ không được lặng lẽ bỏ các dòng đã huỷ.
