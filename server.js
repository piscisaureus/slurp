SERVER = "irc.freenode.net";
CHANNEL = "#libuv";
NICK = "slurp";
START = new Date();

var fs = require('fs'),
    path = require('path');

// Make sure the log directory exists
LOG_DIR = path.resolve(process.env.HOME, CHANNEL.replace('#', '') + '-log');

if (!path.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, 0777);
}

require('./logger.js').start();
require('./log-server.js').start();
