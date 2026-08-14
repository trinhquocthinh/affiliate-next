# Quy Chuẩn Kiểm Thử & Kiểm Soát Chất Lượng Mã Nguồn

Quy định bắt buộc dành cho lập trình viên và trợ lý AI trong toàn bộ repository `affiliate-next`.

## 1. Nguyên Tắc Bắt Buộc Về Unit Test

### 1.1. Bắt Buộc Viết Test Khi Tạo Function Mới

- Bất kỳ khi nào tạo mới hoặc sửa đổi một function nghiệp vụ (nằm trong `src/domain/`, `src/lib/`, `src/hooks/`, hoặc utility helpers):
  - **Bắt buộc** phải tạo hoặc cập nhật file test tương ứng (`*.test.ts` / `*.test.tsx`).
  - Bộ test case phải bao phủ tối thiểu:
    1. **Happy Path**: Dữ liệu đầu vào chuẩn, kết quả trả về đúng định dạng.
    2. **Edge Cases**: Giá trị rỗng (`null`, `undefined`, `""`), số âm, cận trên/cận dưới, ký tự đặc biệt.
    3. **Error Handling**: Ném đúng lỗi hoặc trả về mã lỗi (`PermissionError`, `ApiError`, `ValidationError`).

### 1.2. Bắt Buộc Có Test Khi Hoàn Thành 1 Feature

- Khi hoàn thành một tính năng (Feature / Epic / API Endpoint / Domain flow):
  - Bắt buộc phải có Unit / Integration Test kiểm tra toàn bộ luồng nghiệp vụ liên quan đến feature đó.
  - Không được coi một feature là hoàn thành (`[x]` trong `11-master-plan.md`) nếu chưa có test case tự động kiểm chứng.

## 2. Hệ Thống Kiểm Tra Tự Động (Quality Gates)

Dự án tích hợp các công cụ kiểm soát chất lượng sau:

1. **Pre-commit Hook (Husky + lint-staged)**:
   - Tự động chạy `eslint --fix` và `prettier --write` trên các file được stage.
   - Chặn commit nếu có lỗi linter hoặc cú pháp.
2. **ESLint (`yarn lint`)**:
   - Tuân thủ quy tắc kiến trúc Clean Architecture: UI không import trực tiếp vào domain, kiểm tra thẩm quyền phải qua `matrix.ts` / `resolve.ts`.
   - Cấm dùng `any` bừa bãi.
3. **Prettier (`yarn format:check` / `yarn format`)**:
   - Đảm bảo tính nhất quán định dạng code toàn dự án.
4. **jscpd (`yarn duplicate:check`)**:
   - Tự động quét trùng lặp code / copy-paste trong thư mục `src/`.
   - Ngưỡng cho phép tối đa: 5%.
5. **Knip (`yarn knip`)**:
   - Quét tìm unused files, dead code, dependencies thừa và các export không được sử dụng.
6. **Vitest (`yarn test`)**:
   - Chạy toàn bộ bộ test tự động.

## 3. Lệnh Kiểm Tra Toàn Diện Trước Khi Commit / Merge

Trước khi hoàn thành nhiệm vụ hoặc đẩy mã lên nhánh chính, bắt buộc phải chạy:

```bash
yarn check:all
```

Lệnh này sẽ thực thi tuần tự:

1. `yarn typecheck` (TypeScript)
2. `yarn lint` (ESLint)
3. `yarn duplicate:check` (jscpd)
4. `yarn knip` (Knip)
5. `yarn test` (Vitest)
