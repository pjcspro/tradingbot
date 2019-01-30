const cronJob = require("cron").CronJob;
const Binance = require("./exchanges/binance.js");
const argv = require("yargs").argv;
const asTable = require("as-table");

var DEBUG = true;

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

console.log("\n======== CONFIGS ======== ");
console.log(
  asTable([
    ["symbol", "amount", "trigger_distance", "limit_price_distance"],
    [
      config.symbol,
      config.amount,
      config.trigger_distance,
      config.limit_price_distance
    ]
  ])
);

///////// METHODS /////////
async function start() {
  var price = await binance.price(config.symbol);
  var price_last = price.last;

  var stop_price = price_last - config.trigger_distance;
  var limit_price = stop_price + config.limit_price_distance;

  console.log("\n======== CREATING ORDER ======== ");
  console.log(
    asTable([
      ["symbol", "amount", "limit_price", "stop_price"],
      [config.symbol, config.amount, limit_price, stop_price]
    ])
  );

  var result = await binance.createOrderStopLimit(
    config.symbol,
    config.amount,
    limit_price,
    stop_price
  );

  //TODO: handle errors
  //TODO: add action to log file
  sll_order_id = result.id;
  //console.log(result, sll_order_id);

  /* constructor(cronTime, onTick, onComplete, start, timezone, context, runOnInit, unrefTimeout) */
  var cron = new cronJob(
    CRONJOB.TIME.EVERY_MINUTE,
    function() {
      runAlgorithm();
    },
    null,
    true
  );
}

async function runAlgorithm() {
  var price = await binance.price(config.symbol);
  console.log("price", price.last);

  console.log("\n======== CANCELLING ORDER ======== ");
  var result = await binance.cancelOrder(sll_order_id, config.symbol);
  console.log(result);

  //TODO: create new order with updated price
  //TODO: Maybe only update if diff threshold
}

start();
//Example: node app.js --config=./testOrder1.json

/**
 * TODO
 * - Validate data from json
 * - Error handling if endpoint responds differently
 */
