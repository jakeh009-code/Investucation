# Investucation

A stock market simulator for teens and young adults. You get £100,000 of practice money to buy and sell real US stocks at live prices, with no real money involved.

It's a static website: there's no server or database. Your balance and portfolio are saved in your browser (localStorage).

## Run it locally

You need [Node.js](https://nodejs.org) installed. Then, in this folder:

```bash
npm start
```

Open http://localhost:8080/home.html in your browser.

(In VS Code you can also press F5, or use the Live Server extension on the `Homepage` folder.)

## Add your API key (recommended)

Live prices come from [Finnhub](https://finnhub.io). Without a key the site tries Yahoo Finance instead, which often doesn't work from a browser, so prices may show as unavailable.

1. Get a free key at https://finnhub.io/register
2. Copy `Homepage/config.example.js` to `Homepage/config.js`
3. Paste your key between the quotes in `config.js`

`config.js` is in `.gitignore`, so your key stays on your computer and is never uploaded.

> Note: if you publish the site online, anyone visiting can see the key in their browser, because the site has no server to hide it behind. Use a free Finnhub key and don't reuse it for anything else.

## Where the data comes from

- Stock prices and company names: Finnhub (Yahoo Finance as a backup)
- Pound/dollar exchange rate: [Frankfurter](https://www.frankfurter.app) (European Central Bank rates)
- Price charts: TradingView

## Feedback

Found a bug or have an idea? [Open an issue](https://github.com/jakeh009-code/Investucation/issues/new).

## Disclaimer

Investucation is for education only and does not give financial advice.
