const Binance = require("./exchanges/binance.js");
const argv = require("yargs").argv;
const asTable = require("as-table");
const log = require("ololog").configure({ locate: false });
const cronJob = require("cron").CronJob;

const binance = new Binance();

const array = [
  "BTC/USDT",
  "ETH/USDT",
  "EOS/USDT",
  "LTC/USDT",
  "ADA/USDT",
  "XRP/USDT",
  "BNB/USDT"
];

async function run() {
  var prices = await binance.prices(array);

  log(
    asTable([
      array,
      [
        format(prices[array[0]].last),
        format(prices[array[1]].last),
        format(prices[array[2]].last),
        format(prices[array[3]].last),
        format(prices[array[4]].last),
        format(prices[array[5]].last),
        format(prices[array[6]].last)
      ],
      [
        prices[array[0]].percentage,
        prices[array[1]].percentage,
        prices[array[2]].percentage,
        prices[array[3]].percentage,
        prices[array[4]].percentage,
        prices[array[5]].percentage,
        prices[array[6]].percentage
      ]
    ])
  );
}

async function startPeriodicRun() {
  run();
  var cron = new cronJob(
    "*/10 * * * *", //every 10 minutes
    function() {
      run();
    },
    null,
    true
  );
}

startPeriodicRun();

function format(number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR"
  }).format(number);
}
