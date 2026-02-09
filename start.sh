#!/usr/bin/env bash
set -euo pipefail

PORT="${1:-8080}"
HOST="127.0.0.1"

cd "$(dirname "$0")"

echo "启动 JSON 树状解析器本地服务..."
echo "访问地址: http://${HOST}:${PORT}"

if command -v python3 >/dev/null 2>&1; then
  echo "使用 Python 静态服务"
  exec python3 -m http.server "${PORT}" --bind "${HOST}"
fi

if command -v npx >/dev/null 2>&1; then
  echo "使用 npx serve 静态服务"
  exec npx --yes serve . -l "${HOST}:${PORT}"
fi

echo "错误: 未找到 python3 或 npx，无法启动本地服务。"
echo "请先安装 Python3 或 Node.js。"
exit 1
