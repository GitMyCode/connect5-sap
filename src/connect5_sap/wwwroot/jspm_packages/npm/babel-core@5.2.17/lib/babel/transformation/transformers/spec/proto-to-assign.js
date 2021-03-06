/* */ 
"format cjs";
"use strict";

var _interopRequireDefault = function (obj) { return obj && obj.__esModule ? obj : { "default": obj }; };

var _interopRequireWildcard = function (obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (typeof obj === "object" && obj !== null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } };

exports.__esModule = true;
exports.AssignmentExpression = AssignmentExpression;
exports.ExpressionStatement = ExpressionStatement;
exports.ObjectExpression = ObjectExpression;

var _import = require("../../../types");

var t = _interopRequireWildcard(_import);

var _pull = require("lodash/array/pull");

var _pull2 = _interopRequireDefault(_pull);

function isProtoKey(node) {
  return t.isLiteral(t.toComputedKey(node, node.key), { value: "__proto__" });
}

function isProtoAssignmentExpression(node) {
  var left = node.left;
  return t.isMemberExpression(left) && t.isLiteral(t.toComputedKey(left, left.property), { value: "__proto__" });
}

function buildDefaultsCallExpression(expr, ref, file) {
  return t.expressionStatement(t.callExpression(file.addHelper("defaults"), [ref, expr.right]));
}

var metadata = {
  secondPass: true,
  optional: true
};

exports.metadata = metadata;

function AssignmentExpression(node, parent, scope, file) {
  if (!isProtoAssignmentExpression(node)) return;

  var nodes = [];
  var left = node.left.object;
  var temp = scope.generateMemoisedReference(left);

  nodes.push(t.expressionStatement(t.assignmentExpression("=", temp, left)));
  nodes.push(buildDefaultsCallExpression(node, temp, file));
  if (temp) nodes.push(temp);

  return nodes;
}

function ExpressionStatement(node, parent, scope, file) {
  var expr = node.expression;
  if (!t.isAssignmentExpression(expr, { operator: "=" })) return;

  if (isProtoAssignmentExpression(expr)) {
    return buildDefaultsCallExpression(expr, expr.left.object, file);
  }
}

function ObjectExpression(node, parent, scope, file) {
  var proto;

  for (var i = 0; i < node.properties.length; i++) {
    var prop = node.properties[i];

    if (isProtoKey(prop)) {
      proto = prop.value;
      _pull2["default"](node.properties, prop);
    }
  }

  if (proto) {
    var args = [t.objectExpression([]), proto];
    if (node.properties.length) args.push(node);
    return t.callExpression(file.addHelper("extends"), args);
  }
}