const cronJob = require("cron").CronJob;
const Binance = require("./exchanges/binance.js");
const asTable = require("as-table");
const fs = require("fs");
const ansi = require("ansicolor");

const log = require("ololog").configure({
  "render+"(text, { consoleMethod = "" }) {
    if (!global.DEBUG) {
      fs.appendFileSync("logs/signals.log", "\n" + ansi.strip(text));
    }
    return text;
  },
  time: true
});

const binance = new Binance();

///////// METHODS /////////
async function startPeriodicRun() {
  log("START ");

  run();
  var cron = new cronJob(
    "0 * * * *", //EVERY HOUR
    function() {
      run();
    },
    null,
    true
  );
}

async function run() {
  return;
  var tickers = await binance.prices(["BTC/USDT"]);

  var gains = {};
  for (var key in tickers) {
    var ticker = tickers[key];

    console.log(
      asTable([
        ["symbol", "percentage", "high", "low", "open", "close", "last"],
        [
          ticker.symbol,
          ticker.percentage,
          ticker.high,
          ticker.low,
          ticker.open,
          ticker.close,
          ticker.last
        ]
      ])
    );
  }
}

startPeriodicRun();
