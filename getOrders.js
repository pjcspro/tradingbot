const Binance = require("./exchanges/binance.js");
const asTable = require("as-table");
const argv = require("yargs").argv;

///////// VARS /////////
var binance = new Binance();

async function printRecentOrders(symbol, limit) {
  var results = await binance.orders(symbol, limit);
  var res = [
    ["", "id", "date", "type", "side", "price", "amount", "cost", "status"]
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

if (!argv.pair) {
  console.log("PAIR not set");
  return;
}

var maxOrders = 5;
if (argv.max) {
  maxOrders = parseInt(argv.max);
}

printRecentOrders(argv.pair, maxOrders);
