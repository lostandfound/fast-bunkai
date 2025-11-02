# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- **TypeScript/Node.js版の追加**: Python版と同等の機能を提供するTypeScript版を実装
  - `FastBunkai`クラス: `segment()`, `findEos()`, `eos()`メソッドを実装
  - CLI実装: `fast-bunkai`コマンドでPython版と同等の機能を提供
  - 形態素解析機能: kuromojiを使用した形態素解析（`--ma`オプション対応）
  - Annotationsクラス: Python版と互換のアノテーション機能
  - 大きなテキスト警告機能: Python版と同様に10MB以上のテキストで警告
  - 複数行処理: Python版と同様の行ごと処理を実装

### Changed
- READMEにTypeScript版のセクションを追加

### Technical Details
- **ビルドシステム**: napi-rsを使用してNode.jsバインディングを実装
- **依存関係**: kuromoji@0.1.2を追加（約41MBの辞書ファイル含む）
- **非同期API**: `eos()`メソッドは`Promise<Annotations>`を返す（kuromojiの制約）

### Testing
- TypeScript版のテストを追加（43テスト、38テストパス）
  - 基本機能テスト（7テスト）
  - 互換性テスト（26テスト）
  - 形態素解析テスト（5テスト）
  - CLIテスト（5テスト、一部修正必要）

## [0.1.1] - 2025-10-12

### Added
- Emit a `ResourceWarning` when processing very large (≈10 MiB+) texts and reuse a
  thread-local Janome tokenizer to reduce per-call overhead.

### Packaging
- Build and publish `x86_64-pc-windows-msvc` wheels alongside existing Linux and
  macOS artifacts in the release workflow.
- Lowered the minimum supported Python version to 3.10 and updated the abi3
  target accordingly.

### Documentation & CI
- Refreshed README benchmarks and compatibility guidance, tuned PR/CI
  workflows for documentation-only changes, and documented the release
  checklist stressing full diff reviews before publishing.

## [0.1.0] - 2025-10-10

- Initial release.
