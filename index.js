const chalk = require('chalk');
const clear = require('clear');
const figlet = require('figlet');
const files = require('./lib/files');
const inquirer  = require('./lib/inquirer');
const app  = require('./lib/app');
const fs = require('fs');
const Configstore = require('configstore');
const { init } = require('./lib/app');
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
        const answers = await inquirer.menu();
        if (answers.main == "Output Rankings"){
            app.printRanks()
        } else {
            app.update()
        }
        //update()
    } else {
        app.install()
    }
};

run();