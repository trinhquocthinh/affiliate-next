---
doc: onboarding-guide
version: 1.0.0
status: approved
updated: 2026-08-11
owner: Quành (Admin)
upstream: [problem-definition, prd, tech-spec-architecture, master-plan]
downstream: []
---

# Onboarding Guide — Shop Quành

| 📄 **Metadata** | 📑 **Details** |
| :--- | :--- |
| **Doc ID** | `onboarding-guide` |
| **Version** | `1.0.0` |
| **Status** | 🟢 **Approved** |
| **Last Updated** | `2026-08-11` |
| **Owner** | Quành (Admin) |
| **Upstream** | [problem-definition], [prd], [tech-spec-architecture], [master-plan] |
| **Downstream** | — |

Độc giả: một cộng tác viên mới, một AI agent, hoặc chính bạn sau sáu tháng đã quên sạch. Mục tiêu: từ chưa biết gì đến gửi được thay đổi đầu tiên trong dưới một giờ.

## 1. Dự án này là gì

Một nhóm dưới 10 người bạn ở Việt Nam dùng chung một hàng đợi để điều phối việc tạo link affiliate khi ai đó trong nhóm sắp mua hàng trên Shopee hay TikTok Shop. Nó phục vụ 6 buyer, 3 affiliate, 1 affiliate master, 1 admin — và khác các helpdesk tổng quát ở chỗ nó hiểu khái niệm "đơn hàng" và gắn liền với Discord thay vì email, thứ mà những công cụ đó cố tình không làm vì sẽ thu hẹp thị trường của họ.

## 2. Bản đồ tài liệu

Đọc theo đúng thứ tự này nếu là lần đầu — mỗi tài liệu giả định bạn đã đọc tài liệu trước nó.

| # | File | Trả lời câu hỏi gì | Đọc khi nào |
| --- | --- | --- | --- |
| 01 | `01-problem-definition.md` | Vấn đề gì, cho ai, tại sao đáng làm | Luôn đọc trước tiên |
| 02 | `02-business-rules.md` | Luật nghiệp vụ nào không bao giờ được vi phạm | Trước khi chạm bất kỳ logic nào |
| 03 | `03-prd.md` | Tính năng nào, ưu tiên ra sao, xong ở release nào | Trước khi nhận một task |
| 04 | `04-sdd.md` | Hành vi chính xác, từng kịch bản kiểm chứng được | **Bắt buộc đọc trước khi viết code** cho task đó |
| 05 | `05-tech-spec-architecture.md` | Kiến trúc, mô hình dữ liệu, vì sao chọn thế | Trước khi đổi cấu trúc thư mục hay lược đồ |
| `07-diagrams/` | Sơ đồ trực quan của 3 tài liệu trên | Khi đọc chữ chưa hình dung ra luồng | |
| 08 | `08-test-cases-specification.md` | Test case cụ thể, ánh xạ 1–1 với SDD | Lúc viết test |
| 09 | `09-design-criteria.md` | Token màu, chữ, kiểm kê màn hình | Lúc chạm giao diện |
| 10 | `10-setup-and-ops-guide.md` | Cài đặt, deploy, sự cố thường gặp | Lúc dựng môi trường hoặc gỡ lỗi vận hành |
| 06 | `06-plan-and-scope.md` | Chia giai đoạn theo tuần, điểm dừng | Khi cần biết đang ở đâu trong 5 tháng |
| 11 | `11-master-plan.md` | Epic/Story/Subtask cụ thể, đường găng, việc ngoài phạm vi | **Mở mỗi ngày làm việc** |

`INDEX.md` ở gốc `docs/` luôn là nguồn xác định phiên bản và trạng thái mới nhất của từng tài liệu — nếu số phiên bản ở đây khác `INDEX.md`, tin `INDEX.md`.

## 3. Chạy trong 10 phút

```bash
git clone <repo-url>
cd shop-quanh
yarn install
cp .env.example .env.local
# điền biến môi trường — xem 10-setup-and-ops-guide.md §3, xin từ Admin
yarn prisma generate
yarn prisma migrate dev
yarn dev
```

Mở `http://localhost:3000` — quan sát được: **thấy màn hình đăng nhập, không phải trang trắng hay lỗi 500.** Nếu không, quay lại `10-setup-and-ops-guide.md` §8 bảng sự cố thường gặp, dòng đầu tiên.

Đăng nhập bằng tài khoản mẫu (seed từ `prisma/seed.ts`, xem §6 tech-spec) — quan sát được: **thấy trang chủ theo đúng vai của tài khoản đó**, không phải cùng một trang chủ cho mọi vai.

## 4. Bản đồ mã nguồn

```
src/
├── domain/                  ← Hàm thuần. KHÔNG import React, Prisma, Next.js, biến môi trường
│   ├── order-id/             validate.ts (SPEC-001), date-check.ts (SPEC-004)
│   ├── permissions/           matrix.ts (nguồn chuẩn duy nhất), resolve.ts (SPEC-006)
│   └── reconciliation/        parse-report.ts, match.ts (SPEC-013)
├── config/
│   └── permissions.ts        Điểm vào công khai, tái xuất từ domain/permissions
├── lib/                      Truy vấn DB, phiên đăng nhập, tích hợp ngoài
├── components/                Component UI dùng chung
└── app/                      Next.js App Router — route + trang
    ├── (buyer)/               Trang chủ, tạo yêu cầu, My Requests
    ├── (affiliate)/           Queue, điền link
    ├── (dashboard)/admin/     Users, Config, Reconciliation
    └── api/                   Route handler
```

**Luật phụ thuộc, chỉ thực thi nghiêm cho `src/domain/`, bằng ESLint chứ không bằng kỷ luật:**

```
app / components  →  lib  →  domain
                              ↑
                     domain KHÔNG import ngược lên bất cứ đâu
```

Nếu ESLint đỏ báo `import/no-restricted-paths`, đừng tắt luật — nghĩa là logic bạn vừa viết vào `domain/` đang cần thứ gì đó bên ngoài, và nó nên nằm ở `lib/` thay vì `domain/`.

Phần còn lại của mã nguồn **không** theo cấu trúc Clean Architecture đầy đủ, và đó là chủ ý — xem tech-spec §2.1 nếu thắc mắc vì sao.

## 5. Quy ước

| Việc | Quy ước |
| --- | --- |
| Tên nhánh | `<epic-id>-<mô-tả-ngắn>`, ví dụ `e4-s3-ghep-sub-id` |
| Commit | Mỗi subtask trong master-plan tương ứng ít nhất một commit gộp được. Nội dung commit nêu ID subtask, ví dụ `E4-S3-T1: hàm ghép theo Sub_id1` |
| Pull Request | Mở PR → Vercel tự dựng Preview Deployment trỏ nhánh `uat` của Neon → thử tay trên URL đó → đối chiếu Definition of Done ở `06-plan-and-scope.md` §4 → merge |
| Cổng tự động | `yarn lint`, `yarn tsc --noEmit`, `yarn test` chạy trong CI trên mọi PR. Đỏ ở `yarn test` cho `src/domain/` nghĩa là hành vi sai theo SDD — sửa code, không sửa test, trừ khi SDD chính nó sai (thì sửa SDD trước, bump version, rồi mới sửa test) |

## 6. Thêm một tính năng mới — ví dụ thật: E6-S4-T1 (gợi ý dùng lại mã đơn)

Đi qua đúng một luồng, từ đầu tới cuối, để không ai phải đoán quy trình.

**Bước 1 — đọc nguồn.** Mở `04-sdd.md`, tìm `SPEC-003`. Đọc hành vi và 8 kịch bản (TC-023 đến TC-030 trong `08-test-cases-specification.md`).

**Bước 2 — viết test trước.**

```bash
# tạo file test cạnh chỗ hàm sẽ nằm
touch src/domain/order-id/suggest.test.ts
```

Viết 8 test theo đúng Given/When/Then của SPEC-003. Chạy `yarn test` — đỏ, vì hàm chưa tồn tại. Đó là bước bắt buộc, không phải phụ.

**Bước 3 — viết hàm thuần.**

```bash
touch src/domain/order-id/suggest.ts
```

Viết hàm `suggestOrderId(actorId, platform, recentCloses)` — thuần, nhận dữ liệu đã có sẵn, không tự đọc DB. Chạy `yarn test` tới khi cả 8 test xanh.

**Bước 4 — nối vào route.** Trong `src/app/api/requests/order-id-suggestion/route.ts`, gọi `assertPermission` trước, đọc dữ liệu 24 giờ gần nhất từ `lib/`, truyền vào hàm thuần ở bước 3.

**Bước 5 — thử tay trên Preview Deployment**, đúng 2 kịch bản chính từ SPEC-003 (đóng một yêu cầu, mở yêu cầu tiếp theo cùng sàn, thấy gợi ý).

**Bước 6 — mở PR**, ghi `E6-S4-T1: gợi ý dùng lại mã đơn`, đối chiếu Definition of Done, merge.

**Bước 7 — cập nhật bảng tiến độ** ở `11-master-plan.md` §1, tick `[x]` cho subtask này.

## 7. Nơi tìm câu trả lời

| Câu hỏi | Tài liệu |
| --- | --- |
| "Vì sao tính năng này tồn tại?" | `01-problem-definition.md`, tra theo BR-ID hoặc S-ID |
| "Ai được làm gì?" | `02-business-rules.md` nhóm Quyền, hoặc `04-sdd.md` SPEC-006 |
| "Hành vi chính xác khi... ?" | `04-sdd.md`, tìm SPEC tương ứng |
| "Vì sao chọn công nghệ/kiến trúc này?" | `05-tech-spec-architecture.md`, mỗi lựa chọn có cột "Từ bỏ điều gì" |
| "Màu này, khoảng cách này lấy từ đâu?" | `09-design-criteria.md` §2 |
| "Sao cái này lỗi, từng gặp chưa?" | `10-setup-and-ops-guide.md` §8 |
| "Đang ở tuần nào, còn bao nhiêu giờ?" | `11-master-plan.md` §1 bảng tiến độ |
| "Cái này có đáng làm bây giờ không?" | `11-master-plan.md` §12 — có thể nó đã có sẵn điều kiện kích hoạt |

## 8. Cạm bẫy

Những chỗ đã tốn thời gian thật trong quá trình dựng bộ tài liệu này, ghi lại để không lặp lại:

- **Bảng theo dõi công việc cũ (Excel) không đáng tin.** Đã phát hiện ít nhất 2 mục ghi "chưa xong" nhưng thực ra đã xong (chọn cột ở Queue, ngưỡng ngày tự đóng). Luôn kiểm tra code thật trước khi tin trạng thái ghi trong bảng theo dõi bất kỳ.
- **`orderId` không phải khoá duy nhất.** Một đơn Shopee có thể gộp nhiều sản phẩm, nên nhiều `Request` dùng chung một mã đơn — đây là hành vi **đúng**, không phải lỗi dữ liệu. Đừng đặt ràng buộc `UNIQUE` lên cột này.
- **Mã đơn Shopee và TikTok khác khuôn dạng hoàn toàn.** Shopee 14 ký tự có ngày, TikTok 18 chữ số thuần không có ngày. Logic kiểm tra phải rẽ theo `platform`, không dùng chung một biểu thức chính quy.
- **Mã đơn Shopee đánh ngày theo UTC+8, hệ thống lưu giờ theo UTC+7.** Quên dung sai ±1 ngày sẽ tạo cảnh báo giả cho mọi đơn đặt sau 23:00 giờ Việt Nam — đã xảy ra thật khi phân tích tệp báo cáo mẫu, xem tech-spec §11.3.
- **`subIdStamped` là lời khai, không phải bằng chứng.** Không có cách nào hệ thống tự kiểm chứng affiliate có thực sự dán mã vào Sub_ID hay không, vì link rút gọn của sàn không lộ tham số. Đừng viết logic nào giả định trường này luôn đúng.
- **Chuyển đổi thẩm quyền phải đúng thứ tự.** Ma trận mới phản ánh hành vi cũ → test xanh → chuyển từng điểm cuối → rồi mới thêm vai mới. Đảo thứ tự này thì khi có lỗi không phân biệt được lỗi do chuyển đổi hay do vai mới thêm — xem tech-spec §5.2, đây là quy tắc duy nhất trong toàn dự án không có ngoại lệ.
- **Netlify từng được dùng cho môi trường thử, giờ đã bỏ.** Nếu thấy cấu hình Netlify còn sót trong lịch sử git, đó là có chủ đích giữ lại làm phương án dự phòng (TR-7), không phải rác quên xoá.

## 9. Việc khởi động tốt

Ba subtask an toàn để làm quen quy trình, không đụng logic rủi ro cao:

1. **E2-S1-T1** — đổi cột ngày sang `dd/mm/yyyy` ở Queue. 1 giờ, không chạm dữ liệu nhạy cảm, kết quả nhìn thấy ngay.
2. **E2-S4-T1** — gỡ hiệu ứng nền `blur`/`animate-float`. 1 giờ, chỉ sửa CSS, rủi ro gần như bằng không.
3. **E6-S4-T2** — trường số tiền không bắt buộc khi đóng yêu cầu. 0,5 giờ, đã có TC-018 đến TC-021 sẵn sàng để chạy theo ngay.

## 10. Dành cho AI agent

Nếu bạn là Claude Code hoặc agent tương tự đang thực thi task trong dự án này:

- Đọc `04-sdd.md`, tìm đúng SPEC-ID được giao **trước khi** viết bất kỳ dòng code nào.
- Mọi hàm mới trong `src/domain/` phải kèm test cùng lúc, không tách làm hai lượt.
- Không sửa file trong `domain/` mà không đối chiếu ngược `02-business-rules.md` — nếu hành vi cần đổi khác với luật đã ghi, dừng lại và báo, đừng tự quyết đổi luật.
- Chạy `yarn lint && yarn tsc --noEmit && yarn test` trước khi báo cáo một subtask đã xong. Không báo "xong" khi một trong ba lệnh còn đỏ.
- Với subtask chạm `src/domain/permissions/`, phải tuân thủ chính xác thứ tự 4 bước ở tech-spec §5.2 — không được nhảy bước để nhanh hơn.

Đề xuất: chép mục 10 này thành `CLAUDE.md` ở gốc repo để agent tự đọc mà không cần được nhắc.
