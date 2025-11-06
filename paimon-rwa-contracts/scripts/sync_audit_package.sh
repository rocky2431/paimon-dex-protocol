#!/usr/bin/env bash
set -euo pipefail

# Synchronize contract sources into the audit package mirror.
# The audit-package tree is treated as a generated artifact – do not edit
# files under audit-package/contracts/src directly. Instead, modify
# paimon-rwa-contracts/src and rerun this script (or the corresponding CI job).

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC_DIR="${ROOT_DIR}/src"
AUDIT_SRC_DIR="${ROOT_DIR}/audit-package/contracts/src"

if [[ ! -d "${SRC_DIR}" ]]; then
  echo "[sync-audit] Source directory missing: ${SRC_DIR}" >&2
  exit 1
fi

mkdir -p "${AUDIT_SRC_DIR}"

rsync \
  --archive \
  --delete \
  --prune-empty-dirs \
  --exclude '.DS_Store' \
  "${SRC_DIR}/" "${AUDIT_SRC_DIR}/"

echo "[sync-audit] audit-package/contracts/src synchronized with src"
