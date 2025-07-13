# 作業メモ

## TODO:

- [x] 実際のアプリケーションを操作して機能を把握する。
- [x] データモデリングする。
- [x] プロジェクトのセットアップ。必要なライブラリをインストールする。
- [x] データベースのマイグレーションをする。
- [x] APIのエンドポイントを一つ作成する。認証が不要なやつ。
	- [x] エンドポイントの定義を作成する
	- [x] データベースからデータを取得して返すようにする
- [x] 残りのAPIエンドポイントの定義を作成していく。
	- とりあえず認証だけ書いておいた
- [x] 認証機能を実装する。
- [ ] テストを書く。
	- [x] テストを書けるように整備する
	- [ ] 認証のAPIのテストを実装する
	- [ ] Postmanのテストの実行方法も確認しておく。
- [ ] APIを順番に実装していく。

知りたいことメモ

- Cloudflare Workersのテスト方法。
- EffectのAPIのテスト方法。HTTPのエンドポイントを直接実行したい。テスト用にインメモリDBを使うのもできると思う。
- @effect/sqlのAPI。色々あるのでそれぞれがどのようなもので、どう使い分けるのかを知りたい。sqlタグで簡潔に書きたいが
- エラーハンドリング。コンパイルエラーが出たら都度mapErrorしてその場しのぎしてるのでちゃんとやりたい。

### 認証のAPIのテストを実装する

やっとAPIの単体テストが実行できるようになったので、テストを実装していく。

- ユーザー登録
	- ユーザー名、メールアドレス、パスワードを入力してユーザー登録できること
	- フィールドが不足している場合は登録できないこと
	- ユーザー名が重複している場合は登録できないこと
	- メールアドレスが重複している場合は登録できないこと
- ログイン
	- パスワードとメールアドレスが正しい場合はログインできること
	- パスワードが間違っている場合は認証エラーになること
	- メールアドレスが間違っている場合は認証エラーになること
- ユーザー情報取得
	- ログインしている場合はユーザー情報を取得できること
	- ログインしていない場合は認証エラーになること
- ユーザー情報更新
	- 未実装

### テストが書けるように整備する

とりあえずインメモリDBを使いつつ、APIのハンドラをHTTPを経由せずに実行できるテストが書けた。ベタ書きなので処理を共通化する。

あと、このタイプのテストはNode.jsで実行するので、Vitestのプロジェクトを定義してCloudflare Workersのテストとは別の環境で実行できるようにする。

Webハンドラーを作成する処理を別ファイルに抽出した。testSqlClientを直接使っているが、テストコード側でDBにデータを入れるので、DBクライアントを渡せるように変更する必要がある。

```ts
export const testWebHandler = Effect.gen(function* () {
	const sql = yield* testSqlClient;

	const apiLive = HttpApiBuilder.api(ConduitApi).pipe(
		Layer.provide(tagsLive),
		Layer.provide(usersLive),
		Layer.provide(AuthorizationLive),
		Layer.provide(Layer.succeed(SqlClient.SqlClient, sql)),
	);

	const webHandler = HttpApiBuilder.toWebHandler(Layer.mergeAll(apiLive, HttpServer.layerContext));

	return webHandler;
});
```

テスト用のクライアントの型が`Effect.Effect<SqlClient, SqlError, Scope>`で、これを`SqlClient`を必要とするエフェクトに渡してから実行したい。どうすればいい？

エフェクトの中でyield*してSqlClientを取り出してから、provideServiceを実行するとできた。これでいいのかな。

それから、Layer.Effectでレイヤーを作ってからLayer.provideするとかもできるかも？←やってみたけど分からなかった。

SqlClientを各テストで使い回そうと思ったけれど、`yield*`する度に毎回作成されているような気がする。Effectを返す関数じゃなくて、Effectを返すだけでもリセットされそうだ。←そうでした。毎回create tableでスキーマ作ってるので、そこは今後改善の必要があるかも。

### 認証機能を実装する

まず、認証機能を実装するにあたって必要そうな、ミドルウェアなどの機能を確認する。

トークンでの認証なので、トークンを検証してユーザー情報をハンドラからアクセスできる場所に入れる、トークンが不正な場合は認証エラーを出す、というようなミドルウェアが作れればよい。

Bearerトークンってなんだっけ...？仕様とかあるのかな。

Bearerトークンの認証が用意されているが、使い方が分からない。

Authorizationをprovideしないといけないんだけど、どうしようね。

分からなかったのでClaude Codeに書き進めてもらう。HttpApiSecurityを使って新しいルールを作ればいいらしい。

---

あとはjwtのエンコード、デコード処理を実装すればOK。jwtの実装は

- jose
- jsonwebtoken

のどちらかを使えば良さそう。よく分からないので全部やってもらった。これなんとかしたいね。

---

次はデータベースの登録処理を実装する。INSERT、UPDATEの実装方法を確認する。

SqlResolverを使う方法と、sqlタグを使う方法がある。APIが複数用意されているので確認したい。あとトランザクションの書き方を調べる。

エラーハンドリングがガバガバだが、そこはテストを書いてから修正することにして次に進む。

### 残りのAPIエンドポイントの定義を作成していく

認証関係を最初に実装するので、まずは認証とユーザーに関するAPIエンドポイントの定義のみを作成する。

`HttpApiEndpoint`で、リクエストボディの定義は`setPayload`、レスポンスの定義は`addSuccess`にスキーマを指定して行う。

次はエラー関係と、ステータスコードの設定を行う。`addSuccess`のステータスコードはデフォルトで200だが、オプションで変更することができる。

ユーザー関係のAPIのエラーには次のものがある。401はログインしていないときのエラーだが、ログインAPIでの401エラーはどういう状況で出すのか分からない。カレントユーザー情報取得の422も、リクエストボディがないので不明。

- ログイン: 401、422
- ユーザー登録: 422
- カレントユーザー情報取得: 401、422
- カレントーユーザー情報更新: 401、422

422の時のエラー情報は、`{ errors: { body: ['message1', 'message2'] } }`のフォーマットで返せばよい。

独自のエラーを定義する場合は、`Schema.TaggedError`を使う。できれば`HttpApiError`の定義を参考にして422を返すようなエラークラスを作成したいが、また今度。また、スキーマのパースに失敗した場合は400を返すようになっているので、これをカスタマイズする必要もありそうだ。

### APIのエンドポイントを一つ作成する

[How to implement a backend with Effect | Typeonce](https://www.typeonce.dev/article/how-to-implement-a-backend-with-effect)

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
