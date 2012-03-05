// Work around no.de fuckup
if (/^v0.4/.test(process.version)) {
  console.log("Spawning child process");
  return require('child_process').spawn('/home/node/node/out/Release/node',
                                        process.argv.slice(1),
                                        { customFds: [0, 1, 2] });
}

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