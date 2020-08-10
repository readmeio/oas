const fs = require('fs');

const exp = {};
fs.readdirSync('./src')
  .filter(har => {
    return har.indexOf('.har') !== -1;
  })
  .forEach(har => {
    exp[har] = JSON.parse(fs.readFileSync(`./src/${har}`, 'utf8'));
  });

module.exports = exp;
