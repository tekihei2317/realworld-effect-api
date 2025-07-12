# 作業メモ

## TODO:

- [x] 実際のアプリケーションを操作して機能を把握する。
- [x] データモデリングする。
- [x] プロジェクトのセットアップ。必要なライブラリをインストールする。
- [x] データベースのマイグレーションをする。
- [ ] APIのエンドポイントを一つ作成する。認証が不要なやつ。
	- [x] エンドポイントの定義を作成する
	- [ ] データベースからデータを取得して返すようにする
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

次はタグをDBから取得する処理を実装しましょう。D1のbindingsをEffect側に渡します。

D1Client.layer（SQLクライアントの実態）にはD1Databaseが必要で、作成したレイヤーをhandlerに渡す必要があるので、D1Databaseを受け取ってhandlerを返す関数を作るとよいでしょう。まずAPI側でSQLクライアントを呼び出してみて、依存がどうなるかを見てみます。

```ts
export function createWebHandler({
	db,
}: {
	db: D1Database;
}): ReturnType<typeof HttpApiBuilder.toWebHandler> {
	const SqlLive = D1Client.layer({ db });
	const ConduitApiLive = HttpApiBuilder.api(ConduitApi).pipe(
		Layer.provide(tagsLive),
		Layer.provide(usersLive),
		Layer.provide(SqlLive),
	);

	const SwaggerLive = HttpApiSwagger.layer().pipe(Layer.provide(ConduitApiLive));

	return HttpApiBuilder.toWebHandler(
		Layer.mergeAll(ConduitApiLive, SwaggerLive, HttpServer.layerContext),
	);
}
```

APIエンドポイント側の定義です。SQLのエラーをHTTPのエラーに変換しないとエラーになるので、変換処理が必要でした。エラーハンドリングClaudeに書いてもらったので、ちゃんと型エラーや型定義を確認して自分で修正できるようにしたい。

```ts
import { HttpApiBuilder, HttpApiError } from '@effect/platform';
import { ConduitApi } from './api';
import { Effect } from 'effect';
import { SqlClient } from '@effect/sql';

export const tagsLive = HttpApiBuilder.group(ConduitApi, 'Tags', (handlers) =>
	handlers.handle('getTags', () =>
		Effect.gen(function* () {
			const sql = yield* SqlClient.SqlClient;

			const tags = yield* sql<{
				readonly id: number;
				readonly name: string;
			}>`SELECT id, name FROM Tag`.pipe(
				Effect.mapError(() => new HttpApiError.InternalServerError()),
			);

			return { tags: tags.map((tag) => tag.name) };
		}),
	),
);
```

スローするエラーはあらかじめAPIの定義の方に含める必要があるみたい。仕様→実装の順で進める必要がありますね。

```ts
const getTags = HttpApiEndpoint.get('getTags', '/tags')
	.addSuccess(tagsResponse)
	.addError(HttpApiError.InternalServerError);
```

以下のコマンドでデータベースにデータを追加し、APIレスポンスに含まれることを確認した。

```bash
npx wrangler d1 execute realworld-effect --command="INSERT INTO Tag (name) VALUES ('javascript')"
```

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
