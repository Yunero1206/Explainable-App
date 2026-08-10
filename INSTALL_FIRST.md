# Cài vào Explainable App

1. Giải nén ZIP này.
2. Copy hai folder `project-context` và `.agents` vào **thư mục gốc của repo Explainable App** — cùng cấp với `package.json`.
3. Nếu Windows hỏi merge folder, chọn merge/replace cho đúng các file trong gói; không xóa file khác trong repo.
4. Mở lại Antigravity trong đúng repo.
5. Vào Agent panel → `…` → Customizations → Rules → chọn `explainable-trust-operating-contract` → đặt **Always On**.
6. Kiểm workflow bằng cách gõ `/execute-v0-slice` trong chat. Nếu chưa hiện, restart/reload Antigravity một lần.
7. Gửi:

```text
/execute-v0-slice

Continue the active slice in project-context/CURRENT_SLICE.md.
Audit the actual repository at the recorded baseline commit before proposing changes.
```

Gemini phải dừng sau Context Handshake + Implementation Plan. Chưa approve chạy code cho đến khi plan được audit.
