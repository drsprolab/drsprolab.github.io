#!/usr/bin/env bash
# Reuse share images only when every change since the last successful build is
# confined to the gallery or this deployment plumbing. Any doubt regenerates.
set -euo pipefail
output_required() { echo "required=$1" >> "$GITHUB_OUTPUT"; }
allowed='^(assets/images/gallery/|_data/gallery\.yml$|highlights\.md$|assets/js/gallery-photo\.js$|assets/css/style\.css$|\.github/workflows/jekyll\.yml$|tools/restore_share_images\.sh$)'
if [ "${EVENT_NAME:-}" != push ]; then output_required true; exit; fi
if ! previous=$(gh run list --repo "$GITHUB_REPOSITORY" --workflow jekyll.yml --branch main --status success --limit 1 --json databaseId,headSha --jq '.[] | [.databaseId,.headSha] | @tsv'); then
  output_required true; exit
fi
read -r previous_run previous_sha <<< "$previous"
if [ -z "${previous_run:-}" ] || ! git cat-file -e "${previous_sha:-}^{commit}" 2>/dev/null; then output_required true; exit; fi
if git diff --name-only "$previous_sha" "$GITHUB_SHA" | grep -qvE "$allowed"; then output_required true; exit; fi
reuse_dir=$(mktemp -d "$RUNNER_TEMP/share-images.XXXXXX")
if gh run download "$previous_run" --repo "$GITHUB_REPOSITORY" --name github-pages --dir "$reuse_dir" && tar -xf "$reuse_dir/artifact.tar" -C "$reuse_dir" && [ -d "$reuse_dir/assets/og" ]; then
  mkdir -p assets/og
  cp -R "$reuse_dir/assets/og/." assets/og/
  echo "Gallery-only update: restored share images from successful run $previous_run."
  output_required false
else
  echo "Previous share images unavailable; regenerate them."
  output_required true
fi
rm -rf "$reuse_dir"
