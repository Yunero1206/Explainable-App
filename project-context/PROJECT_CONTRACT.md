# Explainable Trust V0 — Project Contract

## Mission

Explainable Trust V0 là một portfolio app có thể chạy được, chứng minh trọn vòng:

**Evidence → assessment → explanation → action/recovery → revision**

App phải cho người xem hiểu:

- kết luận dựa trên evidence nào;
- đâu là fact, interpretation và unknown/gap;
- người dùng có thể làm gì tiếp theo;
- khi có evidence hoặc action mới, kết luận thay đổi thành revision mới như thế nào.

Đây là executable case study, không phải production SaaS.

## V0 output bắt buộc

V0 được coi là đủ chạy khi một người khác có thể mở app local và hoàn thành một demo case ổn định:

1. Mở case mẫu và thấy evidence/source hiện có.
2. Thấy assessment hiện tại cùng explanation có thể truy ngược về evidence.
3. Thấy gaps/unknowns và action/recovery phù hợp.
4. Thực hiện hoặc replay một action/evidence update.
5. App tạo revision mới thay vì ghi đè lịch sử.
6. Current projection/timeline phản ánh đúng revision mới.
7. Reload app vẫn giữ đúng record và revision history.
8. UI, server và persistence cùng dùng canonical record làm source of truth.
9. Default demo chạy deterministic; external AI provider không phải điều kiện để demo hoạt động.
10. Typecheck, full tests và production build đều pass.

## V0 không yêu cầu

- production-scale security, auth, billing hoặc multi-tenant architecture;
- Gemini Flash-Lite extraction;
- redesign/polish lớn;
- hoàn thiện mọi case study;
- automation production hoặc monitoring production;
- thêm framework mới không trực tiếp giúp demo loop chạy đúng.

## Phase map

### Phase 1A — Canonical contract

Schema, branded ID families, revision/delta/source relationships, gap/action lifecycle và validation invariants.

### Phase 1A-R — Recovery and runtime integration

Đóng các lỗ contract còn lại, sau đó chứng minh runtime, server, persistence/reload và replay thực sự tuân theo canonical record.

### Phase 1B — Deterministic V0 behavior

Một demo case deterministic chạy trọn vòng trong UI với kết quả có thể lặp lại và kiểm thử.

### V0 gate

Chạy end-to-end demo và toàn bộ command gates; chỉ sửa blocker cần thiết để bàn giao bản local ổn định.

## Definition of Done

Không được tuyên bố V0 complete chỉ vì một subset test pass. V0 chỉ complete khi tất cả điều sau có bằng chứng:

- canonical transition invariants pass cả positive và negative tests;
- runtime không tạo hoặc dùng một nguồn state song song trái canonical record;
- save → reload → replay bảo toàn identity, sources, revisions và current projection;
- demo case hoàn thành đầy đủ vòng mission;
- `npm run lint` exit 0;
- full `npm test` exit 0;
- `npm run build` exit 0;
- không có known blocker làm demo sai hoặc mất dữ liệu;
- `CURRENT_STATE.md` ghi đúng gate nào đã chạy và gate nào chưa chạy.

## Evidence policy

- Code, git state và command output tái hiện được là evidence.
- `task.md`, walkthrough và lời kể của agent không phải bằng chứng độc lập.
- A passing subset proves only that subset.
- Không dùng `as any`, `as unknown as`, double casts hoặc fallback để che contract error trong active slice.
- Nếu request mới mâu thuẫn contract này, agent phải dừng và nêu mâu thuẫn trước khi sửa.

## Scope authority

`PROJECT_CONTRACT.md` chỉ được đổi khi user chấp thuận một thay đổi cấp project. Task agent không được tự sửa mission, V0 Definition of Done hoặc phase boundary để hợp thức hóa implementation hiện tại.
