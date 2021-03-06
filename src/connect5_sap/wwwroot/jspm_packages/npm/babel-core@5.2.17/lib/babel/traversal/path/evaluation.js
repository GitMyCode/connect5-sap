/* */ 
"format cjs";
"use strict";

exports.__esModule = true;
/**
 * Walk the input `node` and statically evaluate if it's truthy.
 *
 * Returning `true` when we're sure that the expression will evaluate to a
 * truthy value, `false` if we're sure that it will evaluate to a falsy
 * value and `undefined` if we aren't sure. Because of this please do not
 * rely on coercion when using this method and check with === if it's false.
 *
 * For example do:
 *
 *   if (t.evaluateTruthy(node) === false) falsyLogic();
 *
 * **AND NOT**
 *
 *   if (!t.evaluateTruthy(node)) falsyLogic();
 *
 */

exports.evaluateTruthy = evaluateTruthy;

/**
 * Walk the input `node` and statically evaluate it.
 *
 * Returns an object in the form `{ confident, value }`. `confident` indicates
 * whether or not we had to drop out of evaluating the expression because of
 * hitting an unknown node that we couldn't confidently find the value of.
 *
 * Example:
 *
 *   t.evaluate(parse("5 + 5")) // { confident: true, value: 10 }
 *   t.evaluate(parse("!true")) // { confident: true, value: false }
 *   t.evaluate(parse("foo + foo")) // { confident: false, value: undefined }
 *
 */

exports.evaluate = evaluate;

function evaluateTruthy() {
  var res = this.evaluate();
  if (res.confident) return !!res.value;
}

function evaluate() {
  var confident = true;

  var value = evaluate(this);
  if (!confident) value = undefined;
  return {
    confident: confident,
    value: value
  };

  function evaluate(path) {
    if (!confident) return;

    var node = path.node;

    if (path.isSequenceExpression()) {
      var exprs = path.get("expressions");
      return evaluate(exprs[exprs.length - 1]);
    }

    if (path.isLiteral()) {
      if (node.regex) {} else {
        return node.value;
      }
    }

    if (path.isConditionalExpression()) {
      if (evaluate(path.get("test"))) {
        return evaluate(path.get("consequent"));
      } else {
        return evaluate(path.get("alternate"));
      }
    }

    if (path.isIdentifier({ name: "undefined" })) {
      return undefined;
    }

    if (path.isIdentifier() || path.isMemberExpression()) {
      path = path.resolve();
      if (path) {
        return evaluate(path);
      } else {
        return confident = false;
      }
    }

    if (path.isUnaryExpression({ prefix: true })) {
      var arg = evaluate(path.get("argument"));
      switch (node.operator) {
        case "void":
          return undefined;
        case "!":
          return !arg;
        case "+":
          return +arg;
        case "-":
          return -arg;
      }
    }

    if (path.isArrayExpression() || path.isObjectExpression()) {}

    if (path.isLogicalExpression()) {
      var left = evaluate(path.get("left"));
      var right = evaluate(path.get("right"));

      switch (node.operator) {
        case "||":
          return left || right;
        case "&&":
          return left && right;
      }
    }

    if (path.isBinaryExpression()) {
      var left = evaluate(path.get("left"));
      var right = evaluate(path.get("right"));

      switch (node.operator) {
        case "-":
          return left - right;
        case "+":
          return left + right;
        case "/":
          return left / right;
        case "*":
          return left * right;
        case "%":
          return left % right;
        case "<":
          return left < right;
        case ">":
          return left > right;
        case "<=":
          return left <= right;
        case ">=":
          return left >= right;
        case "==":
          return left == right;
        case "!=":
          return left != right;
        case "===":
          return left === right;
        case "!==":
          return left !== right;
      }
    }

    confident = false;
  }
}

// we have a regex and we can't represent it natively

// we could evaluate these but it's probably impractical and not very useful