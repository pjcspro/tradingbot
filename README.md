**Disclaimer**: This code is still under development, it is not ready for production! **Do not use it with real money**. This bot may contain bugs, be unpredictable or counterintuitive to use. Whatever you decide to do with it, use it at your own risk.

# Trading Bot

The goal of this bot is to be a modular system where a) multiple scripts can be easily plugged b) new exchanges can be easily supported and c) all the combinations tested.


# Setup

I am running this bot on a Raspberry Pi, so it can run 24/7. 

1) Install NodeJS and NPM
2) add a file named **settings.json** inside the **exchanges** folder with the following format:

```
{
  "binance": {
    "apiKey": "<binance_api>",
    "secret": "<binance_secret>"
  },
  "kucoin": {
    "apiKey": "<kucoin_api>",
    "secret": "<kucoin_secret>",
    "password": "<kucoin_password>"
  }
}

```
3) On each exchange create an API key and replace on the settings file. 
Note: For the bot to work we the API key requires access to trade (place & cancel orders). 
In the current implementation this information is stored unprotected in the settings.json file, so make sure you use it with a test account to avoid unauthorized access to them.

# Run

The bot does not decide what to do by himself. It merely automates your strategies. 

1) You should define your strategy in a json file, where the format can be based on the examples provided together with the code.
2) Run `node run_newOrder.js --config ./strategy_1.json` to add the new strategy to the bot
3) Make sure you set `global.DEBUG = false;` on the *run_app.js* file, so it runs on **simulating mode**
In this mode the orders are logged but are are not really created on the exchanges
4) Run `node run_app.js` to start the script 

# Debug

The script details are logged to two files under the *logs* folder. 
In the **orders.log** file you see all the placed orders
In the **script.log** file you see all the messages logged from the script.

I suggest using tail to see these logs in real time `tail -f logs/orders.log` or `tail -f logs/script.log`

# Contribute 
As mentioned above this code is still under development and still requires a lot of work. If you are interested in contributing please have a look at the *Projects* and *Issues* tab.

