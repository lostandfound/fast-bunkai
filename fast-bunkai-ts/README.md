# fast-bunkai (TypeScript/Node.js版)

Rustで高速化された文境界検出ライブラリ。bunkai互換APIを提供します。

## インストール

```bash
npm install fast-bunkai
```

## 使用方法

### 基本的な使用

```typescript
import { FastBunkai } from 'fast-bunkai';

const splitter = new FastBunkai();
const text = "羽田から✈️出発して、友だちと🍣食べました。最高！また行きたいな😂";
const sentences = splitter.segment(text);

for (const sentence of sentences) {
  console.log(sentence);
}
```

### EOSインデックスの取得

```typescript
const splitter = new FastBunkai();
const text = "文1。文2！文3？";
const eosIndices = splitter.findEos(text);
console.log(eosIndices); // [2, 5, 8]
```

## API

### `FastBunkai` クラス

#### `segment(text: string): string[]`

テキストを文に分割し、文の配列を返します。

#### `findEos(text: string): number[]`

文末のUTF-16インデックスを返します。

## 開発

### ビルド

```bash
cd fast-bunkai-ts
npm install
npm run build
```

### テスト

```bash
npm test
```

### 型チェック

```bash
npm run typecheck
```

## ライセンス

MIT

