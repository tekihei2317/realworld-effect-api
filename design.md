# 設計

## 目的

Realworldという、Mediumのクローンの記事投稿アプリを、異なるバックエンド・フロントエンドで実装するプロジェクトがあります。

Effect-TSの学習のため、このRealWorldのAPIをEffect-TSを使って実装していきます。

- [Introduction | RealWorld](https://docs.realworld.build/introduction/)
- [gothinkster/realworld: "The mother of all demo apps" — Exemplary fullstack Medium.com clone powered by React, Angular, Node, Django, and many more](https://github.com/gothinkster/realworld?tab=readme-ov-file)
- [gothinkster/realworld-starter-kit: Starter kit for new RealWorld framework implementations](https://github.com/gothinkster/realworld-starter-kit?tab=readme-ov-file)

## 使用するツール、ライブラリ等

- データベース、ランタイム
  - Cloudflare Workers + Cloudflare D1にします。Node.js + PostgreSQLで動かせるようにもしておきたい。
- HTTPサーバー、ルーティング
  - `@effect/platform`
  - [effect/packages/platform/README.md at main · Effect-TS/effect](https://github.com/Effect-TS/effect/blob/main/packages/platform/README.md#http-server)
- データベースアクセス
  - `@effect/sql`、`@effect/sql-d1`
  - [effect/packages/sql/README.md at main · Effect-TS/effect](https://github.com/Effect-TS/effect/blob/main/packages/sql/README.md)
  - Prismaを使いたいけどとりあえず標準のものを使ってみます。

## RealWorldの機能や仕様について

[realworld/api at main · gothinkster/realworld](https://github.com/gothinkster/realworld/tree/main/api)

APIの仕様（OpenAPI）と、Postmanで実行するためのコレクションが置いてある。

[Endpoints | RealWorld](https://docs.realworld.build/specifications/backend/endpoints/)

APIのエンドポイントの一覧。

- 認証
  - ログイン
  - ユーザー登録
  - ログインユーザーの取得
  - ユーザー情報の更新
- ユーザー
  - 特定のユーザーのプロフィールの取得
  - ユーザーのフォロー・アンフォロー
- 記事
  - 記事の一覧の取得。タグや著者、フォロー主での検索と、ページネーション。
  - フィード。フォローしているユーザーの記事を取得する。
  - 記事の取得
  - 記事の作成
  - 記事の更新
  - 記事の削除
- コメント
  - 記事にコメントする
  - 記事のコメント一覧を取得する
  - コメントを削除する
- お気に入り
  - 記事をお気に入り、お気に入り解除する
- タグ
  - タグの一覧を取得する

デモアプリケーションを使って機能を確認しよう。

デモアプリケーション: [Conduit](https://demo.realworld.build/#/)

ドキュメントにはないけど、ログアウトのAPIは必要そうだった。設定ページに"Or click here to logout"というボタンがある。

## データモデリング

他の方のマイグレーションを見ればいいのだけれど、一応自分で整理してから確認することにする。

パスワードの変更がユーザー編集ページからできるの怖いな...。

?は省略可能な属性

- ユーザー（ID、ユーザー名、bio?、プロフィール画像のURL?、登録日時）
  - ユーザー名がURLに使われているが、漢字を入力するとAPI側でエラーになっていた。
- 認証情報（ユーザーID、メールアドレス、パスワード）
- 記事（ID、ユーザーID、タイトル、description、記事の内容、slug、作成日時、更新日時）
  - slugは確か記事の内容か何かを元に生成してたような記憶がある
- タグ（ID、タグ名、作成日時）
- 記事とタグの関連（記事ID、タグID、作成日時）
- コメント（ID、記事ID、ユーザーID、コメント内容、コメント日時）
- お気に入り（ユーザーID、記事ID、お気に入り日時）
- フォロー（フォロワーID、フォロイーID、フォロー日時）
