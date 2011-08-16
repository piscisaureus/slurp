
function pad2(n) {
  if (n < 10) return '0' + n;
  return '' + n;
}

function getDate(date) {
  return date.getUTCFullYear() + '-' + 
         pad2(date.getUTCMonth() + 1) + '-' + 
         pad2(date.getUTCDate());
}

function getTime(date) {
  return pad2(date.getUTCHours()) + ':' +
         pad2(date.getUTCMinutes()) + ':' +
         pad2(date.getUTCSeconds());
}

exports.getDate = getDate;
exports.getTime = getTime;
