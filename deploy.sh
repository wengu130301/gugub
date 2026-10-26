#!/usr/bin/env bash
# 将本目录推送到 GitHub，供 GitHub Pages 托管 gubrowser.laswi.com.cn
#
# 用法：
#   GH_USER=yourname GH_TOKEN=ghp_xxx ./deploy.sh      # 走 HTTPS + Token（Token 不落盘）
#   GH_USER=yourname ./deploy.sh                        # 走 SSH（需已把公钥加入账号）
#
# 可选：REPO=gubrowser-web BRANCH=main
set -euo pipefail

GH_USER="${GH_USER:?请先设置 GH_USER（GitHub 用户名）}"
REPO="${REPO:-gubrowser-web}"
BRANCH="${BRANCH:-main}"
cd "$(dirname "$0")"

if [ ! -d .git ]; then
  git init -q
  git branch -M "$BRANCH"
fi

git add -A
if git diff --cached --quiet; then
  echo "没有变更需要提交"
else
  git commit -q -m "feat: LaswI ID 登录页 /id"
  echo "已提交变更"
fi

git branch -M "$BRANCH"

if [ -n "${GH_TOKEN:-}" ]; then
  git remote set-url origin "https://github.com/${GH_USER}/${REPO}.git" 2>/dev/null || \
    git remote add origin "https://github.com/${GH_USER}/${REPO}.git"
  # Token 通过临时 credential helper 传入，不写入 .git/config
  git -c credential.helper='!f(){ echo "username=${GH_USER}"; echo "password=${GH_TOKEN}"; }; f' \
      push -u origin "$BRANCH"
else
  git remote set-url origin "git@github.com:${GH_USER}/${REPO}.git" 2>/dev/null || \
    git remote add origin "git@github.com:${GH_USER}/${REPO}.git"
  git push -u origin "$BRANCH"
fi

cat <<EOF

已推送。接下来两步（一次性）：
1. GitHub 仓库 Settings → Pages → Source 选 "Deploy from a branch" → ${BRANCH} / (root)
2. DNS 添加：CNAME  gubrowser  →  ${GH_USER}.github.io
   生效后用 https://gubrowser.laswi.com.cn/id/ 验证
EOF
