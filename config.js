module.exports = {
  verbose:false,
  intervals:['1m','5m','1h','12h'], //['1m','5m','15m','30m','1h','6h','12h','1d','1w']
  rankings:['priceChange','priceChangePercent','buySellRatio','volume','trades'],
  exchanges: ["Binance"],
  exclusionList:['BCHSVUSDT'], // add any symbols of pairs that should not be included.
  updateExclusions:true, // recheck and remove items in the exclusion list on update
  preferredQuote: "USDT",
  onlyPreferredQuote:true,
  arbitrageTrusted:["BTC","USDT","ETH","LTC","XRP","BCH","NANO","XLM", "GDP"],
  arbitrageTrustedOnly:false,
  saveType: "file", // file or db
  repeatMenu: true,
  fees:{ // not available through API
    Binance:{
      maker: 0.001,
      taker: 0.001
    }
  },
  hot:5 // 24 'high' hour percentage 

}
