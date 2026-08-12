---
doc: business-rules
version: 1.1.0
status: approved
updated: 2026-08-11
owner: Quành (Admin)
upstream: [problem-definition]
downstream: [prd, sdd, tech-spec-architecture, test-cases-specification]
---

# Business Rules — Shop Quành

| 📄 **Metadata** | 📑 **Details** |
|:---|:---|
| **Doc ID** | `business-rules` |
| **Version** | `1.1.0` |
| **Status** | 🟢 **Approved** |
| **Last Updated** | `2026-08-11` |
| **Owner** | Quành (Admin) |
| **Upstream** | [problem-definition] |
| **Downstream** | [prd], [sdd], [tech-spec-architecture], [test-cases-specification] |


Nguồn duy nhất: `01-problem-definition.md` v1.0.0 (approved). Mọi luật dưới đây đều truy ngược được về một mục cụ thể trong tài liệu đó. Những chỗ tôi không truy được đã ghi thẳng ở §5.

Tên tiếng Anh trong §1 **giữ nguyên theo hệ thống đang chạy**. Đây là dự án brownfield: đổi tên gọi lúc này chỉ tạo công đổi tên mà không tạo giá trị nghiệp vụ.

## 1. Từ điển miền

| Thuật ngữ (VI) | Term (EN) | Định nghĩa | Ghi chú |
| --- | --- | --- | --- |
| Yêu cầu | `Request` | Một lần một Buyer nêu ý định mua một sản phẩm và cần link affiliate | Thực thể trung tâm |
| Người mua | `Buyer` | Thành viên nêu yêu cầu và là người trực tiếp mua hàng | 6 người |
| Cộng tác viên | `Affiliate` | Người tạo link affiliate cho yêu cầu | 3 người |
| Quản lý cộng tác viên | `AffiliateMaster` | Người có toàn quyền nghiệp vụ trên mọi yêu cầu, không có quyền kỹ thuật | Đúng 1 người |
| Quản trị viên | `Admin` | Người bảo trì hệ thống về mặt kỹ thuật | Đúng 1 người |
| Sàn | `Platform` | Nơi bán hàng: `SHOPEE`, `TIKTOK`, `OTHER` | Danh sách do Admin cấu hình |
| Link affiliate | `affiliateLink` | Đường dẫn có gắn mã hoa hồng của nhóm | |
| Mã đơn | `orderId` | Mã định danh đơn hàng do sàn cấp | **Khoá nối duy nhất** giữa dữ liệu nhóm và dữ liệu sàn — PD §1, G-5 |
| Số tiền đơn | `orderAmount` | Số tiền Buyer thực trả cho đơn | Không bắt buộc; khoá nối phụ — PD §10.9 |
| Nhận việc | `claim` | Hành động một Affiliate giành trách nhiệm xử lý một yêu cầu | |
| Người giữ việc | `affiliateOwner` | Affiliate đang chịu trách nhiệm một yêu cầu | Rỗng nếu chưa ai nhận |
| Yêu cầu ế | `stale` | Yêu cầu chưa được điền link quá lâu | Giá trị suy dẫn, không lưu |
| Dấu vết | `AuditLog` | Bản ghi bất biến về một thay đổi có ý nghĩa nghiệp vụ | Nền tảng của việc đối soát — PD R-7 |
| Lý do đóng | `closeReason` | `BOUGHT`, `NOT_BUYING`, `INVALID`, `STALE`, `OTHER` | |
| Đối soát | `reconciliation` | Việc ghép dữ liệu nhóm với báo cáo của sàn để xác định hoa hồng | UC-3 |

## 2. Luật nghiệp vụ

### Nhóm Định nghĩa

| ID | Nhóm | Phát biểu | Nguồn | Khi vi phạm |
| --- | --- | --- | --- | --- |
| BR-001 | Định nghĩa | Mỗi `Request` thuộc về đúng một `Buyer` và đúng một `Platform` | PD §4 UC-2 | Từ chối tạo |
| BR-002 | Định nghĩa | Mỗi `Request` có đúng một trạng thái tại một thời điểm, thuộc `NEW`, `FILLED`, `CLOSED` | PD §4 | Từ chối chuyển |
| BR-003 | Định nghĩa | Một `Request` có nhiều nhất một `affiliateOwner` tại một thời điểm | PD §4 UC-1 | Từ chối nhận việc |
| BR-004 | Định nghĩa | Một `orderId` có thể gắn với **nhiều** `Request` khác nhau, vì một đơn hàng có thể gộp nhiều sản phẩm | PD §1, G-2 | — (đây là điều được phép, ghi ra để không ai đặt ràng buộc duy nhất nhầm) |

### Nhóm Ràng buộc — mã đơn và số tiền

| ID | Nhóm | Phát biểu | Nguồn | Khi vi phạm |
| --- | --- | --- | --- | --- |
| BR-010 | Ràng buộc | `orderId` là **bắt buộc** khi và chỉ khi `closeReason = BOUGHT` | PD §4 UC-4 | Từ chối đóng |
| BR-011 | Ràng buộc | `orderId` của `SHOPEE` phải gồm đúng 14 ký tự: 6 chữ số dạng `YYMMDD`, theo sau là 8 ký tự chữ in hoa hoặc chữ số | PD §1 | Từ chối, nêu rõ khuôn dạng mong đợi |
| BR-012 | Ràng buộc | `orderId` của `TIKTOK` phải gồm đúng 18 chữ số, không chứa ký tự nào khác | PD §1 | Từ chối, nêu rõ khuôn dạng mong đợi |
| BR-013 | Ràng buộc | Với `Platform` không có khuôn dạng đã biết (`OTHER`), `orderId` chỉ cần khác rỗng | PD §1 | Từ chối nếu rỗng |
| BR-014 | Suy dẫn | Với `SHOPEE`, phần `YYMMDD` trong `orderId` được hiểu là ngày đặt đơn. Nếu ngày này nằm ngoài khoảng từ ngày tạo `Request` đến ngày đóng `Request`, hệ thống **cảnh báo nhưng vẫn cho lưu** | PD §1 | Cảnh báo, ghi `AuditLog`, không chặn |
| BR-015 | Ràng buộc | `orderAmount` là **không bắt buộc**. Nếu có, phải là số dương | PD §10.9 | Từ chối giá trị ≤ 0 |
| BR-016 | Ràng buộc | Hệ thống **không** lưu, không tính và không hiển thị tỉ lệ hoa hồng hay số tiền hoa hồng | PD §10.9 | — (ràng buộc phạm vi) |
| BR-017 | Sự kiện | Khi một `Buyer` đóng một `Request` với `closeReason = BOUGHT`, hệ thống phải đề nghị dùng lại `orderId` mà chính `Buyer` đó vừa nhập gần nhất trong vòng 24 giờ | PD §1 A1, G-2 | — (giảm số lần gõ lại, giảm nguồn sinh lỗi) |

### Nhóm Sự kiện — vòng đời yêu cầu

| ID | Nhóm | Phát biểu | Nguồn | Khi vi phạm |
| --- | --- | --- | --- | --- |
| BR-020 | Sự kiện | Một `Request` mới tạo luôn ở trạng thái `NEW`, không có `affiliateOwner` | PD §4 UC-2 | — |
| BR-021 | Sự kiện | Khi một `affiliateLink` hợp lệ được điền, `Request` chuyển sang `FILLED` và người điền trở thành `affiliateOwner` nếu chưa có ai giữ | PD §4 UC-1 | — |
| BR-022 | Ràng buộc | `affiliateLink` phải là một URL dùng giao thức `http` hoặc `https` | PD §4 UC-1 | Từ chối |
| BR-023 | Sự kiện | Một `Request` ở `NEW` hoặc `FILLED` có thể chuyển sang `CLOSED` kèm một `closeReason` | PD §4 UC-4 | — |
| BR-024 | Ràng buộc | Một `Request` đã `CLOSED` không thể quay lại `NEW` hoặc `FILLED` | PD §4 | Từ chối chuyển |
| BR-025 | Ràng buộc | `orderId` và `orderAmount` **vẫn sửa được sau khi `Request` đã `CLOSED`**, nhưng chỉ bởi người có thẩm quyền tương ứng | PD §1, G-5 | Từ chối nếu thiếu thẩm quyền |
| BR-026 | Suy dẫn | Một `Request` là `stale` khi nó đang ở `NEW` và đã quá ngưỡng giờ do Admin cấu hình kể từ lúc tạo | PD §8 S-6 | — |
| BR-027 | Sự kiện | Hệ thống tự đóng các `Request` ở `NEW` hoặc `FILLED` quá ngưỡng ngày do Admin cấu hình, với `closeReason = STALE` | PD §8 S-6 | — |

### Nhóm Quyền

Ở quy mô này chỉ có hai quan hệ: **người giữ việc** và **người khác**. Mọi luật quyền đều quy về đó.

| ID | Nhóm | Phát biểu | Nguồn | Khi vi phạm |
| --- | --- | --- | --- | --- |
| BR-030 | Quyền | `Buyer` chỉ thao tác được trên `Request` do chính mình tạo | PD §3 | Từ chối |
| BR-031 | Quyền | `Affiliate` chỉ điền link, sửa ghi chú và nhả việc trên `Request` mà chính mình đang giữ, hoặc nhận `Request` chưa ai giữ | PD §3 | Từ chối |
| BR-032 | Quyền | `AffiliateMaster` thực hiện được **mọi thao tác nghiệp vụ trên mọi `Request`, bất kể ai đang giữ** — gồm tiếp quản việc của người khác, nhả việc của người khác, thay link, sửa ghi chú, đóng, và sửa `orderId` ở mọi trạng thái | PD §3, UC-5 | Từ chối |
| BR-033 | Quyền | `AffiliateMaster` **không** quản lý được tài khoản, vai trò, hay cấu hình hệ thống | PD §3 | Từ chối |
| BR-034 | Quyền | `Admin` có mọi quyền của `AffiliateMaster`, cộng thêm quản lý tài khoản, vai trò và cấu hình | PD §3 | — |
| BR-035 | Quyền | Việc ẩn một hành động khỏi giao diện **không phải** là cấp phép. Mọi thao tác đều phải được kiểm tra thẩm quyền tại phía máy chủ | PD §8 S-5 | Từ chối |

### Nhóm Sự kiện — tài khoản

| ID | Nhóm | Phát biểu | Nguồn | Khi vi phạm |
| --- | --- | --- | --- | --- |
| BR-040 | Sự kiện | Người rời nhóm bị **vô hiệu hoá tạm thời**: không đăng nhập được, nhưng mọi dữ liệu giữ nguyên | PD §12 | — |
| BR-041 | Sự kiện | Sau 30 ngày kể từ lúc vô hiệu hoá, thông tin cá nhân của tài khoản được **ẩn danh hoá**, còn `AuditLog` và các `Request` họ từng xử lý **được giữ lại nguyên vẹn** | PD R-7 | — |
| BR-042 | Ràng buộc | Không được xoá vĩnh viễn một tài khoản theo cách làm mất `AuditLog` hoặc làm mất liên kết giữa `Request` và người từng xử lý nó | PD R-7, §8 S-2, S-5 | Từ chối thao tác xoá |
| BR-043 | Ràng buộc | Vô hiệu hoá một tài khoản **không** tự động nhả các `Request` mà người đó đang giữ. Những `Request` này chỉ được giải phóng bởi `AffiliateMaster` hoặc `Admin` | PD §12, UC-5 | — (ghi ra để không ai giả định là tự động) |
| BR-044 | Ràng buộc | Tại mọi thời điểm phải tồn tại ít nhất một tài khoản `Admin` đang hoạt động | PD §3 | Từ chối vô hiệu hoá tài khoản Admin cuối cùng |

### Nhóm Đối soát

| ID | Nhóm | Phát biểu | Nguồn | Khi vi phạm |
| --- | --- | --- | --- | --- |
| BR-060 | Định nghĩa | `Sub_ID` là nhãn theo dõi do cộng tác viên gắn vào link affiliate lúc tạo link trên sàn. Sàn trả lại nguyên vẹn nhãn này trong báo cáo hoa hồng | PRD F-23 | — |
| BR-061 | Ràng buộc | Nhãn `Sub_ID` mà nhóm dùng là **mã yêu cầu**, không phải giá trị nào khác | PRD F-23 | Dòng báo cáo không ghép tự động được |
| BR-062 | Ràng buộc | `Sub_ID` chỉ ghi được lúc tạo link. Link đã tạo **không thể gắn ngược** | PRD §6 | — (ràng buộc vật lý, ghi ra để không ai lập kế hoạch dựa trên giả định sai) |
| BR-063 | Định nghĩa | Một dòng trong báo cáo của sàn tương ứng **một sản phẩm trong một đơn**, không phải một đơn | Tech-spec §11.1 | — |
| BR-064 | Suy dẫn | Khoá ghép giữa một `Request` và một dòng báo cáo, xét theo thứ tự ưu tiên: (1) `Sub_ID` khớp mã yêu cầu; (2) cặp mã đơn và mã sản phẩm; (3) không ghép được | Tech-spec §11.5 | — |
| BR-065 | Ràng buộc | Kết quả ghép luôn phân thành đúng ba nhóm: đã ghép, dòng báo cáo không có yêu cầu tương ứng, yêu cầu không có dòng báo cáo. **Không được lặng lẽ bỏ nhóm nào** | PD UC-3 | — |
| BR-066 | Ràng buộc | Trạng thái đơn trong báo cáo (`Hoàn thành`, `Đã hủy`, `Đang chờ xử lý`) phải được giữ nguyên khi xuất ra, không được lọc bỏ | Tech-spec §11.6 | Từ chối xuất tệp thiếu cột trạng thái |
| BR-067 | Ràng buộc | Việc nạp báo cáo **không bao giờ sửa đổi** dữ liệu yêu cầu đang có. Ghép là một phép đọc | PD §10.9 | Từ chối |

### Nhóm Dấu vết

| ID | Nhóm | Phát biểu | Nguồn | Khi vi phạm |
| --- | --- | --- | --- | --- |
| BR-050 | Ràng buộc | `AuditLog` là bất biến: chỉ ghi thêm, không sửa, không xoá | PD R-7 | Từ chối |
| BR-051 | Sự kiện | Phải ghi `AuditLog` khi `AffiliateMaster` hoặc `Admin` tác động lên `Request` **không thuộc quyền sở hữu của mình**: tiếp quản hoặc nhả việc của người khác, sửa ghi chú của người khác, thay link đã có, đóng yêu cầu của người khác | PD §8 S-5 | — |
| BR-052 | Sự kiện | Phải ghi `AuditLog` mỗi khi `orderId` hoặc `orderAmount` được tạo hoặc thay đổi, bất kể ai thực hiện và ở trạng thái nào | PD §1, G-5 | — |
| BR-053 | Ràng buộc | Mỗi bản ghi `AuditLog` phải chứa: người thực hiện, đối tượng bị tác động, loại hành động, giá trị cũ, giá trị mới, thời điểm, và nguồn thao tác | PD §8 S-5 | Từ chối ghi bản ghi thiếu trường |

## 3. Máy trạng thái của `Request`

```
            tạo yêu cầu
                 │
                 ▼
             ┌───────┐   điền link hợp lệ (BR-021)   ┌────────┐
             │  NEW  │ ────────────────────────────► │ FILLED │
             └───┬───┘                               └───┬────┘
                 │                                       │
                 │ đóng (BR-023)          đóng (BR-023)  │
                 │                                       │
                 ▼                                       ▼
             ┌──────────────────────────────────────────────┐
             │                   CLOSED                     │
             │  (BR-024: không quay lại trạng thái trước)   │
             │  orderId / orderAmount vẫn sửa được: BR-025  │
             └──────────────────────────────────────────────┘
```

**Việc nhận và nhả việc là trục độc lập với trạng thái.** Một `Request` ở `NEW` hoặc `FILLED` đều có thể đang có hoặc không có `affiliateOwner`. Gộp hai trục này lại là lỗi mô hình hoá thường gặp, nên tách ra ở đây.

`stale` (BR-026) **không phải một trạng thái** mà là giá trị suy dẫn từ `NEW` cộng thời gian trôi qua. Nó không được lưu, để không bao giờ có chuyện dữ liệu lưu bị lệch so với thực tế.

## 4. Kiểm tra nhất quán

- [x] **Không có hai luật mâu thuẫn.** Cặp đáng ngờ nhất là BR-024 (không quay lại trạng thái trước) và BR-025 (vẫn sửa được mã đơn sau khi đóng) — chúng không mâu thuẫn vì BR-025 chỉ cho sửa **dữ liệu đối soát**, không cho đổi **trạng thái**.
- [x] **Mỗi luật kiểm chứng được bằng ít nhất một test.** BR-011, BR-012, BR-015, BR-024, BR-030 → BR-035, BR-042, BR-044 là những luật nên có test trước tiên.
- [x] **Mỗi luật truy được về problem-definition** — xem cột Nguồn.
- [x] **Tổng số luật: 44**. Vượt nhẹ khoảng 15–40 khuyến nghị, chấp nhận vì nhóm Đối soát là miền nghiệp vụ mới được đưa vào phạm vi ở PRD v2.0.0.

## 5. Những chỗ tôi không truy được về problem-definition

Ghi ra thay vì lặng lẽ thêm vào:

1. **BR-044 (luôn còn ít nhất một Admin)** không có trong problem-definition. Tôi thêm vì nếu vi phạm thì không ai khôi phục được hệ thống. Nếu bạn thấy thừa, bỏ đi.
2. ~~Luật về nhập báo cáo của sàn và ghép tự động chưa có ở đây.~~ → **Đã bổ sung ở v1.1.0**: nhóm Đối soát, BR-060 đến BR-067. Nguồn là PRD v2.0.0 và phân tích tệp báo cáo thật ở tech-spec §11.
3. **Ngưỡng giờ của `stale` (BR-026) và ngưỡng ngày tự đóng (BR-027)** là tham số cấu hình, không phải luật. Tôi cố tình không ghi con số cụ thể để tránh việc tài liệu và cấu hình thật lệch nhau.
