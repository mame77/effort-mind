# effort-mind

意識することをフォルダに貯めて、○×で振り返るスマホ向けの試作です。上のフォルダの項目も表示し、直近10回の×率とフォルダごとの固定から「今意識する項目」を選びます。

## 起動

Node.js 20.19+ または 22.12+ を使用します。NixOS では以下を実行してください。

```sh
nix shell nixpkgs#nodejs -c npm ci
nix shell nixpkgs#nodejs -c npm run dev
```

表示された URL を開きます。スマホから試す場合は同じネットワークからホストの IP とポートにアクセスします。

```sh
nix shell nixpkgs#nodejs -c npm test
nix shell nixpkgs#nodejs -c npm run build
nix shell nixpkgs#nodejs -c npm run preview
```

オフライン対応は production build の Service Worker で提供します。`preview` を localhost（または HTTPS 配信）で一度開き、Service Worker が有効になった後にオフラインで再読み込みできます。通常の HTTP の LAN アドレスでは Service Worker が使えないため、スマホのオフライン検証には HTTPS 配信を使用してください。

データは IndexedDB にブラウザ単位で保存されます。設定画面から JSON の書き出し・読み込みができ、読み込み時は全データを置き換えます。ブラウザのデータ削除に備えて書き出したファイルを保管してください。フォルダ削除は子孫フォルダとその項目も削除します。
