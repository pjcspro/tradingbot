const Databases = require("./database.js");
const ansi = require("ansicolor");
const fs = require("fs");
const asTable = require("as-table");
const log = require("ololog").configure({
  "render+"(text, { consoleMethod = "" }) {
    if (true /* consoleMethod === "error" */) {
      fs.appendFileSync("logs/script.log", "\n" + ansi.strip(text)); // strip ANSI styling codes from output
    }
    return text;
  },
  time: true
});
var db = new Databases();

async function test() {
  var json = {
    value: "cenas",
    array: [{ one: "two", three: 3, four: false }, { oh: "hum" }]
  };

  log("START LOGGING");
  log(
    asTable([
      ["Col1", "Col2", "Col3", "Col4"],
      [json.value, json.array[0].one, "Fixed", "Coisas"]
    ])
  );
  log.error("This is an error");
}

test();
