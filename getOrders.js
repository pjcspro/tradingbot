const Binance = require("./exchanges/binance.js");
const asTable = require("as-table");
const argv = require("yargs").argv;

global.DEBUG = true;

///////// VARS /////////
var binance = new Binance();

async function printRecentOrders(symbol, limit) {
  var results = await binance.orders(symbol, limit);
  var res = [
    [
      "",
      "order_id",
      "date",
      "type",
      "side",
      "price",
      "amount",
      "cost",
      "status"
    ]
  ];
  results.forEach(function(result) {
    res.push([
      result.symbol,
      result.id,
      result.datetime,
      result.type,
      result.side,
      result.price,
      result.amount,
      result.cost,
      result.status
    ]);
  });
  console.log(asTable(res));
}

if (!argv.symbol) {
  console.log("symbol not set");
  return;
}

var maxOrders = 5;
if (argv.max) {
  maxOrders = parseInt(argv.max);
}

printRecentOrders(argv.symbol, maxOrders);

//EXAMPLE: node getOrders.js --symbol=ETH/USDT --max=1
