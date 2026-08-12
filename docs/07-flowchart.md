---
doc: diagrams-flowchart
version: 1.0.0
status: draft
updated: 2026-08-11
upstream: [sdd, business-rules]
---

# Flowchart

| 📄 **Metadata** | 📑 **Details** |
|:---|:---|
| **Doc ID** | `diagrams-flowchart` |
| **Version** | `1.0.0` |
| **Status** | 🟡 **Draft** |
| **Last Updated** | `2026-08-11` |
| **Owner** | Quành (Admin) |
| **Upstream** | [sdd], [business-rules] |
| **Downstream** | — |


Ba luồng, không hơn. Vẽ hết mọi luồng thì không ai cập nhật và sơ đồ chết sau một tháng.

## 1. UC-1 — Vòng đời một yêu cầu (ưu tiên cao nhất)

Dùng để quyết định: **chỗ nào cần chặn, chỗ nào chỉ cảnh báo.**

```mermaid
flowchart TD
    start(["Buyer thấy món muốn mua"]) --> create["Nêu yêu cầu, dán URL sản phẩm"]
    create --> extract["Trích productItemId từ URL"]
    extract --> dup{"Trùng trong<br/>24h qua?"}
    dup -->|Có| warnDup["Cảnh báo trùng"] --> confirmDup{"Vẫn tạo?"}
    confirmDup -->|Không| stop1(["Dừng"])
    confirmDup -->|Có| newReq
    dup -->|Không| newReq["Trạng thái NEW"]

    newReq --> notify["Cron 15' đẩy thông báo Discord"]
    notify --> claim{"Có affiliate<br/>nhận việc?"}
    claim -->|Không, quá ngưỡng giờ| stale["Suy dẫn: stale<br/>BR-026 - không lưu cột"]
    stale --> autoclose["Cron 00:00 tự đóng<br/>closeReason = STALE"]
    autoclose --> closed

    claim -->|Có| owner["affiliateOwner = người nhận"]
    owner --> copyCode["📋 Sao chép mã yêu cầu"]
    copyCode --> genLink["Tạo link trên sàn,<br/>dán mã vào ô Sub_ID"]
    genLink --> saveLink["Lưu link + tích xác nhận đã gắn"]
    saveLink --> validLink{"URL http/https?<br/>BR-022"}
    validLink -->|Không| errLink["❌ 400 - từ chối"] --> saveLink
    validLink -->|Có| filled["Trạng thái FILLED<br/>subIdStamped = true/false"]

    filled --> buy["Buyer mở link và mua"]
    buy --> close["Đóng yêu cầu"]
    close --> reason{"closeReason?"}
    reason -->|"NOT_BUYING / INVALID"| dropOid["Bỏ qua mã đơn nếu có<br/>SPEC-002 kịch bản 4"] --> closed
    reason -->|BOUGHT| needOid{"Có mã đơn?<br/>BR-010"}
    needOid -->|Không| errOid["❌ ERR_ORDER_ID_REQUIRED"] --> close
    needOid -->|Có| fmt{"Đúng khuôn dạng<br/>của sàn? BR-011/012/013"}
    fmt -->|Không| errFmt["❌ ERR_ORDER_ID_FORMAT"] --> close
    fmt -->|Có| dateChk{"Shopee: ngày trong mã<br/>nằm trong khoảng ±1 ngày?<br/>SPEC-004"}
    dateChk -->|Không| warnDate["⚠️ Cảnh báo - VẪN CHO LƯU<br/>ghim orderIdWarning = true"] --> closed
    dateChk -->|Có| closed["Trạng thái CLOSED"]

    closed --> audit["Ghi AuditLog - BR-052"]
    audit --> done(["Chờ đối soát"])

    style errOid fill:#7f1d1d,color:#fff
    style errFmt fill:#7f1d1d,color:#fff
    style errLink fill:#7f1d1d,color:#fff
    style warnDate fill:#78350f,color:#fff
    style warnDup fill:#78350f,color:#fff
    style copyCode fill:#0f766e,color:#fff
```

**Quy tắc phân biệt đỏ và cam:** đỏ là chặn — dữ liệu chắc chắn sai và sửa được ngay. Cam là cảnh báo — có thể sai, có thể không, và người dùng biết rõ hơn hệ thống. Cảnh báo giả nguy hiểm hơn không cảnh báo: sai vài lần là người ta bỏ qua mọi cảnh báo về sau, kể cả cảnh báo đúng.

## 2. UC-3 — Đối soát sau đợt sale

Dùng để quyết định: **ba nhóm kết quả, không phải hai.**

```mermaid
flowchart TD
    start(["Kết thúc đợt sale"]) --> dl["Tải CSV báo cáo từ sàn"]
    dl --> upload["Nạp tệp vào hệ thống"]
    upload --> parse{"Đủ cột bắt buộc?"}
    parse -->|Không| errFile["❌ ERR_REPORT_FORMAT<br/>không xử lý dòng nào"] --> upload
    parse -->|Có| loop["Với từng dòng báo cáo"]

    loop --> k1{"Sub_id1 khớp<br/>mã yêu cầu?"}
    k1 -->|Có| m1["✅ matchMethod = SUB_ID"]
    k1 -->|Không| k2{"Cặp orderId +<br/>itemId khớp?"}
    k2 -->|Có| m2["✅ matchMethod = ORDER_ITEM"]
    k2 -->|Không| m3["⚠️ matchMethod = NONE"]

    m1 --> g1["Nhóm A: đã ghép"]
    m2 --> g1
    m3 --> g2["Nhóm B: dòng báo cáo<br/>không có yêu cầu"]

    g1 --> scan["Quét ngược các Request<br/>đã đóng BOUGHT trong kỳ"]
    scan --> g3{"Có dòng<br/>báo cáo nào khớp?"}
    g3 -->|Không| g3b["Nhóm C: yêu cầu<br/>không có dòng báo cáo"]
    g3 -->|Có| skip[" "]

    g1 --> export["Xuất tệp, GIỮ NGUYÊN<br/>cột trạng thái đơn - BR-066"]
    g2 --> export
    g3b --> export
    export --> sheet(["Mở bằng bảng tính:<br/>tính thuế, chia %, so kỳ trước"])

    style errFile fill:#7f1d1d,color:#fff
    style m3 fill:#78350f,color:#fff
    style g2 fill:#78350f,color:#fff
    style g3b fill:#78350f,color:#fff
    style skip fill:none,stroke:none
```

**Nhóm C là nhóm dễ quên nhất và nguy hiểm nhất.** Đó là những yêu cầu buyer khai đã mua nhưng sàn không ghi nhận hoa hồng — nghĩa là hoa hồng **bị mất thật**. Một công cụ chỉ đối chiếu theo chiều từ báo cáo sang hệ thống sẽ không bao giờ thấy nhóm này. BR-065 bắt buộc đủ ba nhóm chính vì lý do đó.

## 3. Kiểm tra thẩm quyền — luồng chung cho mọi điểm cuối

Dùng để quyết định: **thứ tự kiểm tra.**

```mermaid
flowchart TD
    req(["Yêu cầu tới điểm cuối"]) --> auth{"Đã đăng nhập?"}
    auth -->|Không| e401["❌ 401 ERR_UNAUTHENTICATED"]
    auth -->|Có| active{"Tài khoản<br/>còn hoạt động?<br/>BR-040"}
    active -->|Không| e401
    active -->|Có| perm{"hasPermission<br/>(actor, permission)?"}
    perm -->|Không| e403["❌ 403 ERR_FORBIDDEN"]
    perm -->|Có| scope{"Quyền này<br/>có phạm vi?"}
    scope -->|"Không (vd user.manage)"| exec
    scope -->|Có| any{"Phạm vi = any?"}
    any -->|Có| exec["Đọc dữ liệu và thực hiện"]
    any -->|"Không, chỉ own"| own{"actor là chủ<br/>sở hữu tương ứng?"}
    own -->|Không| e403
    own -->|Có| exec

    exec --> override{"Tác động lên tài nguyên<br/>của người khác?"}
    override -->|Có| log["Ghi AuditLog - BR-051"] --> ok
    override -->|Không| ok(["✅ 200"])

    style e401 fill:#78350f,color:#fff
    style e403 fill:#7f1d1d,color:#fff
```

**Xác thực luôn đi trước thẩm quyền.** Gộp cả hai thành 403 là lỗi rất hay gặp khi gom kiểm tra vào một chỗ — và hậu quả là người dùng hết phiên đăng nhập sẽ thấy "bạn không có quyền" thay vì "hãy đăng nhập lại", rồi đi hỏi admin về một quyền họ vốn đã có.

**Đọc dữ liệu diễn ra sau kiểm tra thẩm quyền, không phải trước.** Đọc trước rồi mới kiểm tra là cách vô tình để lộ sự tồn tại của tài nguyên qua chênh lệch thời gian phản hồi.
