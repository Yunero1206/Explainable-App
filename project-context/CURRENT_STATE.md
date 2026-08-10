# Current State

Last confirmed baseline: `86372a99fbc66a94cac5dc53e1b4617a3da0350f`

Current branch/upstream intent: local working branch pushed to `origin/main`.

Current phase: **Phase 1A-R active**.

## Đã xác nhận ở baseline

- Commit tồn tại trên upstream `main`.
- `npm run lint` pass khi audit độc lập.
- Canonical test file: 21 tests pass.
- Full `npm test`: 22 tests / 2 files pass tại baseline.
- `npm run build` pass.
- Các lỗi trước về missing/duplicate gap delta, reopen revision identity và single-event source reconciliation đã được đóng.

## Slice 1 Canonical Closure (Accepted)

- Accepted canonical implementation commit: `b994ac94fcae09632071579e29ce025317fb31bd`
- Slice 1 canonical closure is accepted.

Gates chạy thành công:
- `cmd.exe /c "npm run lint"`: exit 0
- `cmd.exe /c "npm test"`: exit 0
  - canonical file: 22 tests passed
  - full `npm test`: 23 tests passed across 2 files
- `cmd.exe /c "npm run build"`: exit 0

## Phase 1A-R (Runtime Integration)

### Phase 1A-R: Corrective Runtime Stabilization
**Status:** Active — unaccepted
**Slice:** Core Canonical Runtime (`src/canonical/`, `src/domain/`, `tests/canonicalRuntime.test.ts`, `tests/cleanup.test.ts`, etc.)
**Baseline Commit:** `86372a99fbc66a94cac5dc53e1b4617a3da0350f`
**Candidate Implementation Commit:** `612bbd0cb0b4aa2cd99af592b53011808161a74d` (pending review)

#### Verified Completion State:
* **Bootstrap Admission:** Fixed. Strict Zod schemas explicitly define Legacy structs without `.passthrough()`. `SAMPLE_CASES` upgrade deterministically.
* **Commit Boundary:** Fixed. Revision timestamping is deterministic (`commitRevisionToRecord` accepts injected strings).
* **Entity Identity:** Fixed. Immutable fields strictly reject mutation. CE9-CE12 tests proven.
* **Translation Purity:** Fixed. `applyTranslation` ensures overlay logic is pure. `acceptTranslationResponse` rejects stale requests and unknown IDs.
* **State Cleanup:** Fixed. `cleanupCaseState` cleanly extracts domain logic away from presentation mutation without using ambiguous prefix matching (switched to `::` separator).
* **Acceptance Boundaries:** Proven negative bounds (legacy structural rejection, presentation structural rejection, invariant verification). All tests are reproducibly green.

Gates chạy thành công:
- `cmd.exe /c "npm run lint"`: exit 0
- `cmd.exe /c "npm test tests/canonicalRuntime.test.ts tests/serverBoundary.test.ts"`: exit 0 (55 tests)
- `cmd.exe /c "npm test"`: exit 0 (128 tests)
- `cmd.exe /c "npm run build"`: exit 0
- Unsafe casts added in modified files (`as any` & `as unknown as`): 0

## Đường đi ngắn nhất đến V0

| Slice | Kết quả cần có | Trạng thái |
|---|---|---|
| 1. Canonical closure | Đóng 2 counterexample còn lại, toàn bộ gates xanh | Accepted |
| 2. Runtime integration (1A-R) | UI/server/domain dùng canonical record nhất quán | Active — ready for review |
| 3. Persistence/reload | Save/reload giữ record, sources, revision identity | Pending |
| 4. Deterministic demo | Một case chạy trọn evidence → revision loop | Pending |
| 5. V0 gate | Lint/test/build + demo smoke test, không còn blocker | Pending |

## State update rule

Chỉ cập nhật file này sau khi agent đã chạy gate thật. Mỗi cập nhật phải ghi commit SHA, command, exit status, test count và phần nào vẫn chưa được chứng minh.
