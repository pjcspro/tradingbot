const cronJob = require("cron").CronJob;
const Binance = require("./exchanges/binance.js");
const argv = require("yargs").argv;
const asTable = require("as-table");

global.DEBUG = true;

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
var sll_stop_price;

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
  runAlgorithm();
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
  //TODO: Maybe only update if diff threshold
  var price = await binance.price(config.symbol);
  var price_last = price.last;

  var stop_price = price_last - config.trigger_distance;
  var limit_price = stop_price + config.limit_price_distance;

  if (price_last <= sll_stop_price) {
    //CHECK IF ORDER STILL OPENED
    //TODO: This
  }

  //TODO: sll_stop_price + threshold?? how know threshold?
  if (stop_price > sll_stop_price) {
    //MOVE STOP LOSS ABOVE

    sll_stop_price = stop_price;
    console.log("\n======== CANCELLING ORDER ======== ");
    if (!global.DEBUG) {
      if (sll_order_id) {
        var result = await binance.cancelOrder(sll_order_id, config.symbol);
        console.log(result);
      }
    }

    console.log("\n======== CREATING ORDER ======== ");
    console.log(
      asTable([
        ["symbol", "amount", "limit_price", "stop_price"],
        [config.symbol, config.amount, limit_price, stop_price]
      ])
    );

    if (!global.DEBUG) {
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
    }
  }
}

start();

//Example: node app.js --config=./testOrder1.json

/**
 * TODO
 * - Validate data from json
 * - Error handling if endpoint responds differently
 */
