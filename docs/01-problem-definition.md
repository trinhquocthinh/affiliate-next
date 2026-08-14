---
doc: problem-definition
version: 1.0.0
status: approved
updated: 2026-08-11
owner: Quành (Admin)
upstream: []
downstream: [business-rules, prd]
---

# Problem Definition — Shop Quành

| 📄 **Metadata**  | 📑 **Details**          |
| :--------------- | :---------------------- |
| **Doc ID**       | `problem-definition`    |
| **Version**      | `1.0.0`                 |
| **Status**       | 🟢 **Approved**         |
| **Last Updated** | `2026-08-11`            |
| **Owner**        | Quành (Admin)           |
| **Upstream**     | —                       |
| **Downstream**   | [business-rules], [prd] |

## 1. Bối cảnh

Một nhóm bạn dưới 10 người ở Việt Nam thường xuyên mua sắm trên Shopee, TikTok Shop và các sàn khác. Khi một người trong nhóm mua hàng, nếu họ đi qua link affiliate của nhóm thì hoa hồng chảy về nhóm; nếu không, khoản đó mất trắng. Nhóm đã vận hành một hệ thống điều phối việc này từ khoảng tháng 4/2026 và tới nay đã xử lý **110 request, trong đó 109 đã hoàn tất, chỉ còn 2 quá hạn**. Hệ thống đang sống và đang được dùng thật.

Vấn đề hiện tại không phải là hệ thống không hoạt động, mà là nó đang bước vào giai đoạn có nhiều người tham gia hơn: từ 3 lên **6 buyer**, và từ 1 lên **3 affiliate** (hai người mới gia nhập sau khi thấy giá trị hệ thống mang lại). Cùng lúc đó, khối lượng dao động mạnh — bình thường 2–3 request/tuần, nhưng vào đợt sale có thể lên **50 request/tuần**. Cách phân chia trách nhiệm và cách trình bày thông tin vốn đủ dùng cho một người, giờ bắt đầu không đủ cho một nhóm.

Nghiêm trọng hơn cả, có một phần công việc nằm **hoàn toàn bên ngoài hệ thống**: sau mỗi đợt sale, việc đối soát hoa hồng được làm thủ công trên bảng tính và mất **2 ngày**. Trong đó khoảng **80% thời gian là dò khớp từng dòng** giữa dữ liệu của sàn và dữ liệu của nhóm, vì mã đơn nhập vào hệ thống thường xuyên sai nên hai bên không khớp. Phần còn lại — tính toán tài chính — đã có công thức sẵn và chạy nhanh.

Nói cách khác: chi phí 2 ngày này **không phải do thiếu công cụ báo cáo, mà do chất lượng của khoá nối giữa hai nguồn dữ liệu**. Báo cáo của sàn có mã đơn, sản phẩm, số tiền và hoa hồng — nhưng **không có danh tính người mua**, và sẽ không bao giờ có, vì sàn không tiết lộ điều đó. Dữ liệu của nhóm thì ngược lại: biết ai yêu cầu, ai xử lý, nhưng không biết tiền. Nghĩa là **mã đơn là khoá duy nhất nối hai bên**. Khi mã đơn sai hoặc để trống, không còn cách nào khác ngoài dò tay từng dòng theo tên sản phẩm và ngày.

Mã đơn lại được gõ tay, không kiểm tra, và một đơn gộp nhiều sản phẩm nên cùng một mã phải gõ lại nhiều lần. Từ đó sinh ra hai loại lệch cần hai cách chữa khác nhau:

- **A1 — mã đơn sai hoặc thiếu.** Do gõ tay. Phòng được bằng cách kiểm tra ngay tại chỗ nhập.
- **A2 — dòng không có đối ứng.** Báo cáo sàn có đơn mà bên nhóm không có bản ghi, hoặc ngược lại. Không phòng được bằng kỹ thuật, nhưng **khoanh vùng được**: nếu ghép tự động theo mã đơn, những dòng này chính là phần còn lại sau khi ghép.

Với 4 đợt sale còn lại trong năm, riêng phần dò khớp này tiêu khoảng **51 giờ** lao động tay, so với **85 giờ** là toàn bộ quỹ phát triển hệ thống trong cùng kỳ.

Định dạng mã đơn đã xác nhận, và **hai sàn khác nhau hoàn toàn**:

| Sàn         | Khuôn dạng                                     | Ví dụ                |
| ----------- | ---------------------------------------------- | -------------------- |
| Shopee      | 14 ký tự: `YYMMDD` + 8 ký tự chữ hoa và số     | `260810124VEV6B`     |
| TikTok Shop | 18 chữ số, thuần số, không mang thông tin ngày | `584788646734693649` |

Hệ quả: việc kiểm tra mã đơn **phải theo từng sàn**, không thể dùng một khuôn chung. Mã Shopee còn cho phép đối chiếu chéo phần ngày với thời điểm của yêu cầu; mã TikTok thì không, nên chỉ kiểm tra được độ dài và ký tự. Nói cách khác, khả năng bắt lỗi ở Shopee mạnh hơn hẳn ở TikTok — và đó là điều phải chấp nhận, không phải khiếm khuyết cần khắc phục.

## 2. Phát biểu vấn đề

> Khi số người tham gia và khối lượng yêu cầu tăng đột biến vào các đợt sale, nhóm không phân định được rõ ai được làm gì trên yêu cầu của ai, không dò lại được yêu cầu theo thời gian để đối soát, và phải nhìn quá lâu vào một lượng thông tin gây mỏi mắt đúng vào lúc cần xử lý nhanh nhất.

## 3. Người dùng mục tiêu

| Người dùng       | Mô tả                                          | Nỗi đau chính                                                                                                                 | Số lượng |
| ---------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | -------- |
| Buyer            | Thành viên trong nhóm sắp mua hàng online      | Cần link đúng lúc còn ý định mua; sau khi mua phải nhớ ghi lại mã đơn                                                         | 6        |
| Affiliate        | Người tạo link affiliate cho yêu cầu của buyer | Xử lý lượng lớn yêu cầu dồn dập trong đợt sale; khó biết yêu cầu nào đã có người nhận                                         | 3        |
| Affiliate Master | Người quản lý nhóm affiliate về mặt nghiệp vụ  | **Mất 2 ngày thủ công mỗi đợt sale để đối soát hoa hồng ngoài hệ thống**; phải gỡ kẹt hộ người khác nhưng không đủ thẩm quyền | 1        |
| Admin            | Người bảo trì hệ thống về mặt kỹ thuật         | Mọi thay đổi về thẩm quyền đều phải sửa nhiều nơi, dễ sót                                                                     | 1        |

Ghi chú: Affiliate Master và Admin là hai vai khác nhau về bản chất — một bên là **thẩm quyền nghiệp vụ**, một bên là **quyền bảo trì kỹ thuật**. Việc gộp chúng lại là nguyên nhân của nỗi đau ở dòng thứ ba.

## 4. Use case cơ bản

| #    | Use case                             | Actor            | Trigger                                        | Luồng chính                                                                      | Kết quả                                     | Tần suất                 | Ưu tiên |
| ---- | ------------------------------------ | ---------------- | ---------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------- | ------------------------ | ------- |
| UC-1 | Cung cấp link cho một yêu cầu        | Affiliate        | Có yêu cầu mới được báo                        | Nhận việc → tạo link trên sàn → gắn link vào yêu cầu                             | Buyer có link để mua                        | Ngày; bùng nổ đợt sale   | **P0**  |
| UC-2 | Nêu yêu cầu mua hàng                 | Buyer            | Thấy món muốn mua                              | Nêu sản phẩm → chờ → nhận link                                                   | Yêu cầu được ghi nhận                       | Ngày                     | P1      |
| UC-3 | Đối soát hoa hồng sau đợt sale       | Affiliate Master | Kết thúc đợt sale                              | Lọc theo khoảng thời gian → đối chiếu từng mã đơn với báo cáo của sàn → xác nhận | Biết đợt sale thu về những gì               | Mỗi đợt sale (4 lần/năm) | **P0**  |
| UC-4 | Xác nhận đã mua và ghi mã đơn        | Buyer            | Sau khi hoàn tất đơn                           | Ghi nhận mã đơn → đóng yêu cầu                                                   | Yêu cầu khép lại, có dấu vết đối soát       | Ngày                     | **P0**  |
| UC-5 | Can thiệp vào yêu cầu của người khác | Affiliate Master | Một affiliate nhận việc rồi bỏ dở hoặc làm sai | Tiếp quản → sửa → khép lại                                                       | Yêu cầu không bị kẹt vì phụ thuộc một người | Tuần                     | P1      |
| UC-6 | Quản trị thành viên và tham số       | Admin            | Có người mới, cần đổi ngưỡng                   | Duyệt người dùng → gán vai → chỉnh tham số                                       | Nhóm vận hành đúng cấu hình                 | Tháng                    | P2      |

**UC-1, UC-3 và UC-4 quyết định thiết kế.** UC-1 có tần suất cao nhất. UC-3 tần suất thấp nhưng là **nỗi đau đo được lớn nhất trong toàn dự án**: 2 ngày thủ công mỗi lần, 4 lần/năm. Mọi thay đổi không phục vụ ba use case này đều phải tự biện minh.

Lưu ý về UC-3: hiện nó **không được hệ thống hỗ trợ chút nào** — toàn bộ diễn ra trên bảng tính bên ngoài.

Lưu ý về UC-4, quan trọng: nhìn riêng lẻ, đây là thao tác nhẹ và buyer không thấy đau. Nhưng **đây chính là nơi sinh ra lỗi dữ liệu gây tốn 80% của UC-3**. Một sai sót mất 5 giây khi nhập sẽ tốn hàng giờ dò lại sau nhiều tuần, và người gây ra sai sót không bao giờ chịu hậu quả — người khác chịu. Đây là lý do UC-4 được nâng lên P0 dù bản thân nó không hề đau: **chỗ đau và chỗ gây đau nằm ở hai người khác nhau, cách nhau hàng tuần.**

## 5. Bức tranh thị trường

| Sản phẩm                                     | Giá / free tier                                             | Tính năng cốt lõi                                   | Vì sao họ làm vậy                                                                              | Điểm yếu với nhóm này                                                                                                          |
| -------------------------------------------- | ----------------------------------------------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Jira Service Management                      | Miễn phí tới 3 agent; $20/agent/tháng sau đó                | Hàng đợi, SLA, workflow, tự động hoá                | Đặt cược rằng thời gian agent là tài nguyên khan hiếm → tính tiền theo agent, tối ưu quanh SLA | Trần 3 agent, nhóm này có 4 người phía affiliate → khoảng $80/tháng. Không có khái niệm đơn hàng                               |
| Freshdesk / Zoho Desk                        | Freshdesk miễn phí tới 10 agent; Zoho Desk tới 3            | Hàng đợi email, phân loại, báo cáo                  | Dùng free tier rộng để thu hút, khoá tính năng nâng cao ở tầng trả phí                         | Xoay quanh email; không có sản phẩm, mã đơn, hay link affiliate                                                                |
| FreeScout                                    | Mã nguồn mở, tự vận hành; module trả một lần; VPS ~$5/tháng | Hộp thư chung, chống trùng người xử lý, mẫu trả lời | Ra đời như phản ứng với mô hình thu $20–115/agent/tháng → đổi công vận hành lấy chi phí bằng 0 | Phải tự nuôi server; vẫn là công cụ email, không hiểu nghiệp vụ mua hàng                                                       |
| **Bảng tính + nhóm chat** (giải pháp thô sơ) | 0₫                                                          | Ghi tay, nhắn tin                                   | Không ai thiết kế cả — đây là mặc định khi chưa ai chịu dựng gì                                | Không phát hiện trùng, không có cơ chế nhận việc dứt khoát nên hai người dễ làm cùng một yêu cầu, không có dấu vết để đối soát |

Giải pháp thô sơ mới là đối thủ thật. Nhóm đã sống trên nền tảng chat từ trước, và mỗi khi thao tác qua chat nhanh hơn thao tác qua hệ thống thì hệ thống mất một điểm.

## 6. Gap analysis

| #   | Khoảng trống                                                                                                                                                                  | Ai chịu thiệt                                      | Vì sao đối thủ chưa lấp                                                                                        | Ta lấp được không                                                                                     |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| G-1 | Không công cụ nào mô hình hoá **cửa sổ ý định mua hàng** — thứ hết hạn theo cảm hứng người mua, không theo giờ làm việc                                                       | Buyer bỏ cuộc; nhóm mất hoa hồng                   | Thị trường quá nhỏ, họ không biết ngành này tồn tại                                                            | **Có** — đây là chỗ dự án cá nhân thắng                                                               |
| G-2 | Mã đơn được gõ tay và **không được kiểm tra tại chỗ nhập**, trong khi một đơn có thể gộp nhiều sản phẩm nên cùng một mã phải gõ lại nhiều lần                                 | Affiliate Master gánh toàn bộ hậu quả khi đối soát | Helpdesk tổng quát không có khái niệm đơn hàng nên không thể kiểm tra định dạng của thứ chúng không biết là gì | **Có** — kiểm tra tại chỗ nhập là việc rẻ                                                             |
| G-5 | **Mã đơn là khoá nối duy nhất** giữa dữ liệu nhóm và dữ liệu sàn, nhưng lại không được đối xử như một khoá: được phép để trống, được phép sai, không có tín hiệu nào khi hỏng | Affiliate Master                                   | Không đối thủ nào có hai nguồn dữ liệu cần ghép như tình huống này                                             | **Có** — nhưng đòi hỏi thay đổi cách nhìn: mã đơn là dữ liệu hạ tầng, không phải một ghi chú tuỳ chọn |
| G-3 | Free tier của helpdesk chặn ở 3 agent, đúng ngay dưới quy mô nhóm                                                                                                             | Cả nhóm                                            | Nhóm dưới 10 người không bao giờ trả tiền → nới trần chỉ làm loãng phân khúc chính. Hợp lý về phía họ          | **Có**                                                                                                |
| G-4 | Không công cụ nào phân tách **thẩm quyền nghiệp vụ** khỏi **quyền bảo trì kỹ thuật** ở quy mô nhỏ                                                                             | Affiliate Master và Admin                          | Ở quy mô doanh nghiệp, hai vai này vốn thuộc hai phòng ban khác nhau nên không ai thấy đây là vấn đề           | **Có**                                                                                                |

## 7. USP

> Với một nhóm bạn dưới 10 người cùng mua sắm online ở Việt Nam, **Shop Quành** là hàng đợi yêu cầu affiliate gắn liền với nền tảng chat sẵn có của nhóm, giúp link về tay người mua **trước khi họ chốt đơn** và đối soát được **mã đơn** sau đó — không như helpdesk tổng quát vốn tính tiền theo đầu agent và không biết gì về đơn hàng.

Ba câu kiểm tra:

- **Có ai làm ngược lại được không?** → Có. Mọi helpdesk tổng quát chủ động _không_ mô hình hoá đơn hàng và _không_ gắn chặt vào một nền tảng chat cụ thể, vì làm vậy sẽ thu hẹp thị trường của họ. Đây là USP thật, không phải khẩu hiệu.
- **Một người ship được trong vài tuần không?** → Đã ship rồi, và đã chạy 4 tháng.
- **Sống sót khi user thật dùng không?** → 110 yêu cầu, 109 hoàn tất, 2 quá hạn. Nhóm còn tự mở rộng từ 1 lên 3 affiliate vì thấy giá trị. Đây là bằng chứng mạnh nhất trong tài liệu này.

## 8. Tiêu chí thành công

| #    | Tiêu chí                                            | Cách đo                                                                                   | Ngưỡng                   | Mốc            |
| ---- | --------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------ | -------------- |
| S-1  | Yêu cầu được đáp ứng trong lúc buyer còn ý định mua | Trung vị thời gian từ lúc nêu yêu cầu tới lúc có link                                     | < 4 giờ                  | Đợt sale 9/9   |
| S-2a | Đối soát bớt nặng — bước 1                          | Thời gian đối soát trọn một đợt sale (nền hiện tại: **2 ngày**)                           | ≤ 4 giờ                  | Đợt sale 11/11 |
| S-2b | Đối soát bớt nặng — bước 2                          | Như trên                                                                                  | ≤ 1 giờ                  | Đợt sale 12/12 |
| S-3  | Tải không dồn vào một người                         | Tỉ lệ yêu cầu do một cá nhân xử lý                                                        | < 70%                    | 30/11/2026     |
| S-4  | Cả ba affiliate đều thực sự tham gia                | Số affiliate có hoạt động trong tháng                                                     | 3/3                      | Tháng 12/2026  |
| S-5  | Không có sự cố thẩm quyền                           | Số lần một người thực hiện được hành động vượt thẩm quyền, đối chiếu qua dấu vết hệ thống | 0                        | 31/12/2026     |
| S-6  | Không còn yêu cầu bị bỏ quên trong đợt cao điểm     | Số yêu cầu quá hạn tại mọi thời điểm trong đợt sale                                       | ≤ 5                      | Đợt sale 11/11 |
| S-7  | Người dùng không còn phàn nàn mỏi mắt               | Hỏi trực tiếp 6 buyer + 3 affiliate                                                       | ≥ 7/9 nói đã dễ chịu hơn | 31/12/2026     |
| S-8  | Mã đơn nhập vào là dùng được ngay                   | Tỉ lệ mã đơn không khớp với dữ liệu sàn khi đối soát (nền hiện tại: cao, chưa đo)         | < 5%                     | Đợt sale 11/11 |

## 9. Ràng buộc

- **Thời gian:** 4 giờ/tuần trong 5 tháng ≈ 85 giờ. Đây là ràng buộc cứng nhất.
- **Ngân sách:** 0₫/tháng. Dự án phi thương mại, dùng nội bộ trong nhóm.
- **Kỹ năng:** một người làm toàn bộ, kiêm cả phát triển lẫn vận hành.
- **Hạ tầng:** ưu tiên free tier. Hiện có hai môi trường trên hai nhà cung cấp khác nhau — đây là điểm cần thống nhất lại (xem R-3).
- **Lịch bên ngoài:** các đợt sale 9/9, 10/10, 11/11, 12/12 là mốc cứng không dời được. Đợt gần nhất còn khoảng 4 tuần.
- **Hiện trạng:** hệ thống đang chạy thật với người dùng thật. Không có dữ liệu mẫu để thử, không có kiểm thử tự động.

## 10. Out of scope

Những thứ nghe hợp lý nhưng **cố tình không làm** trong 5 tháng này:

1. **Theo dõi hạn dùng của link** — hoa hồng thực chất tính theo thời điểm người mua bấm vào link, không phải theo hạn của bản thân link; hiện tại người mua thường bấm mua ngay nên chưa đau.
2. **Nêu yêu cầu trực tiếp từ nền tảng chat** — chỉ xem xét lại nếu sau khi cải thiện, các affiliate mới vẫn không dùng hệ thống.
3. **Thêm trạng thái trung gian cho việc "để dành chờ sale"** — hiện có thể ghi chú tay, chưa đáng thêm một trạng thái vào vòng đời.
4. **Viết lại cơ chế phát hiện trùng lặp** — cơ chế hiện tại tuy thô nhưng chưa gây thiệt hại nào ghi nhận được.
5. **Tự động lấy tên và ảnh sản phẩm** — sàn chặn truy cập từ hạ tầng máy chủ; giải pháp vòng tránh đều tốn tiền hoặc phức tạp, vi phạm ràng buộc 0₫.
6. **Mở hệ thống cho người ngoài nhóm** — mọi quyết định thiết kế ở đây đều giả định dưới 10 người quen biết nhau.
7. **Đa ngôn ngữ, ứng dụng di động riêng, theo dõi số tiền hoa hồng thực nhận.**
8. **Cho phép chỉnh sửa thẩm quyền lúc đang chạy** — thay đổi thẩm quyền phải đi qua một lần triển khai, có chủ đích.
9. **Mọi tính toán tài chính: trừ thuế, chia tỉ lệ, báo cáo so sánh kỳ trước.** Đây là quyết định có chủ ý, không phải bỏ sót. Nhóm đã có công thức bảng tính chạy nhanh và chỉ chiếm 20% thời gian đối soát. Dựng lại phần này trong hệ thống sẽ tốn hàng chục giờ để có một bản sao kém hơn bảng tính, và mỗi lần đổi tỉ lệ chia lại phải triển khai lại ứng dụng. **Ranh giới được chốt: hệ thống lo ghép nối dữ liệu, bảng tính lo tiền nong.**

   **Đã chốt:** hệ thống **có** ghi nhận số tiền của đơn, dưới dạng **trường không bắt buộc**. Đây không phải tính toán tài chính mà là thu thập một khoá nối phụ: khi mã đơn hỏng, cặp (ngày + số tiền) là cách còn lại để dò ra dòng tương ứng bên sàn. Vì không bắt buộc, nó là khoá **nỗ lực tốt nhất** — chỉ giúp được ở những dòng có người điền, và mọi thiết kế phía sau không được phụ thuộc vào việc trường này có dữ liệu. **Tỉ lệ hoa hồng vẫn nằm ngoài phạm vi**: buyer không biết tỉ lệ theo ngành hàng và chiến dịch, bắt họ nhập là đảm bảo dữ liệu rác.

## 11. Giả định & rủi ro

| #   | Giả định                                                                             | Rủi ro nếu sai                                                                                                                                                                                          | Mức                 | Cách kiểm chứng (<1 ngày)                                                                                                                                             |
| --- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R-1 | ~~Cảm giác "rối mắt, khó chịu" đến từ màu sắc và hiệu ứng~~                          | —                                                                                                                                                                                                       | Đã xác nhận         | **[ĐÃ KIỂM CHỨNG 2026-08-11]** 3 người dùng thật xem bản tắt hiệu ứng + giảm màu, đều xác nhận đỡ mỏi mắt hơn hẳn. Xem `09-design-criteria.md`                        |
| R-2 | Có thể thay đổi cách phân định thẩm quyền trên hệ thống đang chạy mà không gây sự cố | Người dùng mất quyền hoặc được quyền quá tay giữa đợt sale; lỗi loại này không báo lỗi, chỉ phát hiện sau nhiều tuần                                                                                    | **Cao**             | Dựng bộ dữ liệu mẫu và một bộ kiểm thử chỉ cho bảng thẩm quyền, trước khi động vào bất cứ thứ gì                                                                      |
| R-3 | Hai môi trường chạy trên hai nhà cung cấp khác nhau vẫn cho tín hiệu tin cậy         | Môi trường thử nghiệm báo xanh nhưng môi trường thật vẫn lỗi → mất luôn tác dụng của việc có môi trường thử                                                                                             | Trung bình          | Đối chiếu một lần cách dựng bản chạy của hai bên; chọn một bên duy nhất                                                                                               |
| R-4 | Nhóm giữ nhịp mua sắm tới hết tháng 12                                               | Công bỏ ra không ai hưởng                                                                                                                                                                               | Thấp                | Đã có bằng chứng ngược lại: nhóm đang tự mở rộng                                                                                                                      |
| R-5 | Đúng một người giữ vai Affiliate Master, lâu dài                                     | Nếu thành nhiều người, cách phân định thẩm quyền phải khác                                                                                                                                              | Thấp                | Người dùng đã xác nhận ở phase 1                                                                                                                                      |
| R-6 | Bảng theo dõi công việc phản ánh đúng hiện trạng                                     | Làm lại thứ đã làm xong                                                                                                                                                                                 | **Cao — đã xảy ra** | Đã phát hiện ít nhất 2 mục ghi là chưa xong nhưng thực tế đã xong. Cần rà lại toàn bộ trước khi lập kế hoạch                                                          |
| R-7 | Có thể xoá vĩnh viễn tài khoản của người rời nhóm sau 30 ngày                        | **Xoá cứng một người đồng nghĩa xoá luôn dấu vết họ từng làm gì** — mà dấu vết đó chính là thứ dùng để đối soát hoa hồng và để chứng minh không có sự cố thẩm quyền. Mâu thuẫn trực tiếp với S-2 và S-5 | **Cao**             | Kiểm tra xem việc xoá một người có kéo theo mất dữ liệu của các yêu cầu họ từng xử lý hay không                                                                       |
| R-8 | Góp ý của thành viên mới đang được xếp hạng đúng mức độ quan trọng                   | Người mới nhìn ra thứ người cũ đã quen mắt; nếu góp ý của họ mặc định rơi xuống đáy danh sách, ta mất nguồn phản hồi giá trị nhất và họ mất động lực đóng góp                                           | Trung bình          | Rà lại nhóm ưu tiên thấp nhất, đối chiếu với UC-1/UC-3                                                                                                                |
| R-9 | Nhóm tin rằng "sai sót nhập liệu là không thể tránh khỏi"                            | Niềm tin này khiến không ai buồn chặn lỗi ở đầu vào, và chi phí dò tay được chấp nhận như định mệnh. Nó **đúng một phần** (A2 thật sự không tránh được) nhưng **sai với A1**, vốn là phần lớn hơn       | **Cao**             | Đo tỉ lệ mã đơn sai định dạng trong dữ liệu hiện có — nếu phần lớn lỗi là sai khuôn dạng thì chúng phòng được, và niềm tin kia bị bác bỏ bằng số                      |
| R-9 | Niềm tin hiện tại trong nhóm rằng **"sai sót nhập liệu là không thể tránh khỏi"**    | Nếu niềm tin này không được thách thức, nhóm sẽ mãi đầu tư vào việc dọn hậu quả thay vì chặn nguyên nhân, và chi phí 51 giờ/năm trở thành vĩnh viễn                                                     | **Cao**             | Mã đơn có khuôn dạng cố định 14 ký tự với 6 số đầu là ngày — đủ chặt để bắt phần lớn lỗi gõ ngay tại chỗ. Kiểm chứng bằng cách đối chiếu khuôn này với 20 mã đơn thật |

**Giả định rủi ro nhất: R-1.** Toàn bộ phần cải thiện giao diện đứng trên một lời kể định tính từ người dùng, chưa ai kiểm chứng. Nếu nguyên nhân thật là mật độ thông tin chứ không phải màu sắc, thì việc giảm màu và tắt hiệu ứng sẽ không cứu được gì, và ta mất công vô ích. Phải kiểm chứng R-1 **trước** khi tiêu giờ nào vào phần này.

## 13. Khả năng mở rộng

| Hướng                                     | Điều kiện kích hoạt                                                             |
| ----------------------------------------- | ------------------------------------------------------------------------------- |
| Thao tác hàng loạt trên nhiều yêu cầu     | Chỉ làm nếu đợt 11/11 vượt 80 yêu cầu/tuần                                      |
| Gán một mã đơn cho nhiều yêu cầu cùng lúc | Khi ghi nhận ≥3 lần một đơn gộp nhiều yêu cầu trong cùng đợt sale (đã có 1 lần) |
| Nêu yêu cầu từ nền tảng chat              | Chỉ nếu sau cải thiện, hai affiliate mới vẫn không dùng hệ thống                |
