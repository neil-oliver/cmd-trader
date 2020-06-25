const fs = require('fs');
const config = require('../config');
const helpers = require('./helpers');
const Binance = require('node-binance-api');
const {Account, Pair, Ticker} = require('./classes');
const inquirer  = require('./inquirer');
const arbitrage = require('./arbitrage')
const jumper  = require('../testing/jumper.js');

//for cli output
const CLI = require('clui');
const { intervalSelect } = require('./inquirer');
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
    } else if (answers.main == "Highest Performing Coin"){
      this.intervalSelect()
    } else if (answers.main == "Arbitrage"){
      arbitrage.outputResults(this.accounts,"USDT")
      if (config.repeatMenu) this.mainMenu()
    } else if (answers.main == "Live Updates"){
      //allow to cancel the live stream
      // process.stdin.on('keypress', (str, key) => {
      //   if (key.ctrl && key.name === 'c') {
      //     process.exit();
      //   } else if (key.name == 'escape'){
      //     console.log('menu escape')
      //     jumper.terminate()
      //     if (config.repeatMenu) this.mainMenu()
      //   }
      // });

      jumper.updater(this.accounts)

    } else if (answers.main == "Backtest"){
      this.backfill()
      this.mainMenu()
    } else if (answers.main == "Test"){
      const res = await inquirer.cancelContinue('This selection is only used for developer testing. Would you like to continue?');
      if (res.cancel == "Yes"){
        this.test()
      }
      this.mainMenu()
    } else if (answers.main == "Exit"){
      const res = await inquirer.cancelContinue('Would you like to save any updates before existing?');
      if (res.cancel == "Yes"){
        fs.writeFileSync('./data.json',JSON.stringify(this.accounts))
      }
      process.exit()
    }
  },
  async intervalSelect(){
    const answers = await inquirer.intervalSelect();
    console.log(answers)
    if (answers.interval.length > 0){
      this.recommendation(answers.interval)
    } else {
      const res = await inquirer.cancelContinue('You did not select any intervals. Would you like to return to the main menu?');
      if (res.cancel == "Yes"){
        this.mainMenu()
      } else {
        this.intervalSelect()
      }
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
    // if (config.saveType == 'db') mongo.setup()

    // get exchange info
    status.message('Getting Exchange Info...');

    let info = await binance.exchangeInfo()

    for (let exchange of config.exchanges){

      this.accounts[exchange] = new Account(exchange)
      this.accounts[exchange].updated.start = new Date()

      for (let pair of info.symbols){
        let quoteCheck = true
        if (config.onlyPreferredQuote){
          quoteCheck = pair.quoteAsset == config.preferredQuote
        }
        if (pair.status == 'TRADING' && quoteCheck && !config.exclusionList.includes(pair.baseAsset)) this.accounts[exchange].pair = {base: pair.baseAsset, quote: pair.quoteAsset}
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
    //check exclusion list
    if(config.updateExclusions){
      for (let exchange in this.accounts){
        for (let pair in this.accounts[exchange].pairs){
          if (config.exclusionList.includes(pair)){
            delete this.accounts[exchange].pairs[pair]
          }
        }
      }
    }
    //update tickers
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

  async updateAllTickers(backfill){
    backfill = backfill || false
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
            await this.getLatestTicker(pair,interval,backfill)
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
  recommendation(interval){
    for(let exchange of config.exchanges){
      console.log(this.accounts[exchange].recommendation(interval))
    }
    if (config.repeatMenu) this.mainMenu()
  },

  getLatestTicker(pair, interval,backfill){
    let limit = backfill ? 500 : 2
    interval = interval || '1m'
    if (pair){
      return new Promise(resolve => {
        binance.candlesticks(pair, interval, (error, ticks, symbol) => {
          if(error) console.log(error)
          for (i in ticks){
            let [time, open, high, low, close, volume, closeTime, assetVolume, trades, buyBaseVolume, buyAssetVolume, ignored] = ticks[i];
            let obj = {time, open, high, low, close, volume, closeTime, assetVolume, trades, buyBaseVolume, buyAssetVolume, ignored}
            obj.sellBaseVolume = parseFloat(obj.volume) - parseFloat(obj.buyBaseVolume)
            obj.buySellRatio = obj.buyBaseVolume / obj.sellBaseVolume
            obj.priceChange = i == 0 ? 0 : obj.close - ticks[i-1][4] // close from previous tick
            obj.priceChangePercent = i == 0 ? 0 : (obj.close - ticks[i-1][4]) /  ticks[i-1][4] * 100
            this.accounts.Binance.pairs[pair].ticker = [interval,obj]
          }
          resolve();
        }, {limit: limit});
      });
    }
  },
  backfill(){
    console.log('Backtesting is currently in development, but for now we can collect the data.')
    this.updateAllTickers(true)
  },
  async test(){
    let info = await binance.exchangeInfo()
    for (let coin of info.symbols){
      if(coin.baseAsset == "ARDR"){
        console.log(coin)
      }
    }
  }
}


