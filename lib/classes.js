const Binance = require('node-binance-api');
const binance = new Binance()
const helpers = require('./helpers');
const config = require('../config');
const v = helpers.v

//Exchange account
class Account {
  constructor(exchange, pairs={}) {
      this.name = exchange;
      this.updated = {start:new Date(), end:new Date()}
      this._pairs = {}
      this.pairs = pairs
  }
  rank(ticker){
    // item to rank
    v(`ranking ${ticker} ticker`)
    for (let pair in this.pairs){
      // add rank object if it does not exist
      if (!this.pairs[pair].hasOwnProperty('rank')){
        this.pairs[pair].rank = {}
      }
      //check pair has ticker
      if(ticker && this.pairs[pair].tickers.hasOwnProperty(ticker)){
        this.pairs[pair].rank[ticker] = {}
        v(`ranking ${pair}`)
        for(let el of config.rankings){
          v(`calculating ${el} rank`)
          // check rank item is available on ticker
          if (this.pairs[pair].tickers[ticker].latest.hasOwnProperty(el)){
            // sort items
            let sorted = Object.values(this.pairs)
              .sort((a, b) => (parseFloat(a.tickers[ticker].latest[el]) > parseFloat(b.tickers[ticker].latest[el])) ? -1 : 1)
            // assign index+1 as rank 
            this.pairs[pair].rank[ticker][el] = sorted.indexOf(this.pairs[pair])+1
          }
        }
      }
    }
  }

  set pairs(data){
    for (let pair in data){
      this._pairs[pair] = data[pair]._tickers ? new Pair(data[pair].base, data[pair].quote, data[pair]._tickers) : new Pair(data[pair].base, data[pair].quote)
    }
  }

  set pair(data){
    this._pairs[data.base + data.quote] = data._tickers ? new Pair(data.base, data.quote, data._tickers) : new Pair(data.base, data.quote)
  }

  get pairs(){
    return this._pairs
  }
}

class Pair{
  constructor(base,quote,tickers={}){
    this.base = base;
    this.quote = quote;
    this.updated = {start:new Date(), end:new Date()};
    this._tickers = {};
    this.tickers = tickers;
  }

  //create ticker object from contructor single or array of tickers
  set tickers(data){
    for (let ticker in data){
      this._tickers[ticker] = new Ticker(data[ticker]._ticks)
    }
  }

  set ticker(data){
    this._tickers[data[0]] = new Ticker(data[1])
  }

  get tickers(){
    return this._tickers
  }
}

class Ticker{
  constructor(data){
    this._ticks = [];
    this.ticks = data
    this.updated = {start:new Date(), end:new Date()}
  }

  get latest(){
    if (this._ticks.length == 0){
      return []
    } else {
      return this._ticks[this._ticks.length -1]
    }
  }

  set ticks(data){
    if (Array.isArray(data)){
      this._ticks = data
    } else {
      this._ticks.push(data)
    }
  }

  set update(data){
    if (Array.isArray(data)){
      this._ticks.concat(data)
    } else {
      this._ticks.push(data)
    }
  }

  get ticks(){
    return this._ticks
  }
}

module.exports = {Account, Pair, Ticker}