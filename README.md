# JSON Visual Flow Editor

一个纯前端 JSON 可视化工具，用于把输入的标准 JSON 转成可交互的结构图，并同步输出格式化 JSON。

## 项目做了什么

本项目实现了以下能力：

- 标准 JSON 解析：严格使用 `JSON.parse` 校验输入
- 三种可视化模式：
  - 上下结构图
  - 左右结构图（从父节点字段位置连线到子节点）
  - 经典树视图
- 结构交互：
  - 节点折叠/展开（默认全折叠，根节点展开）
  - 一键全部折叠 / 一键全部展开
  - 仅数组路径过滤（只展示 `array` 及包含 `array` 的 `object`）
- 视图操作：
  - 缩放（20% ~ 200%）
  - 画布拖拽平移
  - 画布全屏模式
- 输出联动：可视化与右侧格式化 JSON 同步

## 快速开始（本地运行）

```bash
cd <project-root>
./start.sh
```

浏览器访问：
- `http://127.0.0.1:8080`

## 如何部署

本项目是纯静态前端，可部署到任意静态托管环境。

### 1) 本地静态服务（验收）

```bash
cd <project-root>
python3 -m http.server 8080
```

访问：`http://127.0.0.1:8080`

### 2) Nginx 部署

1. 上传以下文件到服务器目录（示例 `/var/www/json-tree-parser`）：
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

3. 生效配置：

```bash
nginx -t
sudo systemctl reload nginx
```

### 3) Docker 部署

1. 创建 `Dockerfile`：

```dockerfile
FROM nginx:stable-alpine
WORKDIR /usr/share/nginx/html
COPY index.html style.css script.js jsonTreeCore.js ./
EXPOSE 80
```

2. 构建并运行：

```bash
docker build -t json-tree-parser:1.0.0 .
docker run -d --name json-tree-parser -p 8080:80 json-tree-parser:1.0.0
```

访问：`http://127.0.0.1:8080`

### 4) Vercel / Netlify

- 导入仓库后，按静态项目发布即可
- Build Command 留空
- Output Directory 设为项目根目录 `.`

## 测试

```bash
npm test
```

## 详细部署文档

- `DEPLOYMENT.md`
