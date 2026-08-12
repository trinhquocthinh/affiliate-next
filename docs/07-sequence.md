---
doc: diagrams-sequence
version: 1.0.0
status: draft
updated: 2026-08-11
upstream: [sdd, tech-spec-architecture]
---

# Sequence

| 📄 **Metadata** | 📑 **Details** |
|:---|:---|
| **Doc ID** | `diagrams-sequence` |
| **Version** | `1.0.0` |
| **Status** | 🟡 **Draft** |
| **Last Updated** | `2026-08-11` |
| **Owner** | Quành (Admin) |
| **Upstream** | [sdd], [tech-spec-architecture] |
| **Downstream** | — |


Chỉ vẽ các tương tác **vượt qua ranh giới tầng** hoặc **gọi ra ngoài hệ thống**. Tên actor khớp tên container ở `c4.md`.

## 1. Điền link kèm Sub_ID — luồng có ranh giới ngoài

Đây là luồng quan trọng nhất trong cả dự án, và điều đáng chú ý là **một đoạn của nó nằm ngoài hệ thống**.

```mermaid
sequenceDiagram
    actor Aff as Affiliate
    participant UI as Trình duyệt
    participant API as Route Handler
    participant Dom as src/domain
    participant DB as Neon
    participant Shopee as Sàn (ngoài)

    Aff->>UI: Mở yêu cầu REQ-20260909-0007
    UI->>API: GET /api/requests/:id
    API->>API: assertPermission(actor, affiliate.fill)
    API->>DB: đọc Request
    DB-->>API: Request
    API-->>UI: dữ liệu + mã yêu cầu
    UI-->>Aff: hiện mã kèm nút sao chép

    Note over Aff,Shopee: ⚠️ Đoạn này hệ thống KHÔNG quan sát được
    Aff->>Aff: bấm sao chép mã
    Aff->>Shopee: tạo Custom Link, dán mã vào ô Sub_ID
    Shopee-->>Aff: link affiliate rút gọn

    Aff->>UI: dán link + tích "đã gắn mã"
    UI->>API: POST /api/requests/:id/fill
    API->>Dom: validateUrl(link)
    Dom-->>API: ok
    API->>DB: cập nhật affiliateLink, subIdStamped=true, status=FILLED
    API->>DB: ghi AuditLog
    DB-->>API: ok
    API-->>UI: 200
    UI-->>Aff: đã lưu
```

**Khối `Note` là toàn bộ TR-8 gói gọn trong một dòng.** Link rút gọn của sàn không lộ tham số, nên hệ thống không có cách nào xác minh Sub_ID đã thực sự được gắn. Ô tích là **lời khai**, không phải bằng chứng.

Hệ quả cho việc thiết kế: không chặn khi người dùng không tích. Chặn thì họ sẽ tích bừa để qua cửa, và ta mất luôn tín hiệu — biến một dữ liệu yếu thành một dữ liệu nói dối.

Cách kiểm chứng duy nhất là **hậu kiểm**, ở sơ đồ số 2.

## 2. Nạp báo cáo và ghép — luồng vượt tầng

```mermaid
sequenceDiagram
    actor Master as Affiliate Master
    participant UI as Trình duyệt
    participant API as Route Handler
    participant Dom as src/domain
    participant DB as Neon

    Master->>UI: chọn tệp CSV từ sàn
    UI->>API: POST /api/reconciliation/import
    API->>API: assertPermission(...)
    API->>Dom: parseReport(csv)

    alt Thiếu cột bắt buộc
        Dom-->>API: lỗi miền
        API-->>UI: 400 ERR_REPORT_FORMAT
        UI-->>Master: không dòng nào được xử lý
    else Hợp lệ
        Dom-->>API: 91 dòng đã chuẩn hoá
        API->>DB: tạo ReconciliationRun
        API->>DB: đọc Request trong kỳ

        loop Từng dòng
            API->>Dom: matchRow(row, requests)
            Note right of Dom: Ưu tiên BR-064<br/>1. Sub_id1<br/>2. orderId + itemId<br/>3. NONE
            Dom-->>API: matchedRequestId, matchMethod
        end

        API->>DB: ghi ReconciliationRow (không đụng Request — BR-067)
        API->>API: gom 3 nhóm A/B/C
        API-->>UI: kết quả
        UI-->>Master: A: đã ghép · B: dòng thừa · C: yêu cầu thiếu báo cáo
    end

    Master->>UI: xuất tệp
    UI->>API: GET /api/reconciliation/:runId/export
    API-->>Master: CSV giữ nguyên cột trạng thái (BR-066)
```

**`matchRow` nằm trong `src/domain` chứ không trong route handler.** Đó là lý do nó test được bằng 91 dòng dữ liệu thật mà không cần cơ sở dữ liệu — và ghép sai là loại lỗi im lặng, đúng tiêu chí ở tech-spec §2.2.

**Mũi tên ghi `ReconciliationRow` không chạm vào `Request`.** BR-067: nạp báo cáo là phép đọc. Nếu ghép sai, không có gì hỏng — chỉ cần xoá lần nạp và làm lại.

## 3. Chuyển đổi thẩm quyền — trước và sau

Không phải sơ đồ chạy máy, mà là sơ đồ để **so sánh hai trạng thái mã nguồn**.

```mermaid
sequenceDiagram
    participant API as Route Handler
    participant Ad_hoc as Kiểm tra rải rác
    participant Matrix as domain/permissions

    Note over API,Ad_hoc: TRƯỚC — mỗi điểm cuối tự quyết
    API->>Ad_hoc: if (actor.isAdmin || actor.role === 'AFFILIATE')
    Ad_hoc-->>API: true/false
    Note right of Ad_hoc: Sửa quyền = sửa N chỗ<br/>Sót 1 chỗ = lỗi im lặng

    Note over API,Matrix: SAU — một nguồn chuẩn
    API->>Matrix: assertPermission(actor, 'affiliate.fill')
    Matrix-->>API: throw Forbidden / void
    API->>Matrix: canAccessRequest(actor, req, 'affiliate.fill')
    Matrix-->>API: boolean
    Note right of Matrix: Sửa quyền = sửa 1 chỗ<br/>Định danh lạ = lỗi biên dịch
```

Thứ tự chuyển đổi bắt buộc ở tech-spec §5.2: viết ma trận phản ánh **hành vi hiện tại** → test xanh → thay từng điểm cuối → **rồi mới** thêm vai mới. Làm ngược thì khi có lỗi, bạn không phân biệt được do chuyển đổi hay do vai mới — và bạn đang gỡ lỗi mù trên hệ thống có người dùng thật.
