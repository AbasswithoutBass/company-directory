# 企业通讯录名册

> 前后端双端 — Node.js + Express + SQLite (纯 JS) + 现代化响应式前端

一个开箱即用的企业通讯录系统,无需编译任何原生模块,Windows / macOS / Linux 通吃。

## 🌐 在线演示

- 👉 **推荐**:https://abasswithoutbass.github.io/company-directory/(GitHub Pages 静态前端,默认指向 Render 真后端,**完整功能**)
- 👉 **同源备用**:https://company-directory-w22q.onrender.com(直接访问 Render,数据从 Render SQLite)

> GitHub Pages 上的前端通过 `window.API_BASE` 跨域调用 Render 后端,获得真后端体验;若 Render 服务不可达,前端自动降级到内置 demo 数据。

## ✨ 特性

- **首页**:卡片式员工浏览,按姓名 / 工号 / 手机 / 邮箱 / 职位搜索,按部门筛选
- **管理后台**:`/admin.html` 登录后增删改查,搜索过滤
- **鉴权**:JWT(8 小时有效),bcrypt 哈希
- **数据导出**:一键导出 CSV(Excel 友好,带 BOM)
- **持久化**:SQLite 文件存储(`data/directory.db`)
- **响应式**:手机 / 平板 / 桌面三端适配
- **零构建**:前端纯 HTML/CSS/JS,无需 npm run build

## 📂 目录结构

```
company-directory/
├── server.js            # Express 服务入口
├── db.js                # SQLite 封装(sql.js,纯 JS,免编译)
├── seed.js              # 写入示例数据
├── smoke.js             # 冒烟测试脚本
├── package.json
├── .env.example         # 环境变量样例
├── data/
│   └── directory.db     # SQLite 数据库(运行后生成)
└── public/
    ├── index.html       # 首页(员工查询)
    ├── admin.html       # 管理后台
    ├── css/style.css    # 共享样式
    └── js/
        ├── app.js       # 首页逻辑
        └── admin.js     # 管理后台逻辑
```

## 🚀 快速开始

```bash
# 1. 安装依赖(无需 Python / Visual Studio)
npm install

# 2. (可选)写入 12 条示例员工数据
npm run seed

# 3. 启动服务
npm start

# 4. 浏览器访问
#    首页:        http://localhost:3000
#    管理后台:    http://localhost:3000/admin.html
#                 默认账号 admin / admin123(首次启动自动创建)
```

> 默认端口 `3000`,可通过环境变量 `PORT=8080 npm start` 修改。

## ⚙️ 环境变量

复制 `.env.example` 为 `.env` 并按需修改:

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `PORT` | `3000` | HTTP 端口 |
| `JWT_SECRET` | `change-me` | JWT 签名密钥(**生产环境务必改!)** |
| `ADMIN_USERNAME` | `admin` | 首次启动时创建的默认管理员账号 |
| `ADMIN_PASSWORD` | `admin123` | 默认管理员密码 |

> 修改默认账号密码后,**需删除 `data/directory.db` 才会重建**。

## 🔌 API 文档

| Method | Path | 鉴权 | 说明 |
| --- | --- | :-: | --- |
| `POST` | `/api/auth/login` | - | 登录,返回 `{ token, username }` |
| `GET`  | `/api/auth/me` | ✓ | 当前管理员信息 |
| `GET`  | `/api/employees` | - | 列表(支持 `q`、`department`、`page`、`pageSize`) |
| `GET`  | `/api/employees/:id` | - | 员工详情 |
| `POST` | `/api/employees` | ✓ | 新增员工 |
| `PUT`  | `/api/employees/:id` | ✓ | 更新员工 |
| `DELETE` | `/api/employees/:id` | ✓ | 删除员工 |
| `GET`  | `/api/departments` | - | 部门列表(含人数) |
| `GET`  | `/api/export` | - | 导出全部员工为 CSV |

### 员工字段

| 字段 | 必填 | 说明 |
| --- | :-: | --- |
| `employee_no` | ✓ | 工号(唯一) |
| `name` | ✓ | 姓名 |
| `department` | ✓ | 部门 |
| `position` |   | 职位 |
| `mobile` |   | 手机号 |
| `email` |   | 邮箱 |
| `extension` |   | 分机号 |
| `office_location` |   | 办公地点 |
| `hire_date` |   | 入职日期(`YYYY-MM-DD`) |
| `notes` |   | 备注 |

## 🧪 测试

```bash
# 启动一个临时实例在 3399 端口,跑完整 CRUD + 鉴权 + 中文搜索,自动退出
node smoke.js
```

## 🚀 部署到 Render(免费)

[Render](https://render.com) 免费 Web Service 提供 750 小时/月运行时间,Node.js 应用,适合 demo / 个人项目。

### 一键部署步骤

1. 注册 [render.com](https://render.com),**用 GitHub 登录**
2. 仪表盘点 **New +** → **Blueprint**
3. **Connect repository**:选 `AbasswithoutBass/company-directory`
4. Render 会自动识别仓库根的 `render.yaml`,列出要创建的服务
5. 点 **Apply** → 等待 2-3 分钟构建
6. 构建完成后会给你一个 URL:`https://company-directory-xxx.onrender.com`

> ⚠️ 免费版 15 分钟无请求会休眠,首次唤醒约 30 秒。下次再用就秒响应。

### ⚠️ 关于数据持久化(重要!)

**Render Free tier 自 2024 年起不再支持持久磁盘**,意味着:

- 每次重新部署 / 重启服务,数据库会被清空
- 部署时设置了 `SEED_ON_BOOT=true`,会**自动重新写入 12 条示例员工**
- 你手动添加/修改的数据**会丢**

### 真持久化方案(任选)

| 方案 | 费用 | 难度 | 说明 |
| --- | --- | :-: | --- |
| Render Starter | $7/月 | ⭐ | 开启持久磁盘,数据不丢 |
| **[Turso](https://turso.tech)** | **免费** | ⭐⭐ | **专门做 SQLite 托管,免费 9GB + 5 亿读/月 + 1 千万写/月**,最适合你这项目 |
| Neon / Supabase | 免费 | ⭐⭐⭐ | 免费 Postgres,需要改代码换 driver |

**想接 Turso 跟我说一声**,10 分钟改完,数据真持久化 + 全球边缘同步。

### 修改默认密码

部署成功后,在 Render 仪表盘:
- 进 service → **Environment** → 修改 `ADMIN_PASSWORD` → Save
- 改完会自动重启,新密码生效



```bash
# 启动一个临时实例在 3399 端口,跑完整 CRUD + 鉴权 + 中文搜索,自动退出
node smoke.js
```

## 🛠️ 技术栈

- **后端**:Node.js 18+ / Express 4 / sql.js / jsonwebtoken / bcryptjs
- **前端**:原生 HTML / CSS / JS(无任何框架,无构建步骤)
- **存储**:SQLite(sql.js 驱动,纯 WASM,免编译)

> 选 `sql.js` 而非 `better-sqlite3` 是为了规避 Windows 下 node-gyp 编译对 Python / VS Build Tools 的依赖。代价是每次写入都会把整个 DB 序列化写盘 — 千级以下数据无感知,万级以上建议换回 `better-sqlite3`。

## 📝 许可证

MIT
