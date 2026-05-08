#!/usr/bin/env bash


log()   { echo "[$(date +%H:%M:%S)] $*" >&2; }
fatal() { echo "FATAL: $*" >&2; exit 1; }

require_cmd() {
  command -v "$1" >/dev/null || fatal "Required command not found: $1"
}


capitalize() {
  echo "${1^}"
}

