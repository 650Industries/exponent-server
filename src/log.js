import tc from 'turbocolor';

let _bundleProgressBar;

let _printNewLineBeforeNextLog = false;
let _isLastLineNewLine = false;
function _updateIsLastLineNewLine(args) {
  if (args.length === 0) {
    _isLastLineNewLine = true;
  } else {
    let lastArg = args[args.length - 1];
    if (typeof lastArg === 'string' && (lastArg === '' || lastArg.match(/[\r\n]$/))) {
      _isLastLineNewLine = true;
    } else {
      _isLastLineNewLine = false;
    }
  }
}

function _maybePrintNewLine() {
  if (_printNewLineBeforeNextLog) {
    _printNewLineBeforeNextLog = false;
    console.log();
  }
}

function consoleLog(...args) {
  _maybePrintNewLine();
  _updateIsLastLineNewLine(args);

  console.log(...args);
}

function consoleWarn(...args) {
  _maybePrintNewLine();
  _updateIsLastLineNewLine(args);

  console.warn(...args);
}

function consoleError(...args) {
  _maybePrintNewLine();
  _updateIsLastLineNewLine(args);

  console.error(...args);
}

function respectProgressBars(commitLogs) {
  if (_bundleProgressBar) {
    _bundleProgressBar.terminate();
    _bundleProgressBar.lastDraw = '';
    commitLogs();
    _bundleProgressBar.render();
  } else {
    commitLogs();
  }
}

function getPrefix(color) {
  return color(`[${new Date().toTimeString().slice(0, 8)}]`);
}

function withPrefixAndTextColor(args, color = tc.gray) {
  return [getPrefix(color), ...args.map(arg => color(arg))];
}

function withPrefix(args, color = tc.gray) {
  return [getPrefix(color), ...args];
}

function log(...args) {
  if (log.config.raw) {
    return;
  }

  respectProgressBars(() => {
    consoleLog(...withPrefix(args));
  });
}

log.nested = function(message) {
  respectProgressBars(() => {
    consoleLog(message);
  });
};

log.newLine = function newLine() {
  respectProgressBars(() => {
    consoleLog();
  });
};

log.addNewLineIfNone = function addNewLineIfNone() {
  if (!_isLastLineNewLine && !_printNewLineBeforeNextLog) {
    log.newLine();
  }
};

log.printNewLineBeforeNextLog = function printNewLineBeforeNextLog() {
  _printNewLineBeforeNextLog = true;
};

log.setBundleProgressBar = function setBundleProgressBar(bar) {
  _bundleProgressBar = bar;
};

log.error = function error(...args) {
  if (log.config.raw) {
    return;
  }

  respectProgressBars(() => {
    consoleError(...withPrefixAndTextColor(args, tc.red));
  });
};

log.nestedError = function(message) {
  respectProgressBars(() => {
    consoleError(tc.red(message));
  });
};

log.warn = function warn(...args) {
  if (log.config.raw) {
    return;
  }

  respectProgressBars(() => {
    consoleWarn(...withPrefixAndTextColor(args, tc.yellow));
  });
};

log.nestedWarn = function(message) {
  respectProgressBars(() => {
    consoleWarn(tc.yellow(message));
  });
};

log.gray = function(...args) {
  if (log.config.raw) {
    return;
  }

  respectProgressBars(() => {
    consoleLog(...withPrefixAndTextColor(args));
  });
};

log.raw = function(...args) {
  if (!log.config.raw) {
    return;
  }

  respectProgressBars(() => {
    consoleLog(...args);
  });
};

log.tc = tc;

log.config = {
  raw: false,
};

export default log;
