# ドキュメント一覧

このディレクトリには、プロジェクトの開発過程で作成された様々な文書が含まれています。

## 📚 ドキュメントの分類

### 🟢 永続的な文書（長期参照対象）

プロジェクトの理解に必要な、長期的に参照されるべき文書：

- **[directory-structure.md](./directory-structure.md)**
  - **目的**: ディレクトリ構成の説明
  - **対象**: 新しい開発者、コントリビューター
  - **更新頻度**: 構造変更時
  - **状態**: ✅ 最新

- **[python-vs-typescript-comparison.md](./python-vs-typescript-comparison.md)**
  - **目的**: Python版とTypeScript版の機能・テスト比較
  - **対象**: ユーザー、開発者（互換性判断）
  - **更新頻度**: 機能追加・変更時
  - **状態**: ✅ 最新

- **[typescript-review.md](./typescript-review.md)**
  - **目的**: TypeScript版の包括的なセルフレビュー
  - **対象**: 開発者（アーキテクチャ理解）
  - **更新頻度**: 大きな変更時
  - **状態**: ✅ 最新（実装完了時点）

### 🟡 一時的な文書（実装過程で作成、アーカイブ対象）

実装過程で作成され、完了後は参照頻度が低下する文書：

#### 実装計画・調査関連

- **[implementation-plan.md](./archive/implementation/implementation-plan.md)** 📦 アーカイブ済み
  - **目的**: TypeScript版実装の詳細計画
  - **状態**: ✅ 実装完了
  - **場所**: `docs/archive/implementation/`

- **[morphological-analysis-feasibility.md](./archive/research/morphological-analysis-feasibility.md)** 📦 アーカイブ済み
  - **目的**: 形態素解析機能（kuromoji）の実装可能性調査
  - **状態**: ✅ 実装完了
  - **場所**: `docs/archive/research/`

#### タスク管理・レビュー関連

- **[remaining-tasks.md](./remaining-tasks.md)**
  - **目的**: 残りのタスク一覧
  - **更新頻度**: タスク完了・追加時
  - **状態**: ⚠️ 継続的に更新が必要
  - **推奨**: プロジェクトボード（GitHub Issues/Projects）に移行、または完了後にアーカイブ

- **[refactoring-points.md](./archive/refactoring/refactoring-points.md)** 📦 アーカイブ済み
  - **目的**: リファクタリングポイントの記録
  - **状態**: ✅ 実装完了
  - **場所**: `docs/archive/refactoring/`

- **[morphological-refactoring-points.md](./archive/refactoring/morphological-refactoring-points.md)** 📦 アーカイブ済み
  - **目的**: 形態素解析機能のリファクタリングポイント
  - **状態**: ⚠️ 一部未実装（将来の参考として保持）
  - **場所**: `docs/archive/refactoring/`

---

## 📁 現在のディレクトリ構造

```
docs/
├── README.md (このファイル)
├── directory-structure.md          # 永続
├── python-vs-typescript-comparison.md  # 永続
├── typescript-review.md            # 永続
├── remaining-tasks.md             # 一時的（継続更新中）
└── archive/                       # アーカイブ済み
    ├── README.md
    ├── implementation/
    │   └── implementation-plan.md
    ├── refactoring/
    │   ├── refactoring-points.md
    │   └── morphological-refactoring-points.md
    └── research/
        └── morphological-analysis-feasibility.md
```

---

## 🔄 ドキュメント管理方針

### 永続的な文書の扱い

1. **定期的な更新**: プロジェクトの変更に合わせて更新
2. **バージョン管理**: Git履歴で追跡
3. **README.mdからの参照**: 主要ドキュメントへのリンクを維持

### 一時的な文書の扱い

1. **実装完了後のアーカイブ**: `docs/archive/` に移動
2. **Git履歴の保持**: 削除ではなく移動で履歴を保持
3. **プロジェクトボードへの移行**: タスク管理ツールに移行を検討

### アーカイブのタイミング

- ✅ **実装完了時**: 計画・調査文書は実装完了後にアーカイブ
- ✅ **タスク完了時**: 完了したタスクはアーカイブまたは削除
- ✅ **定期的な整理**: 四半期ごとにドキュメントの見直し

---

## 📝 ドキュメント作成ガイドライン

### 新規ドキュメント作成時

1. **永続的な文書か一時的な文書かを判断**
   - 永続的: プロジェクト理解に必要、長期的に参照
   - 一時的: 実装過程のみ必要、完了後は参照頻度低下

2. **一時的な文書の場合**
   - タイトルに日付を含める（例: `implementation-plan-2025-01.md`）
   - 完了後にアーカイブすることを前提に作成

3. **永続的な文書の場合**
   - 明確な構造と目次を作成
   - 定期的な更新を前提に作成
   - README.mdから参照可能にする

---

## 🔍 現在の状態（2025年1月）

### 実装完了済み

- ✅ TypeScript版実装（`implementation-plan.md` → アーカイブ対象）
- ✅ 形態素解析機能実装（`morphological-analysis-feasibility.md` → アーカイブ対象）
- ✅ リファクタリング実施（`refactoring-points.md` → 一部アーカイブ可能）

### 継続中

- ⚠️ 残りのタスク（`remaining-tasks.md` → 定期的な更新が必要）
- ⚠️ 形態素解析リファクタリング（`morphological-refactoring-points.md` → 未実装項目あり）

---

## 📌 完了したアクション

1. ✅ **アーカイブディレクトリの作成** - 完了
2. ✅ **完了済み文書の移動** - 完了
   - `implementation-plan.md` → `docs/archive/implementation/`
   - `morphological-analysis-feasibility.md` → `docs/archive/research/`
   - `refactoring-points.md` → `docs/archive/refactoring/`
   - `morphological-refactoring-points.md` → `docs/archive/refactoring/`

## 🔄 今後のアクション

1. **タスク管理の移行検討**
   - `remaining-tasks.md` の内容をGitHub Issues/Projectsに移行
   - または、完了したタスクをアーカイブしてアクティブなタスクのみ保持

2. **定期整理**
   - 四半期ごとにドキュメントの見直し
   - 参照頻度が低下した文書のアーカイブ

---

## 🎯 まとめ

- **永続的な文書**: 3ファイル（directory-structure, python-vs-typescript-comparison, typescript-review）
- **一時的な文書**: 5ファイル（実装計画、調査、タスク、リファクタリングポイント）
- **推奨アクション**: アーカイブ構造の作成と完了済み文書の整理

