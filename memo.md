# 作業メモ

### プロジェクトのセットアップ

EffectのAPIをCloudflare Workersにデプロイするには？プロジェクトはどうセットアップすればよい？

[@effect/platform @effect/schema Cloudflare Worker example](https://gist.github.com/Fredx87/68b2d86caa309d96f27884a4ae9ff71f)

作成したAPIを`toWebHandler`で変換して、`Request`オブジェクトを受け取れるようにしてあげればよい。

なので、wrangler initでプロジェクトを作成してから、Effectの依存をインストールしていけばいいかな。Effectのテンプレートもあったと思うのでまた見てみる。

最低限のファイルが含まれていそうなHello World example > Worker onlyを選択する。API Starter（OpenAPI compliant）とかあって面白そう。
