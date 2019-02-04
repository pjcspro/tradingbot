const Databases = require("./database.js");
const argv = require("yargs").argv;
const db = new Databases();

if (!argv.config) {
  console.log("Configuration file not set");
  return;
}
const config = require(argv.config);
//console.log(config);

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
