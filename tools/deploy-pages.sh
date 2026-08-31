#!/bin/sh
set -eu

script_directory=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
repository_directory=$(dirname -- "$script_directory")
project_name=${1:-xunzhang-zhaiju}
wrangler="$repository_directory/sync-worker/node_modules/.bin/wrangler"

for command_name in git mktemp node rsync; do
  command -v "$command_name" >/dev/null 2>&1 || {
    echo "Missing required command: $command_name" >&2
    exit 69
  }
done

if [ ! -x "$wrangler" ]; then
  echo "Wrangler is missing. Run npm install in sync-worker first." >&2
  exit 69
fi

cd "$repository_directory"

if [ -n "$(git status --porcelain)" ]; then
  echo "Refusing to deploy a dirty worktree. Commit all intended website changes first." >&2
  exit 65
fi

node tools/validate-app-store-assets.mjs
node tools/scan-secrets.mjs
"$wrangler" whoami >/dev/null

commit_hash=$(git rev-parse HEAD)
commit_message=$(git log -1 --pretty=%s)
deploy_directory=$(mktemp -d '/Users/naichengchen/projects/xunzhang-pages-deploy.XXXXXX')

case "$deploy_directory" in
  /Users/naichengchen/projects/xunzhang-pages-deploy.*) ;;
  *)
    echo "Unexpected deployment path: $deploy_directory" >&2
    exit 70
    ;;
esac

cleanup() {
  rm -R -- "$deploy_directory"
}
trap cleanup EXIT HUP INT TERM

rsync -a \
  index.html \
  privacy.html \
  support.html \
  favicon.svg \
  css \
  js \
  assets \
  data \
  "$deploy_directory/"

test -f "$deploy_directory/index.html"
test -f "$deploy_directory/privacy.html"
test -f "$deploy_directory/support.html"

"$wrangler" pages deploy "$deploy_directory" \
  --project-name "$project_name" \
  --branch main \
  --commit-hash "$commit_hash" \
  --commit-message "$commit_message" \
  --commit-dirty false
