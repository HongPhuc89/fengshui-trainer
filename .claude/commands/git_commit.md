# Git Commit

Liệt kê các thay đổi hiện tại và tạo git commit với message tóm tắt nội dung.

## Quy tắc bắt buộc

- **KHÔNG push lên remote** (không chạy `git push`)
- **KHÔNG commit các file có thể chứa sensitive data**:
  - `.env`, `.env.*` (trừ `.env.example`, `.env.*.example`)
  - `*.pem`, `*.key`, `*.p12`, `*.cert`
  - `secrets.*`, `credentials.*`
  - Bất kỳ file nào chứa API key, password, token thật
- **KHÔNG dùng `--no-verify`** (không bypass pre-commit hooks)
- **KHÔNG amend commit cũ** — luôn tạo commit mới

## Quy trình

### Bước 1 — Xem trạng thái hiện tại

Chạy song song:
- `git status` — xem untracked + modified files
- `git diff` — xem chi tiết thay đổi staged + unstaged
- `git log --oneline -5` — xem 5 commit gần nhất để follow commit style

### Bước 2 — Liệt kê và phân loại thay đổi

Hiển thị danh sách files thay đổi, phân loại:

| File | Loại thay đổi | An toàn commit? |
|------|--------------|-----------------|
| ... | added/modified/deleted | ✅ / ⚠️ SKIP |

**Đánh dấu ⚠️ SKIP** nếu file:
- Là `.env` hoặc chứa credentials thật
- Có tên gợi ý sensitive data (`secret`, `key`, `token`, `password`)
- Là binary lớn không liên quan (video, PDF binary)

### Bước 3 — Stage files an toàn

Chỉ stage các file đã được xác nhận an toàn. Ưu tiên stage theo từng file cụ thể (không dùng `git add -A` hay `git add .`).

### Bước 4 — Viết commit message

Format:
```
<type>: <mô tả ngắn gọn bằng tiếng Anh>

<body tùy chọn — liệt kê các thay đổi quan trọng nếu cần>

```

**Commit types:**
- `feat` — tính năng mới
- `fix` — sửa bug
- `docs` — chỉ thay đổi documentation/design docs
- `refactor` — refactor code
- `chore` — config, tooling, không ảnh hưởng logic
- `style` — CSS, formatting

### Bước 5 — Tạo commit

Dùng HEREDOC để đảm bảo format đúng:

```bash
git commit -m "$(cat <<'EOF'
type: mô tả

- Chi tiết 1
- Chi tiết 2

EOF
)"
```

### Bước 6 — Xác nhận

Chạy `git status` sau commit để xác nhận thành công. Thông báo cho user kết quả (commit hash + message).

**KHÔNG chạy `git push` trong bất kỳ trường hợp nào.**
**Luôn viết bằng tiếng Anh**
