#!/usr/bin/env bash

set -Eeuo pipefail

script_directory="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
powershell_script="$script_directory/Bootstrap-PortableToolchain.ps1"

if command -v pwsh >/dev/null 2>&1; then
    exec pwsh -NoProfile -File "$powershell_script" "$@"
fi

if command -v powershell.exe >/dev/null 2>&1; then
    if command -v cygpath >/dev/null 2>&1; then
        powershell_script="$(cygpath -w "$powershell_script")"
    fi
    exec powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$powershell_script" "$@"
fi

echo "Error: PowerShell is required. On Windows, use Windows PowerShell or PowerShell 7." >&2
exit 1
