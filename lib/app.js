const fs = require('fs');
const config = require('../config');
const helpers = require('./helpers');
const Binance = require('node-binance-api');
const {Account, Pair, Ticker} = require('./classes');
const inquirer  = require('./inquirer');

const CLI = require('clui');
const Spinner = CLI.Spinner;

const v = helpers.v

const binance = new Binance()

module.exports = {
  accounts:{},
  async mainMenu(){
    console.log('') //blank spacer before menu
    const answers = await inquirer.menu();
    if (answers.main == "Output Rankings"){
        this.printRanks()
    } else if (answers.main == "Update"){
        this.update()
    } else if (answers.main == "Exit"){
        process.exit()
    }
  },
  latestUpdate(){
    let updated = {start: new Date(), end: new Date()}
    for(let pair in this.accounts.pairs){
      if (new Date(this.accounts.pairs[pair].updated.start).getTime() < updated.start.getTime()){
        updated.start = new Date(this.accounts.pairs[pair].updated.start);
        updated.end = new Date(this.accounts.pairs[pair].updated.start);
      }
      if (new Date(this.accounts.pairs[pair].updated.end).getTime() > updated.end.getTime()){
        updated.end = new Date(this.accounts.pairs[pair].updated.end);
      }
    }
    return updated
  },
  async install(){
    const status = new Spinner('Initializing Trader...');

    status.start();

    //check and setup mongoDB
    if (config.saveType == 'db') mongo.setup()

    // get exchange info
    status.message('Getting Exchange Info...');

    let info = await binance.exchangeInfo()

    for (let exchange of config.exchanges){

      this.accounts[exchange] = new Account(exchange)
      this.accounts[exchange].updated.start = new Date()

      for (let pair of info.symbols){
        if (pair.quoteAsset == 'USDT') this.accounts[exchange].pair = {base: pair.baseAsset, quote: pair.quoteAsset}
      }
      this.accounts[exchange].updated.end = new Date()
    }

    status.message('Getting Tickers');

    await this.updateAllTickers()

    //save file
    v('saving file',true)
    fs.writeFileSync('./data.json',JSON.stringify(this.accounts))
    status.stop();
    if (config.repeatMenu) this.mainMenu()
  },

  async update(){
    await this.updateAllTickers()
    if (config.repeatMenu) this.mainMenu()    
  },

  async init(){
    const status = new Spinner('Loading Saved Data...');
    status.start();
    let data = JSON.parse(fs.readFileSync('./data.json'))
    //fix reloading from save
    for (let i in data){
      let name = data[i].name, 
      pairs = data[i]._pairs

      this.accounts[data[i].name] = new Account(name, pairs)
      this.updateRanks()
    }
    status.stop();

  },

  async updateAllTickers(){
    const status = new Spinner('Updating Tickers...');
    status.start();
    return new Promise(async resolve => {
      for (let exchange of config.exchanges){
        this.accounts[exchange].updated.start = new Date()
        status.message(`Updating ${this.accounts[exchange].name} exchange`);
        for (let pair in this.accounts.Binance.pairs){
          this.accounts[exchange].pairs[pair].updated.start = new Date()
          let pairList = Object.keys(this.accounts[exchange].pairs)
          status.message(`Updating Symbol ${pairList.indexOf(this.accounts[exchange].pairs[pair]+1)}/${pairList.length}: ${pair}`);
          for (let interval of config.intervals){
            status.message(`Updating Symbol ${pairList.indexOf(pair)+1}/${pairList.length}: ${pair} - Ticker ${config.intervals.indexOf(interval)+1}/${config.intervals.length}: ${interval}`);
            if (this.accounts[exchange].pairs[pair].tickers[interval]) this.accounts[exchange].pairs[pair].tickers[interval].updated.start = new Date()
            await this.getLatestTicker(pair,interval)
            if (this.accounts[exchange].pairs[pair].tickers[interval]) this.accounts[exchange].pairs[pair].tickers[interval].updated.end = new Date()
            v('updated latest ticker for ' + pair)
          }
          this.accounts[exchange].pairs[pair].updated.end = new Date()
        }
        this.accounts[exchange].updated.end = new Date()
      }
      status.message(`Updating Ranks`);
      this.updateRanks()
      status.message(`Saving Updates`);
      fs.writeFileSync('./data.json',JSON.stringify(this.accounts))
      status.stop();
      resolve()
    })
  },

  updateRanks(){
    for (let exchange of config.exchanges){
      for (let interval of config.intervals){
        this.accounts[exchange].rank(interval)
      }
    }
  },

  printRanks(){
    console.log('-- Graph Columns --')
    for (let interval in config.intervals){
      for (let rank in config.rankings){
        let num = parseInt(interval)+parseInt(rank)+1
        console.log(`${num}. ${config.intervals[interval]}-${config.rankings[rank]}`);
      }
    }

    var line = new CLI.Line()
      .padding(2)
      .column('Symbol', 15)
      .column('graph', 15)
      .column('Highest Rank', 15)
      .column('Lowest Rank', 15)
      .fill()
      .output();

    for (let exchange of config.exchanges){
      for (let pair in this.accounts[exchange].pairs){
        let allRanks = this.accounts[exchange].pairs[pair].rank
        allRanks = Object.values(allRanks).map(d => Object.values(d))
        var Sparkline = CLI.Sparkline;        
        console.log(pair + " " + Sparkline(allRanks.flat(), `/${Object.keys(this.accounts[exchange].pairs).length}`));
      }
    }
    if (config.repeatMenu) this.mainMenu()
  },

  getLatestTicker(pair, interval){
    interval = interval || '1m'
    if (pair){
      return new Promise(resolve => {
        binance.candlesticks(pair, interval, (error, ticks, symbol) => {
          if(ticks.length > 1){
            let last_tick = ticks[ticks.length - 1];
            let [time, open, high, low, close, volume, closeTime, assetVolume, trades, buyBaseVolume, buyAssetVolume, ignored] = last_tick;
            let obj = {time, open, high, low, close, volume, closeTime, assetVolume, trades, buyBaseVolume, buyAssetVolume, ignored}
            obj.sellBaseVolume = parseFloat(obj.volume) - parseFloat(obj.buyBaseVolume)
            obj.priceChange = obj.close - ticks[ticks.length - 2][4] // close from previous tick
            obj.priceChangePercent = (obj.close - ticks[ticks.length - 2][4]) /  ticks[ticks.length - 2][4] * 100
            this.accounts.Binance.pairs[pair].ticker = [interval,obj]
          } else {
            v(`error getting ${pair} for ${interval} interval`)
          }
          resolve();
        }, {limit: 2});
      });
    }
  }
}


