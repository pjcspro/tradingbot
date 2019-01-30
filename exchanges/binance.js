const ccxt = require("ccxt");
const settings = require("./settings.json").binance;

const exchangeId = "binance",
  exchangeClass = ccxt[exchangeId],
  exchange = new exchangeClass({
    apiKey: settings.apiKey,
    secret: settings.secret,
    timeout: 30000,
    enableRateLimit: true
  });

module.exports = class Binance {
  constructor() {}

  /*    
  Returns the balance of a specific symbol
  Example return: { free: 0.0465583, used: 0, total: 0.0465583 }
  */
  async balance(symbol) {
    var result = await exchange.fetchBalance();
    return result[symbol];
  }

  async price(symbol) {
    if (!exchange.has["fetchOrders"]) return;

    var result = await exchange.fetchTicker(symbol);
    return result;
  }

  async orders_open(symbol) {
    if (!exchange.has["fetchOpenOrders"]) return;

    var result = await exchange.fetchOpenOrders(symbol);
    return result;
  }

  async orders(symbol, limit) {
    if (!exchange.has["fetchOrders"]) return;

    var result = await exchange.fetchOrders(symbol, undefined, limit);
    return result;
  }

  async order(orderid, symbol) {
    if (!exchange.has["fetchOrder"]) return;

    var result = await exchange.fetchOrder(orderid, symbol);
    return result;
  }

  async cancelOrder(orderid, symbol) {
    if (!exchange.has["cancelOrder"]) return;

    var result = await exchange.cancelOrder(orderid, symbol);
    return result;
  }

  async createOrderStopLimit(symbol, amount, limit_price, stop_price) {
    if (!exchange.has["createOrder"]) return;

    var result = await exchange.createOrder(
      symbol,
      "limit",
      "sell",
      amount,
      limit_price,
      {
        type: "STOP_LOSS_LIMIT",
        timeInForce: "GTC",
        stopPrice: stop_price
      }
    );
    return result;
  }
};
