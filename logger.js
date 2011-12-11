
var irc = require('irc'),
    path = require('path'),
    utc = require('./utc'),
    fs = require('fs'),
    util = require('util');

exports.start = function() {
  var ircClient = new irc.Client(SERVER, NICK, {
    channels: [CHANNEL],
    debug: true
  });

  ircClient.on('error', function(error) {
    console.log('IRC error: ' + util.inspect(error));
  });

  function chanflt(channels) {
    if (channels.slice) {
      // array
      return channels.indexOf(CHANNEL) != -1;
    } else {
      // string
      return channels == CHANNEL;
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

  ircClient.on('topic', function(channel, topic, nick) {
    if (!chanflt(channel)) return;

    // Ignore topic changes the first 10 seconds so we don't
    // litter our logs with "topic" messages when the bot restarts.
    if ((new Date()).getTime() - START.getTime() < 10000) return;

    log('topic', { nick: nick, topic: topic });
  });

  ircClient.on('join', function(channel, nick) {
    if (!chanflt(channel)) return;
    if (nick == NICK) return;
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
        utcDate = utc.getDate(date),
        args = Array.prototype.slice.call(arguments, 0);

    // Make sure we're writing to the correct file
    if (lastUtcDate != utcDate) {
      if (logStream) {
        logStream.end();
      }

      var logFile = path.resolve(LOG_DIR, utcDate + '.txt');
      logStream = fs.createWriteStream(logFile, {
                    flags: 'a+',
                    mode: 0666,
                    encoding: 'utf8'
                  });
      lastUtcDate = utcDate;
    }

    // Set the type and date
    fields.date = date.toISOString();
    fields.type = type;

    // Write!
    logStream.write(JSON.stringify(fields) + '\n');
    console.log(JSON.stringify(fields));
  }
};
