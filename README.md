# 企业通讯录名册

> 前后端双端 — Node.js + Express + SQLite (纯 JS) + 现代化响应式前端

一个开箱即用的企业通讯录系统,无需编译任何原生模块,Windows / macOS / Linux 通吃。

## 🌐 在线演示

👉 **https://AbasswithoutBass.github.io/company-directory/**(GitHub Pages,演示模式)

> Pages 版前端使用内置示例数据,搜索/筛选/导出 CSV 可用;登录/CRUD 仅在内存中模拟(刷新即重置)。如需完整功能,请按下方"本地运行"启动 Node.js 后端,或部署到 Render / Railway 等平台。

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

## 🛠️ 技术栈

- **后端**:Node.js 18+ / Express 4 / sql.js / jsonwebtoken / bcryptjs
- **前端**:原生 HTML / CSS / JS(无任何框架,无构建步骤)
- **存储**:SQLite(sql.js 驱动,纯 WASM,免编译)

> 选 `sql.js` 而非 `better-sqlite3` 是为了规避 Windows 下 node-gyp 编译对 Python / VS Build Tools 的依赖。代价是每次写入都会把整个 DB 序列化写盘 — 千级以下数据无感知,万级以上建议换回 `better-sqlite3`。

## 📝 许可证

MIT
