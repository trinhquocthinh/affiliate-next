---
doc: sdd
version: 1.1.0
status: draft
updated: 2026-08-11
owner: Quành (Admin)
upstream: [prd, business-rules]
downstream: [tech-spec-architecture, test-cases-specification]
---

# SDD — Shop Quành

| 📄 **Metadata**  | 📑 **Details**                                       |
| :--------------- | :--------------------------------------------------- |
| **Doc ID**       | `sdd`                                                |
| **Version**      | `1.1.0`                                              |
| **Status**       | 🟡 **Draft**                                         |
| **Last Updated** | `2026-08-11`                                         |
| **Owner**        | Quành (Admin)                                        |
| **Upstream**     | [prd], [business-rules]                              |
| **Downstream**   | [tech-spec-architecture], [test-cases-specification] |

> [!IMPORTANT]
> Cầu nối giữa PRD và mã nguồn. Mỗi kịch bản trong tài liệu này về sau trở thành **đúng một test case** ở phase 8. Ánh xạ là 1–1: không viết kịch bản mà không định test.

> [!NOTE]
> Phạm vi: toàn bộ 8 tính năng **Must** và các tính năng **Should** đã đủ rõ để đặc tả. F-15 đến F-19 chưa đặc tả vì chưa chốt cơ chế.

## 1. Quy ước chung

> [!NOTE]
>
> - Định danh yêu cầu giữ nguyên khuôn hiện có: `REQ-YYYYMMDD-NNNN`.
> - Mọi thời điểm lưu ở UTC, hiển thị theo giờ Việt Nam (UTC+7).
> - Mọi phản hồi lỗi có dạng `{ ok: false, error: { code, message } }`; thành công có dạng `{ ok: true, data }`.
> - Thiếu xác thực → `401`. Thiếu thẩm quyền → `403`. Dữ liệu sai → `400`. Xung đột trạng thái → `409`.

## 2. Đặc tả

### SPEC-001 — Kiểm tra khuôn dạng mã đơn

**Nguồn:** US-001, BR-011, BR-012, BR-013

**Đầu vào:** `{ platform: "SHOPEE" | "TIKTOK" | "OTHER", orderId: string }`
**Đầu ra:** `{ valid: true }` | `{ valid: false, code, expectedFormat }`

**Hành vi:**

- Cắt khoảng trắng hai đầu trước khi kiểm tra.
- Chuyển mã Shopee về chữ in hoa trước khi kiểm tra và trước khi lưu.
- `SHOPEE`: khớp đúng `^[0-9]{6}[A-Z0-9]{8}$` — tổng 14 ký tự.
- `TIKTOK`: khớp đúng `^[0-9]{18}$`.
- `OTHER`: chỉ cần chuỗi sau khi cắt khoảng trắng có độ dài ≥ 1.
- Việc kiểm tra **chỉ dựa vào khuôn dạng**, không gọi ra ngoài hệ thống.

**Kịch bản:**

| #   | Given             | When                                    | Then                                          |
| --- | ----------------- | --------------------------------------- | --------------------------------------------- |
| 1   | platform = SHOPEE | orderId = `260810124VEV6B`              | valid = true                                  |
| 2   | platform = SHOPEE | orderId = `260810124VEV6` (13 ký tự)    | valid = false, code = `ERR_ORDER_ID_FORMAT`   |
| 3   | platform = SHOPEE | orderId = `260810124vev6b` (chữ thường) | valid = true, giá trị lưu là `260810124VEV6B` |
| 4   | platform = SHOPEE | orderId = `260810124VEV6B`              | valid = true, giá trị lưu đã cắt khoảng trắng |
| 5   | platform = TIKTOK | orderId = `584788646734693649`          | valid = true                                  |
| 6   | platform = TIKTOK | orderId = `58478864673469364A`          | valid = false, code = `ERR_ORDER_ID_FORMAT`   |
| 7   | platform = TIKTOK | orderId = `5847886467346936` (16 số)    | valid = false                                 |
| 8   | platform = OTHER  | orderId = `bất-kỳ-chuỗi-nào`            | valid = true                                  |
| 9   | platform = OTHER  | orderId = `   `                         | valid = false, code = `ERR_ORDER_ID_REQUIRED` |

### SPEC-002 — Đóng yêu cầu

**Nguồn:** US-001, US-004, BR-010, BR-015, BR-023, BR-024

**Đầu vào:** `{ requestId, closeReason, orderId?: string, orderAmount?: number, closeNote?: string }`
**Đầu ra:** `Request` | `Error`

**Hành vi:**

- `orderId` bắt buộc khi và chỉ khi `closeReason = BOUGHT`; nếu có thì phải qua SPEC-001.
- Nếu `closeReason ≠ BOUGHT` mà vẫn gửi `orderId`, giá trị đó **bị bỏ qua**, không lưu.
- `orderAmount` không bắt buộc; nếu có phải là số > 0. Không có giá trị mặc định.
- Chỉ chuyển được sang `CLOSED` từ `NEW` hoặc `FILLED`.

**Kịch bản:**

| #   | Given             | When                              | Then                                              |
| --- | ----------------- | --------------------------------- | ------------------------------------------------- |
| 1   | request ở FILLED  | đóng với BOUGHT + mã hợp lệ       | status = CLOSED, orderId được lưu                 |
| 2   | request ở FILLED  | đóng với BOUGHT, không có mã      | `400 ERR_ORDER_ID_REQUIRED`, không đổi trạng thái |
| 3   | request ở NEW     | đóng với NOT_BUYING               | status = CLOSED, orderId để trống                 |
| 4   | request ở NEW     | đóng với NOT_BUYING kèm mã đơn    | status = CLOSED, orderId **không** được lưu       |
| 5   | request đã CLOSED | đóng lần nữa                      | `409 ERR_INVALID_TRANSITION`                      |
| 6   | request ở FILLED  | đóng với BOUGHT + amount = 0      | `400 ERR_AMOUNT_INVALID`                          |
| 7   | request ở FILLED  | đóng với BOUGHT + amount = 250000 | lưu thành công, amount = 250000                   |
| 8   | request ở FILLED  | đóng với BOUGHT, bỏ trống amount  | lưu thành công, amount = null                     |

### SPEC-003 — Gợi ý dùng lại mã đơn gần nhất

**Nguồn:** US-002, BR-017, BR-004

**Đầu vào:** `{ actorId, platform }`
**Đầu ra:** `{ suggestion: string | null }`

**Hành vi:**

- Tìm `orderId` gần nhất mà **chính người đang thao tác** đã dùng để đóng một yêu cầu, trong vòng **24 giờ** trở lại, trên **cùng sàn**.
- Nếu không có, trả về `null` — không gợi ý gì, không báo lỗi.
- Gợi ý là đề xuất, người dùng gõ đè lên được. Giá trị người dùng gõ luôn thắng.
- Không tự điền sẵn khi người dùng chưa chọn.

**Kịch bản:**

| #   | Given                                                 | When                            | Then                                                       |
| --- | ----------------------------------------------------- | ------------------------------- | ---------------------------------------------------------- |
| 1   | tôi vừa đóng REQ-A với mã X trên Shopee 10 phút trước | mở form đóng REQ-B trên Shopee  | suggestion = X                                             |
| 2   | mã X được dùng cách đây 25 giờ                        | mở form đóng                    | suggestion = null                                          |
| 3   | mã X do **người khác** dùng cách đây 10 phút          | mở form đóng                    | suggestion = null                                          |
| 4   | tôi vừa dùng mã X trên Shopee                         | mở form đóng một yêu cầu TikTok | suggestion = null                                          |
| 5   | suggestion = X                                        | tôi gõ mã Y rồi lưu             | giá trị lưu là Y                                           |
| 6   | suggestion = X                                        | tôi chọn dùng gợi ý rồi lưu     | giá trị lưu là X, hai yêu cầu cùng mã — hợp lệ theo BR-004 |

### SPEC-004 — Cảnh báo lệch ngày trong mã Shopee

**Nguồn:** US-003, BR-014

**Đầu vào:** `{ orderId, platform: "SHOPEE", requestCreatedAt, closedAt }`
**Đầu ra:** `{ warning: boolean, code?: "WARN_ORDER_DATE_OUT_OF_RANGE" }`

**Hành vi:**

> [!WARNING]
>
> - Đọc 6 ký tự đầu làm ngày `YYMMDD`.
> - **Mã đơn đánh ngày theo UTC+8, còn hệ thống lưu thời gian theo UTC+7.** Đã kiểm chứng trên tệp báo cáo thật: 5/91 dòng lệch đúng 1 ngày, cả 5 đều là đơn đặt sau 23:00 giờ Việt Nam (tech-spec §11.3).
> - Vì vậy khoảng hợp lệ phải **nới thêm 1 ngày ở cả hai đầu**: cảnh báo chỉ khi ngày trong mã đơn sớm hơn (ngày tạo yêu cầu − 1) hoặc muộn hơn (ngày đóng + 1).
> - So sánh ở mức **ngày**, không mức giờ.
> - Cảnh báo **không bao giờ chặn** việc lưu. Khi người dùng vẫn lưu, ghi dấu vết kèm cờ cảnh báo.
> - Không áp dụng cho TikTok và các sàn khác — mã của chúng không mang thông tin ngày.

**Kịch bản:**

| #   | Given                                                           | When                            | Then                                                          |
| --- | --------------------------------------------------------------- | ------------------------------- | ------------------------------------------------------------- |
| 1   | yêu cầu tạo 08/08, đóng 10/08, mã bắt đầu `260809`              | lưu                             | warning = false                                               |
| 2   | yêu cầu tạo 08/08, đóng 10/08, mã bắt đầu `260725`              | lưu                             | warning = true, dữ liệu **vẫn được lưu**                      |
| 3   | yêu cầu tạo 08/08, đóng 10/08, mã bắt đầu `260813`              | lưu                             | warning = true, vẫn lưu                                       |
| 4   | yêu cầu tạo 10/08 lúc 23:50, mã bắt đầu `260811` (lệch múi giờ) | lưu                             | warning = false — nằm trong dung sai 1 ngày                   |
| 5   | platform = TIKTOK                                               | lưu bất kỳ mã hợp lệ nào        | warning = false, không kiểm tra ngày                          |
| 6   | warning = true                                                  | người dùng vẫn lưu              | ghi cờ `orderIdWarning = true` lên yêu cầu **và** ghi dấu vết |
| 7   | warning = true trước đó                                         | sửa mã đơn thành giá trị hợp lệ | cờ `orderIdWarning` được tính lại và trở về false             |

### SPEC-005 — Hiển thị và lọc theo ngày tạo

**Nguồn:** US-010, US-011

**Đầu vào bộ lọc:** `{ createdFrom?: date, createdTo?: date }`
**Đầu ra:** danh sách yêu cầu

**Hành vi:**

- Cột ngày tạo hiển thị `dd/mm/yyyy`. Trỏ vào hiện thêm giờ phút.
- Khoảng lọc **bao gồm cả hai đầu**, tính theo ngày ở giờ Việt Nam: `createdFrom` lấy từ 00:00:00, `createdTo` lấy tới 23:59:59.
- Chỉ có một đầu thì lọc một phía.
- `createdFrom` muộn hơn `createdTo` → `400 ERR_DATE_RANGE_INVALID`.
- Bộ lọc phản ánh vào địa chỉ trang để tải lại vẫn giữ nguyên và chia sẻ được.
- Việc xuất tệp áp dụng đúng bộ lọc đang có.

**Kịch bản:**

| #   | Given                          | When                     | Then                            |
| --- | ------------------------------ | ------------------------ | ------------------------------- |
| 1   | có yêu cầu tạo 09/09 lúc 00:15 | lọc from=09/09, to=09/09 | yêu cầu đó **có** trong kết quả |
| 2   | có yêu cầu tạo 09/09 lúc 23:45 | lọc from=09/09, to=09/09 | yêu cầu đó **có** trong kết quả |
| 3   | có yêu cầu tạo 08/09 lúc 23:59 | lọc from=09/09, to=09/09 | **không** có trong kết quả      |
| 4   | —                              | lọc from=10/09, to=09/09 | `400 ERR_DATE_RANGE_INVALID`    |
| 5   | đã lọc from=01/09, to=09/09    | tải lại trang            | bộ lọc còn nguyên               |
| 6   | đã lọc theo khoảng ngày        | xuất tệp                 | tệp chỉ chứa các dòng đang lọc  |
| 7   | chỉ đặt from=01/09             | áp dụng                  | mọi yêu cầu từ 01/09 trở đi     |

### SPEC-006 — Phân giải thẩm quyền

**Nguồn:** US-022, BR-030..BR-035

**Hợp đồng:**

```
hasPermission(actor, permission) -> boolean
assertPermission(actor, permission) -> void | throw Forbidden
canAccessRequest(actor, request, permission) -> boolean
```

> [!TIP]
> **Mô hình thẩm quyền — đề xuất rút gọn:**
> Tài liệu yêu cầu ban đầu liệt kê 24 định danh, trong đó phần lớn là cặp `.own` / `.any` của cùng một hành động. Đề xuất giữ **16 định danh** kèm một khái niệm **phạm vi** (`own` | `any`), thay vì nhân đôi định danh. Hành vi không đổi; số thứ phải nhớ giảm một phần ba.

> [!NOTE]
> **Bổ sung sau khi F-15 (đối soát) vào phạm vi giữa phase 6 — nay là 18 định danh.**
> Bảng 16 định danh được chốt **trước** khi F-15 vào phạm vi, nên ba điểm cuối đối soát không có định danh nào để dùng và đã phải tự so sánh vai. Đây là khe hở của tài liệu, không phải của mã. Hai định danh `reconciliation.*` dưới đây lấp khe hở đó.
> Phạm vi cấp cho Master/Admin theo đúng ý định đã ghi trong mã (`TODO(Epic 5)` ở `reconciliation/import/route.ts`): nhập tệp đối soát là thao tác quản trị dữ liệu, không phải việc thường ngày của Affiliate. **Affiliate thường mất quyền đối soát so với hành vi tạm thời trước đó** — đây là thu hẹp có chủ ý.

| Định danh                          | Có phạm vi | Buyer | Affiliate | AffiliateMaster | Admin |
| ---------------------------------- | :--------: | :---: | :-------: | :-------------: | :---: |
| `request.create`                   |     –      |   ✓   |     ✓     |        ✓        |   ✓   |
| `request.view`                     |     ✓      |  own  |    any    |       any       |  any  |
| `request.edit`                     |     ✓      |  own  |     –     |        –        |  any  |
| `request.close`                    |     ✓      |  own  |    own    |       any       |  any  |
| `request.buyer_note`               |     ✓      |  own  |     –     |        –        |  any  |
| `request.order_id.edit_any_status` |     –      |   –   |     –     |        ✓        |   ✓   |
| `affiliate.queue.view`             |     –      |   –   |     ✓     |        ✓        |   ✓   |
| `affiliate.claim.unclaimed`        |     –      |   –   |     ✓     |        ✓        |   ✓   |
| `affiliate.claim.override`         |     –      |   –   |     –     |        ✓        |   ✓   |
| `affiliate.unclaim`                |     ✓      |   –   |    own    |       any       |  any  |
| `affiliate.note`                   |     ✓      |   –   |    own    |       any       |  any  |
| `affiliate.fill`                   |     ✓      |   –   |    own    |       any       |  any  |
| `affiliate.bulk_close`             |     ✓      |   –   |    own    |       any       |  any  |
| `reconciliation.run`               |     –      |   –   |     –     |        ✓        |   ✓   |
| `reconciliation.export`            |     –      |   –   |     –     |        ✓        |   ✓   |
| `user.manage`                      |     –      |   –   |     –     |        –        |   ✓   |
| `config.manage`                    |     –      |   –   |     –     |        –        |   ✓   |
| `system.bulk_close`                |     –      |   –   |     –     |        –        |   ✓   |

**Hành vi:**

- Phạm vi `own` đúng khi người thao tác là chủ sở hữu tương ứng: người tạo với các quyền `request.*`, người đang giữ việc với các quyền `affiliate.*`.
- Phạm vi `any` bao hàm `own`.
- Không có thẩm quyền → `403`. Chưa xác thực → `401`. **Kiểm tra xác thực luôn đi trước kiểm tra thẩm quyền**, để không lộ ra sự tồn tại của tài nguyên.
- Định danh lạ hoặc vai lạ phải gây lỗi ngay khi biên dịch, không phải khi chạy.

**Kịch bản:**

| #   | Given                                            | When                                                  | Then                                     |
| --- | ------------------------------------------------ | ----------------------------------------------------- | ---------------------------------------- |
| 1   | Affiliate A, yêu cầu do B giữ                    | gọi `affiliate.fill`                                  | 403                                      |
| 2   | Affiliate A, yêu cầu chưa ai giữ                 | gọi `affiliate.claim.unclaimed`                       | cho phép                                 |
| 3   | Affiliate A, yêu cầu do B giữ                    | gọi `affiliate.claim.override`                        | 403                                      |
| 4   | AffiliateMaster, yêu cầu do B giữ                | gọi `affiliate.claim.override`                        | cho phép                                 |
| 5   | AffiliateMaster                                  | gọi `user.manage`                                     | 403                                      |
| 6   | AffiliateMaster                                  | gọi `config.manage`                                   | 403                                      |
| 7   | AffiliateMaster                                  | gọi `system.bulk_close`                               | 403                                      |
| 8   | Buyer, yêu cầu của người khác                    | gọi `request.view`                                    | 403                                      |
| 9   | Buyer, yêu cầu của chính mình                    | gọi `request.close`                                   | cho phép                                 |
| 10  | Chưa đăng nhập                                   | gọi bất kỳ điểm cuối được bảo vệ nào                  | 401, **không** phải 403                  |
| 11  | Người dùng gọi thẳng điểm cuối, bỏ qua giao diện | thiếu thẩm quyền                                      | 403 — ẩn nút không phải cấp phép         |
| 12  | Mã nguồn tham chiếu một định danh không tồn tại  | biên dịch                                             | lỗi biên dịch                            |
| 13  | Affiliate thường                                 | gọi `reconciliation.run` hoặc `reconciliation.export` | 403                                      |
| 14  | AffiliateMaster                                  | gọi `reconciliation.run`                              | cho phép                                 |
| 15  | AffiliateMaster, yêu cầu do B giữ                | gọi `affiliate.fill`                                  | cho phép — **không** cần tiếp quản trước |

### SPEC-007 — Tiếp quản và nhả việc của người khác

**Nguồn:** US-021, BR-003, BR-032, BR-043

**Hành vi:**

- Tiếp quản đặt người thao tác thành người giữ việc mới; người giữ cũ được ghi vào dấu vết.
- Nhả việc đưa yêu cầu về trạng thái chưa ai giữ; **không** đổi trạng thái vòng đời.
- Vô hiệu hoá tài khoản **không** tự nhả việc của người đó.
- Cả hai thao tác đều áp dụng được cho yêu cầu ở `NEW` và `FILLED`.

**Kịch bản:**

| #   | Given                                | When                     | Then                                         |
| --- | ------------------------------------ | ------------------------ | -------------------------------------------- |
| 1   | yêu cầu FILLED do A giữ              | Master tiếp quản         | người giữ = Master, trạng thái vẫn FILLED    |
| 2   | yêu cầu NEW do A giữ                 | Master nhả việc          | người giữ = rỗng, trạng thái vẫn NEW         |
| 3   | A bị vô hiệu hoá, đang giữ 3 yêu cầu | ngay sau khi vô hiệu hoá | cả 3 vẫn do A giữ                            |
| 4   | tiếp quản xong                       | đọc dấu vết              | có bản ghi kèm người giữ cũ và người giữ mới |

### SPEC-008 — Sửa mã đơn ở mọi trạng thái

**Nguồn:** US-021, BR-025, BR-052

**Hành vi:**

- `AffiliateMaster` và `Admin` sửa được `orderId` và `orderAmount` kể cả khi yêu cầu đã `CLOSED`.
- Giá trị mới vẫn phải qua SPEC-001 và SPEC-004.
- Việc sửa **không** đổi trạng thái vòng đời và không đổi `closeReason`.
- Mọi lần tạo hoặc đổi hai trường này đều ghi dấu vết kèm giá trị cũ.

**Kịch bản:**

| #   | Given                                 | When                           | Then                                  |
| --- | ------------------------------------- | ------------------------------ | ------------------------------------- |
| 1   | yêu cầu CLOSED, Master                | đổi mã đơn sang giá trị hợp lệ | lưu thành công, trạng thái vẫn CLOSED |
| 2   | yêu cầu CLOSED, Master                | đổi sang mã sai khuôn dạng     | `400 ERR_ORDER_ID_FORMAT`             |
| 3   | yêu cầu CLOSED, Affiliate thường      | đổi mã đơn                     | 403                                   |
| 4   | đổi mã thành công                     | đọc dấu vết                    | có bản ghi với giá trị cũ và mới      |
| 5   | yêu cầu CLOSED với NOT_BUYING, Master | thêm mã đơn                    | `409 ERR_ORDER_ID_NOT_APPLICABLE`     |

### SPEC-009 — Ghi dấu vết

**Nguồn:** BR-050, BR-051, BR-052, BR-053

**Cấu trúc bản ghi:** `{ actorId, requestId?, targetUserId?, action, oldValue, newValue, timestamp, source }`

**Hành vi:**

- Bắt buộc ghi khi: tiếp quản hoặc nhả việc của người khác; sửa ghi chú của người khác; thay link đã có; đóng yêu cầu của người khác; tạo hoặc đổi `orderId` / `orderAmount` bởi bất kỳ ai.
- Bản ghi thiếu bất kỳ trường bắt buộc nào thì bị từ chối ghi.
- Chỉ thêm mới; không có đường sửa hay xoá.
- **Ngoại lệ của `actorId`:** thao tác do hệ thống tự chạy (cron đóng hàng loạt theo BR-053) thật sự không có người thao tác. Những bản ghi này được phép để trống `actorId`, nhưng **phải khai báo tường minh** là việc của hệ thống — để "quên truyền `actorId`" không lặng lẽ trôi qua như một việc hợp lệ. Mọi thao tác do người dùng khởi xướng vẫn bắt buộc có `actorId`.

**Kịch bản:**

| #   | Given                                                | When | Then                                               |
| --- | ---------------------------------------------------- | ---- | -------------------------------------------------- |
| 1   | Master thay link do A điền                           | lưu  | có bản ghi với link cũ và mới                      |
| 2   | Affiliate A điền link cho yêu cầu **chính mình** giữ | lưu  | không bắt buộc ghi dấu vết vượt quyền              |
| 3   | Buyer sửa mã đơn của chính mình                      | lưu  | **vẫn** ghi dấu vết (BR-052 áp dụng cho mọi người) |
| 4   | bản ghi thiếu `actorId`                              | ghi  | bị từ chối                                         |

### SPEC-010 — Vòng đời tài khoản

**Nguồn:** US-030, BR-040, BR-041, BR-042, BR-044

**Hành vi:**

- Vô hiệu hoá: chặn đăng nhập, giữ nguyên toàn bộ dữ liệu liên quan.
- Sau 30 ngày kể từ lúc vô hiệu hoá, ẩn danh hoá: xoá thông tin cá nhân, **giữ nguyên** dấu vết và liên kết giữa yêu cầu và người từng xử lý.
- Sau khi ẩn danh, các yêu cầu cũ vẫn tra được và vẫn hiển thị một định danh ổn định thay cho tên thật.
- Không tồn tại thao tác nào xoá tài khoản theo cách làm mất dấu vết.
- Không cho vô hiệu hoá quản trị viên đang hoạt động cuối cùng.

**Kịch bản:**

| #   | Given                                           | When                                | Then                                            |
| --- | ----------------------------------------------- | ----------------------------------- | ----------------------------------------------- |
| 1   | tài khoản bị vô hiệu hoá                        | đăng nhập                           | bị từ chối                                      |
| 2   | tài khoản bị vô hiệu hoá, từng xử lý 12 yêu cầu | xem 12 yêu cầu đó                   | dữ liệu còn nguyên                              |
| 3   | đã qua 30 ngày                                  | ẩn danh hoá                         | thông tin cá nhân trống, dấu vết còn nguyên     |
| 4   | sau khi ẩn danh                                 | xem một yêu cầu người đó từng xử lý | vẫn thấy có người xử lý, dưới định danh ẩn danh |
| 5   | chỉ còn 1 quản trị viên hoạt động               | vô hiệu hoá chính tài khoản đó      | `409 ERR_LAST_ADMIN`                            |

### SPEC-011 — Ngân sách thị giác

**Nguồn:** US-040, US-041, NFR-1, NFR-2

> [!IMPORTANT]
> Đặc tả này khác các mục trên: nó ràng buộc **cái không được có**, và vẫn kiểm chứng được.

**Hành vi:**

- Không có phần tử nào chạy hiệu ứng chuyển động lặp vô hạn khi người dùng không tương tác.
- Không dùng hiệu ứng làm mờ nền diện rộng.
- Tối đa **3 màu nhấn** trên một màn hình, ngoài các mức xám. Mỗi màu mang đúng một ý nghĩa và ý nghĩa đó không đổi giữa các màn hình.
- Trạng thái và sàn dùng cùng một hệ ký hiệu ở mọi màn hình.
- Tôn trọng thiết lập giảm chuyển động của hệ điều hành.
- Màn hình đầu tiên của trang chủ chứa hành động chính của vai trò, không chứa ô thống kê rỗng.

**Kịch bản:**

| #   | Given                                          | When               | Then                                                           |
| --- | ---------------------------------------------- | ------------------ | -------------------------------------------------------------- |
| 1   | mở bất kỳ màn hình nào, không tương tác        | quan sát 10 giây   | không có phần tử nào chuyển động                               |
| 2   | danh sách 50 dòng, máy yếu nhất trong nhóm     | cuộn hết danh sách | không rớt khung hình rõ rệt                                    |
| 3   | người dùng bật giảm chuyển động ở hệ điều hành | mở ứng dụng        | mọi chuyển tiếp bị tắt                                         |
| 4   | người mua không có yêu cầu nào đang chờ        | mở trang chủ       | không thấy ô thống kê giá trị 0 chiếm chỗ                      |
| 5   | quản trị viên mở trang chủ                     | quan sát           | không thấy lặp lại nguyên bảng danh sách đã có ở màn hình khác |
| 6   | đếm màu nhấn trên màn hình danh sách           | —                  | ≤ 3 màu ngoài các mức xám                                      |

### SPEC-012 — Gắn mã yêu cầu vào link affiliate

**Nguồn:** US-050, BR-060, BR-061, BR-062

**Hành vi:**

- Màn hình điền link hiển thị mã yêu cầu ở dạng sao chép được bằng một thao tác (nút sao chép cạnh mã ở đầu biểu mẫu). Giá trị này là thứ cần dán vào ô `Sub_ID` khi tạo link trên sàn.
- Khi lưu link, hệ thống ghi `subIdStamped: boolean` — đánh dấu cộng tác viên đã xác nhận có gắn mã hay không. Đây là **khai báo của người dùng**, hệ thống không thể tự kiểm chứng vì link rút gọn của sàn không lộ tham số.
- Yêu cầu có `subIdStamped = false` được đánh dấu là sẽ phải đối soát tay.
- Không chặn việc lưu link khi chưa gắn mã — chặn sẽ khiến người dùng khai man để qua cửa.

**Kịch bản:**

| #   | Given                                | When     | Then                                                                           |
| --- | ------------------------------------ | -------- | ------------------------------------------------------------------------------ |
| 1   | mở màn hình điền link                | quan sát | thấy mã yêu cầu và nút sao chép                                                |
| 2   | lưu link, có tích xác nhận đã gắn mã | lưu      | `subIdStamped = true`                                                          |
| 3   | lưu link, không tích                 | lưu      | lưu thành công, `subIdStamped = false`, yêu cầu mang dấu hiệu cần đối soát tay |
| 4   | lọc danh sách theo "chưa gắn mã"     | áp dụng  | chỉ còn các yêu cầu `subIdStamped = false`                                     |

### SPEC-013 — Nạp báo cáo sàn và ghép

**Nguồn:** US-051, BR-063, BR-064, BR-065, BR-066, BR-067

**Đầu vào:** tệp CSV báo cáo hoa hồng của sàn, mã hoá UTF-8 có BOM, 47 cột.
**Đầu ra:** kết quả ghép gồm ba nhóm.

**Hành vi:**

- Đọc các cột cần dùng: `ID đơn hàng`, `Item id`, `Tên Item`, `Thời Gian Đặt Hàng`, `Trạng thái đặt hàng`, `Trạng thái sản phẩm liên kết`, `Giá(₫)`, `Giá trị đơn hàng (₫)`, `Hoa hồng ròng tiếp thị liên kết(₫)`, `Sub_id1`. Bỏ qua các cột còn lại thay vì lỗi.
- Ghép theo thứ tự ưu tiên của BR-064: `Sub_id1` khớp mã yêu cầu trước; nếu không có thì thử cặp (mã đơn, mã sản phẩm trích từ URL sản phẩm đã lưu); nếu vẫn không thì xếp vào nhóm không ghép được.
- Mỗi dòng báo cáo ghép **độc lập**. Một mã đơn có nhiều dòng thì mỗi dòng ghép riêng.
- Kết quả luôn có đủ ba nhóm, kể cả nhóm rỗng.
- Việc nạp **không ghi đè** bất kỳ trường nào của yêu cầu. Đây là phép đọc.
- Tệp xuất ra giữ nguyên cột trạng thái đơn và trạng thái sản phẩm liên kết.

**Kịch bản:**

| #   | Given                                                                 | When         | Then                                                                |
| --- | --------------------------------------------------------------------- | ------------ | ------------------------------------------------------------------- |
| 1   | dòng báo cáo có `Sub_id1` = `REQ-20260810-0010`, yêu cầu đó tồn tại   | ghép         | ghép theo mã yêu cầu, không xét khoá khác                           |
| 2   | dòng có `Sub_id1` trỏ tới mã yêu cầu không tồn tại                    | ghép         | xếp vào nhóm không có yêu cầu tương ứng                             |
| 3   | dòng không có `Sub_id1`, mã đơn và mã sản phẩm khớp một yêu cầu       | ghép         | ghép theo cặp khoá phụ                                              |
| 4   | một mã đơn có 3 dòng sản phẩm, chỉ 1 dòng khớp                        | ghép         | 1 dòng vào nhóm đã ghép, 2 dòng vào nhóm không có yêu cầu tương ứng |
| 5   | có yêu cầu đã đóng với lý do đã mua nhưng không dòng báo cáo nào khớp | ghép         | xếp vào nhóm yêu cầu không có dòng báo cáo                          |
| 6   | tệp có dòng trạng thái `Đã hủy`                                       | ghép và xuất | dòng vẫn xuất hiện, cột trạng thái giữ nguyên                       |
| 7   | tệp có cột lạ ngoài 47 cột đã biết                                    | nạp          | nạp thành công, cột lạ bị bỏ qua                                    |
| 8   | nạp cùng một tệp hai lần                                              | nạp lần hai  | dữ liệu yêu cầu không đổi so với trước khi nạp                      |
| 9   | tệp sai định dạng, thiếu cột `ID đơn hàng`                            | nạp          | `400 ERR_REPORT_FORMAT`, không xử lý dòng nào                       |

## 3. Bảng mã lỗi

| Mã                             | HTTP | Thông điệp cho người dùng                                                                                        |
| ------------------------------ | ---- | ---------------------------------------------------------------------------------------------------------------- |
| `ERR_ORDER_ID_REQUIRED`        | 400  | Cần nhập mã đơn khi lý do đóng là đã mua                                                                         |
| `ERR_ORDER_ID_FORMAT`          | 400  | Mã đơn không đúng khuôn dạng của sàn này. Shopee: 14 ký tự bắt đầu bằng 6 chữ số ngày. TikTok: 18 chữ số         |
| `ERR_ORDER_ID_NOT_APPLICABLE`  | 409  | Yêu cầu này không đóng với lý do đã mua nên không nhận mã đơn                                                    |
| `ERR_AMOUNT_INVALID`           | 400  | Số tiền phải lớn hơn 0                                                                                           |
| `ERR_DATE_RANGE_INVALID`       | 400  | Ngày bắt đầu phải trước hoặc bằng ngày kết thúc                                                                  |
| `ERR_INVALID_TRANSITION`       | 409  | Không thể chuyển yêu cầu sang trạng thái này                                                                     |
| `ERR_LAST_ADMIN`               | 409  | Không thể vô hiệu hoá quản trị viên cuối cùng                                                                    |
| `ERR_FORBIDDEN`                | 403  | Bạn không có quyền thực hiện thao tác này                                                                        |
| `ERR_UNAUTHENTICATED`          | 401  | Vui lòng đăng nhập lại                                                                                           |
| `ERR_REPORT_FORMAT`            | 400  | Tệp báo cáo không đúng định dạng. Cần tệp CSV tải trực tiếp từ trang quản lý hoa hồng của sàn                    |
| `WARN_ORDER_DATE_OUT_OF_RANGE` | —    | Ngày trong mã đơn nằm ngoài khoảng thời gian của yêu cầu. Kiểm tra lại giúp bạn — vẫn lưu được nếu bạn chắc chắn |

## 4. Hợp đồng giữa các tầng

- Tầng nghiệp vụ **không** biết gì về HTTP. Nó ném lỗi miền; tầng trình bày dịch sang mã HTTP theo bảng trên.
- Việc kiểm tra khuôn dạng mã đơn là **một hàm thuần**, không chạm cơ sở dữ liệu, để dùng chung được cho cả phía máy chủ lẫn phía trình duyệt.
- Ma trận thẩm quyền là **một nguồn duy nhất phía máy chủ**. Phía trình duyệt chỉ nhận danh sách thẩm quyền đã phân giải và không được định nghĩa lại.
- Việc kiểm tra thẩm quyền phía máy chủ là bắt buộc kể cả khi phía trình duyệt đã ẩn thao tác.

## 5. Chưa đặc tả

- **F-16 thao tác hàng loạt, F-17 gán mã đơn cho nhiều yêu cầu, F-18 nhắc đóng, F-19 nhóm theo ngày** — xếp Could, đặc tả khi tới điều kiện kích hoạt.
- **Định dạng báo cáo của TikTok Shop** — SPEC-013 hiện chỉ đặc tả cho báo cáo Shopee. Cần một tệp mẫu của TikTok trước khi mở rộng.
