/* */ 
"format cjs";
"use strict";

var _interopRequireWildcard = function (obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (typeof obj === "object" && obj !== null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } };

var _interopRequireDefault = function (obj) { return obj && obj.__esModule ? obj : { "default": obj }; };

exports.__esModule = true;
exports.is = is;
exports.pullFlag = pullFlag;

var _pull = require("lodash/array/pull");

var _pull2 = _interopRequireDefault(_pull);

var _import = require("../../types");

var t = _interopRequireWildcard(_import);

function is(node, flag) {
  return t.isLiteral(node) && node.regex && node.regex.flags.indexOf(flag) >= 0;
}

function pullFlag(node, flag) {
  var flags = node.regex.flags.split("");
  if (node.regex.flags.indexOf(flag) < 0) return;
  _pull2["default"](flags, flag);
  node.regex.flags = flags.join("");
}