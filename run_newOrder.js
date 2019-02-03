const Databases = require("./database.js");
const argv = require("yargs").argv;
const db = new Databases();

if (!argv.config) {
  console.log("Configuration file not set");
  return;
}
const config = require(argv.config);
console.log(config);

db.newOrder(config, function(err, data) {
  if (err) {
    console.log("Error: ", err);
  } else {
    console.log("Data:", data);
  }
});

//node run_newOrder.js --config ./data_placeholder.json
