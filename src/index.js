// https://github.com/nodejs/node/blob/master/lib/_http_server.js

const codes = {
  default: ['Default', true],

  '1XX': ['Informational', true],
  100: ['Continue', true],
  101: ['Switching Protocols', true],
  102: ['Processing', true],
  103: ['Early Hints', true], // Also informally used as "Checkpoint".

  '2XX': ['Success', true],
  200: ['OK', true],
  201: ['Created', true],
  202: ['Accepted', true],
  203: ['Non-Authoritative Information', true],
  204: ['No Content', true],
  205: ['Reset Content', true],
  206: ['Partial Content', true],
  207: ['Multi-Status', true],
  208: ['Already Reported', true],
  218: ['This is fine', true], // Unofficial
  226: ['IM Used', true],

  '3XX': ['Redirection', true],
  300: ['Multiple Choices', true],
  301: ['Moved Permanently', true],
  302: ['Found', true],
  303: ['See Other', true],
  304: ['Not Modified', true],
  305: ['Use Proxy', true],
  306: ['Switch Proxy', true],
  307: ['Temporary Redirect', true],
  308: ['Permanent Redirect', true],

  '4XX': ['Client Error', false],
  400: ['Bad Request', false],
  401: ['Unauthorized', false],
  402: ['Payment Required', false],
  403: ['Forbidden', false],
  404: ['Not Found', false],
  405: ['Method Not Allowed', false],
  406: ['Not Acceptable', false],
  407: ['Proxy Authentication Required', false],
  408: ['Request Timeout', false],
  409: ['Conflict', false],
  410: ['Gone', false],
  411: ['Length Required', false],
  412: ['Precondition Failed', false],
  413: ['Payload Too Large', false],
  414: ['URI Too Long', false],
  415: ['Unsupported Media Type', false],
  416: ['Range Not Satisfiable', false],
  417: ['Expectation Failed', false],
  418: ["I'm a teapot", false],
  419: ['Page Expired', false], // Unofficial
  420: ['Enhance Your Calm', false], // Unofficial
  421: ['Misdirected Request', false],
  422: ['Unprocessable Entity', false],
  423: ['Locked', false],
  424: ['Failed Dependency', false],
  425: ['Too Early', false],
  426: ['Upgrade Required', false],
  428: ['Precondition Required', false],
  429: ['Too Many Requests', false],
  430: ['Request Header Fields Too Large', false], // Unofficial
  431: ['Request Header Fields Too Large', false],
  440: ['Login Time-out', false], // Unofficial
  444: ['No Response', false], // Unofficial
  449: ['Retry With', false], // Unofficial
  450: ['Blocked by Windows Parental Controls', false], // Unofficial
  451: ['Unavailable For Legal Reasons', false],
  494: ['Request Header Too Large', false], // Unofficial
  495: ['SSL Certificate Error', false], // Unofficial
  496: ['SSL Certificate Required', false], // Unofficial
  497: ['HTTP Request Sent to HTTPS Port', false], // Unofficial
  498: ['Invalid Token', false], // Unofficial
  499: ['Client Error', false], // "Token Request" on ArcGIS, "Client Closed Request" on nginx

  '5XX': ['Server Error', false],
  500: ['Internal Server Error', false],
  501: ['Not Implemented', false],
  502: ['Bad Gateway', false],
  503: ['Service Unavailable', false],
  504: ['Gateway Timeout', false],
  505: ['HTTP Version Not Supported', false],
  506: ['Variant Also Negotiates', false],
  507: ['Insufficient Storage', false],
  508: ['Loop Detected', false],
  509: ['Bandwidth Limit Exceeded', false],
  510: ['Not Extended', false],
  511: ['Network Authentication Required', false],
  520: ['Web Server Returned an Unknown Error', false], // Unofficial
  521: ['Web Server Is Down', false], // Unofficial
  522: ['Connection Timed Out', false], // Unofficial
  523: ['Origin Is Unreachable', false], // Unofficial
  524: ['A Timeout Occurred', false], // Unofficial
  525: ['SSL Handshake Failed', false], // Unofficial
  526: ['Invalid SSL Certificate', false], // Unofficial
  527: ['Railgun Error', false], // Unofficial
  529: ['Site is Overloaded', false], // Unofficial
  530: ['Site is Frozen', false], // Unofficial
  598: ['Network Read Timeout Error', false], // Unofficial
};

function isStatusCodeValid(code) {
  return code in codes;
}

function getStatusCode(code) {
  if (!isStatusCodeValid(code)) {
    throw new Error(`${code} is not a known HTTP status code.`);
  }

  return {
    // Since there's no HTTP status code that can really match up with `default`, code should just be empty.
    code: code === 'default' ? '' : code,
    message: codes[code][0],
    success: codes[code][1],
  };
}

function getStatusCodeMessage(code) {
  const res = getStatusCode(code);
  return `${res.code} ${res.message}`;
}

function isStatusCodeSuccessful(code) {
  try {
    return getStatusCode(code).success;
  } catch (e) {
    return false;
  }
}

module.exports = {
  codes,
  getStatusCode,
  getStatusCodeMessage,
  isStatusCodeSuccessful,
  isStatusCodeValid,
};
