# ⚡ fast-bunkai

[![Publish](https://github.com/hotchpotch/fast-bunkai/actions/workflows/publish.yml/badge.svg)](https://github.com/hotchpotch/fast-bunkai/actions/workflows/publish.yml)
[![PyPI](https://img.shields.io/pypi/v/fast-bunkai.svg)](https://pypi.org/project/fast-bunkai/)

⚡ FastBunkai is a Rust-accelerated sentence boundary detection library available for both **Python** and **TypeScript/Node.js**. It provides a highly compatible API with [megagonlabs/bunkai](https://github.com/megagonlabs/bunkai), delivering roughly 40–285× faster segmentation than the original Python implementation. Existing bunkai users can swap to FastBunkai by importing it via `from fast_bunkai import FastBunkai as Bunkai`, making it a true drop-in replacement.

⚡ fast-bunkai は、日本語・英語の長い文章を自然な文単位に切り出すためのライブラリで、**Python**版と**TypeScript/Node.js**版の両方を提供しています。Pythonのみで書かれた [megagonlabs/bunkai](https://github.com/megagonlabs/bunkai) と高い互換性がある API を提供しつつ、内部を Rust で最適化することで、オリジナルの Python 版と比べ約40〜285倍の高速化を実現しています。既存の bunkai ユーザは `from fast_bunkai import FastBunkai as Bunkai` と書き換えるだけで簡単に移行できます。

---

**目次｜Table of Contents**

- [✨ Highlights](#-highlights)
- [🚀 Quick Start](#-quick-start)
  - [Python版](#python版)
  - [TypeScript/Node.js版](#typescriptnodejs版)
- [🧰 CLI Examples](#-cli-examples)
- [📊 Benchmarks](#-benchmarks)
- [🧠 Architecture Snapshot](#-architecture-snapshot)
- [🔀 Python版とTypeScript版の比較](#-python版とtypescript版の比較)
- [🛠️ Development Workflow](#️-development-workflow)
- [🧪 Testing & Quality Gates](#-testing--quality-gates)
- [🙏 Acknowledgements](#-acknowledgements)
- [📄 License](#-license)
- [👤 Author](#-author)

## ✨ Highlights

- 🔁 **Drop-in replacement**: mirrors the `FastBunkai` / `Bunkai` APIs and annotations, including Janome-based morphological spans.
- 🦀 **Rust-powered core**: heavy annotators (facemark, emoji, dot exceptions, indirect quotes, etc.) run inside a PyO3 module that releases the Python GIL.
- ⚡ **Serious speed**: real-world workloads observe 40×–285× faster segmentation than pure Python bunkai (details below).
- 🧵 **Thread-safe by design**: no global mutable state; calling `FastBunkai` concurrently from threads or asyncio tasks is supported.
- 🛫 **CLI parity**: ships a `fast-bunkai` executable compatible with bunkai’s pipe-friendly interface and `--ma` morphological mode.

## 🚀 Quick Start

### Python版

#### Install

```bash
uv pip install fast-bunkai
```

#### Usage

```python
from fast_bunkai import FastBunkai

splitter = FastBunkai()
text = "羽田から✈️出発して、友だちと🍣食べました。最高！また行きたいな😂でも、予算は大丈夫かな…?"
for sentence in splitter(text):
    print(sentence)
```

Output:

```
羽田から✈️出発して、友だちと🍣食べました。
最高！
また行きたいな😂
でも、予算は大丈夫かな…?
```

既存の bunkai ユーザは `from fast_bunkai import FastBunkai as Bunkai` と書き換えるだけで簡単に移行できます。

### TypeScript/Node.js版

#### Install

```bash
npm install fast-bunkai
```

**注意**: kuromoji辞書を含むため、パッケージサイズは約41MBです。

#### Usage

```typescript
import { FastBunkai } from 'fast-bunkai';

const splitter = new FastBunkai();
const text = "羽田から✈️出発して、友だちと🍣食べました。最高！また行きたいな😂でも、予算は大丈夫かな…?";
const sentences = splitter.segment(text);

for (const sentence of sentences) {
  console.log(sentence);
}
```

#### 形態素解析機能（非同期API）

```typescript
import { FastBunkai } from 'fast-bunkai';

const splitter = new FastBunkai();
const text = "形態素解析します";

// eos()メソッドは非同期APIです（kuromojiの制約）
const annotations = await splitter.eos(text);

// 形態素解析レイヤーを取得
const morphLayer = Array.from(
  annotations.getAnnotationLayer('MorphAnnotatorKuromoji')
);

for (const span of morphLayer) {
  const token = span.args?.token;
  if (token) {
    console.log(`${token.surface}: ${token.pos}`);
  }
}
```

#### EOSインデックスの取得

```typescript
const splitter = new FastBunkai();
const text = "文1。文2！文3？";
const eosIndices = splitter.findEos(text);
console.log(eosIndices); // [2, 5, 8]
```

## 🧰 CLI Examples

`fast-bunkai` provides the same pipe-friendly command-line interface as bunkai for both Python and TypeScript versions.

### Python版

```bash
echo -e '宿を予約しました♪!▁まだ2ヶ月も先だけど。▁早すぎかな(笑)楽しみです★\n2文書目です。▁改行を含みます。' \
  | uvx fast-bunkai
```

### TypeScript/Node.js版

```bash
echo -e '宿を予約しました♪!▁まだ2ヶ月も先だけど。▁早すぎかな(笑)楽しみです★\n2文書目です。▁改行を含みます。' \
  | node fast-bunkai-ts/bin/fast-bunkai.mjs
```

Output (sentence boundaries marked with `│`, newlines preserved via `▁`):

```
宿を予約しました♪!▁│まだ2ヶ月も先だけど。▁│早すぎかな(笑)│楽しみです★
2文書目です。▁│改行を含みます。
```

### 形態素解析出力（`--ma`オプション）

#### Python版

```bash
echo -e '形態素解析し▁ます。結果を 表示します！' | uvx fast-bunkai --ma
```

#### TypeScript/Node.js版

```bash
echo -e '形態素解析し▁ます。結果を 表示します！' | node fast-bunkai-ts/bin/fast-bunkai.mjs --ma
```

```
形態素	名詞,一般,*,*,*,*,形態素,ケイタイソ,ケイタイソ
解析	名詞,サ変接続,*,*,*,*,解析,カイセキ,カイセキ
し	動詞,自立,*,*,サ変・スル,連用形,する,シ,シ
▁
EOS
ます	助動詞,*,*,*,特殊・マス,基本形,ます,マス,マス
。	記号,句点,*,*,*,*,。,。,。
EOS
結果	名詞,副詞可能,*,*,*,*,結果,ケッカ,ケッカ
を	助詞,格助詞,一般,*,*,*,を,ヲ,ヲ
	記号,空白,*,*,*,*, ,*,*
表示	名詞,サ変接続,*,*,*,*,表示,ヒョウジ,ヒョージ
し	動詞,自立,*,*,サ変・スル,連用形,する,シ,シ
ます	助動詞,*,*,*,特殊・マス,基本形,ます,マス,マス
！	記号,一般,*,*,*,*,！,！,！
EOS
```

## 📊 Benchmarks

Reproduce the bundled benchmark suite (correctness check + timing vs. bunkai):

```bash
uv run python scripts/benchmark.py --repeats 3 --jp-loops 100 --en-loops 100 --custom-loops 10
```

Latest local run (2025-10-11) reported:

| Corpus     | Docs | bunkai (mean) | fast-bunkai (mean) | Speedup |
|------------|------|---------------|--------------------|---------|
| Japanese   | 200  | 253.92 ms     | 5.55 ms            | 45.72×  |
| English    | 200  | 209.77 ms     | 4.94 ms            | 42.48×  |
| Long text* | 20   | 1330.95 ms    | 4.67 ms            | 285.10× |

*Long text corpus contains mixed Japanese/English paragraphs with emojis and edge cases; the Rust pipeline processes characters in a single pass, whereas pure Python bunkai stacks regex scans, so the gap widens dramatically on longer documents.

Actual numbers vary by hardware, but the Rust core consistently outperforms pure Python bunkai by an order of magnitude or more.

## 🧠 Architecture Snapshot

- 🦀 **Rust core (`src/lib.rs`)**: facemark & emoji annotators, dot/number exceptions, indirect quote handling, and more. Shared between Python and TypeScript versions.
  - **Python版**: Uses PyO3 `abi3` bindings and releases the GIL with `py.allow_threads`.
  - **TypeScript版**: Uses napi-rs for Node.js bindings.
- 😀 **Emoji metadata (`src/emoji_data.rs`)**: generated via `scripts/generate_emoji_data.py`, mapping Unicode codepoints to bunkai-compatible categories.
- 🐍 **Python layer (`fast_bunkai/`)**: wraps the Rust `segment` function, mirrors bunkai annotations with dataclasses, and builds Janome spans through `MorphAnnotatorJanome` for drop-in parity.
- 📘 **TypeScript layer (`fast-bunkai-ts/`)**: wraps the Rust `segment` function, mirrors bunkai annotations with TypeScript interfaces, and builds kuromoji spans through `MorphAnnotatorKuromoji` for compatibility.

## 🔀 Python版とTypeScript版の比較

| 機能 | Python版 | TypeScript版 | 備考 |
|------|----------|--------------|------|
| **基本API** | ✅ | ✅ | `segment()`, `findEos()` 完全実装 |
| **形態素解析** | ✅ Janome | ✅ kuromoji | TypeScript版は非同期API |
| **CLI機能** | ✅ | ✅ | `--ma`オプション含む |
| **大きなテキスト警告** | ✅ | ✅ | 10MB以上のテキストで警告 |
| **パッケージサイズ** | 軽量 | 約41MB | kuromoji辞書を含む |

**詳細比較**: [docs/python-vs-typescript-comparison.md](docs/python-vs-typescript-comparison.md)

### 機能カバレッジ
- **Python版**: 100%
- **TypeScript版**: 約99% (非同期APIの違いのみ)

## 🛠️ Development Workflow

### Python版

```bash
uv sync --reinstall
uv run python scripts/generate_emoji_data.py  # regenerate emoji table when emoji libs change
uv run tox -e pytests,lint,typecheck,rust-fmt,rust-clippy
```

### TypeScript/Node.js版

```bash
cd fast-bunkai-ts
npm install
npm run build  # Build native module
npm test       # Run tests
npm run typecheck  # Type check
npm run lint    # Lint check
```

For manual Rust checks:

```bash
cargo test face_mark_detection_matches_reference
cargo fmt --all
cargo clippy --all-targets -- -D warnings
```

## 🧪 Testing & Quality Gates

### Python版
- ✅ **pytest** (`tests/test_compatibility.py`): ensures Japanese・English texts, emoji-heavy samples, and parallel execution match bunkai outputs.
- 🧹 **Ruff**: lint + format checks via `tox -e lint,format-check`.
- 🧠 **Pyright**: type-checks the Python API surface.
- 🧪 **Rust unit tests**: validate annotator logic remains in sync with reference behaviour.
- 📈 **Benchmarks**: `scripts/benchmark.py` validates speed + correctness; normally executed in CI to avoid long local runs.

### TypeScript版
- ✅ **Vitest** (`fast-bunkai-ts/tests/`): 43テスト実装済み（基本機能、互換性、形態素解析）
- 🧹 **ESLint**: lint checks via `npm run lint`.
- 🧠 **TypeScript**: type-checks via `npm run typecheck`.
- 🧪 **Rust unit tests**: shared with Python version.

## 🙏 Acknowledgements

FastBunkai stands on the shoulders of the [megagonlabs/bunkai](https://github.com/megagonlabs/bunkai) project—ありがとうございます！

## 📄 License

Apache License 2.0

## 👤 Author

Yuichi Tateno ([@hotchpotch](https://github.com/hotchpotch))
