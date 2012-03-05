
var colors = require('./colors'),
    express = require('express'),
    fs = require('fs'),
    path = require('path'),
    utc = require('./utc'),
    util = require('util');


function LogServer(configs) {
  var app = this._app = express.createServer();

  app.set('view engine', 'jade');

  app.get('/', function(req, res) {
    res.redirect('/channels');
  });

  var start_time = new Date();
  app.get('/uptime', function(req, res) {
    var delta = (new Date()).getTime() - start_time.getTime(),
        uptime = '';

    function calc(suffix, divisor, pad) {
      var n = Math.floor(delta / divisor);
      delta -= n * divisor;
      if (pad && n < 10) n = '0' + n;
      uptime += n + suffix;
    }

    calc('d ', 24 * 60 * 60 * 1000);
    calc('h ', 60 * 60 * 1000);
    calc('m ', 60 * 1000);
    calc('s', 1000);

    res.send("Up: " + uptime);
  });

  app.get('/channels', function(req, res) {
    var sortedConfigs = configs.slice(0);
    sortedConfigs.sort(function(a, b) {
      return (a.channel.toLowerCase() < b.channel.toLowerCase()) ? -1 : 1;
    });

    res.render('channels.jade', {
      configs: sortedConfigs,
      title: 'channel index'
    });
  });

  app.get('/:key/index', function(req, res) {
    var config = getConfig(req.params.key);
    if (!config) {
      res.send('No configuration found for ' + req.params.key, 404);
      return;
    } else if (config.key !== req.params.key) {
      res.redirect("/" + config.key + "/index");
      return;
    }

    getIndex(config, function(err, dates) {
      if (err) {
        res.send('' + err, 404);
        return;
      }

      dates.reverse();

      res.render('index.jade', {
        dates: dates,
        channel: config.channel,
        page: 'index'
      });
    });
  });

  app.get('/:key/latest', function(req, res) {
    var config = getConfig(req.params.key);
    if (!config) {
      res.send('No configuration found for ' + req.params.key, 404);
      return;
    } else if (config.key !== req.params.key) {
      res.redirect("/" + config.key + "/latest");
      return;
    }

    getIndex(config, function(err, dates) {
      if (err) {
        res.send('' + err, 404);
        return;
      }

      renderLog(req, res, config, dates[dates.length - 1], dates, true);
    });
  });

  app.get('/:key/:date', function(req, res) {
    var config = getConfig(req.params.key);
    if (!config) {
      res.send('No configuration found for ' + req.params.key, 404);
      return;
    } else if (config.key !== req.params.key) {
      res.redirect("/" + config.key + "/" + req.params.date);
      return;
    }

    getIndex(config, function(err, dates) {
      if (err) {
        res.send('' + err, 404);
        return;
      }

      renderLog(req, res, config, req.params.date, dates, false);
    });
  });

  app.get('/:key', function(req, res) {
    res.redirect('/' + req.params.key + '/latest');
  });

  function getIndex(config, cb) {
    fs.readdir(config.dir, function(err, filenames) {
      if (err) {
        cb(err);
        return;
      }

      var dates = filenames.map(function(filename) {
        return filename.replace(/\..*$/, '');
      });

      dates.sort();

      cb(null, dates);
    });
  }

  function renderLog(req, res, config, date, dates, isLatest) {
    var filename = path.resolve(config.dir, date + '.txt'),
        stream = fs.createReadStream(filename, { encoding: 'utf8' }),
        buffer = '', events = [];

    function pad2(n) {
      if (n < 10) return '0' + n;
      return '' + n;
    }

    function parseEvents(last) {
      var rows = buffer.split('\n'),
          until = last ? rows.length - 1 : rows.length;

      for (var i = 0; i < until; i++) {
        var json, event;

        json = rows[i];
        if (!json) continue;

        event = null;
        try {
          event = JSON.parse(json);
        } catch (e) {
          // ignore
        }
        if (!event) continue;

        event.date = new Date(event.date);
        event.time = utc.getTime(event.date);
        event.timestamp = utc.getTimeMs(event.date);
        if (!event.date) continue;

        events.push(event);
      }

      if (!last) {
        buffer = rows[rows.length - 1] || '';
      } else {
        buffer = '';
      }
    }

    stream.on('data', function(data) {
      buffer += data;
      parseEvents(false);
    });

    stream.on('end', function() {
      parseEvents(true);

      var indexPosition = dates.indexOf(date);

      res.render('log', {
        events: events,
        channel: config.channel,
        page: date,
        format: colors.format,
        previous: dates[indexPosition - 1],
        next: dates[indexPosition + 1],
        isLatest: isLatest
      });
    });

    stream.on('error', function(err) {
      stream.destroy();
      res.send('' + err, 404);
      return;
    });
  }

  // Make an index to map keys to a config options hash.
  var configsMap = {};
  for (var i = 0; i < configs.length; i++) {
    var config = configs[i];
    configsMap[config.key] = config;
    if (config.alias instanceof Array) {
      for (var j = 0; j < config.alias.length; j++) {
        configsMap[config.alias[j]] = config;
      }
    } else if (config.alias) {
      configsMap[config.alias] = config;
    }
  }

  function getConfig(key) {
    return configsMap[key];
  }
}


LogServer.prototype.listen = function(port) {
  this._app.listen(port);
};


exports.createServer = function(loggers) {
  return new LogServer(loggers);
};