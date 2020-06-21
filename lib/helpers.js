const config = require('../config');

module.exports = {
    v: (message, override) => {
        if (config.verbose == true || override == true) console.log(message)
    }
  }