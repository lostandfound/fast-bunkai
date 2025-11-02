#!/bin/bash
# 手動ビルドスクリプト（napi-rsの設定問題を回避）

set -e

export PATH="$HOME/.cargo/bin:$PATH"

echo "Building Rust library..."
cd ..
cargo build --features node --release

echo "Detecting platform..."

# Helper function to get platform name (matching native.ts logic)
get_platform_name() {
  local os=$(uname -s | tr '[:upper:]' '[:lower:]')
  local arch=$(uname -m)
  
  case "$os" in
    darwin)
      if [ "$arch" = "arm64" ]; then
        echo "darwin-arm64"
      else
        echo "darwin-x64"
      fi
      ;;
    linux)
      if [ "$arch" = "aarch64" ]; then
        echo "linux-arm64-gnu"
      else
        echo "linux-x64-gnu"
      fi
      ;;
    *)
      echo "unknown"
      ;;
  esac
}

PLATFORM=$(get_platform_name)

echo "Platform: $PLATFORM"
echo "Copying binary..."

cd fast-bunkai-ts
mkdir -p build

# dylibから.nodeにコピー（macOSの場合）
if [[ -f "../target/release/libfast_bunkai_native.dylib" ]]; then
  cp "../target/release/libfast_bunkai_native.dylib" "build/fast-bunkai.${PLATFORM}.node"
  echo "✓ Binary copied to build/fast-bunkai.${PLATFORM}.node"
elif [[ -f "../target/release/libfast_bunkai_native.so" ]]; then
  cp "../target/release/libfast_bunkai_native.so" "build/fast-bunkai.${PLATFORM}.node"
  echo "✓ Binary copied to build/fast-bunkai.${PLATFORM}.node"
else
  echo "Error: No binary found"
  exit 1
fi

echo "Generating TypeScript definitions..."
cat > build/fast-bunkai.d.ts << 'EOF'
/* tslint:disable */
/* eslint-disable */

export function segment(text: string): string;
EOF

echo "✓ Build complete!"

