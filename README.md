# 企业通讯录名册

> 前后端双端 — Node.js + Express + SQLite (纯 JS) + 现代化响应式前端

一个开箱即用的企业通讯录系统,无需编译任何原生模块,Windows / macOS / Linux 通吃。

## 🌐 在线演示

- 👉 **静态前端演示**:https://AbasswithoutBass.github.io/company-directory/(GitHub Pages,数据为内置示例,搜索/导出可用,写操作仅在内存中)
- 👉 **完整后端版**:参考下方 "部署到 Render" 一节(免费,支持真后端 + 数据持久化)

> Pages 版前端使用内置示例数据;登录/CRUD 仅在内存中模拟。如需完整功能,部署到 Render(免费 750 小时/月 + 1GB 持久磁盘)。

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

[Render](https://render.com) 免费 Web Service 提供 750 小时/月运行时间 + 1GB 持久磁盘,正好适合这种 SQLite 单文件应用。

### 一键部署步骤

1. 注册 [render.com](https://render.com),**用 GitHub 登录**
2. 仪表盘点 **New +** → **Blueprint**
3. **Connect repository**:选 `AbasswithoutBass/company-directory`
4. Render 会自动识别仓库根的 `render.yaml`,列出要创建的服务
5. 点 **Apply** → 等待 2-3 分钟构建
6. 构建完成后会给你一个 URL:`https://company-directory-xxx.onrender.com`

> ⚠️ 免费版 15 分钟无请求会休眠,首次唤醒约 30 秒。下次再用就秒响应。

### 修改默认密码

部署成功后,在 Render 仪表盘:
- 进 service → **Environment** → 修改 `ADMIN_PASSWORD` → Save
- 改完会自动重启,新密码生效

### 数据持久化

- 数据库文件存到 Render 持久卷 `/opt/render/project/src/data/directory.db`
- 重启服务数据不丢
- 删除 service 时数据才丢(想迁移就下载 `data/directory.db`)



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
