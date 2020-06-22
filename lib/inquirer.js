const inquirer = require('inquirer');

module.exports = {
  menu: () => {
    const questions = [
      {
        type: 'list',
        name: 'main',
        message: 'Please select an option:',
        choices: ['Output Rankings','Update','Exit'],
        default: ['Output Rankings']
      }
    ];
    return inquirer.prompt(questions);
  },
};