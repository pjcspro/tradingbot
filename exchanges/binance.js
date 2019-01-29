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

  async orders_open(symbol) {
    if (!exchange.has["fetchOpenOrders"]) return;

    var result = await exchange.fetchOpenOrders(symbol);
    return result;
  }

  async orders(_symbol, _limit) {
    if (!exchange.has["fetchOrders"]) return;

    var result = await exchange.fetchOrders(_symbol, undefined, _limit);
    return result;
  }
};
