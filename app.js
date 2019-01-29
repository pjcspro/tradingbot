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

async function printRecentOrders(symbol, limit) {
  var result = await binance.orders(symbol, limit);
  console.log(result);
}

///////// MANAGER /////////
printRecentOrders("POWR/ETH", 2);

/* constructor(cronTime, onTick, onComplete, start, timezone, context, runOnInit, unrefTimeout) */
new cronJob(
  CRONJOB.TIME.EVERY_MINUTE,
  function() {
    runAlgorithm();
  },
  null,
  true
);
