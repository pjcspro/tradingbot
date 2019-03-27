const Datastore = require("nedb");
const util = require("util");
var db = {};

module.exports = class Databases {
  constructor() {
    db.orders = new Datastore({
      filename: "./databases/orders.db",
      autoload: true
    });
  }

  //ORDERS | CALLBACKS
  newOrder(_json, _callback) {
    db.orders.insert([_json], _callback);
  }

  getOrders(_callback) {
    db.orders.find({}, _callback);
  }

  updateOrder(_dbid, _json, _callback) {
    db.orders.update({ _id: _dbid }, _json, {}, _callback);
  }

  clearOrders(_callback) {
    db.orders.remove({}, { multi: true }, _callback);
  }

  delete(objid, _callback) {
    db.orders.remove({ _id: objid }, { multi: false }, _callback);
  }

  //ORDERS | AWAIT
  async getOrders_sync() {
    return await util.promisify(this.getOrders)();
  }

  async newOrder_sync(_orderid, _status) {
    return await util.promisify(this.newOrder)(_orderid, _status);
  }

  async updateOrder_sync(_dbid, _json) {
    return await util.promisify(this.updateOrder)(_dbid, _json);
  }

  async clearOrders_sync() {
    return await util.promisify(this.clearOrders)();
  }
};
