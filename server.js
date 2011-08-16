SERVER = "irc.freenode.net";
CHANNEL = "#libuv";
NICK = "slurp";

var fs = require('fs'),
    path = require('path');

// Make sure the log directory exists
LOG_DIR = path.resolve(fs.realpathSync(path.dirname(process.argv[1])), 'log');

if (!path.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, 0777);
}

require('./logger.js');
require('./log-server.js');
