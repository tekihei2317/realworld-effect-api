# 作業メモ

## TODO:

- [x] 実際のアプリケーションを操作して機能を把握する。
- [x] データモデリングする。
- [x] プロジェクトのセットアップ。必要なライブラリをインストールする。
- [x] データベースのマイグレーションをする。
- [ ] APIのエンドポイントを一つ作成する。認証が不要なやつ。
- [ ] テストを書く。Postmanのテストの実行方法も確認しておく。
- [ ] 認証機能を実装する。
- [ ] APIを順番に実装していく。

### APIのエンドポイントを一つ作成する

 次はAPIのエンドポイントを作成します。まずは認証が不要なAPIを一つ、タグの一覧取得APIを作成したいと思います。

まずは、`@effect/platform`のAPIの定義方法に関するドキュメントを読みます。

[effect/packages/platform/README.md at main · Effect-TS/effect](https://github.com/Effect-TS/effect/blob/main/packages/platform/README.md)

Node.jsじゃないから少し読み飛ばす。Swaggerもwrangler環境で用意できるか試しておこう。

```ts
import { handler, dispose } from './api';

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const response = await handler(request);
		await dispose();

		return response;
	},
} satisfies ExportedHandler<Env>;
```

これで http://localhost:8787 でAPIサーバーが動いてHello, worldが返ってきました。Swaggerも追加できた。すげ〜。

---

タグのエンドポイントを作成して、他のAPIエンドポイントも一緒に定義しておこうと思います。

### プロジェクトのセットアップ

EffectのAPIをCloudflare Workersにデプロイするには？プロジェクトはどうセットアップすればよい？

[@effect/platform @effect/schema Cloudflare Worker example](https://gist.github.com/Fredx87/68b2d86caa309d96f27884a4ae9ff71f)

作成したAPIを`toWebHandler`で変換して、`Request`オブジェクトを受け取れるようにしてあげればよい。

なので、wrangler initでプロジェクトを作成してから、Effectの依存をインストールしていけばいいかな。Effectのテンプレートもあったと思うのでまた見てみる。

最低限のファイルが含まれていそうなHello World example > Worker onlyを選択する。API Starter（OpenAPI compliant）とかあって面白そう。

次はEffectのライブラリを入れます。`effect`、`@effect/platform`、`@effect/sql`、`@effect/sql-d1`を入れておく。

```bash
npm install effect @effect/platform @effect/sql @effect/sql-d1
```

### データベースのマイグレーションをする

`@effect/sql`にマイグレーションの仕組みはありますが、d1ならwranglerでできるのでwranglerでやります。あと`@effect/sql-d1`にはマイグレーションはなさそう（不要）。

```bash
# データベースの作成
npx wrangler d1 create realworld-effect

# 疎通の確認
npx wrangler d1 execute realworld-effect --remote --command="select 1"

# マイグレーションの作成
npx wrangler d1 migrations create realworld-effect <MIGRATION_NAME>

# マイグレーションの実行（ローカル）
npx wrangler d1 migrations apply realworld-effect --local
```

SQLiteのデータ型を把握していないので、確認しておきます。確か文字列の長さ制限を指定できなかったような気がする。

[Datatypes In SQLite](https://www.sqlite.org/datatype3.html)

- NULL、INTEGER、REAL、TEXT、BLOBの5つですね。

[CREATE TABLE](https://sqlite.org/lang_createtable.html)

練習のために自分で書いておこう。

[SQLite | AUTOINCREMENTを設定する場合としない場合の違い](https://www.javadrive.jp/sqlite/table/index9.html)

SQLiteってPRIMARY KEY設定したら勝手にAUTOINCREMENTになるんだった。明示的にAUTOINCREMENT指定したら微妙に仕様が変わる。どっちがいいんだろう。

現在の日時を初期値にするにはどうするのがいいんだろう。`CURRENT_TIMESTAMP`でいいのかな。

DDLの書き方、わからないところがありすぎるね。

- PRIMARY KEY設定したらNOT NULL制約付くんだっけ？
- updatedAtを自動で更新するにはトリガーが必要？
- ユニーク制約つけたらインデックスは要らないよね？

マイグレーションを書きました。カラム名がAPIのレスポンスと差がないようになるべく合わせておきました。`image`だけは分かりにくいので`profileImageUrl`に変更しておきました。
