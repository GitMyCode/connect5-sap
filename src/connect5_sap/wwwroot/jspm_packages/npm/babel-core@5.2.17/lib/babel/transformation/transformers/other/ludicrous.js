/* */ 
"format cjs";
"use strict";

var _interopRequireWildcard = function (obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (typeof obj === "object" && obj !== null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } };

exports.__esModule = true;

// foo in bar
exports.BinaryExpression = BinaryExpression;

// { 1: "foo" }
exports.Property = Property;

// /foobar/g
exports.Literal = Literal;

// foo.bar
exports.MemberExpression = MemberExpression;

// Object.setPrototypeOf
// Object.preventExtensions
// Object.keys
// Object.isExtensible
// Object.getOwnPropertyDescriptor
// Object.defineProperty
exports.CallExpression = CallExpression;

// delete foo.bar
exports.UnaryExpression = UnaryExpression;

// foo.bar = bar;
exports.AssignmentExpression = AssignmentExpression;

// new Proxy
exports.NewExpression = NewExpression;

var _import = require("../../../types");

var t = _interopRequireWildcard(_import);

var _import2 = require("../../../util");

var util = _interopRequireWildcard(_import2);

var metadata = {
  optional: true
};exports.metadata = metadata;

function BinaryExpression(node) {
  if (node.operator === "in") {
    return util.template("ludicrous-in", {
      LEFT: node.left,
      RIGHT: node.right
    });
  }
}

function Property(node) {
  var key = node.key;
  if (t.isLiteral(key) && typeof key.value === "number") {
    key.value = "" + key.value;
  }
}

function Literal(node) {
  if (node.regex) {
    node.regex.pattern = "foobar";
    node.regex.flags = "";
  }
}

function MemberExpression(node) {}

function CallExpression(node) {}

function UnaryExpression(node) {}

function AssignmentExpression(node) {}

function NewExpression(node, parent, scope, file) {
  if (this.get("callee").isIdentifier({ name: "Proxy" })) {
    return t.callExpression(file.addHelper("proxy-create"), [node.arguments[0], file.addHelper("proxy-directory")]);
  } else {}
}

// possible proxy constructor