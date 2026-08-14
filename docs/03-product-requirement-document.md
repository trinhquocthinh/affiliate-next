---
doc: prd
version: 2.0.0
status: approved
updated: 2026-08-11
owner: Quành (Admin)
upstream: [problem-definition, business-rules]
downstream: [sdd, tech-spec-architecture, plan-and-scope, test-cases-specification]
---

# PRD — Shop Quành

| 📄 **Metadata**  | 📑 **Details**                                                                |
| :--------------- | :---------------------------------------------------------------------------- |
| **Doc ID**       | `prd`                                                                         |
| **Version**      | `2.0.0`                                                                       |
| **Status**       | 🟢 **Approved**                                                               |
| **Last Updated** | `2026-08-11`                                                                  |
| **Owner**        | Quành (Admin)                                                                 |
| **Upstream**     | [problem-definition], [business-rules]                                        |
| **Downstream**   | [sdd], [tech-spec-architecture], [plan-and-scope], [test-cases-specification] |

Tài liệu này trả lời _xây gì và vì sao_. Nó **không** trả lời _xây thế nào_ — phần đó thuộc SDD và tech spec.

## 1. Tóm tắt & mục tiêu

Hệ thống đang chạy tốt: 110 yêu cầu, 109 hoàn tất. Đợt phát triển này **không nhằm thêm tính năng cho phần đang chạy tốt**, mà nhằm ba việc, xếp theo giá trị đo được:

| #      | Mục tiêu                          | Vì sao                                                                               | Đo bằng            |
| ------ | --------------------------------- | ------------------------------------------------------------------------------------ | ------------------ |
| **M1** | Cắt chi phí đối soát sau đợt sale | 2 ngày/đợt × 4 đợt còn lại = ~51 giờ lao động tay, gần bằng cả quỹ phát triển 85 giờ | PD S-2a, S-2b, S-8 |

> [!WARNING]
> **Đổi hướng ở v2.0.0:** phân tích tệp báo cáo thật (tech-spec §11) cho thấy cách đạt M1 rẻ nhất **không phải** là làm sạch mã đơn người dùng gõ, mà là **gắn mã yêu cầu vào link ngay từ đầu** để báo cáo trả về đã kèm sẵn khoá ghép. Hướng cũ trở thành lưới an toàn cho những đơn mà việc theo dõi bị hụt.
> | **M2** | Tách thẩm quyền nghiệp vụ khỏi quyền kỹ thuật | Nhóm vừa tăng lên 3 affiliate; hiện chỉ có Admin mới gỡ được việc kẹt | PD S-5 |
> | **M3** | Giảm mệt mỏi thị giác khi xử lý lượng lớn | Người dùng phản ánh trực tiếp; đau nhất đúng lúc bận nhất | PD S-7 |

> [!IMPORTANT]
> M1 chiếm phần lớn giá trị. Nếu phải cắt, cắt M3 trước, M2 sau, **không bao giờ cắt M1**.

> [!CAUTION]
> Ràng buộc lịch cứng: **9/9 chỉ còn ~4 tuần**. Mọi thứ phục vụ đối soát đợt 9/9 phải xong trước đó.

## 2. Personas

Tối đa 2, theo đúng quy mô dự án.

**P1 — Người mua bận rộn.** Mở hệ thống khi thấy món muốn mua, muốn xong trong 30 giây. Không quan tâm tới đối soát và sẽ không bao giờ quan tâm. Gõ mã đơn như một thủ tục phiền phức, không biết rằng gõ sai sẽ tốn hàng giờ của người khác sau đó. **Mọi thiết kế hướng tới persona này phải giả định họ không có động lực cẩn thận** — nên hệ thống phải cẩn thận thay họ.

**P2 — Người gánh đối soát.** Vừa xử lý yêu cầu hàng ngày như một affiliate, vừa chịu trách nhiệm đối soát cuối đợt sale và gỡ việc kẹt cho người khác. Chịu toàn bộ hậu quả của những sai sót do P1 gây ra, cách đó nhiều tuần. Đây là persona đau nhất và cũng là người ít được phục vụ nhất trong hệ thống hiện tại.

## 3. User stories

### Epic E1 — Chặn lỗi mã đơn tại nguồn

**US-001** — Là người mua, tôi muốn được báo ngay khi gõ sai mã đơn, để tôi sửa được lúc còn nhớ đơn hàng của mình.
_Nguồn: BR-011, BR-012, BR-013_

- Given yêu cầu thuộc Shopee, When nhập mã 13 ký tự, Then hệ thống từ chối và nêu rõ khuôn dạng mong đợi
- Given yêu cầu thuộc TikTok, When nhập mã có chữ cái, Then hệ thống từ chối
- Given yêu cầu thuộc sàn khác, When nhập mã bất kỳ khác rỗng, Then chấp nhận
- Given mã đúng khuôn dạng, When lưu, Then yêu cầu chuyển sang đã đóng

**US-002** — Là người mua vừa mua nhiều món trong một đơn, tôi muốn dùng lại mã đơn vừa nhập thay vì gõ lại, để không gõ sai ở lần thứ hai trở đi.
_Nguồn: BR-017, BR-004_

- Given tôi đã đóng một yêu cầu với mã đơn X trong 24 giờ qua, When tôi đóng yêu cầu tiếp theo, Then hệ thống đề nghị sẵn mã X
- Given hệ thống đề nghị mã X, When tôi chọn dùng, Then mã được điền mà không cần gõ
- Given hệ thống đề nghị mã X, When tôi gõ mã khác, Then mã tôi gõ được ưu tiên

**US-003** — Là người gánh đối soát, tôi muốn hệ thống cảnh báo khi ngày trong mã đơn Shopee lệch so với vòng đời yêu cầu, để tôi phát hiện mã gắn nhầm ngay thay vì sau nhiều tuần.
_Nguồn: BR-014_

- Given mã Shopee có phần ngày nằm ngoài khoảng từ ngày tạo tới ngày đóng yêu cầu, When lưu, Then hiện cảnh báo nhưng **vẫn cho lưu** và ghi lại dấu vết
- Given người dùng bỏ qua cảnh báo, When lưu, Then dữ liệu được lưu bình thường

**US-004** — Là người mua, tôi muốn ghi lại số tiền của đơn nếu tiện, để nhóm có thêm manh mối khi mã đơn hỏng.
_Nguồn: BR-015, BR-016_

- Given tôi đang đóng yêu cầu, When bỏ trống ô số tiền, Then vẫn đóng được bình thường
- Given tôi nhập số tiền ≤ 0, When lưu, Then hệ thống từ chối
- Given tôi nhập số tiền hợp lệ, When lưu, Then số tiền được ghi kèm dấu vết

### Epic E2 — Phục vụ việc đối soát

**US-010** — Là người gánh đối soát, tôi muốn thấy ngày tạo cụ thể thay vì "34 ngày trước", để dò được yêu cầu theo mốc thời gian thật.
_Nguồn: PD UC-3, S-2a_

- Given danh sách yêu cầu, When xem cột ngày tạo, Then thấy ngày dạng `dd/mm/yyyy`
- Given tôi cần độ chính xác cao hơn, When trỏ vào ngày, Then thấy cả giờ phút

**US-011** — Là người gánh đối soát, tôi muốn lọc yêu cầu theo khoảng ngày tạo, để tách riêng đúng tập dữ liệu của một đợt sale.
_Nguồn: PD UC-3, S-2a_

- Given tôi chọn khoảng từ ngày A tới ngày B, When áp dụng, Then chỉ còn yêu cầu tạo trong khoảng đó
- Given tôi đã lọc, When xuất dữ liệu, Then tệp xuất ra chỉ chứa đúng tập đang lọc
- Given tôi đã lọc, When tải lại trang, Then bộ lọc được giữ nguyên

**US-012** — Là người gánh đối soát, tôi muốn xuất ra một tệp đã có sẵn mã đơn, ngày, sản phẩm, người mua và số tiền, để mở thẳng bằng bảng tính mà không phải gõ lại gì.
_Nguồn: PD UC-3, §10.9_

- Given tôi đã lọc theo khoảng ngày, When xuất tệp, Then tệp chứa đúng các cột đang hiển thị, đúng thứ tự
- Given tệp đã xuất, When mở bằng bảng tính, Then tiếng Việt hiển thị đúng, không lỗi phông

### Epic E3 — Thẩm quyền

**US-020** — Là quản trị viên, tôi muốn gán vai Quản lý cộng tác viên cho một người, để họ gỡ việc kẹt mà tôi không phải làm thay.
_Nguồn: BR-032, BR-034_

- Given tôi là quản trị viên, When gán vai mới cho một tài khoản, Then tài khoản đó có đủ thẩm quyền nghiệp vụ ngay lần đăng nhập kế tiếp

**US-021** — Là quản lý cộng tác viên, tôi muốn thao tác trên mọi yêu cầu bất kể ai đang giữ, để công việc của nhóm không kẹt vì phụ thuộc một người.
_Nguồn: BR-032, BR-043, PD UC-5_

- Given một yêu cầu đang do người khác giữ, When tôi tiếp quản, Then tôi trở thành người giữ việc và dấu vết ghi lại người giữ cũ
- Given một yêu cầu đang do người khác giữ, When tôi nhả việc, Then yêu cầu trở về trạng thái chưa ai giữ
- Given một yêu cầu đã đóng, When tôi sửa mã đơn, Then sửa được và dấu vết ghi lại giá trị cũ
- Given tôi thử vào phần quản lý tài khoản, When gửi yêu cầu, Then bị từ chối

**US-022** — Là quản trị viên, tôi muốn mọi thao tác đều được kiểm tra thẩm quyền ở phía máy chủ, để việc ẩn nút bấm không bị nhầm là cấp phép.
_Nguồn: BR-035_

- Given một người không đủ thẩm quyền, When gọi thẳng vào giao diện lập trình bỏ qua màn hình, Then bị từ chối
- Given một người đủ thẩm quyền, When thực hiện, Then thành công
- Given định nghĩa thẩm quyền, When nằm rải rác ở nhiều nơi, Then coi là lỗi — chỉ được có một nguồn chuẩn

### Epic E4 — Vòng đời tài khoản

**US-030** — Là quản trị viên, tôi muốn vô hiệu hoá người rời nhóm rồi ẩn danh sau 30 ngày, để dọn dẹp mà không mất dấu vết đối soát.
_Nguồn: BR-040, BR-041, BR-042_

- Given một tài khoản bị vô hiệu hoá, When người đó đăng nhập, Then bị từ chối
- Given một tài khoản bị vô hiệu hoá, When xem các yêu cầu họ từng xử lý, Then dữ liệu còn nguyên
- Given đã qua 30 ngày, When ẩn danh hoá, Then thông tin cá nhân bị xoá nhưng dấu vết và liên kết yêu cầu vẫn còn
- Given chỉ còn một quản trị viên đang hoạt động, When thử vô hiệu hoá tài khoản đó, Then bị từ chối

### Epic E5 — Giảm mệt mỏi thị giác

**US-040** — Là người dùng phải nhìn danh sách dài, tôi muốn màn hình không có hiệu ứng chuyển động nền và ít màu tương phản mạnh hơn, để mắt không mỏi khi xử lý hàng chục dòng.
_Nguồn: PD R-1, S-7_

- Given tôi mở bất kỳ màn hình nào, When trang hiển thị, Then không có phần tử nào chuyển động liên tục ở nền
- Given tôi xem danh sách yêu cầu, When đếm số màu nhấn khác nhau trên màn hình, Then không quá 3 màu ngoài các mức xám
- Given tôi dùng máy cấu hình thấp, When cuộn danh sách 50 dòng, Then cuộn mượt

**US-041** — Là người dùng, tôi muốn trang chủ hiển thị thứ tôi cần làm hôm nay thay vì các ô số bằng không, để không phải cuộn qua phần vô ích.
_Nguồn: PD §4, R-1_

- Given tôi không có yêu cầu nào đang chờ, When mở trang chủ, Then không thấy các ô thống kê rỗng chiếm chỗ
- Given tôi vừa mở trang chủ, When nhìn màn hình đầu tiên, Then thấy ngay hành động chính của vai trò mình
- Given tôi là quản trị viên, When mở trang chủ, Then không thấy lặp lại nguyên bảng danh sách vốn đã có ở màn hình khác

### Epic E6 — Ghép dữ liệu tự động

**US-050** — Là cộng tác viên, tôi muốn gắn mã yêu cầu vào link affiliate lúc tạo, để báo cáo của sàn trả về đã kèm sẵn mã yêu cầu.
_Nguồn: PD G-5, §1 A1_

- Given tôi mở một yêu cầu để điền link, When nhìn màn hình, Then thấy mã yêu cầu ở dạng sao chép được bằng một thao tác
- Given tôi đã tạo link kèm mã yêu cầu ở ô Sub_ID của sàn, When lưu link vào hệ thống, Then hệ thống ghi nhận link đó đã được gắn mã
- Given một link được lưu mà chưa gắn mã, When xem yêu cầu, Then thấy dấu hiệu cho biết yêu cầu này sẽ phải đối soát tay

**US-051** — Là người gánh đối soát, tôi muốn nạp tệp báo cáo của sàn và để hệ thống tự ghép, để chỉ phải xem những dòng không ghép được.
_Nguồn: PD UC-3, S-2a, S-2b_

- Given tôi nạp tệp báo cáo, When hệ thống ghép xong, Then thấy ba nhóm: đã ghép, dòng báo cáo không có yêu cầu tương ứng, yêu cầu không có dòng báo cáo
- Given một dòng báo cáo có mã yêu cầu trong Sub_ID, When ghép, Then ghép theo mã yêu cầu và bỏ qua mọi khoá khác
- Given một dòng không có Sub_ID, When ghép, Then thử ghép theo cặp mã đơn và mã sản phẩm
- Given ghép xong, When xuất tệp, Then tệp chứa cả dữ liệu nhóm lẫn dữ liệu sàn trên cùng một dòng, giữ nguyên cột trạng thái đơn
- Given một mã đơn ứng với nhiều dòng sản phẩm, When ghép, Then mỗi dòng ghép độc lập, không gộp

## 4. Bảng tính năng

| #    | Tính năng                                         | Epic | MoSCoW    | Business rule      | Ghi chú                                                                                         |
| ---- | ------------------------------------------------- | ---- | --------- | ------------------ | ----------------------------------------------------------------------------------------------- |
| F-01 | Kiểm tra khuôn dạng mã đơn theo từng sàn          | E1   | **Must**  | BR-011..013        | Tấn công trực diện nguyên nhân A1                                                               |
| F-02 | Đề nghị dùng lại mã đơn gần nhất                  | E1   | Should    | BR-017, BR-004     | Hạ từ Must: F-23 xử lý nguồn lỗi này triệt để hơn                                               |
| F-03 | Trường số tiền đơn, không bắt buộc                | E1   | Should    | BR-015             | Hạ từ Must: tech-spec §11.4 cho thấy số tiền người mua trả không khớp cột nào trong báo cáo sàn |
| F-04 | Hiển thị ngày cụ thể thay cho "x ngày trước"      | E2   | **Must**  | PD UC-3            | **Hạn 9/9**                                                                                     |
| F-05 | Lọc theo khoảng ngày tạo                          | E2   | **Must**  | PD UC-3            | **Hạn 9/9**                                                                                     |
| F-06 | Module thẩm quyền tập trung, một nguồn chuẩn      | E3   | **Must**  | BR-035             | Nền cho F-07                                                                                    |
| F-07 | Vai Quản lý cộng tác viên                         | E3   | **Must**  | BR-032, BR-033     | Làm **sau** F-06                                                                                |
| F-08 | Gỡ hiệu ứng nền, giảm số màu nhấn                 | E5   | **Must**  | PD R-1             | Rẻ, thấy ngay                                                                                   |
| F-09 | Xuất tệp đối soát theo bộ lọc                     | E2   | Should    | PD UC-3            | Cắt phần gõ lại tay                                                                             |
| F-10 | Cảnh báo lệch ngày trong mã Shopee                | E1   | Should    | BR-014             | Cảnh báo, không chặn                                                                            |
| F-11 | Sửa mã đơn và số tiền ở mọi trạng thái            | E3   | Should    | BR-025             | Dọn dữ liệu cũ đã sai                                                                           |
| F-12 | Ghi dấu vết cho thao tác vượt quyền sở hữu        | E3   | Should    | BR-051..053        |                                                                                                 |
| F-13 | Ẩn danh hoá tài khoản sau 30 ngày                 | E4   | Should    | BR-040..042        |                                                                                                 |
| F-14 | Thiết kế lại trang chủ theo vai trò               | E5   | Should    | PD §4              |                                                                                                 |
| F-15 | Nạp báo cáo sàn, ghép tự động, chỉ hiện dòng lệch | E6   | **Must**  | _(cần bổ sung BR)_ | Đã có tệp mẫu thật; đây là thứ cắt được phần lớn 51 giờ                                         |
| F-16 | Thao tác hàng loạt trên nhiều yêu cầu             | E2   | Could     | —                  | Kích hoạt nếu 11/11 vượt 80 yêu cầu/tuần                                                        |
| F-17 | Gán một mã đơn cho nhiều yêu cầu cùng lúc         | E2   | Could     | BR-004             | Kích hoạt sau ≥3 lần đơn gộp                                                                    |
| F-18 | Nhắc người mua đóng yêu cầu còn treo              | E2   | Could     | BR-026             |                                                                                                 |
| F-19 | Nhóm danh sách theo ngày ở màn hình của người mua | E5   | Could     | PD UC-3            |                                                                                                 |
| F-20 | Tính và lưu tiền hoa hồng                         | —    | **Won't** | BR-016             | Thuộc bảng tính, không thuộc hệ thống                                                           |
| F-21 | Tạo yêu cầu từ nền tảng chat                      | —    | **Won't** | —                  | PD §10.2                                                                                        |
| F-22 | Theo dõi hạn dùng của link                        | —    | **Won't** | —                  | PD §10.1                                                                                        |
| F-23 | Gắn mã yêu cầu vào Sub_ID của link affiliate      | E6   | **Must**  | _(cần bổ sung BR)_ | **Hạn 9/9 — không thể bù về sau**, xem §6                                                       |

> [!NOTE]
> **Kỷ luật MoSCoW:** 8 Must trên tổng 23 tính năng = **35%**, nằm dưới trần 40%. Việc thêm F-15 và F-23 vào Must được bù bằng cách hạ F-02 và F-03 xuống Should — trần không bị phá.

## 5. Yêu cầu phi chức năng

Chỉ giữ những gì đo được và thực sự cần ở quy mô 10 người. Mọi thứ khác đã bị xoá khỏi tài liệu này một cách có chủ ý.

| #     | Yêu cầu                                                  | Ngưỡng                                                | Cách đo                               |
| ----- | -------------------------------------------------------- | ----------------------------------------------------- | ------------------------------------- |
| NFR-1 | Danh sách 50 yêu cầu cuộn mượt trên máy cấu hình thấp    | Không rớt khung hình rõ rệt khi cuộn                  | Cuộn thử trên máy yếu nhất trong nhóm |
| NFR-2 | Thời gian hiển thị nội dung chính của màn hình danh sách | < 2 giây trên mạng 4G                                 | Đo thực tế                            |
| NFR-3 | Dùng được trên điện thoại                                | Mọi thao tác của người mua làm được trên màn hình dọc | Thử tay                               |
| NFR-4 | Dấu vết không mất khi dọn dẹp tài khoản                  | Không mất bản ghi nào                                 | Kiểm chứng bằng test                  |

## 6. Phạm vi phát hành

| Mốc        | Thời hạn    | Nội dung                            | Định nghĩa "xong"                                                                                   |
| ---------- | ----------- | ----------------------------------- | --------------------------------------------------------------------------------------------------- |
| **R1**     | Trước 9/9   | **F-23**, F-04, F-05, F-08          | Mọi link tạo từ 9/9 trở đi đều mang mã yêu cầu; đối soát lọc được theo ngày; không còn hiệu ứng nền |
| **R2**     | Trước 11/11 | **F-15**, F-01, F-06, F-07, F-09    | Nạp được báo cáo sàn và ghép tự động; mã đơn sai bị chặn tại chỗ nhập; vai mới hoạt động            |
| **R3**     | Trước 12/12 | F-02, F-03, F-10..F-14              | Đối soát đợt 12/12 dưới 1 giờ                                                                       |
| **Sau đó** | —           | F-15..F-19 theo điều kiện kích hoạt | —                                                                                                   |

> [!TIP]
> Lý do F-08 nằm ở R1 dù thuộc mục tiêu ưu tiên thấp nhất: nó rẻ, người dùng thấy ngay, và nó mua đà cho 5 tháng còn lại.

> [!CAUTION]
> **Lý do F-23 phải nằm ở R1, quan trọng hơn mọi lý do khác trong tài liệu này:** Sub_ID chỉ được ghi vào lúc **tạo link**. Mọi link đã tạo trước đó không thể gắn ngược. Nghĩa là mỗi đợt sale trôi qua mà chưa bật F-23 là **một đợt dữ liệu vĩnh viễn không ghép tự động được** — phải dò tay mãi mãi. Đây là hạn chót duy nhất trong toàn dự án mà lỡ thì không bù lại được. F-15 có thể chậm; F-23 thì không.

## 7. Số liệu theo dõi

Tối đa 3. Nhiều hơn thì không ai theo dõi cái nào.

| #         | Số liệu                                           | Nền hiện tại               | Đích                             |
| --------- | ------------------------------------------------- | -------------------------- | -------------------------------- |
| **KPI-1** | Thời gian đối soát trọn một đợt sale              | 2 ngày                     | ≤ 4 giờ (11/11), ≤ 1 giờ (12/12) |
| **KPI-2** | Tỉ lệ dòng báo cáo ghép tự động được              | ~1% (theo tệp mẫu tháng 5) | > 80% (11/11)                    |
| **KPI-3** | Số người trong nhóm thấy giao diện đã dễ chịu hơn | 0/9                        | ≥ 7/9 (31/12)                    |

> [!NOTE]
> KPI-2 đã có số nền từ tệp báo cáo mẫu: chỉ **1 trên 91 dòng** có Sub_ID. Đây vừa là mốc xuất phát vừa là bằng chứng rằng công cụ đã sẵn có nhưng chưa được dùng.
> Bổ sung (đo ở Epic 1): Tỉ lệ trích xuất thành công `productItemId` (khoá phụ 2) từ URL cũ đạt **81%** (22/27). Tỉ lệ mã đơn sai khuôn dạng hiện tại là **33%** (2/6), đây là số nền sẽ được kiểm soát ở Epic 6.

## 8. Out of scope

Kế thừa toàn bộ 9 mục ở problem-definition §10, và bổ sung:

1.  **Giao diện quản lý ma trận thẩm quyền.** Thay đổi thẩm quyền phải đi qua sửa mã nguồn và một lần triển khai — có chủ đích, để không ai đổi nhầm lúc nửa đêm.
2.  **Thông báo thời gian thực.** Cơ chế thông báo theo lô hiện tại đã đủ cho nhịp độ của nhóm.
3.  **Lịch sử phiên bản của từng yêu cầu dưới dạng xem lại được.** Dấu vết được ghi, nhưng không xây màn hình duyệt lịch sử.
