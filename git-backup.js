
var path = require('path'),
    spawn = require('child_process').spawn;

function backup(dir, reason, amend, cb) {
  var options = { cwd: dir, customFds: [0, 1, 2] };

  console.log("Starting backup (" + reason + ")");

  var cp = spawn('git', ['add', '-u'], options);
  cp.on('exit', function(code, signal) {
    if (code || signal) {
      return cb(true, false);
    }

    var commit = [ 'commit',
                   '-a',
                   '--allow-empty',
                   '-m', 'Automatic backup (' + reason + ')',
                   '--author', 'Slurp <slurp@piscisaureus.no.de>',
                   '--date', (new Date()).toISOString() ];
    if (amend) {
      commit.push('--amend');
    }
    var cp = spawn('git', commit, options);
    cp.on('exit', function(code, signal) {
      if (code || signal) {
        return cb(true, false);
      }

      var cp = spawn('git', ['push', '-f'], options);
      cp.on('exit', function(code, signal) {
        if (code || signal) {
          return cb(true, true);
        }

        return cb();
      });
    });
  });
}

// Make a backup once a day, or when the process restarts
exports.start = function(dir) {
  var reason = 'server restart';

  dir = path.resolve(dir);
  backup(dir, 'server restart', false, reschedule);

  function reschedule(retry, amend) {
    var timeout;
    if (retry) {
      // On error, reschedule after 5 minutes
      console.log("Backup failed, scheduling retry");
      timeout = 5 * 60 * 1000;
    } else {
      // On success, at either 12pm, 8am or 16pm.
      console.log("Backup successful, scheduling next backup");
      var interval = 8 * 60 * 60 * 1000,
          now = (new Date()).getTime();
      timeout = Math.floor(now / interval) * interval + interval - now;
      amend = false;
      reason = 'scheduled';
    }
    setTimeout(function() {
      backup(dir, reason, amend, reschedule);
    }, timeout);
  }
};
