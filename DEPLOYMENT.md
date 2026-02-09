# JSON 树状解析器部署文档

本文档适用于项目目录：`<project-root>`

## 1. 项目说明

本项目是纯前端静态站点，不依赖后端服务。

核心文件：
- `index.html`
- `style.css`
- `script.js`
- `jsonTreeCore.js`

测试文件：
- `tests/run-tests.mjs`

## 2. 部署前检查

### 2.1 环境要求
- Node.js 18+（建议）
- npm 9+（建议）

### 2.2 本地自检
在项目根目录执行：

```bash
npm test
```

预期结果：所有测试 `PASS`。

## 3. 本地运行（开发/验收）

由于前端使用 ES Module（`<script type="module">`），不建议直接双击 `index.html`，应通过 HTTP 服务访问。

### 方式 A：Python 临时静态服务

```bash
cd <project-root>
python3 -m http.server 8080
```

浏览器访问：
- `http://127.0.0.1:8080`

### 方式 B：Node 临时静态服务（可选）

```bash
cd <project-root>
npx serve . -l 8080
```

浏览器访问：
- `http://127.0.0.1:8080`

## 4. 生产部署方案一：Nginx

适用于你有云服务器或内网服务器，且用 Nginx 托管静态站点。

### 4.1 上传项目文件
将以下文件上传到服务器目录（示例）：
- `/var/www/json-tree-parser/index.html`
- `/var/www/json-tree-parser/style.css`
- `/var/www/json-tree-parser/script.js`
- `/var/www/json-tree-parser/jsonTreeCore.js`

### 4.2 Nginx 配置示例

新增站点配置（如 `/etc/nginx/conf.d/json-tree-parser.conf`）：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    root /var/www/json-tree-parser;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|html)$ {
        add_header Cache-Control "no-cache";
    }
}
```

### 4.3 生效配置

```bash
nginx -t
sudo systemctl reload nginx
```

### 4.4 验证
- 打开 `http://your-domain.com`
- 粘贴 JSON 并点击“解析 JSON”
- 检查树形展示、折叠、拖拽、输出是否正常

## 5. 生产部署方案二：Docker + Nginx

适用于你希望镜像化部署。

### 5.1 在项目根目录创建 Dockerfile

```dockerfile
FROM nginx:stable-alpine
WORKDIR /usr/share/nginx/html
COPY index.html style.css script.js jsonTreeCore.js ./
EXPOSE 80
```

### 5.2 构建镜像

```bash
cd <project-root>
docker build -t json-tree-parser:1.0.0 .
```

### 5.3 运行容器

```bash
docker run -d --name json-tree-parser -p 8080:80 json-tree-parser:1.0.0
```

### 5.4 验证
浏览器访问：
- `http://127.0.0.1:8080`

### 5.5 升级

```bash
docker build -t json-tree-parser:1.0.1 .
docker rm -f json-tree-parser
docker run -d --name json-tree-parser -p 8080:80 json-tree-parser:1.0.1
```

## 6. 生产部署方案三：Vercel / Netlify（零服务器）

本项目是纯静态资源，可直接托管。

### 6.1 通用步骤
1. 将项目推送到 Git 仓库（GitHub/GitLab/Bitbucket）
2. 在 Vercel 或 Netlify 导入仓库
3. 构建设置：
   - Build Command：留空
   - Output Directory：`.`（根目录）
4. 部署完成后访问平台提供的域名

### 6.2 注意项
- 确保 `index.html` 位于仓库根目录
- 如果平台要求发布目录，设置为项目根目录

## 7. 回归验证清单（上线后）

上线后建议逐项验证：
1. 输入合法 JSON，可成功解析
2. 输入非法 JSON，显示错误提示
3. 树节点可折叠/展开
4. 节点可拖拽，输出 JSON 实时更新
5. 页面在移动端和桌面端都可正常使用

## 8. 常见问题

### 8.1 打开页面空白或脚本不执行
原因：使用 `file://` 直接打开，ES Module 受浏览器安全限制。  
解决：使用 HTTP 服务访问（见第 3 节）。

### 8.2 解析失败
原因：输入不是标准 JSON（例如键未加双引号、尾逗号、单引号字符串）。  
解决：确保输入符合标准 JSON 语法。

### 8.3 拖拽无效
原因：浏览器插件、旧浏览器、或输入区/树区焦点状态导致事件中断。  
解决：刷新页面后重试，建议使用最新版 Chrome/Edge/Safari。

## 9. 建议的发布流程

1. 本地修改代码
2. 执行 `npm test`
3. 推送代码
4. 部署到预发布环境
5. 按“回归验证清单”验收
6. 发布到生产环境
