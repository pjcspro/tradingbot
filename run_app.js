const cronJob = require("cron").CronJob;
const Binance = require("./exchanges/binance.js");
const argv = require("yargs").argv;
const asTable = require("as-table");
const Databases = require("./database.js");

global.DEBUG = true;

/////// CONSTANTS /////////

const buyback_percentage = 5.0;

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
  BUY_WITH_TRAILING: "Buy with trailing",
  SELL_WITH_TRAILING_RE: "Sell with trailing Reinvest",
  BUY_WITH_TRAILING_RE: "Buy with trailing Reinvest"
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
    if (STATUS.PAUSED == order.status || STATUS.FINISHED == order.status) {
      console.log("Item _id=" + order._id + " is " + order.status);
    }

    //Algorithms
    console.log(order.algorithm);
    switch (order.algorithm) {
      case ALGORITHMS.SELL_WITH_TRAILING:
      case ALGORITHMS.SELL_WITH_TRAILING_RE:
        runAlgorithm_SELL_WITH_TRAILING(order);
        break;
      case ALGORITHMS.BUY_WITH_TRAILING:
      case ALGORITHMS.BUY_WITH_TRAILING_RE:
        runAlgorithm_BUY_WITH_TRAILING(order);
        break;
    }
  });
}

async function runAlgorithm_BUY_WITH_TRAILING(order) {
  console.log("runAlgorithm_BUY_WITH_TRAILING", order);

  //TODO: Maybe only update if diff threshold.. how to know this threshold
  var price = await binance.price(order.symbol);
  var price_last = price.last;

  var buy_price = price_last + order.params.trigger_distance;
  var limit_price = buy_price - order.params.limit_price_distance;

  var current_buy_price = order.params.current_buy_price;
  if (current_buy_price && price_last > current_buy_price) {
    if (limit_price < order.params.max_buy_price) {
      console.log("\n======== CREATING ORDER ======== ");
      console.log(
        asTable([
          ["symbol", "amount", "limit_price"],
          [order.symbol, order.amount, limit_price]
        ])
      );

      if (!global.DEBUG) {
        var result = await binance.createBuyLimit(
          order.symbol,
          order.amount,
          limit_price
        );

        //TODO: handle errors
        //TODO: add action to log file
        console.log(result);

        console.log("\n======== ORDER FINISHED ======== ");
        order.status = STATUS.FINISHED;
      }
    } else {
      console.log("Buy price is above max_buy_price");
    }
  } else if (!current_buy_price || buy_price < current_buy_price) {
    //MOVE BUY PRICE BELLOW
    order.params.current_buy_price = buy_price;
  } else {
    console.log(
      "Nothing changed",
      "price",
      price_last,
      "last buy price",
      current_buy_price,
      "new buy price",
      buy_price
    );
  }

  console.log("\n======== UPDATING LOCAL ORDER ======== ");
  var result = await db.updateOrder_sync(order._id, order);
  console.log(order);
}

async function runAlgorithm_SELL_WITH_TRAILING(order) {
  console.log("runAlgorithm_SELL_WITH_TRAILING", order);

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

  if (
    order.status == STATUS.FINISHED &&
    (order.algorithm == ALGORITHMS.BUY_WITH_TRAILING_RE ||
      order.algorithm == ALGORITHMS.SELL_WITH_TRAILING_RE)
  ) {
    reinvest(order, price_last);
  }
}

/**
 * TODO: Progressive buying?
 */
async function reinvest(order, current_price) {
  switch (order.algorithm) {
    case ALGORITHMS.SELL_WITH_TRAILING_RE:
      order.algorithm = ALGORITHMS.BUY_WITH_TRAILING_RE;
      order.status = STATUS.PENDING;
      order.params.trigger_distance =
        current_price - current_price * (buyback_percentage / 100.0);
      order.params.max_buy_price =
        current_price - current_price * ((buyback_percentage - 1) / 100.0); //TODO: Better way to choose this
      order.params.min_sell_price = undefined;
      break;
    case ALGORITHMS.BUY_WITH_TRAILING_RE:
      order.algorithm = ALGORITHMS.SELL_WITH_TRAILING;
      order.status = STATUS.PENDING;
      order.params.trigger_distance =
        current_price + current_price * (buyback_percentage / 100.0);
      order.params.max_buy_price = undefined;
      order.params.min_sell_price =
        current_price + current_price * ((buyback_percentage - 1) / 100.0); //TODO: Better way to choose this
      break;
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
