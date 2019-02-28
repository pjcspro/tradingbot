const cronJob = require("cron").CronJob;
const Binance = require("./exchanges/binance.js");
const Kucoin = require("./exchanges/kucoin.js");
const argv = require("yargs").argv;
const asTable = require("as-table");
const Databases = require("./database.js");
const fs = require("fs");
const ansi = require("ansicolor");

global.DEBUG = true;

const log = require("ololog").configure({
  "render+"(text, { consoleMethod = "" }) {
    if (!global.DEBUG) {
      fs.appendFileSync("logs/script.log", "\n" + ansi.strip(text));
    }
    return text;
  },
  time: true
});

const log_order = require("ololog").configure({
  "render+"(text, { consoleMethod = "" }) {
    if (!global.DEBUG) {
      fs.appendFileSync("logs/orders.log", "\n" + ansi.strip(text));
    }
    return text;
  },
  time: true
});

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
  BUY_WITH_TRAILING: "Buy with trailing",
  SELL_WITH_TRAILING_RE: "Sell with trailing Reinvest",
  BUY_WITH_TRAILING_RE: "Buy with trailing Reinvest"
};

///////// VARS /////////
const db = new Databases();
const binance = new Binance();
const kucoin = new Kucoin();

///////// METHODS /////////
async function startPeriodicRun() {
  log("\nCALLED startPeriodicRun()");
  log_order("START " + (global.DEBUG ? "IN DEBUG" : "IN PRODUCTION"));

  run();
  var cron = new cronJob(
    CRONJOB.TIME.EVERY_5_MINUTES,
    function() {
      run();
    },
    null,
    true
  );
}

async function run() {
  log("\nCALLED run()");

  var orders = await db.getOrders_sync();
  orders.forEach(order => {
    //status
    if (STATUS.PAUSED == order.status || STATUS.FINISHED == order.status) {
      //FINISHED
      console.log("Item _id=" + order._id + " is " + order.status);
    } else {
      //ONGOING
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
    }
  });
}

async function runAlgorithm_BUY_WITH_TRAILING(order) {
  log("\nCALLED runAlgorithm_BUY_WITH_TRAILING(*)", order);

  //TODO: Maybe only update if diff threshold.. how to know this threshold
  var price = await exchangeFor(order).price(order.symbol);
  var price_last = price.last;

  var buy_price = price_last + order.params.trigger_distance;

  log(asTable([["price_last", "buy_price"], [price_last, buy_price]]));

  var current_buy_price = order.params.current_buy_price;
  if (current_buy_price && price_last > current_buy_price) {
    var limit_price = price_last - order.params.limit_price_distance;
    if (limit_price < order.params.max_buy_price) {
      log("\n======== CREATING ORDER ======== ");
      log(
        asTable([
          ["symbol", "amount", "limit_price"],
          [order.symbol, order.amount, limit_price]
        ])
      );

      if (!global.DEBUG) {
        var result = await exchangeFor(order).createOrderBuyLimit(
          order.symbol,
          order.amount,
          limit_price
        );

        //TODO: handle errors
        //TODO: add action to log file

        log_order(
          asTable([
            ["action", "symbol", "amount", "limit_price", "order_id"],
            ["BUY LIMIT", order.symbol, order.amount, limit_price, result.id]
          ])
        );
        log(result);

        log("\n======== ORDER FINISHED ======== ");
        order.status = STATUS.FINISHED;
      }
    } else {
      log("Warning: Buy price is above max_buy_price. Nothing done");
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

  log("\n======== UPDATING LOCAL ORDER ======== ");
  var result = await db.updateOrder_sync(order._id, order);
  log(order);
}

async function runAlgorithm_SELL_WITH_TRAILING(order) {
  log("\nCALLED runAlgorithm_SELL_WITH_TRAILING(*)", order);

  //TODO: Maybe only update if diff threshold.. how to know this threshold
  var price = await exchangeFor(order).price(order.symbol);
  var price_last = price.last;

  var stop_price = price_last - order.params.trigger_distance;
  var limit_price = stop_price + order.params.limit_price_distance;

  var current_stop_price = order.params.current_stop_price;
  var exchange_stop_orderid = order.params.exchange_stop_orderid;

  log(
    asTable([
      [
        "price_last",
        "stop_price",
        "limit_price",
        "current_stop_price",
        "exchange_stop_orderid"
      ],
      [
        price_last,
        stop_price,
        limit_price,
        current_stop_price,
        exchange_stop_orderid
      ]
    ])
  );

  if (current_stop_price && price_last <= current_stop_price) {
    //CHECK IF ORDER STILL OPENED BY CALLING ENDPOINT?
    //TODO: This

    log("\n======== ORDER FINISHED ======== ");
    order.status = STATUS.FINISHED;
  } else if (!current_stop_price || stop_price > current_stop_price) {
    //TODO: + threshold?? how know threshold?
    //MOVE STOP LOSS ABOVE

    order.params.current_stop_price = stop_price;

    if (exchange_stop_orderid) {
      log("\n======== CANCELLING ORDER ======== ");

      if (!global.DEBUG) {
        var result = await exchangeFor(order).cancelOrder(
          exchange_stop_orderid,
          order.symbol
        );
        log(result);
      }

      log_order(
        asTable([
          ["action", "symbol", "order_id"],
          ["CANCEL", order.symbol, exchange_stop_orderid]
        ])
      );
    }

    if (limit_price >= order.params.min_sell_price) {
      log("\n======== CREATING ORDER ======== ");
      log(
        asTable([
          ["symbol", "amount", "limit_price", "stop_price"],
          [order.symbol, order.amount, limit_price, stop_price]
        ])
      );

      if (!global.DEBUG) {
        var result = await exchangeFor(order).createOrderStopLimit(
          order.symbol,
          order.amount,
          limit_price,
          stop_price
        );

        //TODO: handle errors
        //TODO: add action to log file
        order.params.exchange_stop_orderid = result.id;
        log_order(
          asTable([
            [
              "action",
              "symbol",
              "amount",
              "limit_price",
              "stop_price",
              "order_id"
            ],
            [
              "STOP LIMIT",
              order.symbol,
              order.amount,
              limit_price,
              stop_price,
              result.id
            ]
          ])
        );

        log(result);
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

  log("\n======== UPDATING LOCAL ORDER ======== ");
  var result = await db.updateOrder_sync(order._id, order);
  log(order);

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
  log("\nCALLED reinvest(*, " + current_price + ")", order);

  switch (order.algorithm) {
    case ALGORITHMS.SELL_WITH_TRAILING_RE:
      order.algorithm = ALGORITHMS.BUY_WITH_TRAILING_RE;
      order.status = STATUS.PENDING;
      order.params.trigger_distance =
        current_price - current_price * (order.buyback_percentage / 100.0);
      order.params.max_buy_price =
        current_price -
        current_price * ((order.buyback_percentage - 1) / 100.0); //TODO: Better way to choose this
      order.params.min_sell_price = undefined;
      break;
    case ALGORITHMS.BUY_WITH_TRAILING_RE:
      order.algorithm = ALGORITHMS.SELL_WITH_TRAILING;
      order.status = STATUS.PENDING;
      order.params.trigger_distance =
        current_price + current_price * (order.buyback_percentage / 100.0);
      order.params.max_buy_price = undefined;
      order.params.min_sell_price =
        current_price +
        current_price * ((order.buyback_percentage - 1) / 100.0); //TODO: Better way to choose this
      break;
  }

  log("\n======== UPDATING LOCAL ORDER ======== ");
  var result = await db.updateOrder_sync(order._id, order);
  log(order);
}

function exchangeFor(order) {
  if (order.exchange) {
    switch (order.exchange) {
      case "kucoin":
        return kucoin;
    }
  }

  return binance;
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
