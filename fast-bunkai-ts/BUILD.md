# ビルド手順

## 前提条件

1. **Rust ツールチェーン**: Cargo と Rust がインストールされている必要があります
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```

2. **Node.js**: v18以上が必要です
   ```bash
   node --version  # v18.0.0以上であることを確認
   ```

## ビルド手順

### 1. 依存関係のインストール

```bash
cd fast-bunkai-ts
npm install
```

### 2. 型チェック

```bash
npm run typecheck
```

### 3. ネイティブモジュールのビルド

```bash
npm run build
```

このコマンドは以下を実行します：
- Rustコードをコンパイル（`cargo build --release --features node`）
- napi-rsがTypeScriptバインディングを生成
- プラットフォーム別のバイナリを`build/`ディレクトリに生成

### 4. テストの実行

```bash
npm test
```

## トラブルシューティング

### Cargoが見つからない場合

```bash
# Rustのインストール確認
rustup --version
cargo --version

# PATHに追加（必要に応じて）
export PATH="$HOME/.cargo/bin:$PATH"
```

### ビルドエラーが発生する場合

1. Rustバージョンの確認
   ```bash
   rustc --version  # 1.70以上推奨
   ```

2. 親ディレクトリのCargo.tomlが正しく設定されているか確認
   - `features = ["node"]`が有効になっているか
   - `napi`と`napi-derive`依存関係が追加されているか

3. クリーンビルド
   ```bash
   cd ..
   cargo clean
   cd fast-bunkai-ts
   npm run build
   ```

## 開発モード

デバッグビルド：

```bash
npm run build:debug
```

監視モードでテスト：

```bash
npm run test:watch
```

## 成果物

ビルドが成功すると、以下のファイルが生成されます：

- `build/fast-bunkai-*.node` - プラットフォーム別のネイティブモジュール
- `dist/` - TypeScriptのコンパイル済みファイル（まだ未実装、必要に応じて追加）

