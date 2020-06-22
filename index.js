const chalk = require('chalk');
const clear = require('clear');
const figlet = require('figlet');
const app  = require('./lib/app');
const fs = require('fs');
const Configstore = require('configstore');
const conf = new Configstore('Trader');

clear();

console.log(
  chalk.blue(
    figlet.textSync('Trader', { horizontalLayout: 'full' })
  )
);
const run = async () => {

//   conf.set('username',credentials.username)
//   conf.set('password',credentials.password)

    if (fs.existsSync('./data.json')) {
        //file exists
        app.init()
        console.log(`Last Update : ${app.latestUpdate().end}`)
        app.mainMenu()
    } else {
        app.install()
    }
};

run();