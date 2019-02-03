const cronJob = require("cron").CronJob;
const Binance = require("./exchanges/binance.js");
const argv = require("yargs").argv;
const asTable = require("as-table");
const Databases = require("./database.js");

global.DEBUG = false;

/////// CONSTANTS /////////
const CRONJOB = {
  TIME: {
    EVERY_SECOND: "* * * * * *",
    EVERY_MINUTE: "* * * * *",
    EVERY_5_MINUTES: "*/5 * * * *",
    EVERY_HOUR: "0 * * * *"
  }
};

const STATUS = {
  PAUSED: "paused",
  PENDING: "pending",
  FINISHED: "finished"
};

const ALGORITHMS = {
  SELL_WITH_TRAILING: "Sell with trailing",
  BUY_WITH_TRAILING: "Buy with trailing"
};
///////// VARS /////////
const db = new Databases();
const binance = new Binance();

///////// METHODS /////////
async function startPeriodicRun() {
  run();
  var cron = new cronJob(
    CRONJOB.TIME.EVERY_MINUTE,
    function() {
      run();
    },
    null,
    true
  );
}

async function run() {
  var orders = await db.getOrders_sync();
  orders.forEach(order => {
    //status
    if (STATUS.PAUSED == order.status) {
      console.log("Item _id=" + order._id + " is " + order.status);
    }

    //Algorithms
    console.log(order.algorithm);
    switch (order.algorithm) {
      case ALGORITHMS.SELL_WITH_TRAILING:
        runAlgorithm_SELL_WITH_TRAILING(order);
        break;
    }
  });
}

async function runAlgorithm_SELL_WITH_TRAILING(order) {
  console.log("runAlgorithm", order);

  //TODO: Maybe only update if diff threshold.. how to know this threshold
  var price = await binance.price(order.symbol);
  var price_last = price.last;

  var stop_price = price_last - order.params.trigger_distance;
  var limit_price = stop_price + order.params.limit_price_distance;

  var current_stop_price = order.params.current_stop_price;
  var exchange_stop_orderid = order.params.exchange_stop_orderid;

  console.log(
    "price",
    price_last,
    "old stop price",
    current_stop_price,
    "new stop price",
    stop_price
  );
  if (current_stop_price && price_last <= current_stop_price) {
    //CHECK IF ORDER STILL OPENED BY CALLING ENDPOINT?
    //TODO: This

    console.log("\n======== ORDER FINISHED ======== ");
    order.status = STATUS.FINISHED;
  } else if (!current_stop_price || stop_price > current_stop_price) {
    //TODO: + threshold?? how know threshold?
    //MOVE STOP LOSS ABOVE

    order.params.current_stop_price = stop_price;

    if (exchange_stop_orderid) {
      console.log("\n======== CANCELLING ORDER ======== ");
      if (!global.DEBUG) {
        var result = await binance.cancelOrder(
          exchange_stop_orderid,
          order.symbol
        );
        console.log(result);
      }
    }

    if (limit_price >= order.params.min_sell_price) {
      console.log("\n======== CREATING ORDER ======== ");
      console.log(
        asTable([
          ["symbol", "amount", "limit_price", "stop_price"],
          [order.symbol, order.amount, limit_price, stop_price]
        ])
      );

      if (!global.DEBUG) {
        var result = await binance.createOrderStopLimit(
          order.symbol,
          order.amount,
          limit_price,
          stop_price
        );

        //TODO: handle errors
        //TODO: add action to log file
        order.params.exchange_stop_orderid = result.id;
        console.log(result);
      }
    } else {
      console.log(
        "min_sell_price " +
          order.params.min_sell_price +
          " not reached yet. Current stop limit would be: " +
          stop_price
      );
    }
  }

  console.log("\n======== UPDATING LOCAL ORDER ======== ");
  var result = await db.updateOrder_sync(order._id, order);
  console.log(order);
}

startPeriodicRun();

//Example: node run_app.js

/**
 * TODO
 * - Validate data from json
 * - Error handling if endpoint responds differently
 * - Buy back option
 * - Automatic algorithms, buys low sells high
 */