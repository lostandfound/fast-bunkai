# TypeScript版実装プラン

## 概要

本ドキュメントは、FastBunkaiのTypeScript版（Node-API版）を実装するための詳細な計画を記述します。

## 実装アプローチ: Rustコア + Node-API（napi-rs）

### 選択理由

- ✅ **既存Rustコードの再利用**: `segment_impl()`関数をそのまま利用
- ✅ **高性能**: ネイティブバイナリとして実行、Node.jsとのFFIオーバーヘッドが最小
- ✅ **クロスプラットフォーム**: 事前ビルドバイナリで主要OSをサポート
- ✅ **メンテナンス性**: Python版と同じRustロジックを使用するため、バグ修正が自動的に反映

## フェーズ1: 基盤セットアップ

### 1.1 ディレクトリ構成の作成

```
fast-bunkai-ts/
├── package.json
├── tsconfig.json
├── .gitignore
└── src/
    └── index.ts  # 初期ファイル
```

### 1.2 package.jsonの作成

- パッケージ名: `fast-bunkai`（Python版と同じ、npmでは別パッケージとして配布）
- TypeScript依存関係: `typescript`, `@types/node`
- テスト: `vitest`, `@vitest/ui`
- ビルドツール: `@napi-rs/cli`, `napi`
- ESM/CJS両対応

### 1.3 Cargo.tomlの拡張

現在のPyO3専用設定を、PyO3 + Node-API両対応に拡張：

```toml
[lib]
name = "fast_bunkai_native"
crate-type = ["cdylib", "staticlib"]

[dependencies]
# PyO3（条件付き）
pyo3 = { version = "0.22", features = ["extension-module", "abi3-py310"], optional = true }
# napi-rs（条件付き）
napi = { version = "2", optional = true }
napi-derive = { version = "2", optional = true }

[features]
default = ["pyo3"]
python = ["pyo3"]
node = ["napi", "napi-derive"]
```

## フェーズ2: Rustバインディングの実装

### 2.1 napi-rsバインディングの追加

`src/lib.rs`にNode-APIバインディングを追加：

```rust
#[cfg(feature = "node")]
use napi::{bindgen_prelude::*, Result as NapiResult};

#[cfg(feature = "node")]
#[napi]
fn segment(text: String) -> NapiResult<serde_json::Value> {
    let output = segment_impl(&text);
    // UTF-16インデックスに変換して返す（後述）
    Ok(convert_to_json_with_utf16_indices(output, &text))
}
```

### 2.2 UTF-16インデックス変換（重要）

**問題**: RustはUnicodeスカラ値（UTF-8）でインデックスを扱うが、JavaScriptはUTF-16コードユニットでインデックスを扱う。

**解決策**: Rust側でUTF-16インデックスへの変換を行う：

```rust
fn to_utf16_indices(unicode_indices: &[usize], text: &str) -> Vec<u32> {
    let utf16: Vec<u16> = text.encode_utf16().collect();
    // UnicodeインデックスからUTF-16インデックスにマッピング
    // ...
}
```

### 2.3 返り値の形式

TypeScript版は以下の形式で返す：

```typescript
interface SegmentResult {
  sentences: string[];
  eosIndices: number[];  // UTF-16インデックス
  layers?: AnnotationLayer[];  // オプション（詳細モード）
}
```

## フェーズ3: TypeScript層の実装

### 3.1 FastBunkaiクラスの実装

Python版の`FastBunkai`クラスと互換性のあるAPIを提供：

```typescript
// src/fastBunkai.ts
import { segment as segmentNative } from './native';

export class FastBunkai {
  segment(text: string): string[] {
    const result = segmentNative(text);
    return result.sentences;
  }

  *[Symbol.iterator](text: string): Generator<string> {
    for (const sentence of this.segment(text)) {
      yield sentence;
    }
  }
}
```

### 3.2 型定義の実装

Python版の`annotations.py`に対応するTypeScript型定義：

```typescript
// src/annotations.ts
export interface Span {
  rule_name: string;
  start: number;
  end: number;
  split_type?: string;
  split_value?: string;
}

export interface AnnotationLayer {
  name: string;
  spans: Span[];
}
```

### 3.3 エクスポート

```typescript
// src/index.ts
export { FastBunkai } from './fastBunkai';
export * from './annotations';
export { segment } from './native';  // 低レベルAPI（オプション）
```

## フェーズ4: ビルドシステムの構築

### 4.1 napi-rs設定

`fast-bunkai-ts/Cargo.toml`を作成（napi-rs用）：

```toml
[package]
name = "fast_bunkai_native"
version = "0.1.1"

[lib]
crate-type = ["cdylib"]

[build-dependencies]
napi-build = "2"

[dependencies]
napi = { version = "2", features = ["napi4", "napi5", "napi6", "napi7", "napi8"] }
napi-derive = "2"
```

### 4.2 build.rsの作成

```rust
// fast-bunkai-ts/build.rs
fn main() {
    napi_build::setup();
}
```

### 4.3 package.jsonのビルドスクリプト

```json
{
  "scripts": {
    "build": "napi build --platform --release",
    "build:debug": "napi build --platform"
  }
}
```

### 4.4 事前ビルドバイナリの生成

`@napi-rs/cli`を使用して、主要プラットフォーム用のバイナリを事前ビルド：

- macOS (x64, arm64)
- Linux (glibc x64, arm64, musl x64)
- Windows (x64)

GitHub Actionsで自動生成・配布。

## フェーズ5: テストの実装

### 5.1 Vitest設定

`vitest.config.ts`を作成：

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
```

### 5.2 互換性テスト

Python版と同じテストケースを使用して、結果の互換性を検証：

```typescript
// tests/fastBunkai.test.ts
import { describe, it, expect } from 'vitest';
import { FastBunkai } from '../src';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('FastBunkai compatibility', () => {
  it('should match Python version results', () => {
    const text = readFileSync(
      join(__dirname, '../../tests/data/texts/ja_secon_dev_static_embedding_japanese.txt'),
      'utf-8'
    );
    const splitter = new FastBunkai();
    const sentences = splitter.segment(text);
    // ゴールデンファイルと比較（Python版実行結果を事前に保存）
  });
});
```

### 5.3 ゴールデンファイル生成

Python版の実行結果をJSON形式で保存し、TS版テストで参照：

```bash
# Python版でゴールデンを生成
python scripts/generate_golden.py > tests/fixtures/golden.json
```

## フェーズ6: CLIの実装（オプション）

### 6.1 CLIスクリプト

```typescript
// src/cli.ts
#!/usr/bin/env node

import { FastBunkai } from './index';
import { readFileSync } from 'fs';

function main() {
  const splitter = new FastBunkai();
  const text = process.stdin.isTTY
    ? readFileSync(process.argv[2] || '/dev/stdin', 'utf-8')
    : readFileSync(0, 'utf-8');
  
  for (const sentence of splitter.segment(text)) {
    console.log(sentence);
  }
}

if (require.main === module) {
  main();
}
```

### 6.2 package.jsonのbin設定

```json
{
  "bin": {
    "fast-bunkai": "./dist/cli.js"
  }
}
```

## フェーズ7: ドキュメントとリリース

### 7.1 READMEの更新

- TS版のインストール方法
- 使用例
- APIリファレンス
- パフォーマンス比較

### 7.2 CI/CDの拡張

`.github/workflows/ci.yml`に以下を追加：

- TS版のビルドテスト
- Vitestの実行
- プラットフォーム別ビルドの検証

### 7.3 リリース準備

- バージョン番号の同期（Python版とTS版で同じバージョン）
- CHANGELOGの更新
- npm publishの設定

## 技術的な課題と解決策

### 課題1: UTF-16インデックスの正確な変換

**問題**: サロゲートペアや結合文字を含む場合、UnicodeインデックスとUTF-16インデックスの対応が複雑。

**解決策**: Rust側で`encode_utf16().collect()`を使用し、正確なマッピングテーブルを構築。

### 課題2: 形態素解析の互換性

**問題**: Python版はJanomeを使用するが、TS版では完全互換の形態素解析器がない。

**解決策**: 
- オプション1: 形態素解析をオプション機能として提供（kuromoji等を使用）
- オプション2: 形態素解析はPython版のみの機能として維持

**推奨**: オプション1（プラガブルな形態素解析器サポート）

### 課題3: 並行実行

**問題**: Node.jsのワーカースレッドでの並行実行の安全性。

**解決策**: Rust側は既にスレッドセーフ設計（`segment_impl`は純粋関数）。napi-rsもワーカースレッドをサポート。

## 実装の優先順位

1. **高優先度**: 
   - フェーズ1〜3（基盤セットアップ、Rustバインディング、TS層）
   - フェーズ5（テスト）

2. **中優先度**:
   - フェーズ4（ビルドシステム、事前ビルド）
   - フェーズ6（CLI）

3. **低優先度**:
   - フェーズ7（ドキュメント、CI/CD拡張）

## 見積もり（参考）

- **フェーズ1〜3**: 3〜5営業日
- **フェーズ4**: 2〜3営業日
- **フェーズ5**: 1〜2営業日
- **フェーズ6**: 1営業日
- **フェーズ7**: 1〜2営業日

**合計**: 約8〜13営業日

## 次のステップ

1. ✅ ディレクトリ構成の決定（完了）
2. ⬜ `fast-bunkai-ts/`ディレクトリの作成
3. ⬜ `package.json`と`tsconfig.json`の作成
4. ⬜ `Cargo.toml`の拡張（Node-API対応）
5. ⬜ Rustバインディングの実装

