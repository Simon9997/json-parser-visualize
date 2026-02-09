# JSON Visual Flow Editor

[English](./README.md) | [简体中文](./README-CN.md)

![100% AI Generated](https://img.shields.io/badge/Code-100%25%20AI%20Generated-success)

一个轻量前端工具，用于将 JSON 结构以可交互图形方式展示。

在线演示：
- https://simon9997.github.io/json-parser-visualize/

## 功能特性

- 标准 JSON 解析（`JSON.parse`）
- 三种视图：
  - 上下图
  - 左右图（字段锚点连线）
  - 经典树
- 交互能力：
  - 节点折叠/展开（默认根节点展开，其余折叠）
  - 一键全部折叠 / 一键全部展开
  - 仅数组路径过滤
- 画布能力：
  - 缩放（20% ~ 200%）
  - 平移
  - 画布全屏模式

## 快速开始

```bash
cd <project-root>
./start.sh
```

访问：
- http://127.0.0.1:8080

## 部署

本项目是纯静态前端，可部署到任意静态托管环境。

### 1) 本地静态服务

```bash
cd <project-root>
python3 -m http.server 8080
```

### 2) Nginx

1. 上传文件到网站目录（示例：`/var/www/json-tree-parser`）：
- `index.html`
- `style.css`
- `script.js`
- `jsonTreeCore.js`

2. Nginx 配置示例：

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

3. 重新加载：

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

- 导入仓库
- Build Command 留空
- Output Directory 设置为 `.`

## 测试

```bash
npm test
```

## 更多

- 详细部署文档：`DEPLOYMENT.md`
