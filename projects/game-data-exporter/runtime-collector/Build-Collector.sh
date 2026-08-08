#!/usr/bin/env bash

set -Eeuo pipefail

script_directory="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
ue4ss_source="${UE4SS_SOURCE:-$script_directory/.local/RE-UE4SS-662df915}"
build_directory="$script_directory/.local/build/Game__Shipping__Win64"
expected_commit="662df91503379fc383bc745f7ade795d7b2ca215"

fail() {
    echo "Error: $1" >&2
    exit 1
}

for command_name in cmake ninja git rustc cl; do
    command -v "$command_name" >/dev/null 2>&1 || fail "Required command '$command_name' is not available."
done

cmake_version="$(cmake --version | head -n 1 | awk '{print $3}')"
rust_version="$(rustc --version | awk '{print $2}')"
compiler_version="$(cl 2>&1 || true)"

printf '%s\n%s\n' '3.22.0' "$cmake_version" | sort -V -C || fail "CMake 3.22 or newer is required. Found $cmake_version."
printf '%s\n%s\n' '1.73.0' "$rust_version" | sort -V -C || fail "Rust 1.73 or newer is required. Found $rust_version."
[[ "$compiler_version" =~ Version[[:space:]]([0-9]+\.[0-9]+) ]] || fail "Could not read the MSVC compiler version. Start Git Bash from an x64 Visual Studio Developer PowerShell."
compiler_number="${BASH_REMATCH[1]}"
printf '%s\n%s\n' '19.43' "$compiler_number" | sort -V -C || fail "MSVC 19.43 or newer is required. Found $compiler_number."
[[ -f "$ue4ss_source/CMakeLists.txt" ]] || fail "Pinned RE-UE4SS source was not found. Run Prepare-Ue4ssSource.sh first."

actual_commit="$(git -C "$ue4ss_source" rev-parse HEAD)"
[[ "$actual_commit" == "$expected_commit" ]] || fail "RE-UE4SS must be checked out at $expected_commit."

if [[ -n "${PARALLEL_JOBS:-}" ]]; then
    [[ "$PARALLEL_JOBS" =~ ^[1-9][0-9]*$ ]] || fail "PARALLEL_JOBS must be a positive integer."
    parallel_jobs="$PARALLEL_JOBS"
elif [[ "${CI:-}" == 'true' || "${GITHUB_ACTIONS:-}" == 'true' ]]; then
    parallel_jobs="$(nproc)"
else
    parallel_jobs="$(( $(nproc) / 2 ))"
    (( parallel_jobs >= 1 )) || parallel_jobs=1
fi

mkdir -p "$build_directory"
cmake \
    -S "$script_directory" \
    -B "$build_directory" \
    -G Ninja \
    -DCMAKE_BUILD_TYPE=Game__Shipping__Win64 \
    -DNEONREWIND_UE4SS_SOURCE="$ue4ss_source" || fail "CMake configuration failed."

cmake \
    --build "$build_directory" \
    --target NeonRewindMovieReturnCollector \
    --parallel "$parallel_jobs" || fail "Collector build failed."

artifact="$build_directory/artifact/NeonRewindMovieReturnCollector/dlls/main.dll"
[[ -s "$artifact" ]] || fail "The build completed without producing the expected collector DLL: $artifact"

echo "Built collector: $artifact"
echo "Parallel jobs: $parallel_jobs"
