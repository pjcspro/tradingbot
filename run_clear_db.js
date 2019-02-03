const Databases = require("./database.js");
const db = new Databases();

db.clearOrders(function(err, numRemoved) {
  console.log("Removed:", numRemoved, "Error: ", err);
});

//node run_clear_db.js
