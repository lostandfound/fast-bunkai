#!/bin/bash
# 手動ビルドスクリプト（napi-rsの設定問題を回避）

set -e

export PATH="$HOME/.cargo/bin:$PATH"

echo "Building Rust library..."
cd ..
cargo build --features node --release

echo "Detecting platform..."
PLATFORM=""
ARCH=$(uname -m)
OS=$(uname -s | tr '[:upper:]' '[:lower:]')

if [[ "$OS" == "darwin" ]]; then
  if [[ "$ARCH" == "arm64" ]]; then
    PLATFORM="darwin-arm64"
  else
    PLATFORM="darwin-x64"
  fi
elif [[ "$OS" == "linux" ]]; then
  if [[ "$ARCH" == "aarch64" ]]; then
    PLATFORM="linux-arm64-gnu"
  else
    PLATFORM="linux-x64-gnu"
  fi
fi

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

