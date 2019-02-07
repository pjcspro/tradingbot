const Binance = require("./exchanges/binance.js");
const argv = require("yargs").argv;
const asTable = require("as-table");
const log = require("ololog");
const cronJob = require("cron").CronJob;

global.DEBUG = true;

const ACTION = {
  BUY: "buy",
  SELL: "sell"
};

//TODO: Add to orders log
var order_id; //TODO: Save this on a DB to avoid duplicated orders on restart
var last_bid;

const binance = new Binance();
async function run() {
  var price = await binance.price(argv.symbol);
  var price_last = price.last;

  var book = await binance.orderBook(argv.symbol, 5);
  console.log(book);

  switch (argv.action) {
    case ACTION.BUY:
      var best_bid = book.bids[0][0];

      if (order_id) {
        if (last_bid == best_bid) {
          return; // all is good
        }

        log("\n======== CANCELLING ORDER ======== ");
        if (!global.DEBUG) {
          var result = await binance.cancelOrder(order_id, argv.symbol);
          log(result);
        }
      }

      console.log(argv.symbol, argv.amount, best_bid);
      if (!global.DEBUG) {
        var result = await binance.createOrderBuyLimit(
          argv.symbol,
          argv.amount,
          best_bid
        );
        //TODO: best_bid+a bit?

        //TODO: handle errors
        log(result);
        log("\n======== ORDER FINISHED ======== ");
      }

      break;
    case ACTION.SELL:
      var best_sell = book.asks[0][0];
      //TODO: Book sell
      log("Feature to be implemented");
      break;
  }
}

async function startPeriodicRun() {
  log("\nCALLED startPeriodicRun()");

  run();
  var cron = new cronJob(
    "* * * * *", //every minute
    function() {
      run();
    },
    null,
    true
  );
}

//TODO: add distance and
//node run_book_buy.js --symbol=ETH/BTC --action=buy --amount=0.01
