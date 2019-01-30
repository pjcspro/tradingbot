const cronJob = require("cron").CronJob;
const Binance = require("./exchanges/binance.js");
const argv = require("yargs").argv;
const asTable = require("as-table");

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
var sll_order_id; //sll => Sell Loss Limit

if (!argv.config) {
  console.log("Configuration file not set");
  return;
}
const config = require(argv.config);
console.log(asTable([["order_id", "symbol"], [config.orderid, config.symbol]]));

///////// METHODS /////////
async function start() {
  var result = await binance.stopLimit(
    config.symbol,
    config.amount,
    config.limit_price,
    config.stop_price
  );

  //TODO: handle errors
  //TODO: add action to log file
  sll_order_id = result.id;
  console.log(result, sll_order_id);

  /* constructor(cronTime, onTick, onComplete, start, timezone, context, runOnInit, unrefTimeout) */
  runAlgorithm();
  var cron = new cronJob(
    CRONJOB.TIME.EVERY_MINUTE,
    function() {
      //runAlgorithm();
    },
    null,
    true
  );
}

async function runAlgorithm() {
  var price = await binance.price(config.symbol);
  console.log("price", price.last);

  //TODO: If already exists??
}

start();
//Example: node app.js --config=./testOrder1.json

/**
 * TODO
 * - Validate data from json
 * - Error handling if endpoint responds differently
 */
