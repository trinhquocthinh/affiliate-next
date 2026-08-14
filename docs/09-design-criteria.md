---
doc: design-criteria
version: 1.0.0
status: approved
updated: 2026-08-11
owner: Quành (Admin)
upstream: [prd, sdd]
downstream: [master-plan]
---

# Design Criteria — Shop Quành

| 📄 **Metadata**  | 📑 **Details**    |
| :--------------- | :---------------- |
| **Doc ID**       | `design-criteria` |
| **Version**      | `1.0.0`           |
| **Status**       | 🟢 **Approved**   |
| **Last Updated** | `2026-08-11`      |
| **Owner**        | Quành (Admin)     |
| **Upstream**     | [prd], [sdd]      |
| **Downstream**   | [master-plan]     |

Tài liệu này **tự đủ**: đưa thẳng cho công cụ dựng giao diện mà không cần đọc gì khác vẫn ra đúng tinh thần.

**Đã kiểm chứng, không phải phán đoán:** ba người dùng thật đã xem một bản tắt hiệu ứng nền và giảm số màu, cạnh bản hiện tại. Cả ba xác nhận đỡ mỏi mắt hơn hẳn. R-1 trong `01-problem-definition.md` đã đóng. Tài liệu này viết dựa trên bằng chứng đó, không phải suy đoán.

## 1. Tính cách sản phẩm

| Là                                                                                 | Không phải                                                                       |
| ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| **Điềm tĩnh** — màn hình đứng yên, mắt tự chọn nơi nhìn                            | Hớn hở — không có gì nhấp nháy, trôi, hay tự chuyển động để gây chú ý            |
| **Rõ ràng** — mỗi trạng thái có đúng một cách thể hiện, lặp lại y hệt ở mọi nơi    | Trang trí — không gradient, không đổ bóng để tạo chiều sâu giả                   |
| **Nhanh tay** — thao tác chính chạm được trong một cú bấm, không phải đào qua menu | Đầy đủ tính năng phô ra — màn hình chính không cố nhét mọi con số có thể đo được |

Bài kiểm tra nhanh cho mọi thành phần mới: nếu nó khiến mắt phải xử lý nó **trước khi** xử lý dữ liệu bên dưới, nó sai tính cách.

## 2. Design token

### 2.1 Màu — tối đa 3 màu nhấn ngoài mức xám (SPEC-011)

| Vai trò                | Token                                                                      | Hex       | Dùng cho                                                                                          |
| ---------------------- | -------------------------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------- |
| Nền                    | `--bg-base`                                                                | `#0B0F0E` | Nền toàn trang, gần đen, không xanh đậm                                                           |
| Bề mặt                 | `--surface`                                                                | `#121716` | Thẻ, hàng bảng, hộp thoại                                                                         |
| Bề mặt nổi             | `--surface-raised`                                                         | `#1A211F` | Trạng thái hover, thẻ đang chọn                                                                   |
| Viền                   | `--border`                                                                 | `#242C2A` | Đường kẻ bảng, viền thẻ                                                                           |
| Chữ chính              | `--text-primary`                                                           | `#E8ECEA` | Nội dung chính                                                                                    |
| Chữ phụ                | `--text-secondary`                                                         | `#9AA6A2` | Nhãn, chú thích, dòng phụ                                                                         |
| Chữ mờ                 | `--text-tertiary`                                                          | `#5C6663` | Placeholder, dữ liệu vô hiệu                                                                      |
| **Nhấn 1 — hành động** | `--accent-action`                                                          | `#14B8A6` | Nút chính, liên kết, trạng thái đang chọn. **Ý nghĩa cố định: "bấm vào đây"**                     |
| **Nhấn 2 — cảnh báo**  | `--accent-warn`                                                            | `#D9A441` | Cờ `orderIdWarning`, yêu cầu `stale`, nhắc nhở. **Ý nghĩa cố định: "cần xem lại, chưa chặn"**     |
| **Nhấn 3 — chặn/lỗi**  | `--accent-danger`                                                          | `#DC5B5B` | Lỗi biểu mẫu, thao tác không thể hoàn tác, `403`/`400`. **Ý nghĩa cố định: "không đi tiếp được"** |
| Thành công             | dùng `--accent-action` ở độ mờ thấp hơn, **không** thêm màu xanh lá thứ tư |           | `CLOSED` với `BOUGHT`                                                                             |

**Luật cứng:** một màu — một ý nghĩa — mọi màn hình. `--accent-warn` không bao giờ dùng cho trạng thái tích cực dù cam có vẻ "ấm áp"; `--accent-danger` không bao giờ dùng để nhấn mạnh trung tính. Vi phạm luật này là lý do phổ biến nhất khiến giao diện "nhìn nhiều màu" dù đúng bảng token.

Tương phản: `--text-primary` trên `--bg-base` đạt 15.8:1, vượt xa ngưỡng AA (4.5:1). `--text-secondary` trên `--surface` đạt 5.2:1, đạt AA cho chữ thường.

### 2.2 Chữ

Font: **Inter**, self-host qua `next/font/local` — không gọi Google Fonts runtime, tránh một lượt tải mạng ngoài mỗi lần mở trang.

| Token         |   Cỡ | Đậm | Cao dòng | Dùng cho                       |
| ------------- | ---: | --- | -------: | ------------------------------ |
| `--text-2xl`  | 28px | 600 |      1.3 | Tiêu đề trang                  |
| `--text-lg`   | 18px | 600 |      1.4 | Tiêu đề thẻ, tiêu đề hộp thoại |
| `--text-base` | 14px | 400 |      1.5 | Nội dung chính, ô nhập         |
| `--text-sm`   | 13px | 400 |      1.5 | Dòng bảng, nhãn                |
| `--text-xs`   | 12px | 500 |      1.4 | Badge trạng thái, chú thích    |

Số trong bảng dữ liệu dùng `font-variant-numeric: tabular-nums` — mã đơn và số tiền phải thẳng cột khi xếp dọc, để mắt dò lệch dễ hơn.

### 2.3 Khoảng cách và hình khối

| Token                     | Giá trị                                                                                           |
| ------------------------- | ------------------------------------------------------------------------------------------------- |
| `--space-1` … `--space-8` | 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 px                                                            |
| `--radius-sm`             | 6px — ô nhập, badge                                                                               |
| `--radius-md`             | 10px — thẻ, nút                                                                                   |
| `--radius-lg`             | 16px — hộp thoại                                                                                  |
| Đổ bóng                   | **Không dùng.** Phân lớp bằng `--surface-raised` và `--border`, không dùng `box-shadow` diện rộng |
| Hiệu ứng làm mờ nền       | **Cấm tuyệt đối.** Đây là nguồn gốc chính đã xác nhận của sự mỏi mắt                              |

## 3. Kiểm kê màn hình

Mỗi màn hình: mục đích một câu, phần tử chính, và bốn trạng thái bắt buộc. **Trạng thái rỗng đứng đầu tiên trong mỗi hàng vì đây là trạng thái hay bị quên nhất — với một app dữ liệu, đó thường là màn hình đầu tiên người dùng mới thấy.**

### 3.1 Trang chủ Buyer

Mục đích: đưa buyer tới hành động chính trong một cú bấm.

| Trạng thái | Nội dung                                                                                                                                                                                    |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Rỗng**   | Không có ô thống kê giá trị 0. Chỉ một nút "Tạo yêu cầu mới" nổi bật và danh sách 5 yêu cầu gần nhất — nếu rỗng thì thay bằng một dòng chữ mời tạo yêu cầu đầu tiên, không phải khung trống |
| Đang tải   | Khung xám nhấp nháy nhẹ đúng hình dạng nội dung thật (skeleton), không spinner giữa màn hình                                                                                                |
| Lỗi        | Một dòng `--accent-danger`, kèm nút thử lại                                                                                                                                                 |
| Có dữ liệu | 5 yêu cầu gần nhất, đủ ngày cụ thể, trạng thái, sản phẩm                                                                                                                                    |

Bỏ hẳn hai ô "Active Requests" và "Ready to Collect" khỏi màn hình hiện tại — chúng chiếm nửa màn hình đầu để hiển thị số 0 (SPEC-011 kịch bản 4).

### 3.2 My Requests (Buyer)

Mục đích: buyer tra cứu và đóng yêu cầu của chính mình.

| Trạng thái | Nội dung                                                                                                                 |
| ---------- | ------------------------------------------------------------------------------------------------------------------------ |
| Rỗng       | Một dòng mời tạo yêu cầu đầu tiên                                                                                        |
| Đang tải   | Skeleton dạng hàng bảng                                                                                                  |
| Lỗi        | Dòng lỗi + thử lại                                                                                                       |
| Có dữ liệu | Bảng: mã, **ngày cụ thể** (không phải "x ngày trước" — F-04), sàn, trạng thái, sản phẩm, link. Bộ lọc khoảng ngày (F-05) |

### 3.3 Affiliate Queue

Mục đích: affiliate xử lý nhanh nhiều yêu cầu liên tiếp trong đợt cao điểm — **màn hình quan trọng nhất trong toàn hệ thống**.

| Trạng thái | Nội dung                                                                                                                                                                                          |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rỗng       | "Không có yêu cầu nào đang chờ" — không icon lớn giữa màn hình, chỉ một dòng chữ nhỏ phía trên bảng                                                                                               |
| Đang tải   | Skeleton hàng bảng, giữ nguyên chiều cao dòng để không giật layout                                                                                                                                |
| Lỗi        | Dòng lỗi trong ô tìm kiếm, không thay cả bảng                                                                                                                                                     |
| Có dữ liệu | Bảng mật độ cao: mã, mã đơn, **ngày cụ thể**, sàn, trạng thái, sản phẩm, người yêu cầu, người giữ, link. Cờ `orderIdWarning` hiện bằng chấm nhỏ `--accent-warn` cạnh mã đơn, không chiếm thêm cột |

Hai ô số ở đầu trang (`Total`, `Stale`) **giữ lại** — khác với trang chủ, đây là số có ý nghĩa thao tác thật ngay lúc affiliate cần biết còn bao nhiêu việc.

### 3.4 Điền link (bên trong Queue)

Mục đích: hoàn tất SPEC-012 trong ít thao tác nhất.

| Trạng thái | Nội dung                                                                                                                                |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Rỗng       | Không áp dụng — luôn có dữ liệu yêu cầu                                                                                                 |
| Đang tải   | Nút chuyển sang dạng đang xử lý, không khoá cả biểu mẫu                                                                                 |
| Lỗi        | Viền `--accent-danger` quanh đúng ô nhập sai, thông điệp ngay dưới ô đó                                                                 |
| Có dữ liệu | Mã yêu cầu + nút sao chép nổi bật ở đầu biểu mẫu, ô dán link, tích "đã gắn mã vào Sub_ID" — **không bắt buộc, không chặn khi bỏ trống** |

### 3.5 Đóng yêu cầu (Buyer)

| Trạng thái | Nội dung                                                                                           |
| ---------- | -------------------------------------------------------------------------------------------------- |
| Đang tải   | Nút chuyển "Đang lưu…", disable đúng một nút đó                                                    |
| Lỗi        | Thông điệp đúng theo bảng mã lỗi ở SDD §3, ngay dưới ô liên quan                                   |
| Có dữ liệu | Chọn lý do đóng → nếu `BOUGHT`: hiện ô mã đơn (gợi ý sẵn theo SPEC-003 nếu có), ô số tiền tuỳ chọn |

### 3.6 Đối soát (Affiliate Master) — màn hình mới

| Trạng thái | Nội dung                                                                                                                                                                                                             |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rỗng       | Trước khi nạp tệp: một vùng thả tệp lớn, không có gì khác trên màn hình                                                                                                                                              |
| Đang tải   | Thanh tiến trình đúng theo số dòng đang xử lý, không spinner mơ hồ                                                                                                                                                   |
| Lỗi        | `ERR_REPORT_FORMAT` hiện rõ tên cột còn thiếu                                                                                                                                                                        |
| Có dữ liệu | Ba khối rõ rệt: **Đã ghép** (thu gọn mặc định) · **Cần xem: dòng báo cáo thừa** (mở mặc định, `--accent-warn`) · **Cần xem: yêu cầu thiếu báo cáo** (mở mặc định, `--accent-danger` — đây là hoa hồng có thể đã mất) |

### 3.7 Trang chủ Admin

| Trạng thái | Nội dung                                                                                                    |
| ---------- | ----------------------------------------------------------------------------------------------------------- |
| Rỗng       | Không lặp lại nguyên bảng Queue đã có ở màn riêng (vi phạm hiện tại)                                        |
| Đang tải   | Skeleton                                                                                                    |
| Lỗi        | Dòng lỗi                                                                                                    |
| Có dữ liệu | Chỉ số có tính vận hành: số tài khoản chờ duyệt, cấu hình gần nhất đổi khi nào, không lặp dữ liệu nghiệp vụ |

## 4. Thư viện component

Giữ nguyên shadcn/ui đã dùng. Trạng thái tương tác bắt buộc cho mọi phần tử bấm được:

| Trạng thái       | Thể hiện                                                                               |
| ---------------- | -------------------------------------------------------------------------------------- |
| Mặc định         | Token màu ở §2                                                                         |
| Hover            | `--surface-raised`, **không** đổi kích thước, **không** đổ bóng mới                    |
| Focus (bàn phím) | Viền `--accent-action` dày 2px, luôn hiện — không tắt outline mặc định của trình duyệt |
| Active/pressed   | Giảm độ sáng 8%, tức thời, không hiệu ứng nảy                                          |
| Disabled         | Độ mờ 40%, con trỏ `not-allowed`                                                       |
| Đang xử lý       | Chữ nút đổi thành động từ tiếp diễn ("Đang lưu…"), không icon xoay tròn nếu tránh được |

Badge trạng thái yêu cầu (`NEW`/`FILLED`/`CLOSED`) và badge sàn (`SHOPEE`/`TIKTOK`/`OTHER`) dùng **chung một hệ hình dạng** ở mọi màn hình — bo góc, cỡ chữ, đệm giống hệt nhau dù xuất hiện ở Queue hay ở My Requests. Sự nhất quán này là thứ giảm tải nhận thức nhiều hơn bất kỳ lựa chọn màu đơn lẻ nào.

## 5. Breakpoint và hành vi mobile

| Breakpoint |     Từ | Hành vi                                                                                              |
| ---------- | -----: | ---------------------------------------------------------------------------------------------------- |
| Mobile     |    0px | Bảng Queue chuyển thành danh sách thẻ xếp dọc, mỗi thẻ = 1 yêu cầu. Bộ lọc thu vào một nút mở drawer |
| Tablet     |  768px | Bảng hiện dạng rút gọn: ẩn cột phụ (người yêu cầu), giữ cột chính                                    |
| Desktop    | 1024px | Bảng đầy đủ như §3.3                                                                                 |

NFR-3 (PRD): mọi thao tác của Buyer phải làm được trên màn hình dọc. Nút "Tạo yêu cầu" và nút đóng yêu cầu luôn ở vùng chạm dưới 1 tay trên mobile — đặt cố định gần đáy màn hình, không nằm trên cùng.

Vùng chạm tối thiểu 44×44px cho mọi phần tử bấm được trên mobile, theo chuẩn khả năng tiếp cận thông thường.

## 6. Khả năng tiếp cận

- Tương phản văn bản: tối thiểu 4.5:1 cho chữ thường, 3:1 cho chữ lớn (≥18px đậm). Bảng token ở §2.1 đã đạt.
- Thứ tự focus theo bàn phím đi từ trên xuống, trái sang phải, khớp thứ tự đọc — không dùng `tabindex` dương để nhảy cóc.
- Mọi badge trạng thái có `aria-label` đọc được đầy đủ ("Trạng thái: đã đóng"), không chỉ dựa vào màu.
- Cờ `orderIdWarning` phải có văn bản thay thế cho chấm màu, vì chấm màu đơn thuần không tiếp cận được với người khiếm thị màu.
- Tôn trọng `prefers-reduced-motion: reduce` — tắt toàn bộ transition, không chỉ giảm tốc độ (SPEC-011 kịch bản 3).

## 7. Tham chiếu

| Sản phẩm             | Điểm cụ thể cần học                                                                                                                                      |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Linear**           | Bảng dữ liệu mật độ cao vẫn thoáng mắt nhờ khoảng cách dòng nhất quán và **đúng một** màu nhấn cho hành động chính, không phải nhờ giảm dữ liệu hiển thị |
| **Vercel Dashboard** | Nền tối gần đen thật (không xanh đậm), viền mảnh 1px thay cho đổ bóng để phân lớp — đúng hướng đã chọn ở §2.3                                            |
| **Stripe Dashboard** | Cách hiện trạng thái đối soát: nhóm theo "cần hành động" trước, "đã xong" thu gọn sau — áp trực tiếp cho màn Đối soát ở §3.6                             |

## 8. Chống mẫu — không được làm

Danh sách này bắt nguồn trực tiếp từ nguyên nhân đã xác nhận gây mỏi mắt, không phải sở thích thẩm mỹ:

1. **Không hiệu ứng làm mờ nền diện rộng** (`blur()` trên phần tử `fixed` lớn) — đây là chi phí hiệu năng cao nhất và là nguồn gốc chính đã xác nhận.
2. **Không animation lặp vô hạn** ở trạng thái nghỉ — `animate-float`, `animate-pulse` chạy vĩnh viễn khi người dùng không tương tác.
3. **Không quá 3 màu nhấn** trên một màn hình — mỗi màu thêm là một thứ mắt phải phân loại trước khi đọc dữ liệu.
4. **Không gradient** trên nền hoặc thẻ.
5. **Không đổ bóng diện rộng** để tạo ảo giác nổi khối — dùng viền và phân lớp màu nền.
6. **Không spinner giữa màn hình** cho tải dữ liệu danh sách — dùng skeleton đúng hình dạng nội dung.
7. **Không ô thống kê giá trị 0** chiếm không gian màn hình đầu tiên.
8. **Không lặp lại cùng một bảng dữ liệu** ở hai màn hình khác nhau (trang chủ Admin và Queue hiện đang phạm lỗi này).
9. **Không tự phát minh hệ màu mới** cho trạng thái — mọi trạng thái mới trong tương lai phải map vào một trong 3 màu nhấn đã có ở §2.1, không thêm màu thứ tư.
