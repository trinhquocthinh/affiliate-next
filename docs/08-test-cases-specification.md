---
doc: test-cases-specification
version: 1.0.0
status: approved
updated: 2026-08-11
owner: Quành (Admin)
upstream: [sdd, business-rules]
downstream: [master-plan]
---

# Test Cases Specification — Shop Quành

| 📄 **Metadata** | 📑 **Details** |
| :--- | :--- |
| **Doc ID** | `test-cases-specification` |
| **Version** | `1.0.0` |
| **Status** | 🟢 **Approved** |
| **Last Updated** | `2026-08-11` |
| **Owner** | Quành (Admin) |
| **Upstream** | [sdd], [business-rules] |
| **Downstream** | [master-plan] |

Ánh xạ **1–1** với 79 kịch bản trong `04-sdd.md` v1.1.0, cộng biên và trường hợp âm không có trong SDD. Không viết TC nào thiếu nguồn SPEC/BR.

## 1. Tỉ lệ tầng

| Tầng | Mục tiêu | Vì sao |
| --- | --- | --- |
| Unit (`src/domain/`) | ~70% | Hàm thuần, không mock, chạy trong mili-giây — chỗ rẻ nhất để bắt lỗi |
| Integration (route handler + DB thật trên nhánh `uat`) | ~25% | Nơi thẩm quyền, dấu vết, và ràng buộc cơ sở dữ liệu thực sự gặp nhau |
| E2E (trình duyệt thật) | ~5% | Đắt và giòn. Chỉ dùng cho luồng chạm tới tiền hoặc luồng mất dữ liệu nếu sai |

Ở quy mô 88 giờ, e2e giới hạn **đúng 4 kịch bản**: điền link chạy suốt (chạm hoa hồng), đóng yêu cầu kèm mã đơn (chạm đối soát), tiếp quản việc của người khác (chạm dữ liệu người khác), ẩn danh hoá tài khoản (không thể hoàn tác).

## 2. Quy ước

- Tên file: `<module>.test.ts` cạnh file nguồn trong `src/domain/`; `<route>.integration.test.ts` trong `tests/integration/`; `<flow>.e2e.test.ts` trong `tests/e2e/`.
- Tên test: `it("<given>, khi <when>, thì <then>")` — giữ nguyên cấu trúc Given/When/Then của SDD để đối chiếu ngược dễ dàng.
- Mock: tầng unit không mock gì (hàm thuần). Tầng integration mock duy nhất thời gian hệ thống (`vi.useFakeTimers`) để test được BR-014 và BR-026 mà không phải chờ thật.
- Dữ liệu mẫu: dùng bộ cố định mô tả ở §5, không sinh ngẫu nhiên — kết quả phải lặp lại y hệt giữa các lần chạy.
- Ngưỡng phủ: **80% số dòng** cho `src/domain/`. Không đặt ngưỡng cho `src/app/`, `src/components/` — ép phủ ở tầng giao diện chỉ sinh test rác.

## 3. Bảng test case

### SPEC-001 — Kiểm tra khuôn dạng mã đơn (unit)

| ID | Kịch bản SDD | Loại | Kỳ vọng |
| --- | --- | --- | --- |
| TC-001 | #1 Shopee hợp lệ | happy | `valid: true` |
| TC-002 | #2 Shopee thiếu 1 ký tự | biên | `valid: false`, `ERR_ORDER_ID_FORMAT` |
| TC-003 | #3 Shopee chữ thường | happy | `valid: true`, lưu dạng in hoa |
| TC-004 | #4 Shopee có khoảng trắng hai đầu | biên | `valid: true`, đã cắt |
| TC-005 | #5 TikTok hợp lệ | happy | `valid: true` |
| TC-006 | #6 TikTok có chữ cái | âm | `valid: false` |
| TC-007 | #7 TikTok 16 số | biên | `valid: false` |
| TC-008 | #8 OTHER bất kỳ | happy | `valid: true` |
| TC-009 | #9 OTHER rỗng | âm | `valid: false`, `ERR_ORDER_ID_REQUIRED` |
| TC-010 | *(mới)* Shopee 15 ký tự | biên | `valid: false` |
| TC-011 | *(mới)* TikTok 18 số toàn số 0 | biên | `valid: true` — không có luật nào cấm |
| TC-012 | *(mới)* `platform` không thuộc 3 giá trị đã biết | lỗi | ném lỗi kiểu ở biên dịch, không chạy tới runtime |

### SPEC-002 — Đóng yêu cầu (integration)

| ID | Kịch bản SDD | Loại | Kỳ vọng |
| --- | --- | --- | --- |
| TC-013 | #1 BOUGHT + mã hợp lệ | happy | `CLOSED`, `orderId` lưu |
| TC-014 | #2 BOUGHT thiếu mã | âm | `400`, trạng thái không đổi |
| TC-015 | #3 NOT_BUYING | happy | `CLOSED`, `orderId` rỗng |
| TC-016 | #4 NOT_BUYING kèm mã | âm | `CLOSED`, mã **không** lưu |
| TC-017 | #5 đóng yêu cầu đã CLOSED | lỗi | `409 ERR_INVALID_TRANSITION` |
| TC-018 | #6 amount = 0 | biên | `400 ERR_AMOUNT_INVALID` |
| TC-019 | #7 amount hợp lệ | happy | lưu đúng giá trị |
| TC-020 | #8 amount bỏ trống | happy | `orderAmount = null` |
| TC-021 | *(mới)* amount âm | âm | `400` |
| TC-022 | *(mới)* đóng yêu cầu không thuộc quyền sở hữu, không phải Master/Admin | âm | `403` |

### SPEC-003 — Gợi ý dùng lại mã đơn gần nhất (integration)

| ID | Kịch bản SDD | Loại | Kỳ vọng |
| --- | --- | --- | --- |
| TC-023 | #1 trong 24h, cùng người, cùng sàn | happy | trả về gợi ý |
| TC-024 | #2 quá 24h | biên | `null` |
| TC-025 | #3 người khác dùng | âm | `null` |
| TC-026 | #4 khác sàn | âm | `null` |
| TC-027 | #5 gõ đè gợi ý | happy | giá trị gõ thắng |
| TC-028 | #6 chọn dùng gợi ý, hai yêu cầu cùng mã | happy | hợp lệ theo BR-004 |
| TC-029 | *(mới)* đúng 24 giờ 0 giây | biên | vẫn còn hiệu lực (bao gồm cả mốc) |
| TC-030 | *(mới)* 24 giờ 1 giây | biên | hết hiệu lực |

### SPEC-004 — Cảnh báo lệch ngày mã Shopee (unit)

| ID | Kịch bản SDD | Loại | Kỳ vọng |
| --- | --- | --- | --- |
| TC-031 | #1 trong khoảng | happy | `warning: false` |
| TC-032 | #2 sớm hơn ngày tạo quá dung sai | âm | `warning: true`, vẫn lưu |
| TC-033 | #3 muộn hơn ngày đóng quá dung sai | âm | `warning: true`, vẫn lưu |
| TC-034 | #4 lệch múi giờ trong dung sai ±1 | biên | `warning: false` |
| TC-035 | #5 platform khác Shopee | happy | không kiểm tra |
| TC-036 | #6 lưu dù có cảnh báo | happy | ghi cờ + dấu vết |
| TC-037 | #7 sửa lại mã hợp lệ, cờ tự tắt | happy | `orderIdWarning = false` |
| TC-038 | *(mới)* đúng biên dung sai +1 ngày | biên | `warning: false` |
| TC-039 | *(mới)* +1 ngày + 1 giây (vượt dung sai) | biên | `warning: true` |

### SPEC-005 — Hiển thị và lọc theo ngày tạo (integration)

| ID | Kịch bản SDD | Loại | Kỳ vọng |
| --- | --- | --- | --- |
| TC-040 | #1 yêu cầu 00:15 nằm trong ngày lọc | biên | có trong kết quả |
| TC-041 | #2 yêu cầu 23:45 nằm trong ngày lọc | biên | có trong kết quả |
| TC-042 | #3 ngày liền trước, ngoài khoảng | âm | không có trong kết quả |
| TC-043 | #4 from > to | lỗi | `400 ERR_DATE_RANGE_INVALID` |
| TC-044 | #5 tải lại trang giữ bộ lọc | happy | bộ lọc còn nguyên |
| TC-045 | #6 xuất tệp theo bộ lọc | happy | tệp khớp đúng tập đang lọc |
| TC-046 | #7 chỉ đặt from | happy | lọc một phía |
| TC-047 | *(mới)* chỉ đặt to | happy | lọc một phía còn lại |
| TC-048 | *(mới)* from = to | biên | đúng một ngày |

### SPEC-006 — Phân giải thẩm quyền (unit + integration)

| ID | Kịch bản SDD | Loại | Kỳ vọng |
| --- | --- | --- | --- |
| TC-049 | #1 Affiliate thao tác việc người khác giữ | âm | `403` |
| TC-050 | #2 Affiliate nhận việc chưa ai giữ | happy | cho phép |
| TC-051 | #3 Affiliate override | âm | `403` |
| TC-052 | #4 Master override | happy | cho phép |
| TC-053 | #5 Master vào `user.manage` | âm | `403` |
| TC-054 | #6 Master vào `config.manage` | âm | `403` |
| TC-055 | #7 Master vào `system.bulk_close` | âm | `403` |
| TC-056 | #8 Buyer xem yêu cầu người khác | âm | `403` |
| TC-057 | #9 Buyer đóng yêu cầu của mình | happy | cho phép |
| TC-058 | #10 chưa đăng nhập | lỗi | `401`, không phải `403` |
| TC-059 | #11 gọi thẳng bỏ qua giao diện | âm | `403` |
| TC-060 | #12 định danh không tồn tại | lỗi | lỗi biên dịch, test bằng `// @ts-expect-error` |
| TC-061 | *(mới)* Admin làm mọi thứ AffiliateMaster làm được | happy | BR-034 |
| TC-062 | *(mới)* tài khoản bị vô hiệu hoá gọi bất kỳ điểm cuối nào | âm | `401` |

### SPEC-007 — Tiếp quản và nhả việc (integration + e2e)

| ID | Kịch bản SDD | Loại | Kỳ vọng |
| --- | --- | --- | --- |
| TC-063 | #1 Master tiếp quản | happy, **e2e** | người giữ đổi, trạng thái không đổi |
| TC-064 | #2 Master nhả việc | happy | về chưa ai giữ, trạng thái không đổi |
| TC-065 | #3 vô hiệu hoá không tự nhả việc | âm | vẫn còn 3 yêu cầu do người cũ giữ |
| TC-066 | #4 dấu vết ghi người giữ cũ/mới | happy | `AuditLog` đúng cặp giá trị |

### SPEC-008 — Sửa mã đơn mọi trạng thái (integration)

| ID | Kịch bản SDD | Loại | Kỳ vọng |
| --- | --- | --- | --- |
| TC-067 | #1 Master sửa mã đơn khi CLOSED | happy | lưu, trạng thái không đổi |
| TC-068 | #2 sửa sang mã sai khuôn dạng | âm | `400` |
| TC-069 | #3 Affiliate thường thử sửa | âm | `403` |
| TC-070 | #4 dấu vết ghi giá trị cũ/mới | happy | `AuditLog` đúng |
| TC-071 | #5 sửa mã trên yêu cầu đóng NOT_BUYING | lỗi | `409 ERR_ORDER_ID_NOT_APPLICABLE` |

### SPEC-009 — Ghi dấu vết (integration)

| ID | Kịch bản SDD | Loại | Kỳ vọng |
| --- | --- | --- | --- |
| TC-072 | #1 Master thay link của A | happy | dấu vết có link cũ/mới |
| TC-073 | #2 Affiliate điền link việc mình giữ | happy | không bắt buộc dấu vết vượt quyền |
| TC-074 | #3 Buyer sửa mã đơn của chính mình | happy | vẫn ghi dấu vết — BR-052 áp cho mọi người |
| TC-075 | #4 bản ghi thiếu `actorId` | lỗi | từ chối ghi |
| TC-076 | *(mới)* thử `UPDATE` một bản ghi `AuditLog` đã có | lỗi | không có đường sửa ở tầng ứng dụng — BR-050 |

### SPEC-010 — Vòng đời tài khoản (integration + e2e)

| ID | Kịch bản SDD | Loại | Kỳ vọng |
| --- | --- | --- | --- |
| TC-077 | #1 tài khoản vô hiệu hoá đăng nhập | âm | từ chối |
| TC-078 | #2 dữ liệu 12 yêu cầu cũ còn nguyên | happy | đọc được đầy đủ |
| TC-079 | #3 ẩn danh hoá sau 30 ngày | happy, **e2e** | thông tin cá nhân trống, dấu vết còn |
| TC-080 | #4 xem yêu cầu sau khi ẩn danh | happy | thấy định danh ẩn danh, không mất liên kết |
| TC-081 | #5 vô hiệu hoá Admin cuối cùng | lỗi | `409 ERR_LAST_ADMIN` |
| TC-082 | *(mới)* ẩn danh hoá trước 30 ngày | âm | từ chối hoặc không cho gọi |

### SPEC-011 — Ngân sách thị giác (integration, kiểm bằng tay có checklist)

| ID | Kịch bản SDD | Loại | Kỳ vọng |
| --- | --- | --- | --- |
| TC-083 | #1 không phần tử chuyển động khi đứng yên | happy | quan sát 10 giây, không animation lặp |
| TC-084 | #2 cuộn 50 dòng trên máy yếu | happy | không rớt khung hình rõ rệt |
| TC-085 | #3 tôn trọng giảm chuyển động hệ điều hành | happy | mọi transition tắt |
| TC-086 | #4 trang chủ không có ô thống kê rỗng | happy | không ô giá trị 0 chiếm chỗ |
| TC-087 | #5 trang chủ Admin không lặp bảng Queue | happy | quan sát |
| TC-088 | #6 đếm màu nhấn | happy | ≤ 3 màu ngoài mức xám |

### SPEC-012 — Gắn mã yêu cầu vào link (integration + e2e)

| ID | Kịch bản SDD | Loại | Kỳ vọng |
| --- | --- | --- | --- |
| TC-089 | #1 màn hình có mã + nút sao chép | happy | hiển thị đúng |
| TC-090 | #2 lưu link có tích xác nhận | happy | `subIdStamped = true` |
| TC-091 | #3 lưu link không tích | happy, **e2e** | vẫn lưu được, `subIdStamped = false` |
| TC-092 | #4 lọc "chưa gắn mã" | happy | chỉ còn `subIdStamped = false` |

### SPEC-013 — Nạp báo cáo và ghép (integration, dùng tệp mẫu thật)

| ID | Kịch bản SDD | Loại | Kỳ vọng |
| --- | --- | --- | --- |
| TC-093 | #1 ghép theo Sub_id1 | happy | `matchMethod = SUB_ID` |
| TC-094 | #2 Sub_id1 trỏ mã không tồn tại | âm | nhóm B |
| TC-095 | #3 ghép theo cặp orderId+itemId | happy | `matchMethod = ORDER_ITEM` |
| TC-096 | #4 1 mã đơn 3 dòng, 1 khớp | biên | 1 vào A, 2 vào B |
| TC-097 | #5 yêu cầu BOUGHT không có dòng báo cáo | âm | nhóm C |
| TC-098 | #6 dòng "Đã hủy" vẫn xuất | happy | cột trạng thái giữ nguyên |
| TC-099 | #7 cột lạ ngoài 47 cột | biên | bỏ qua, không lỗi |
| TC-100 | #8 nạp cùng tệp 2 lần | happy | dữ liệu `Request` không đổi (BR-067) |
| TC-101 | #9 thiếu cột `ID đơn hàng` | lỗi | `400 ERR_REPORT_FORMAT` |
| TC-102 | *(mới, dùng tệp mẫu thật 91 dòng)* nạp toàn bộ tệp `AffiliateCommissionReport202605081008.csv` | **integration, hồi quy** | 65 mã đơn duy nhất, đúng số dòng khớp `ORDER_ITEM` theo Item id đã biết trước |

## 4. Bảng truy vết

Mọi BR-ID và SPEC-ID phải xuất hiện ở ít nhất một TC. Bảng dưới liệt kê phần **không map 1–1** — các trường hợp đặc biệt cần biết.

| BR-ID / SPEC-ID | TC liên quan | Ghi chú |
| --- | --- | --- |
| BR-044 (luôn còn 1 Admin) | TC-081 | Duy nhất luật không truy được về problem-definition (business-rules §5) — vẫn cần test vì hậu quả nặng nếu sai |
| BR-050 (AuditLog bất biến) | TC-076 | Không có kịch bản gốc trong SDD, thêm mới vì đây là bất biến dữ liệu, không phải hành vi API |
| SPEC-011 | TC-083..088 | Không test tự động được đầy đủ — xem §5 |

Không có BR-ID nào trong `02-business-rules.md` v1.1.0 (44 luật) thiếu TC tương ứng.

## 5. Giới hạn thành thật

**SPEC-011 không kiểm tra được hoàn toàn bằng máy.** "Không có phần tử nào chuyển động" kiểm được bằng cách quét CSS tìm `animation` và `@keyframes` chạy vô hạn. "Đếm màu nhấn ≤ 3" và "không rớt khung hình" thì không — chúng cần con mắt người. TC-083 đến TC-088 là **checklist kiểm bằng tay**, chạy trước mỗi lần phát hành thuộc epic E5, không chạy trong CI.

**TC-102 phụ thuộc vào một tệp cụ thể** đã có sẵn (`AffiliateCommissionReport202605081008.csv`). Test này đóng vai trò test hồi quy: nếu logic ghép đổi mà kết quả trên tệp thật này đổi theo ngoài dự kiến, đó là tín hiệu cần xem lại trước khi triển khai, không phải xem nhẹ.

## 6. Dữ liệu mẫu tối thiểu cần trước khi chạy bộ test integration

Từ tech-spec §8: 4 tài khoản đủ 4 vai (gồm 1 tài khoản đã vô hiệu hoá để test TC-062, TC-077), khoảng 20 yêu cầu rải đủ ba trạng thái NEW/FILLED/CLOSED, có cả yêu cầu đã có người giữ lẫn chưa ai giữ, vài mã đơn cố tình sai khuôn dạng, và một bản sao của tệp báo cáo mẫu thật cho TC-102.
