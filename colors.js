
var COLOR_CODES = {
  0: 'white',
  1: 'black',
  2: 'darkblue',
  3: 'green',
  4: 'red',
  5: 'maroon',
  6: 'purple',
  7: 'orange',
  8: 'yellow',
  9: 'lime',
  10: 'teal',
  11: 'cyan',
  12: 'blue',
  13: 'fuchsia',
  14: 'darkgray',
  15: 'lightgray'
};

function format(input) {
  var fg, bg, bold, italic, underline, inverse, monospace,
      text,
      spans = [];

  function emit() {
    if (!text) return;

    var css = [], classes = [];

    if (bold) {
      classes.push('bold');
    }

    if (italic) {
      classes.push('italic');
    }

    if (underline) {
      classes.push('underline');
    }

    if (monospace) {
      classes.push('monospace');
    }

    if (inverse) {
      // Inverse coloring
      classes.push('inverse');
      if (fg) {
        css.push('background-color: ' + fg + ';');
      }
      if (bg) {
        css.push('color: ' + bg + ';');
      }

    } else  {
      // Normal coloring
      if (fg) {
        css.push('color: ' + fg + ';');
      }
      if (bg) {
        css.push('background-color: ' + bg + ';');
      }
    }

    var span = {
      text: text,
      style: css.join(' '),
      'class': classes.join(' ')
    };
    spans.push(span);
  }

  function resetFormatting() {
    fg = undefined;
    bg = undefined;
    bold = false;
    italic = false;
    underline = false;
    inverse = false;
    monospace = false;
  }

  function findNextFormatting() {
    var result = input.match(/[\x02\x0f\x11\x12\x16\x1d\x1f\x03\x04]/);
    if (!result) {
      return input.length;
    } else {
      return input.indexOf(result[0]);
    }
  }

  resetFormatting();
  text = '';

  while (input.length) {
    // Find all characters until the next magic char
    var pos = findNextFormatting();
    text += input.slice(0, pos);
    input = input.slice(pos);

    // Break if the input is up
    if (!input) break;

    // Emit the text belonging to the monospacevious span
    emit();
    text = '';

    // Parse the formatting character
    var char = input[0];
    input = input.slice(1);
    switch (char) {
      case '\x02':
        bold = !bold;
        break;

      case '\x0f':
        resetFormatting();
        break;

      case '\x11':
        monospace = !monospace;
        break;

      case '\x12':
      case '\x16':
        inverse = !inverse;
        break;

      case '\x1d':
        italic = !italic;
        break;

      case '\x1f':
        underline = !underline;
        break;

      case '\x03':
        var match = input.match(/^(\d{1,2})?(?:,(\d{1,2}))?/);
        fg = (match[1] !== undefined) ? COLOR_CODES[+match[1]] : undefined;
        bg = (match[2] !== undefined) ? COLOR_CODES[+match[2]] : undefined;
        input = input.slice(match[0].length);
        break;

      case '\x04':
        var match = input.match(/^([0-9a-f]{6})?(?:,([0-9a-f]{6}))?/i);
        fg = (match[1] !== undefined) ? '#' + match[1].toLowerCase() : undefined;
        bg = (match[2] !== undefined) ? '#' + match[2].toLowerCase() : undefined;
        input = input.slice(match[0].length);
        break;
    }
  }

  emit();

  return spans;
}

exports.format = format;
