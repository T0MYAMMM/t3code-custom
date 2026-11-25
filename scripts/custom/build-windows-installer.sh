#!/usr/bin/env bash
# Fork (t3code-custom): builds the unsigned Windows installer from WSL, with the Linux CLI
# archive embedded as the WSL runtime. Mirrors .github/workflows/release-desktop.yml.
# Needs: nvm with Node from package.json engines, Rust with x86_64-pc-windows-msvc,
# cargo-xwin, and apt packages libsecret-1-dev patchelf imagemagick clang lld.
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$repo_root"

# shellcheck disable=SC1091
source "$HOME/.nvm/nvm.sh" >/dev/null
nvm use "$(node -p 'require("./package.json").engines.node' 2>/dev/null || echo 26)" >/dev/null
export PATH="$repo_root/node_modules/.bin:$PATH"
export T3CODE_TELEMETRY_CHANNEL=dev

version="${1:-$(node -p 'require("./apps/desktop/package.json").version')}"
work_dir="$(mktemp -d)"
trap 'rm -rf "$work_dir"' EXIT

echo "==> Building T3 Code $version for Windows x64"

echo "==> 1/5 JS bundle"
vp run build:desktop:bundle

echo "==> 2/5 Linux resource monitor and CLI executable"
cargo build --locked --release --manifest-path native/resource-monitor/Cargo.toml --target x86_64-unknown-linux-gnu
mkdir -p "$work_dir/resource-monitor/linux-x64"
cp native/resource-monitor/target/x86_64-unknown-linux-gnu/release/t3-resource-monitor "$work_dir/resource-monitor/linux-x64/"
node apps/server/scripts/cli.ts build-exe

echo "==> 3/5 Linux CLI archive (the WSL runtime)"
node scripts/build-cli-archive.ts --platform linux --arch x64 --version "$version" \
  --resource-monitor-dir "$work_dir/resource-monitor" --output-dir "$work_dir/cli"
archive="$work_dir/cli/t3-$version-linux-x64.tar.gz"
node scripts/smoke-cli-archive.ts --archive "$archive" --expect-version "$version"

echo "==> 4/5 Windows resource monitor"
cargo xwin build --locked --release --manifest-path native/resource-monitor/Cargo.toml --target x86_64-pc-windows-msvc

echo "==> 5/5 Windows installer"
T3CODE_DESKTOP_REUSE_RESOURCE_MONITOR=true vp run dist:desktop:artifact \
  --platform win --target nsis --arch x64 --build-version "$version" --skip-build \
  --wsl-runtime "$archive"

echo "==> Done: $repo_root/release/T3-Code-$version-x64.exe"
