
var irc = require('irc'),
    path = require('path'),
    utc = require('./utc'),
    fs = require('fs'),
    util = require('util');

var ircClients = {};

function getIrcClient(server, nick, auth) {
  var hash = (nick + '@' + server).toLowerCase();

  if (ircClients.hasOwnProperty(hash)) {
    return ircClients[hash];
  }

  console.log("Creating IRC client for " + hash);

  var client = new irc.Client(server, nick, {
     channels: []
  });

  client.setMaxListeners(0);

  if (auth) {
    if (!auth instanceof Array) {
      auth = [auth];
    }
    client.once('connect', function() {
      for (var i = 0; i < auth.length; i++) {
        var command = auth[i],
            result;
        if ((result = command.match(/^\/msg\s+(\S+)\s+(.*)/i))) {
          client.say(result[1], result[2]);
        } else if (/S/.test(command)) {
         throw new Error("Unknown auth command:" + command);
        }
      }
    });
  }

  ircClients[hash] = client;
  return client;
}

exports.start = function(config) {
  var server = config.server,
      botNick = config.nick,
      channel = config.channel,
      auth = config.auth ||
             (config.authFile && fs.readFileSync(config.authFile, 'utf8').split(/\n/)),
      lcChannel = channel.toLowerCase(),
      dir = config.dir,
      ircClient = getIrcClient(server, botNick, auth);

  if (ircClient.connected) {
    ircClient.join(channel);
  } else {
    ircClient.once('connect', function() {
      ircClient.join(channel);
    });
  }

  ircClient.on('error', function(error) {
    console.log('IRC error: ' + util.inspect(error));
  });

  function chanflt(channels) {
    if (channels instanceof Array) {
      // array
      for (var i = 0; i < channels.length; i++) {
        if (channels[i].toLowerCase() == lcChannel) {
          return true;
        }
      }
      return false;
    } else {
      // string
      return channels.toLowerCase() == lcChannel;
    }
  }

  ircClient.on('message', function(nick, channel, message) {
    if (!chanflt(channel)) return;

    var result = (message + '').match(/^\x01ACTION (.*)\x01$/);
    // Filter /me messages
    if (!result) {
      log('message', { nick: nick, message: message });
    } else {
      log('action', { nick: nick, action: result[1] });
    }
  });

  ircClient.on('nick', function(nick, new_nick, channel) {
    if (!chanflt(channel)) return;
    log('nick', { nick: nick, new_nick: new_nick });
  });

  var start_time = new Date();
  ircClient.on('topic', function(channel, topic, nick) {
    if (!chanflt(channel)) return;

    // Ignore topic changes the first 10 seconds so we don't
    // litter our logs with "topic" messages when the bot restarts.
    if ((new Date()).getTime() - start_time.getTime() < 10000) return;

    log('topic', { nick: nick, topic: topic });
  });

  ircClient.on('join', function(channel, nick) {
    if (!chanflt(channel)) return;
    if (nick == botNick) return;
    log('join', { nick: nick });
  });

  ircClient.on('part', function(channel, nick, reason) {
    if (!chanflt(channel)) return;
    log('part', { nick: nick, reason: reason });
  });

  ircClient.on('kick', function(channel, victim, nick, reason) {
    if (!chanflt(channel)) return;
    log('kick', { victim: victim, nick: nick, reason: reason });
  });

  ircClient.on('quit', function(nick, reason, channel) {
    if (!chanflt(channel)) return;
    log('quit', { nick: nick, reason: reason });
  });

  ircClient.on('abort', function() {
    // The logger stopped
    process.exit();
  });

  var logStream = null,
      lastUtcDate = null;

  function log(type, fields) {
    var date = new Date(),
        utcDate = utc.getDate(date);

    // Make sure we're writing to the correct file
    if (lastUtcDate != utcDate) {
      if (logStream) {
        logStream.end();
      }

      var logFile = path.resolve(dir, utcDate + '.txt');
      logStream = fs.createWriteStream(logFile, {
                    flags: 'a+',
                    mode: '0666',
                    encoding: 'utf8'
                  });
      lastUtcDate = utcDate;
    }

    // Set the type and date
    fields.date = date.toISOString();
    fields.type = type;

    // Write!
    logStream.write(JSON.stringify(fields) + '\n');
  }
};
