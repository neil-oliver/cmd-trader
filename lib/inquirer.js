const inquirer = require('inquirer');
const config = require('../config');

module.exports = {
  menu: () => {
    const questions = [
      {
        type: 'list',
        name: 'main',
        message: 'Please select an option:',
        choices: ['Output Rankings','Highest Performing Coin','Update','Arbitrage','Exit'],
        default: ['Output Rankings']
      }
    ];
    return inquirer.prompt(questions);
  },
  intervalSelect: () => {
    const questions = [
      {
        type: 'checkbox',
        name: 'interval',
        message: 'Select which intervals you would like to include when calculating ranks:',
        choices: config.intervals,
        default: ['1m']
      }
    ];
    return inquirer.prompt(questions);
  },
  cancelContinue: (message) => {
    const questions = [
      {
        type: 'list',
        name: 'cancel',
        message: `${message} Would you like to return to return to the main menu?`,
        choices: ['Yes', 'No'],
        default: ['No']
      }
    ];
    return inquirer.prompt(questions);
  },
};