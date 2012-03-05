var fs = require('fs'),
    path = require('path'),
    mkdirpSync = require('mkdirp').sync;

// Work around cloud9 fuckup
if (process.env.HOME.indexOf('cloud9') !== -1)
  process.env.HOME = path.resolve(path.dirname(process.argv[1]));

var CONFIG_FILE = path.resolve(path.dirname(process.argv[1]), 'config.json');
var LOG_ROOT = path.resolve(process.env.HOME, 'logs');

var configs = JSON.parse(fs.readFileSync(CONFIG_FILE));

for (var i = 0; i < configs.length; i++) {
  var config = configs[i];
  config.dir = path.resolve(LOG_ROOT, config.key);
  mkdirpSync(config.dir, '0777');
  require('./logger.js').start(config);
}

require('./log-server.js')
  .createServer(configs)
  .listen(process.env.PORT || 80);

console.log("Server started");