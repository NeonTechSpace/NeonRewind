#!/usr/bin/env bash

set -Eeuo pipefail

script_directory="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
source_directory="${1:-$script_directory/../.local/runtime-collector/source/RE-UE4SS-662df915}"
expected_commit="662df91503379fc383bc745f7ade795d7b2ca215"
expected_unreal_commit="b2e876da82b17254c04304746341c8fde0ddb37c"
expected_pattern_sleuth_commit="da8bfe4c5a464be0ef225c2c9a6ccaa2d9284018"

fail() {
    echo "Error: $1" >&2
    exit 1
}

command -v git >/dev/null 2>&1 || fail "Git is required."
mkdir -p "$(dirname -- "$source_directory")"
resolved_parent="$(cd -- "$(dirname -- "$source_directory")" && pwd -P)"
resolved_source="$resolved_parent/$(basename -- "$source_directory")"

if [[ -e "$resolved_source" ]]; then
    [[ -d "$resolved_source/.git" ]] || fail "The source destination exists but is not a Git working copy: $resolved_source"
else
    git clone --filter=blob:none --no-checkout https://github.com/UE4SS-RE/RE-UE4SS.git "$resolved_source" || fail "Could not clone RE-UE4SS."
fi

git -C "$resolved_source" fetch --depth 1 origin "$expected_commit" || fail "Could not fetch the pinned RE-UE4SS commit."
git -C "$resolved_source" checkout --detach "$expected_commit" || fail "Could not check out the pinned RE-UE4SS commit."
git -C "$resolved_source" config submodule.deps/first/Unreal.url https://github.com/Re-UE4SS/UEPseudo.git
git -C "$resolved_source" config submodule.deps/first/patternsleuth.url https://github.com/trumank/patternsleuth.git
git -C "$resolved_source" submodule update --init --recursive || fail "Could not initialize the pinned RE-UE4SS submodules. Confirm that this GitHub account can access Re-UE4SS/UEPseudo."

actual_commit="$(git -C "$resolved_source" rev-parse HEAD)"
actual_unreal_commit="$(git -C "$resolved_source/deps/first/Unreal" rev-parse HEAD)"
actual_pattern_sleuth_commit="$(git -C "$resolved_source/deps/first/patternsleuth" rev-parse HEAD)"

[[ "$actual_commit" == "$expected_commit" ]] || fail "The RE-UE4SS source commit does not match the pinned identity."
[[ "$actual_unreal_commit" == "$expected_unreal_commit" ]] || fail "The UEPseudo submodule commit does not match the pinned identity."
[[ "$actual_pattern_sleuth_commit" == "$expected_pattern_sleuth_commit" ]] || fail "The patternsleuth submodule commit does not match the pinned identity."

echo "Prepared pinned RE-UE4SS source: $resolved_source"
