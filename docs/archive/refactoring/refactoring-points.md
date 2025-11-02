# リファクタリングポイント

## 優先度: 高（すぐに実装すべき）

### 1. 結果キャッシュの追加（`fastBunkai.ts`）

**問題**: `segment()`と`findEos()`が同じテキストで別々に`segmentNative()`を呼び出している。

```typescript
// 現在: 同じテキストで2回呼ばれる
const sentences = splitter.segment(text);  // segmentNative呼び出し
const eos = splitter.findEos(text);        // 再度segmentNative呼び出し
```

**改善案**: インスタンスレベルで結果をキャッシュ（シンプルな実装で十分）

```typescript
export class FastBunkai {
  private lastResult: { text: string; result: SegmentResult } | null = null;

  private getSegmentResult(text: string): SegmentResult {
    if (this.lastResult?.text === text) {
      return this.lastResult.result;
    }
    const result = segmentNative(text);
    this.lastResult = { text, result };
    return result;
  }

  segment(text: string): string[] {
    return this.getSegmentResult(text).sentences;
  }

  findEos(text: string): number[] {
    return this.getSegmentResult(text).eos_indices ?? [];
  }
}
```

**理由**: パフォーマンス向上、実装がシンプル。

---

### 2. JSONパースエラーの処理（`native.ts`）

**問題**: `JSON.parse()`が失敗した場合のエラーハンドリングがない。

```typescript
// 現在
export function segmentRuntime(text: string): SegmentResult {
  const native = loadNativeModule();
  const jsonString = native.segment(text);
  return JSON.parse(jsonString) as SegmentResult;  // エラー処理なし
}
```

**改善案**: try-catchで明確なエラーメッセージを提供

```typescript
export function segmentRuntime(text: string): SegmentResult {
  const native = loadNativeModule();
  const jsonString = native.segment(text);
  try {
    return JSON.parse(jsonString) as SegmentResult;
  } catch (error) {
    throw new Error(
      `Failed to parse segmentation result from native module: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
```

**理由**: デバッグしやすく、エラーの原因を明確化。

---

### 3. プラットフォーム判定の抽出（`native.ts`）

**問題**: プラットフォーム名の生成ロジックが長く、再利用されていない。

**改善案**: 関数に抽出（将来の拡張に対応）

```typescript
function getPlatformBinaryName(): string {
  const platform = os.platform();
  const arch = os.arch();
  
  if (platform === 'darwin') {
    return arch === 'arm64' ? 'fast-bunkai.darwin-arm64.node' : 'fast-bunkai.darwin-x64.node';
  }
  if (platform === 'linux') {
    return arch === 'arm64' ? 'fast-bunkai.linux-arm64-gnu.node' : 'fast-bunkai.linux-x64-gnu.node';
  }
  if (platform === 'win32') {
    return 'fast-bunkai.win32-x64-msvc.node';
  }
  return 'fast-bunkai.node';
}
```

**理由**: 可読性向上、テスト容易性向上、保守性向上。

---

## 優先度: 中（時間があれば改善）

### 4. CLIのstdin読み取りの改善（`cli.ts`）

**問題**: `readFileSync(0, 'utf-8')`は非推奨の可能性がある。

**改善案**: `process.stdin`を適切に読み取る

```typescript
import { Readable } from 'stream';

async function readInput(input?: string): Promise<string> {
  if (input && input !== '-' && existsSync(input)) {
    return readFileSync(input, 'utf-8');
  }
  
  // stdinから読み取り
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    process.stdin.on('data', (chunk) => chunks.push(chunk));
    process.stdin.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    process.stdin.on('error', reject);
  });
}
```

**理由**: Node.jsのベストプラクティスに準拠。ただし、CLIがシンプルなため、現在の実装でも動作するなら優先度は低い。

---

### 5. エラーメッセージの統一

**問題**: エラーメッセージの形式が統一されていない。

**改善案**: エラークラスを定義（最小限の実装）

```typescript
export class FastBunkaiError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'FastBunkaiError';
  }
}

export class NativeModuleError extends FastBunkaiError {
  constructor(message: string, cause?: Error) {
    super(`Native module error: ${message}`, cause);
    this.name = 'NativeModuleError';
  }
}
```

**理由**: エラーハンドリングの一貫性。ただし、現時点では必須ではない。

---

### 6. 型安全性の向上（`native.ts`）

**問題**: 型アサーション（`as`）が多用されている。

**改善案**: ランタイムバリデーション（zod等のライブラリは使わない。シンプルな実装）

```typescript
function validateSegmentResult(obj: unknown): SegmentResult {
  if (!obj || typeof obj !== 'object') {
    throw new Error('Invalid segment result: not an object');
  }
  const result = obj as Record<string, unknown>;
  
  if (!Array.isArray(result.sentences)) {
    throw new Error('Invalid segment result: sentences must be an array');
  }
  if (!Array.isArray(result.eos_indices)) {
    throw new Error('Invalid segment result: eos_indices must be an array');
  }
  
  return result as SegmentResult;
}
```

**理由**: ランタイムエラーの早期発見。ただし、Rust側が正しく動作している限り必須ではない。

---

## 優先度: 低（現時点では不要）

### 7. CLI引数パーサーの置き換え

**問題**: 手動で引数パースしている。

**検討**: `commander`や`yargs`を使う選択肢があるが、現在の実装で十分シンプル。過度の依存追加は避けるべき。

**判断**: 現状維持（CLIが複雑化したら再検討）

---

### 8. 非同期APIの追加

**問題**: 全てのAPIが同期。

**検討**: 非同期APIを追加する選択肢があるが、Rust側が同期で、現在の使用ケースで問題がないなら不要。

**判断**: 必要に応じて後で追加（現時点では不要）

---

### 9. 設定オプションの追加

**問題**: FastBunkaiクラスに設定オプションがない。

**検討**: Python版に合わせてオプションを追加する選択肢があるが、TypeScript版の現在の使用ケースでは不要。

**判断**: ユーザーからの要求があれば追加

---

## 実装推奨順

1. ✅ **結果キャッシュ**（簡単、効果大）
2. ✅ **JSONパースエラーハンドリング**（簡単、堅牢性向上）
3. ✅ **プラットフォーム判定の抽出**（簡単、可読性向上）
4. ⚠️ **stdin読み取りの改善**（中程度の複雑さ、現状でも動作する）
5. ⚠️ **エラークラスの定義**（低優先度、現状でも問題なし）

## 避けるべきこと

- ❌ 過度な抽象化（DIコンテナ、ファクトリーパターンなど）
- ❌ 不要な依存関係の追加（zod、commander等は必要になるまで追加しない）
- ❌ パフォーマンス最適化の先回り（実際に問題が発生してから対処）
- ❌ 型システムの過度な活用（複雑な型演算は避ける）

## まとめ

現時点で**1-3の改善**を実装すれば十分。それ以外は、実際に問題が発生するか、ユーザーからの要求があるまで保留で良い。シンプルさと実用性のバランスを保つことが重要。

