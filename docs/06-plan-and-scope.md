---
doc: plan-and-scope
version: 1.2.0
status: approved
updated: 2026-08-13
owner: Quành (Admin)
upstream: [prd, tech-spec-architecture, sdd]
downstream: [master-plan]
---

# Plan & Scope — Shop Quành

| 📄 **Metadata**  | 📑 **Details**                         |
| :--------------- | :------------------------------------- |
| **Doc ID**       | `plan-and-scope`                       |
| **Version**      | `1.2.0`                                |
| **Status**       | 🟢 **Approved**                        |
| **Last Updated** | `2026-08-11`                           |
| **Owner**        | Quành (Admin)                          |
| **Upstream**     | [prd], [tech-spec-architecture], [sdd] |
| **Downstream**   | [master-plan]                          |

Kế hoạch **mức cao**. Chia subtask chi tiết thuộc phase 9 (`11-master-plan.md`).

## 1. Ràng buộc chi phối

| Ràng buộc          | Giá trị                                                           | Hệ quả                                                |
| ------------------ | ----------------------------------------------------------------- | ----------------------------------------------------- |
| Quỹ giờ            | 4 giờ/tuần × 22 tuần ≈ **88 giờ**                                 | Không có chỗ cho việc "làm cho đẹp"                   |
| Hạn không bù được  | **F-23 trước 9/9** (~4 tuần)                                      | Xem §3, đây là thứ duy nhất lỡ thì mất vĩnh viễn      |
| Mốc cứng bên ngoài | 9/9 → **tuần 4** · 11/11 → **tuần 13** · 12/12 → **tuần 18**      | Không dời được, không thương lượng được               |
| Hiện trạng         | Hệ thống đang chạy, chưa có kiểm thử tự động, chưa có dữ liệu mẫu | Phải dựng lưới an toàn trước khi động vào phần rủi ro |

**Kiểu thất bại cần phòng ở dự án 5 tháng không phải là không kịp, mà là rơi rụng.** Làm hăng 3 tuần đầu, tuần 7–8 mất đà, tháng thứ 3 quên mình đang dở việc gì. Vì vậy mỗi giai đoạn dưới đây đều kết thúc bằng **một thứ người dùng thấy được**, không có giai đoạn nào kéo dài quá 4 tuần mà không ai nhận ra khác biệt.

## 2. Ước lượng

Ước lượng theo **giờ**, đã cộng hệ số dự phòng **30%**.

| Giai đoạn | Nội dung                                  | Giờ thô | Có dự phòng |
| --------- | ----------------------------------------- | ------: | ----------: |
| **P0**    | Chặn máu: F-23 tối thiểu + đo số nền      |       5 |     **6,5** |
| **P1**    | Đối soát đợt 9/9: F-04, F-05, F-08        |       9 |    **11,5** |
| **P2**    | Lưới an toàn: dữ liệu mẫu + kiểm thử miền |       7 |       **9** |
| **P3**    | Ghép tự động: F-15, F-01, F-09            |      18 |    **23,5** |
| **P4**    | Thẩm quyền: F-06 rồi F-07                 |      16 |      **21** |
| **P5**    | Còn lại: F-02, F-03, F-10..F-14           |       8 |    **10,5** |
|           | **Tổng**                                  |  **63** |      **82** |

82 trên 88 giờ, dư 6 giờ. **Không còn dư.** Điều này có chủ ý và nó có nghĩa cụ thể: bất kỳ việc nào phát sinh ngoài danh sách đều phải **đánh đổi**, không được cộng thêm. P5 là phần hy sinh trước tiên.

## 3. P0 — làm ngay tuần này, trước cả khi đọc hết tài liệu này

**6,5 giờ. Đây là giai đoạn có tỉ lệ giá trị trên công sức cao nhất trong cả dự án.**

| Việc                                                              | Giờ | Vì sao ngay bây giờ                                 |
| ----------------------------------------------------------------- | --: | --------------------------------------------------- |
| Hiện mã yêu cầu kèm nút sao chép ở màn hình điền link             |   2 | Phần lớn của F-23 chỉ là chừng này                  |
| Ô xác nhận "đã gắn mã vào Sub_ID" khi lưu link                    |   1 | SPEC-012                                            |
| Thống nhất quy trình với 3 affiliate                              | 0,5 | Phần quan trọng nhất, và không phải việc lập trình  |
| Chạy quy tắc khuôn dạng mã đơn trên toàn bộ dữ liệu hiện có       |   1 | Kiểm chứng TR-3, lấy số nền cho KPI-2               |
| Trích thử `productItemId` từ mọi URL đã lưu, đếm tỉ lệ trích được |   1 | Kiểm chứng TR-9 trước khi thiết kế phụ thuộc vào nó |
| Cho 3 người xem thử bản đã tắt hiệu ứng nền                       |   1 | Kiểm chứng R-1 trước khi tiêu 11 giờ vào P1         |

Ba việc cuối là **kiểm chứng giả định**, không phải xây tính năng. Mỗi việc dưới 1 giờ và mỗi việc đều có khả năng làm đổi kế hoạch phía sau. Bỏ qua chúng là cách nhanh nhất để tiêu 20 giờ vào thứ không đau.

**Định nghĩa xong P0:** một link được tạo qua quy trình mới, có Sub_ID, và tuần sau kiểm tra thấy nó xuất hiện trong báo cáo sàn kèm mã yêu cầu.

## 4. Giai đoạn và cột mốc

| GĐ     | Tuần  |  Giờ | Nội dung                                                               | "Xong" quan sát được                                                    |
| ------ | ----- | ---: | ---------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| **P0** | 1     |  6,5 | F-23 tối thiểu, 3 phép đo kiểm chứng                                   | Link đầu tiên mang Sub_ID chạy suốt tới báo cáo sàn                     |
| **P1** | 2–4   | 11,5 | F-04 ngày cụ thể, F-05 lọc khoảng ngày, F-08 gỡ hiệu ứng               | Đợt 9/9 lọc được theo ngày; nhóm nói giao diện đỡ mỏi mắt               |
| **P2** | 5–7   |    9 | Dữ liệu mẫu, kiểm thử `src/domain/`, nhánh `uat` trên Neon, gỡ Netlify | `yarn test` xanh; môi trường thử dựng cùng cách môi trường thật         |
| **P3** | 8–13  | 23,5 | F-15 nạp báo cáo và ghép, F-01 kiểm khuôn dạng, F-09 xuất tệp          | **Đối soát đợt 11/11 dưới 4 giờ**                                       |
| **P4** | 14–18 |   21 | F-06 module thẩm quyền theo 4 bước §5.2 tech-spec, rồi F-07 vai mới    | Affiliate Master tiếp quản được việc của người khác; không ai mất quyền |
| **P5** | 19–22 | 10,5 | F-02, F-03, F-10 tới F-14                                              | Đối soát đợt 12/12 dưới 1 giờ                                           |

### Vì sao thứ tự này

**P2 đứng trước P3, không phải ngược lại.** Chuyển đổi thẩm quyền là TR-1, rủi ro cao nhất trong dự án, và là loại lỗi im lặng. Làm nó khi chưa có dữ liệu mẫu và chưa có kiểm thử là đi trong bóng tối trên hệ thống có người dùng thật. 9 giờ của P2 mua lấy khả năng biết mình có làm hỏng gì không.

**Ghép tự động đứng trước thẩm quyền — đây là chỗ tôi sửa so với bản nháp đầu.** Bản nháp xếp thẩm quyền ở tuần 8–12 rồi ghép tự động ở tuần 13–18, và hứa "đối soát đợt 11/11 dưới 4 giờ". Nhưng **11/11 rơi vào tuần 13**, tức là lúc đó việc ghép mới bắt đầu được một tuần. Lời hứa đó không thể giữ. Đảo hai giai đoạn thì ghép tự động xong ở tuần 13, vừa kịp.

Lý do đảo được mà không sinh nợ: hai phần này **độc lập kỹ thuật**. Ghép tự động chủ yếu là điểm cuối **mới**; chuyển đổi thẩm quyền là sửa điểm cuối **cũ**. Các điểm cuối đối soát tạm dùng cách kiểm tra hiện hành rồi chuyển cùng đợt ở P4, tốn thêm chừng 30 phút.

Lý do đảo là đúng chứ không chỉ là tiện: đối soát có **hạn ngoài không dời được** và tiết kiệm 51 giờ đo được. Thẩm quyền không có hạn ngoài, và vấn đề nó giải quyết đang gây khó chịu chứ chưa gây thiệt hại đo được.

**P4 dài và nằm cuối** — 5 tuần không có gì mới cho người dùng thấy, nguy hiểm về động lực. Giảm thiểu: chia thành các lần chuyển đổi từng điểm cuối một, mỗi lần một commit, để tiến độ luôn nhìn thấy được.

**F-08 nằm ở P1 chứ không phải P5** dù nó phục vụ mục tiêu ưu tiên thấp nhất. Đây là quyết định về động lực chứ không về giá trị: một chiến thắng nhìn thấy được ở tuần 3 mua lấy đà cho 18 tuần còn lại.

## 5. Definition of Done

Áp cho mọi hạng mục:

- Kịch bản tương ứng trong SDD đã có kiểm thử và kiểm thử xanh
- Với mã trong `src/domain/`: phủ kiểm thử ≥ 80% số dòng
- TypeScript không lỗi, ESLint không lỗi, luật tầng không bị vi phạm
- Chạy được trên Preview Deployment và đã thử tay ít nhất một lần
- Nếu có đổi lược đồ: đã chạy trên nhánh `uat` trước khi chạm nhánh chính
- Nếu đổi hành vi người dùng thấy được: đã báo cho nhóm

Chưa áp dụng ở đợt này: jscpd, knip, commitlint. Chúng nằm cuối bảng ưu tiên chất lượng ở tech-spec §8 và chỉ làm nếu còn giờ.

## 6. Điểm dừng

Những mốc mà **nếu chạm phải thì dừng lại xem lại phạm vi**, không cố đẩy tiếp:

| #    | Điểm dừng                                                           | Nếu chạm thì làm gì                                                                                                                                                                                  |
| ---- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SP-1 | Hết tuần 1 mà P0 chưa xong                                          | P0 là phần dễ nhất và rẻ nhất. Không xong nghĩa là quỹ 4 giờ/tuần không có thật. Tính lại quỹ giờ trước khi làm gì tiếp                                                                              |
| SP-2 | Sau đợt 9/9, tỉ lệ dòng báo cáo có Sub_ID dưới 50%                  | Quy trình không được tuân thủ (TR-8). **Dừng P4**, quay lại giải quyết vấn đề con người. Xây công cụ ghép cho dữ liệu không có khoá là xây nhà trên cát                                              |
| SP-3 | Hết tuần 11 mà việc nạp tệp chưa nối được tới màn hình kết quả      | Hạ F-15 xuống bản thủ công: chỉ xuất một tệp đã có sẵn mã yêu cầu và mã sản phẩm đúng định dạng để bạn dùng hàm dò trong bảng tính. Tốn ~3 giờ, chắc chắn kịp 11/11, và vẫn cắt phần lớn công gõ tay |
| SP-6 | P4 vượt 28 giờ mà chưa chuyển xong hết điểm cuối                    | Dừng, giữ nguyên trạng thái lai, hoãn F-07 sang sau 12/12. Nửa vời có kiểm thử vẫn an toàn hơn vội vàng                                                                                              |
| SP-4 | Tới tuần 8 mà P3 chưa bắt đầu                                       | Bỏ P5 hoàn toàn, dồn toàn bộ giờ còn lại cho P3. Đối soát quan trọng hơn mọi thứ trong P5 cộng lại                                                                                                   |
| SP-5 | Kiểm chứng R-1 ở P0 cho thấy vấn đề không nằm ở màu sắc và hiệu ứng | Viết lại SPEC-011 trước khi tiêu giờ nào cho F-08                                                                                                                                                    |

## 7. Những gì không nằm trong kế hoạch này

Ngoài các mục Out of scope ở PRD §8, đợt này còn **không** làm:

- Tái cấu trúc mã cũ sang Clean Architecture đầy đủ (tech-spec §2.1)
- Nâng cấp bất kỳ thư viện nào, gồm cả Next.js (TR-4)
- Thêm thư viện mới
- Hỗ trợ báo cáo của TikTok Shop trong việc ghép — chưa có tệp mẫu (SDD §5)
- F-16 đến F-19, trừ khi chạm điều kiện kích hoạt ghi ở PD §13

## 8. Rà soát bảng theo dõi công việc — đã hoàn tất 2026-08-13

Đã rà lại toàn bộ 36 mục trong bảng theo dõi cũ, đối chiếu với PRD, plan-and-scope, master-plan. Kết quả:

- **3 mục sai trạng thái đã sửa:** #16, #23, #34 (thực tế đã xong, hoặc đã được F-04/F-05 hấp thụ vào Epic 2)
- **4 nhóm mục đóng vì trùng out-of-scope:** #2, #18, #19/#25, #22 — xem `11-master-plan.md` §13.2
- **1 mục cần quyết định trước khi thiết kế Epic 5:** #35 (khả năng mâu thuẫn với quyết định "thẩm quyền phải qua sửa mã nguồn + deploy") — đưa vào Epic 7-S1, phải chốt song song với E5-S1, xem `11-master-plan.md` §9 và §13.2
- **3 mục orphan có epic thực thi:** #29, #30, #33 — gộp vào **Epic 7 mới** (`11-master-plan.md` §9), ưu tiên thấp hơn Epic 5
- **1 mục đã ánh xạ đúng vào F-06/F-07 (Epic 5):** #36

Không phát sinh thêm giờ thừa ngoài dự kiến ở §2 cho phần R1–R3 — ngược lại, Epic 6 hoàn thành sớm hơn ước lượng, xem ghi chú tiến độ ở `11-master-plan.md` §1. Nhưng Epic 7 mới (dọn backlog kế thừa) đẩy tổng ước lượng vượt quỹ 88h khoảng 2h — xem cảnh báo ngân sách ở `11-master-plan.md` §9. Chỉ còn Epic 5 (Thẩm quyền, bắt buộc) và Epic 7 (dọn backlog, ưu tiên thấp hơn) là chưa làm.
