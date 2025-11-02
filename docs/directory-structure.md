# ディレクトリ構成

## 概要

本リポジトリは、Python版とTypeScript版の両方をサポートするモノレポ構成を採用しています。Rustコアを共有し、各言語向けのバインディングを提供します。

## 現在の構成（Python版）

```
fast-bunkai/
├── fast_bunkai/              # Python版パッケージ
│   ├── __init__.py
│   ├── core.py               # FastBunkaiクラス実装
│   ├── annotations.py        # 注釈型定義（bunkai互換）
│   ├── cli.py                # CLI実装
│   └── _fast_bunkai.pyi      # 型スタブ
├── src/                      # Rustコア（共有）
│   ├── lib.rs                # メインロジック、PyO3バインディング
│   └── emoji_data.rs         # 絵文字メタデータ（自動生成）
├── scripts/
│   ├── benchmark.py          # ベンチマークスクリプト
│   └── generate_emoji_data.py # 絵文字データ生成
├── tests/                    # Pythonテスト
│   ├── test_compatibility.py
│   ├── test_cli.py
│   └── data/                 # テストデータ
├── Cargo.toml                # Rust設定（現在はPyO3専用）
├── pyproject.toml            # Python版設定
└── README.md
```

## 追加予定の構成（TS版追加後）

```
fast-bunkai/
├── fast_bunkai/              # Python版パッケージ（既存、変更なし）
│   ├── __init__.py
│   ├── core.py
│   ├── annotations.py
│   ├── cli.py
│   └── _fast_bunkai.pyi
├── fast-bunkai-ts/           # TS版パッケージ（新規追加）
│   ├── package.json          # npmパッケージ設定
│   ├── tsconfig.json         # TypeScript設定
│   ├── .npmignore            # npm公開時の除外設定
│   ├── src/
│   │   ├── index.ts          # メインエクスポート
│   │   ├── fastBunkai.ts     # FastBunkaiクラス実装
│   │   ├── annotations.ts    # 型定義（Python版と互換）
│   │   └── native.ts         # napi-rs生成コード（自動生成、gitignore）
│   ├── tests/
│   │   ├── fastBunkai.test.ts # Vitestテスト
│   │   └── fixtures/          # テストデータ（Python版と共有可能）
│   ├── scripts/
│   │   └── generate-emoji.ts # 絵文字データ生成（Node.js版、オプション）
│   └── build/                # ビルド出力（gitignore）
├── src/                      # Rustコア（共有、拡張予定）
│   ├── lib.rs                # メインロジック
│   │   ├── segment_impl()   # 純粋なRust関数（Python/TS両方から利用）
│   │   ├── Pythonバインディング（PyO3）
│   │   └── Node-APIバインディング（napi-rs、追加予定）
│   └── emoji_data.rs         # 絵文字メタデータ
├── scripts/
│   ├── benchmark.py
│   ├── generate_emoji_data.py
│   └── benchmark-ts.ts       # TS版ベンチマーク（追加予定）
├── tests/                    # Pythonテスト（既存）
│   ├── test_compatibility.py
│   ├── test_cli.py
│   └── data/
├── docs/                     # ドキュメント（本ディレクトリ）
│   ├── directory-structure.md
│   └── implementation-plan.md
├── Cargo.toml                # Rust設定（PyO3 + Node-API両対応に拡張）
├── pyproject.toml            # Python版設定（変更なし）
└── README.md                 # メインREADME（TS版情報を追加予定）
```

## 設計原則

### 1. フラット構成の採用理由

- **最小限の変更**: 既存のPython版コードを一切移動する必要がない
- **明確な分離**: 各言語版が独立したディレクトリに配置され、管理が容易
- **段階的移行**: 将来的に`packages/`構成に移行することも可能

### 2. Rustコアの共有

- `src/lib.rs`の`segment_impl()`関数は純粋なRust関数として実装されており、Python版とTS版の両方から利用可能
- PyO3とnapi-rsは同じRustコードベースから異なるバインディングを生成
- `Cargo.toml`で条件付きコンパイル（features）を使用して、必要なバインディングのみをビルド

### 3. テストデータの共有

- Python版の`tests/data/`をTS版からも参照可能（相対パスでアクセス）
- 同じテストケースで互換性を検証

### 4. ビルド出力の管理

- Python版: `target/`（Cargoのビルド出力）
- TS版: `fast-bunkai-ts/build/`（napi-rsのビルド出力、ネイティブモジュール）
- 両方とも`.gitignore`に追加済み

## パッケージ配布

### Python版（既存）

- PyPIに`fast-bunkai`として配布
- `pyproject.toml`で設定、maturinでビルド

### TS版（追加予定）

- npmに`fast-bunkai`または`@fast-bunkai/core`として配布
- `package.json`で設定、napi-rsでビルド
- プラットフォーム別の事前ビルドバイナリを含む

## 今後の拡張可能性

### ワークスペース構成への移行（オプション）

将来的にプロジェクトが大きくなった場合、以下のような構成に移行することも可能です：

```
fast-bunkai/
├── packages/
│   ├── python/              # fast_bunkai/を移動
│   └── typescript/          # fast-bunkai-ts/を移動
├── crates/
│   └── fast-bunkai-core/    # Rustコアを独立クレートに分離
└── Cargo.toml               # ワークスペース定義
```

ただし、現時点ではフラット構成で十分であり、無理に移行する必要はありません。

