var Databases = require("./database.js");
var db = new Databases();

async function test() {
  var result = await db.getOrders_sync();
  //var result = await db.newOrder_sync("new oerder id", "new order status");
  console.log(result);
}

test();
