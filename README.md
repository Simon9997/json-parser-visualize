# JSON Visual Flow Editor

![100% AI Generated](https://img.shields.io/badge/Code-100%25%20AI%20Generated-success)

A lightweight frontend tool for visualizing JSON as interactive diagrams.

Demo:
- https://simon9997.github.io/json-parser-visualize/

## Features

- Standard JSON parsing (`JSON.parse`)
- Three views:
  - Vertical flow
  - Horizontal flow (field-anchored connectors)
  - Classic tree
- Interactions:
  - Collapse / expand nodes (default: collapsed except root)
  - Collapse all / expand all
  - Array-path-only filter
- Canvas controls:
  - Zoom (20% ~ 200%)
  - Pan
  - Canvas fullscreen mode

## Quick Start

```bash
cd <project-root>
./start.sh
```

Open:
- http://127.0.0.1:8080

## Deployment

This is a static frontend project and can be deployed to any static host.

### 1) Local static server

```bash
cd <project-root>
python3 -m http.server 8080
```

### 2) Nginx

1. Upload files to a web root (example: `/var/www/json-tree-parser`):
- `index.html`
- `style.css`
- `script.js`
- `jsonTreeCore.js`

2. Nginx config:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    root /var/www/json-tree-parser;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

3. Reload:

```bash
nginx -t
sudo systemctl reload nginx
```

### 3) Docker

```dockerfile
FROM nginx:stable-alpine
WORKDIR /usr/share/nginx/html
COPY index.html style.css script.js jsonTreeCore.js ./
EXPOSE 80
```

```bash
docker build -t json-tree-parser:1.0.0 .
docker run -d --name json-tree-parser -p 8080:80 json-tree-parser:1.0.0
```

### 4) Vercel / Netlify

- Import the repository
- Leave Build Command empty
- Set Output Directory to `.`

## Test

```bash
npm test
```

## More

- Detailed deployment guide: `DEPLOYMENT.md`

---

<details>
<summary>中文说明（点击展开）</summary>

## 项目简介

这是一个轻量前端 JSON 可视化工具，用于将标准 JSON 解析为可交互图形。

在线演示：
- https://simon9997.github.io/json-parser-visualize/

## 功能

- 标准 JSON 解析（`JSON.parse`）
- 三种视图：上下图、左右图（字段锚点连线）、经典树
- 交互能力：节点折叠/展开、全部折叠/展开、仅数组路径过滤
- 画布能力：缩放（20%~200%）、平移、画布全屏

## 本地启动

```bash
cd <project-root>
./start.sh
```

访问：
- http://127.0.0.1:8080

## 部署

本项目为纯静态前端，可部署到任意静态托管平台（Nginx / Docker / Vercel / Netlify）。
详细步骤见：`DEPLOYMENT.md`

## 测试

```bash
npm test
```

</details>
