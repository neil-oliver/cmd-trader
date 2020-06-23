const config = require('../config');

module.exports = {
    pairsGraph(accounts){
        let list = {}

        for (let exchange in accounts){
            list[exchange] = {}
            for(let i in accounts[exchange].pairs){
                let pair = accounts[exchange].pairs[i]
                let candle = pair.tickers['1m'].latest

                if (!list[exchange].hasOwnProperty(pair.base)){
                    list[exchange][pair.base] = []
                }
                list[exchange][pair.base].push({symbol: pair.quote, price: parseFloat(candle.close)})


                if (!list[exchange].hasOwnProperty(pair.quote)){
                    list[exchange][pair.quote] = []
                }
                list[exchange][pair.quote].push({symbol: pair.base, price: parseFloat(1 / candle.close)})
            }

        }
        return list
    },
    searchGraph(accounts){
        let untrusted = (symbol) => {
            if (config.arbitrageTrustedOnly == false){
                return false
            } else if (config.arbitrageTrusted.includes(symbol)){
                return false
            } else {
                return true
            }
        }
        let success = {}
        let graph = this.pairsGraph(accounts)
        // in each exchange
        for (let exchange in graph){
            success[exchange] = {}
            //loop through each coin
            for (let symbol in graph[exchange]){
                if (untrusted(symbol)) continue
                success[exchange][symbol] = []
                // loop the linked coins
                for (let pair of graph[exchange][symbol]){
                    // traverse to linked coin
                    if (untrusted(pair.symbol)) continue
                    for (let step of graph[exchange][pair.symbol]){
                        // check that link is not original coin
                        if (untrusted(step.symbol)) continue
                        if (step.symbol == symbol) continue
                        // traverse to the nezxt linked coin
                        for(let complete of graph[exchange][step.symbol]){
                            if (untrusted(complete.symbol)) continue
                            if (complete.symbol == symbol){
                                let difference = (pair.price * step.price) * complete.price
                                if (difference > 1) success[exchange][symbol].push({"starting symbol": symbol, "first exchange": pair, "second exchange": step, "final exchange": complete, variation: difference})
                                break
                            }
                        }
                    }
                }
                success[exchange][symbol] = success[exchange][symbol].sort((a, b) => (a.variation > b.variation) ? -1 : 1)
            }
        }
        return success
    },
    outputResults(accounts){
        let results = this.searchGraph(accounts)
        console.log("\nCircular exchanging resulting in profit")
        
        for(let exchange in results){
            console.log(`${exchange} exchange`)
            for (let symbol in results[exchange]){
                console.log(`${symbol} coin`)
                for (let option of results[exchange][symbol]){
                    console.log(option)
                }
            }
        }
    }

}