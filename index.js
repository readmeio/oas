const fs = require('fs');
const path = require('path');

const exp = {};
fs.readdirSync(path.join(__dirname, './src'))
  .filter(har => {
    return har.indexOf('.har') !== -1;
  })
  .forEach(har => {
    exp[har.replace('.har', '')] = JSON.parse(fs.readFileSync(path.join(__dirname, `./src/${har}`), 'utf8'));
  });

module.exports = exp;
