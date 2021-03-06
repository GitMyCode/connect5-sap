/* */ 
"format cjs";
"use strict";

var _interopRequireWildcard = function (obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (typeof obj === "object" && obj !== null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } };

exports.__esModule = true;
exports.MemberExpression = MemberExpression;

var _import = require("../../../types");

var t = _interopRequireWildcard(_import);

var metadata = {
  optional: true
};

exports.metadata = metadata;
var match = t.buildMatchMemberExpression("process.env");

function MemberExpression(node) {
  if (match(node.object)) {
    var key = this.toComputedKey();
    if (t.isLiteral(key)) {
      return t.valueToNode(process.env[key.value]);
    }
  }
}