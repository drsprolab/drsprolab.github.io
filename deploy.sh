#!/bin/bash
git add .
git commit -m "Update blog post: $(date '+%Y-%m-%d %H:%M')"
git push origin main
echo "✅ drsprolab.github.io 블로그 반영이 완료되었습니다!"
