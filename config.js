module.exports = {
  verbose:false,
  intervals:['1m','5m','15m','30m','1h','6h','12h','1d','1w'],
  rankings:['priceChange','priceChangePercent','buySellRatio','volume','trades'],
  exchanges: ["Binance"],
  exclusionList:['BCHSVUSDT'], // add any symbols of pairs that should not be included.
  updateExclusions:true, // recheck and remove items in the exclusion list on update
  preferredQuote: "USDT",
  saveType: "file", // file or db
  repeatMenu: true,
}
