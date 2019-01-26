const cronJob = require("cron").CronJob;
const Binance = require("./exchanges/binance.js");

/////// CONSTANTS /////////
const CRONJOB = {
  TIME: {
    EVERY_SECOND: "* * * * * *",
    EVERY_MINUTE: "* * * * *",
    EVERY_HOUR: "0 * * * *"
  }
};

///////// VARS /////////
var binance = new Binance();

///////// METHODS /////////
function runAlgorithm() {
  console.log("RUN");
}

async function printOpenOrders(symbol) {
  var result = await binance.orders_open(symbol);
  console.log(result);
}

///////// MANAGER /////////
printOpenOrders("POWR/ETH");

/* constructor(cronTime, onTick, onComplete, start, timezone, context, runOnInit, unrefTimeout) */
new cronJob(
  CRONJOB.TIME.EVERY_MINUTE,
  function() {
    runAlgorithm();
  },
  null,
  true
);
