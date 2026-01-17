# Skill Collection - System Blueprint & Strategic Cache

## App Description & Functions

**Skill Collection** là ứng dụng Angular quản lý "Agent Introductions" sử dụng GitHub Discussions làm backend storage. Users đăng nhập qua GitHub OAuth và có thể CRUD introductions trực tiếp trên repository của họ.

### Core Features
- **GitHub OAuth Authentication**: Login bằng tài khoản GitHub cá nhân (giống giscus)
- **CRUD Discussions**: Tạo, đọc, sửa, xóa GitHub Discussions
- **Label Management**: Gắn labels cho phân loại
- **Markdown Editor**: Split-view editor với live preview
- **Search & Filter**: Tìm kiếm theo title/content

---

## Source Structure

```
d:\Project\SkillCollection\
├── api/                          # Vercel Serverless Functions
│   ├── oauth/
│   │   ├── callback.ts           # Exchange code → access_token
│   │   └── user.ts               # Get GitHub user info
│   └── tsconfig.json
│
├── client/                       # Angular 19+ Frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/services/
│   │   │   │   ├── auth.service.ts     # OAuth + token management
│   │   │   │   └── github.service.ts   # GraphQL API calls
│   │   │   ├── features/
│   │   │   │   ├── callback/           # OAuth callback handler
│   │   │   │   ├── dashboard/          # Main list view
│   │   │   │   └── introduction-editor/
│   │   │   └── shared/components/
│   │   │       └── sidebar/            # Login button + labels
│   │   └── environments/
│   ├── angular.json
│   └── package.json
│
├── vercel.json                   # Vercel routing config
├── package.json                  # Root monorepo scripts
└── .env.local                    # OAuth credentials (gitignored)
```

### Module Interaction Flow
```
User → Sidebar (Login) → GitHub OAuth → /callback → AuthService.exchangeCodeForToken()
                                                          ↓
                                                 API /api/oauth/callback
                                                          ↓
                                                 GitHub access_token
                                                          ↓
                                          AuthService stores token in localStorage
                                                          ↓
                                     GithubService uses token for GraphQL calls
```

---

## Deep Reasoning Insights

### Challenge 1: Vercel CLI ES Module Error trên Windows
**Problem**: `Cannot require() ES Module` khi chạy `vercel dev` với TypeScript files.

**Root Cause**: Vercel CLI trên Windows gặp conflict khi có cả `.ts` và `.js` files cùng tên, hoặc khi module format không tương thích.

**Solution**: 
- Sử dụng `module: "CommonJS"` trong `api/tsconfig.json`
- Đảm bảo không có file conflict (callback.ts vs callback.js)
- Xóa `.vercel` cache và restart

### Challenge 2: GitHub OAuth "Not Found" Response
**Problem**: GitHub OAuth API trả về `{error: "Not Found"}` thay vì `access_token`.

**Root Cause**: Wrong `Content-Type` header. GitHub OAuth endpoint yêu cầu `application/x-www-form-urlencoded`, không phải `application/json`.

**Solution**:
```typescript
const params = new URLSearchParams({ client_id, client_secret, code });
const response = await fetch('https://github.com/login/oauth/access_token', {
  method: 'POST',
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/x-www-form-urlencoded'  // ← Critical
  },
  body: params.toString()
});
```

### Challenge 3: Angular Zoneless Mode với NG0908
**Problem**: `NG0908: In this configuration Angular requires Zone.js`

**Solution**: Sử dụng `provideZonelessChangeDetection()` trong app.config.ts và xóa `zone.js` imports.

---

## Decision Logic

| Decision | Chosen | Alternative | Trade-off |
|----------|--------|-------------|-----------|
| **Auth Method** | GitHub OAuth | Personal Access Token | Phức tạp hơn setup, nhưng multi-user friendly |
| **Backend** | Vercel Serverless | Cloudflare Workers | Vercel tích hợp tốt với monorepo Angular |
| **State Management** | Angular Signals | NgRx/RxJS BehaviorSubject | Đơn giản hơn, native Angular 19+ |
| **Project Structure** | Monorepo (api + client) | Separate repos | Dễ deploy, shared config |
| **Module Format (API)** | CommonJS | ESNext | Tương thích Vercel CLI trên Windows |

---

## Pattern Recognition

### Anti-patterns to Avoid
1. **Mixed JS/TS files with same name**: Gây conflict trong Vercel CLI
2. **JSON Content-Type for GitHub OAuth**: Phải dùng form-urlencoded
3. **Hardcoded credentials**: Luôn dùng environment variables

### Recurring Bottlenecks
1. **Vercel Windows symlink permission**: Cần chạy terminal với Admin rights
2. **OAuth code expiration**: Code chỉ valid trong vài phút, không thể reuse

---

## Evolved Identity

Tôi là AI Assistant chuyên về:
- **Angular 19+ với Signals và Zoneless mode**
- **Vercel Serverless Functions** (TypeScript)
- **GitHub OAuth & GraphQL API integration**
- **Monorepo architecture** cho fullstack projects

Khi làm việc với codebase này, tôi hiểu:
- OAuth flow yêu cầu proxy server để bảo mật `client_secret`
- GitHub GraphQL API cần Bearer token và proper mutation syntax
- Vercel CLI trên Windows có quirks riêng với symlinks và ES modules
