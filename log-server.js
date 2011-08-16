
var colors = require('./colors'),
    express = require('express'),
    fs = require('fs'),
    path = require('path'),
    utc = require('./utc'),
    util = require('util');

var app = express.createServer();

app.set('view engine', 'jade');

app.get('/', function(req, res){
  res.send('hello world');
});

function getIndex(cb) {
  fs.readdir(LOG_DIR, function(err, filenames) {
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

app.get('/index', function(req, res) {
  getIndex(function(err, dates) {
    if (err) {
      res.send('' + err);
      res.send();
    }

    dates.reverse();

    res.render('index.jade', {dates: dates, channel: CHANNEL, page: 'index'});
    res.end();
  });
});

app.get('/log/latest', function(req, res) {
  getIndex(function(err, dates) {
    if (err) {
      res.send('' + err);
      res.send();
    }

    renderLog(req, res, dates[dates.length - 1], dates, true);
  });
});

app.get('/log/:date', function(req, res) {
  getIndex(function(err, dates) {
    if (err) {
      res.send('' + err);
      res.send();
    }

    renderLog(req, res, req.params.date, dates, false);
  });
});

app.listen(80);


function renderLog(req, res, date, dates, isLatest) {
  var filename = path.resolve(LOG_DIR, date + '.txt'),
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
      date: date,
      channel: CHANNEL,
      page: date,
      format: colors.format,
      previous: dates[indexPosition - 1],
      next: dates[indexPosition + 1],
      isLatest: isLatest
    });
    res.end();
  });

  stream.on('error', function(err) {
    stream.destroy();
    res.send('' + err);
    res.end();
    return;
  });
}

