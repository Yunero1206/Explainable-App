# Active Slice — Unambiguous Gap Transition Identity

Baseline commit: `fe22f8800cb2801f671c5150465e566aa3cac3cd`

Phase: Phase 1A-R canonical closure.

## Objective

Đóng đúng hai lỗ canonical transition còn lại. Không mở runtime, persistence, UI/UX, Gemini extraction, chat, translation, QuickBite replay, deferred backlog hoặc Phase 1B trong slice này.

## Required behavior

### 1. Exactly one structured event per actual transition

Với mỗi gap status change trong một revision:

- có đúng một matching structured `gap_transition` event;
- reject khi zero, multiple hoặc ambiguous event;
- event phải đúng gap, containing revision, previous status và resulting status;
- source-ID set của event phải bằng gap status sources và matching delta sources;
- mọi event có `gap_transition` phải được validate độc lập;
- không dùng `find()` theo cách chỉ check event đầu rồi bỏ qua event dư.

Phải reject counterexample:

- `G01`: `open → resolved`;
- gap metadata, delta và `EV2` dùng `[U01]`;
- thêm `EV3` mô tả cùng transition nhưng dùng `[U02]`;
- validator hiện trả `[]` nhưng phải trả error.

### 2. No transition-identity rewrite without status change

Khi gap tồn tại ở parent và child với status không đổi:

- không được tự thêm, xóa hoặc rewrite `status_revision_id`, `status_reason`, `status_source_ids`;
- nếu parent có transition identity, child phải carry forward cùng identity và source set;
- nếu initially-open parent không có transition metadata, unchanged child không được tự thêm metadata;
- non-status `updated` delta không được giả mạo status transition identity.

Phải reject counterexample:

- parent `G01` open, không có transition metadata;
- child vẫn open nhưng thêm `status_revision_id: R02`, reason và sources;
- không có status change.

## Regression tests bắt buộc

Phải chứng minh reject:

- multiple structured transition events cho một transition;
- extra event có mismatched/additional/missing sources;
- newly introduced hoặc changed `status_revision_id` khi status không đổi;
- cleared/rewritten reason hoặc sources khi status không đổi.

Phải chứng minh valid:

- exactly one correctly sourced resolve event;
- exactly one correctly sourced reopen event;
- carried-forward resolved gap với identity không đổi;
- initially-open gap carry forward không có transition metadata.

## Expected code scope

Chủ yếu:

- `src/canonical/validate.ts`;
- `tests/canonical-record.test.ts`.

Nếu cần đổi file khác, agent phải nêu file, lý do và invariant liên quan trong plan trước khi edit.

## Required verification

Chạy độc lập:

- `npm run lint`;
- `npm test`;
- `npm run build`.

Report phải có exit status thật, canonical test count, full-suite file/test count và grep `as any` / `as unknown as` trong file đã đổi.

## Handoff

Nếu pass, commit đúng slice với message:

`fix: enforce unambiguous gap transition identity`

Push `main`, cung cấp full SHA. Chỉ được claim **active slice pass**; không được claim Phase 1A-R hoặc V0 complete.
