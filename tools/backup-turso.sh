#!/bin/sh
set -eu

umask 077

database_name="${1:-}"
backup_root="${2:-}"

if [ -z "$database_name" ]; then
  echo "Usage: tools/backup-turso.sh <database-name> [backup-directory]" >&2
  exit 64
fi

if [ -z "$backup_root" ]; then
  script_directory=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
  repository_directory=$(dirname -- "$script_directory")
  backup_root=$(dirname -- "$repository_directory")/xunzhang-zhaiju-backups
fi

command -v turso >/dev/null 2>&1 || {
  echo "Missing required command: turso" >&2
  exit 69
}
command -v sqlite3 >/dev/null 2>&1 || {
  echo "Missing required command: sqlite3" >&2
  exit 69
}

turso auth whoami >/dev/null
mkdir -p "$backup_root"

timestamp=$(date -u +%Y%m%dT%H%M%SZ)
backup_file="$backup_root/${database_name}-${timestamp}.turso-backup.sql"
partial_file="$backup_file.partial"

cleanup_partial() {
  rm -f -- "$partial_file"
}
trap cleanup_partial EXIT HUP INT TERM

turso db shell "$database_name" .dump > "$partial_file"

if [ ! -s "$partial_file" ]; then
  echo "Backup is empty: $partial_file" >&2
  exit 65
fi

integrity_result=$(sqlite3 :memory: < "$partial_file" 'PRAGMA integrity_check;')
if [ "$integrity_result" != "ok" ]; then
  echo "Backup integrity check failed: $integrity_result" >&2
  exit 65
fi

mv -- "$partial_file" "$backup_file"
trap - EXIT HUP INT TERM
checksum=$(shasum -a 256 "$backup_file" | awk '{print $1}')
echo "Backup verified: $backup_file"
echo "SHA-256: $checksum"
