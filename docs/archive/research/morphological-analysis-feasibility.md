# 形態素解析機能の実装可能性調査

## 調査目的
TypeScript版でPython版のJanome形態素解析機能を、kuromoji等のJavaScriptライブラリで代替できるか検討する。

---

## 1. Python版の実装要件

### Janomeの使用方法

Python版は以下の情報を取得している：

```python
tokenizer = Tokenizer()
tokens = tokenizer.tokenize(text)
for token in tokens:
    surface = token.surface              # 表層形
    part_of_speech = token.part_of_speech  # 品詞（カンマ区切り文字列）
    base_form = token.base_form          # 基本形
    reading = token.reading              # 読み（カタカナ）
    phonetic = token.phonetic            # 発音（カタカナ）
```

### 出力形式（CLI `--ma`オプション）

```
表層形	品詞1,品詞2,品詞3,品詞4,基本形,読み,発音
形態素	名詞,一般,*,*,形態素,ケイタイソ,ケイタイソ
解析	名詞,サ変接続,*,*,解析,カイセキ,カイセキ
EOS
ます	助動詞,*,*,特殊・マス,基本形,ます,マス,マス
```

### TokenResult の構造

```python
TokenResult(
    node_obj=token,                    # Janomeトークンオブジェクト
    tuple_pos=("名詞", "一般", "*", "*"),  # 品詞をタプル化
    word_stem=token.base_form,          # 基本形
    word_surface=token.surface,          # 表層形
)
```

---

## 2. JavaScript/TypeScript 形態素解析ライブラリ候補

### 候補1: kuromoji.js

**概要**: 
- MeCab辞書ベースのJavaScript形態素解析ライブラリ
- Node.jsとブラウザの両方で動作
- npmパッケージ: `kuromoji`

**API例**:
```javascript
import kuromoji from 'kuromoji';

kuromoji.builder({ dicPath: "node_modules/kuromoji/dict" }).build((err, tokenizer) => {
  const tokens = tokenizer.tokenize("形態素解析します");
  tokens.forEach(token => {
    token.surface_form;    // 表層形
    token.pos;            // 品詞（配列）
    token.basic_form;     // 基本形
    token.reading;        // 読み
    token.pronunciation;  // 発音
  });
});
```

**互換性評価**:
- ✅ 必要な情報（表層形、品詞、基本形、読み、発音）を提供
- ✅ 辞書サイズ: 約10-20MB（初回ダウンロード）
- ⚠️ 非同期初期化が必要（ビルダーパターン）
- ✅ TypeScript型定義: `@types/kuromoji` が利用可能

**出力形式の対応**:
- `surface_form` → `surface` ✅
- `pos` (配列) → `part_of_speech` (文字列) ⚠️ 変換必要
- `basic_form` → `base_form` ✅
- `reading` → `reading` ✅
- `pronunciation` → `phonetic` ✅

### 候補2: node-kuromoji

**概要**: 
- kuromojiのNode.js専用ラッパー
- より簡単なAPIを提供

**評価**: kuromojiと同様だが、より新しいメンテナンス状況を確認が必要

### 候補3: kuromoji-analyzer

**概要**: 
- kuromojiのラッパーライブラリ
- より高レベルなAPI

**評価**: 依存関係が増えるため、kuromoji直接使用が推奨

### 候補4: その他のライブラリ

- **juman.js**: JUMAN辞書ベース（非推奨、メンテナンス停止の可能性）
- **mecab-js**: MeCabの直接バインディング（ネイティブ依存が必要）

**推奨**: **kuromoji.js** が最も適切

---

## 3. 実装の詳細設計

### 3.1 依存関係の追加

```json
{
  "dependencies": {
    "kuromoji": "^0.1.2"
  },
  "devDependencies": {
    "@types/kuromoji": "^0.1.3"
  }
}
```

**確認済み情報**:
- `kuromoji@0.1.2`: 利用可能（最終更新: 2018-03-19）
- `@types/kuromoji@0.1.3`: TypeScript型定義あり（最終更新: 2023-11-07）
- 依存関係: `async@^2.0.1` のみ（軽量）

**パッケージサイズ**: 
- `kuromoji`: 約10-20MB（辞書ファイル含む）
- 初回インストール時に辞書をダウンロード

### 3.2 TokenResult のマッピング実装

```typescript
// src/morphological/kuromojiAdapter.ts
import kuromoji, { IpadicFeatures } from 'kuromoji';

interface KuromojiToken extends IpadicFeatures {
  surface_form: string;
  pos: string[];
  basic_form: string;
  reading?: string;
  pronunciation?: string;
}

export function convertKuromojiTokenToTokenResult(
  token: KuromojiToken,
  startIndex: number
): TokenResult {
  // 品詞をカンマ区切り文字列に変換
  const posString = token.pos.join(',');
  
  return {
    node_obj: token,  // kuromojiトークンオブジェクトを保存
    tuple_pos: token.pos as [string, ...string[]],
    word_stem: token.basic_form || token.surface_form,
    word_surface: token.surface_form,
    // 追加フィールド（オプション）
    reading: token.reading,
    phonetic: token.pronunciation,
  };
}
```

### 3.3 FastBunkaiクラスへの統合

```typescript
// src/fastBunkai.ts
import kuromoji from 'kuromoji';
import { convertKuromojiTokenToTokenResult } from './morphological/kuromojiAdapter';

export class FastBunkai {
  private kuromojiTokenizer: kuromoji.Tokenizer<IpadicFeatures> | null = null;
  private kuromojiInitPromise: Promise<void> | null = null;

  private async initializeKuromoji(): Promise<void> {
    if (this.kuromojiTokenizer) {
      return;
    }

    if (this.kuromojiInitPromise) {
      return this.kuromojiInitPromise;
    }

    this.kuromojiInitPromise = new Promise((resolve, reject) => {
      kuromoji.builder({ dicPath: "node_modules/kuromoji/dict" })
        .build((err, tokenizer) => {
          if (err) {
            reject(err);
          } else {
            this.kuromojiTokenizer = tokenizer;
            resolve();
          }
        });
    });

    return this.kuromojiInitPromise;
  }

  private buildMorphLayer(text: string): SpanAnnotation[] {
    if (!this.kuromojiTokenizer) {
      throw new Error('Kuromoji tokenizer not initialized');
    }

    const tokens = this.kuromojiTokenizer.tokenize(text);
    const spans: SpanAnnotation[] = [];
    let startIndex = 0;

    for (const token of tokens) {
      const surface = token.surface_form;
      const length = surface.length;
      
      const tokenResult = convertKuromojiTokenToTokenResult(token, startIndex);
      
      spans.push({
        rule_name: "MorphAnnotatorKuromoji",
        start_index: startIndex,
        end_index: startIndex + length,
        split_string_type: "kuromoji",
        split_string_value: "token",
        args: { token: tokenResult },
      });

      startIndex += length;
    }

    // 末尾の改行処理（Python版と同様）
    if (startIndex < text.length && text.slice(startIndex) === '\n') {
      const tokenResult: TokenResult = {
        node_obj: null,
        tuple_pos: ['記号', '空白', '*', '*'],
        word_stem: '\n',
        word_surface: '\n',
      };
      
      spans.push({
        rule_name: "MorphAnnotatorKuromoji",
        start_index: startIndex,
        end_index: text.length,
        split_string_type: "kuromoji",
        split_string_value: "token",
        args: { token: tokenResult },
      });
    }

    return spans;
  }

  async eos(text: string): Promise<Annotations> {
    await this.initializeKuromoji();
    
    const result = segmentNative(text);
    const annotations = new Annotations();

    // Rust側のアノテーションレイヤーを追加
    for (const layer of result.layers) {
      const spans = layer.spans.map(span => ({
        rule_name: span.rule_name,
        start_index: span.start,
        end_index: span.end,
        split_string_type: span.split_type,
        split_string_value: span.split_value,
        args: null,
      }));
      annotations.addAnnotationLayer(layer.name, spans);

      // BasicRuleが見つかったら形態素解析レイヤーを追加
      if (layer.name === "BasicRule") {
        const morphSpans = this.buildMorphLayer(text);
        const combined = [...morphSpans, ...annotations.flatten()];
        annotations.addAnnotationLayer("MorphAnnotatorKuromoji", combined);
      }
    }

    return annotations;
  }
}
```

### 3.4 CLI `--ma`オプションの実装

```typescript
// src/cli.ts
async function morphOutput(text: string, splitter: FastBunkai): Promise<string> {
  const annotations = await splitter.eos(text);
  const endIndices = new Set(
    annotations.getFinalLayer().map(span => span.end_index)
  );
  
  const spans = annotations
    .getAnnotationLayer("MorphAnnotatorKuromoji")
    .filter(span => span.rule_name === "MorphAnnotatorKuromoji")
    .sort((a, b) => a.start_index - b.start_index || a.end_index - b.end_index);

  const output: string[] = [];
  const seen = new Set<number>();
  let position = 0;

  for (const span of spans) {
    const token = span.args?.token;
    if (!token) continue;

    const tokenId = token.node_obj ? 
      (token.node_obj as any).word_id || position : position;
    if (seen.has(tokenId)) continue;
    seen.add(tokenId);

    const prevPosition = position;

    if (!token.node_obj || token.word_surface === '\n') {
      output.push(METACHAR_LINE_BREAK + '\n');
      position += 1;
    } else {
      const node = token.node_obj;
      const partOfSpeech = (node as any).pos?.join(',') || token.tuple_pos.join(',');
      const inflType = (node as any).conjugated_type || '*';
      const inflForm = (node as any).conjugated_form || '*';
      const baseForm = token.word_stem || token.word_surface;
      const reading = token.reading || (node as any).reading || '*';
      const phonetic = token.phonetic || (node as any).pronunciation || '*';

      output.push(
        `${token.word_surface}\t` +
        `${partOfSpeech},${inflType},${inflForm},${baseForm},${reading},${phonetic}\n`
      );
      position += token.word_surface.length;
    }

    // EOSマーカーの挿入
    for (let idx = prevPosition; idx < position; idx++) {
      if (endIndices.has(idx + 1)) {
        output.push('EOS\n');
      }
    }
  }

  return output.join('');
}
```

---

## 4. 実装の難易度評価

### 実装の複雑さ

| 項目 | 難易度 | 所要時間見積もり |
|------|--------|-----------------|
| **kuromoji統合** | ⭐⭐☆☆☆ | 2-3時間 |
| **TokenResult変換** | ⭐☆☆☆☆ | 1時間 |
| **Annotations実装** | ⭐⭐⭐☆☆ | 3-4時間 |
| **CLI `--ma`実装** | ⭐⭐☆☆☆ | 2-3時間 |
| **テスト実装** | ⭐⭐☆☆☆ | 2-3時間 |
| **型定義の追加** | ⭐☆☆☆☆ | 1時間 |

**合計**: 約11-15時間（1.5-2営業日）

**注意**: kuromojiのパッケージサイズが41.3MBと大きいため、実装前に以下を検討：
1. オプション依存として提供するか（`peerDependencies`または別パッケージ）
2. パッケージ配布時のサイズ増加への対策

### 技術的な課題

#### 課題1: 非同期初期化
- **問題**: kuromojiは非同期で初期化される
- **影響**: `eos()`メソッドが非同期になる（Python版は同期）
- **解決策**: 
  - `eos()`を非同期APIとして提供
  - または、初期化を事前に行う（コンストラクタで初期化開始）

#### 課題2: 品詞形式の違い
- **問題**: kuromojiの`pos`は配列、Janomeは文字列
- **影響**: 出力形式の微細な差異の可能性
- **解決策**: 変換関数で統一（カンマ区切り文字列に変換）

#### 課題3: 辞書サイズ
- **問題**: kuromoji辞書は**41.3MB**（実測値）
- **影響**: npmパッケージサイズの大幅な増加
- **解決策**: 
  - **推奨**: オプション依存として提供（`fast-bunkai[morphology]`）
  - または、別パッケージとして提供（`fast-bunkai-morphology`）
  - 必須依存として含める場合は、ユーザーへの明示が必要

#### 課題4: パフォーマンス
- **問題**: JavaScript実装のため、Janomeより遅い可能性
- **影響**: 大きなテキストでは処理時間が長くなる可能性
- **評価**: 実測が必要だが、通常の使用では問題ない見込み

---

## 5. 実装のメリット・デメリット

### ✅ メリット

1. **機能の完全性**: Python版と同等の機能を提供可能
2. **API互換性**: `eos()`メソッドと`--ma`オプションの実装
3. **型安全性**: TypeScriptで型安全に実装可能
4. **コミュニティ**: kuromojiは広く使われており、安定性が高い

### ⚠️ デメリット

1. **非同期API**: Python版は同期だが、TypeScript版は非同期になる
2. **パッケージサイズ**: 辞書ファイルで約10-20MB増加
3. **依存関係**: 外部ライブラリへの依存
4. **パフォーマンス**: JavaScript実装のため、Janomeより若干遅い可能性

---

## 6. 実装方針の推奨

### 推奨アプローチ: 段階的実装

#### フェーズ1: 基本実装（必須）
1. kuromojiの統合
2. `eos()`メソッドの実装（非同期）
3. 基本的なテスト

#### フェーズ2: CLI統合
1. `--ma`オプションの実装
2. CLIテストの追加

#### フェーズ3: 最適化（オプション）
1. パフォーマンス最適化
2. キャッシングの追加
3. エラーハンドリングの強化

### 実装の優先度

- **高**: `eos()`メソッドの実装（API互換性のため）
- **中**: `--ma` CLIオプション（ユーザビリティのため）
- **低**: パフォーマンス最適化（必要に応じて）

---

## 7. 実装例（簡易版）

### 最小限の実装

```typescript
// src/morphological/kuromojiMorphology.ts
import kuromoji from 'kuromoji';

let tokenizer: kuromoji.Tokenizer<kuromoji.IpadicFeatures> | null = null;
let initPromise: Promise<void> | null = null;

export async function initializeTokenizer(): Promise<void> {
  if (tokenizer) return;
  if (initPromise) return initPromise;

  initPromise = new Promise((resolve, reject) => {
    kuromoji.builder({ dicPath: 'node_modules/kuromoji/dict' })
      .build((err, tok) => {
        if (err) reject(err);
        else { tokenizer = tok; resolve(); }
      });
  });

  return initPromise;
}

export function tokenize(text: string): kuromoji.IpadicFeatures[] {
  if (!tokenizer) {
    throw new Error('Tokenizer not initialized. Call initializeTokenizer() first.');
  }
  return tokenizer.tokenize(text);
}
```

### FastBunkaiクラスへの追加

```typescript
// src/fastBunkai.ts に追加
import { initializeTokenizer, tokenize } from './morphological/kuromojiMorphology';

export class FastBunkai {
  // ... 既存のコード ...

  /**
   * Get annotations with morphological analysis
   * 
   * @param text - Input text
   * @returns Annotations object with morphological layer
   */
  async eos(text: string): Promise<AnnotationResult> {
    await initializeTokenizer();
    
    const result = segmentNative(text);
    // 形態素解析レイヤーを追加
    const morphSpans = this._buildMorphLayer(text);
    
    return {
      ...result,
      layers: [
        ...result.layers,
        {
          name: 'MorphAnnotatorKuromoji',
          spans: morphSpans,
        },
      ],
    };
  }

  private _buildMorphLayer(text: string): Span[] {
    const tokens = tokenize(text);
    const spans: Span[] = [];
    let startIndex = 0;

    for (const token of tokens) {
      const length = token.surface_form.length;
      spans.push({
        rule_name: 'MorphAnnotatorKuromoji',
        start: startIndex,
        end: startIndex + length,
        split_type: 'kuromoji',
        split_value: 'token',
      });
      startIndex += length;
    }

    return spans;
  }
}
```

---

## 8. 結論

### 実装可能性: ✅ **高い**

kuromojiを使用することで、Python版のJanome機能を**ほぼ完全に代替可能**。

### 実装推奨度: ⭐⭐⭐⭐☆ (4/5)

**推奨する理由**:
1. 技術的に実現可能
2. 実装コストが妥当（1.5-2営業日）
3. 機能の完全性が向上（Python版との互換性向上）
4. ユーザー体験の向上（`--ma`オプションの提供）

**注意点**:
1. 非同期APIになる（Python版との差異）
2. パッケージサイズの増加
3. 依存関係の管理

### 次のステップ

1. **実装の承認**: この設計方針で進めるか決定
2. **依存関係の追加**: `package.json`にkuromojiを追加
3. **段階的実装**: フェーズ1から順次実装
4. **テスト**: Python版との出力比較テスト

実装を進める場合は、まず`eos()`メソッドの基本実装から開始することを推奨します。
