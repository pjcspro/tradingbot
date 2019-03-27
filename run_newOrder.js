const Databases = require("./database.js");
const argv = require("yargs").argv;
const db = new Databases();

const delete_id = argv.delete_id;
if (delete_id) {
  db.delete(delete_id, function(err, numUpdated) {
    if (err) {
      console.log("Error: ", err);
    } else {
      console.log("Deleted ", numUpdated);
    }
  });

  return;
}

if (!argv.config) {
  console.log("Configuration file not set");
  db.getOrders(function(err, result) {
    console.log(err, result);
  });

  return;
}

const config = require(argv.config);

if (config._id) {
  db.updateOrder(config._id, config, function(err, numUpdated) {
    if (err) {
      console.log("Error: ", err);
    } else {
      console.log("Updated ", numUpdated);
    }
  });
} else {
  db.newOrder(config, function(err, data) {
    if (err) {
      console.log("Error: ", err);
    } else {
      console.log("New Entry:", data);
    }
  });
}

//node run_newOrder.js --config ./data_placeholder.json
//node run_newOrder.js --delete_id="hSqamm4mDzH5TzsD"
