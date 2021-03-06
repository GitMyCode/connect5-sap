/* */ 
"format cjs";
"use strict";

var _interopRequireWildcard = function (obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (typeof obj === "object" && obj !== null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } };

var _interopRequireDefault = function (obj) { return obj && obj.__esModule ? obj : { "default": obj }; };

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

var _reduceRight = require("lodash/collection/reduceRight");

var _reduceRight2 = _interopRequireDefault(_reduceRight);

var _import = require("../../../messages");

var messages = _interopRequireWildcard(_import);

var _flatten = require("lodash/array/flatten");

var _flatten2 = _interopRequireDefault(_flatten);

var _traverse = require("../../../traversal");

var _traverse2 = _interopRequireDefault(_traverse);

var _import2 = require("../../../util");

var util = _interopRequireWildcard(_import2);

var _map = require("lodash/collection/map");

var _map2 = _interopRequireDefault(_map);

var _import3 = require("../../../types");

var t = _interopRequireWildcard(_import3);

exports.Function = function (node, parent, scope, file) {
  if (node.generator || node.async) return;
  var tailCall = new TailCallTransformer(this, scope, file);
  tailCall.run();
};

function returnBlock(expr) {
  return t.blockStatement([t.returnStatement(expr)]);
}

// looks for and replaces tail recursion calls
var firstPass = _traverse2["default"].explode({
  enter: function enter(node, parent, scope, state) {
    if (t.isTryStatement(parent)) {
      if (node === parent.block) {
        this.skip();
      } else if (parent.finalizer && node !== parent.finalizer) {
        this.skip();
      }
    }
  },

  ReturnStatement: function ReturnStatement(node, parent, scope, state) {
    this.skip();
    return state.subTransform(node.argument);
  },

  Function: function Function(node, parent, scope, state) {
    this.skip();
  },

  VariableDeclaration: function VariableDeclaration(node, parent, scope, state) {
    this.skip();
    state.vars.push(node);
  }
});

// hoists up function declarations, replaces `this` and `arguments` and marks
// them as needed
var secondPass = _traverse2["default"].explode({
  ThisExpression: function ThisExpression(node, parent, scope, state) {
    state.needsThis = true;
    return state.getThisId();
  },

  ReferencedIdentifier: function ReferencedIdentifier(node, parent, scope, state) {
    if (node.name !== "arguments") return;
    state.needsArguments = true;
    return state.getArgumentsId();
  },

  Function: function Function(node, parent, scope, state) {
    this.skip();
    if (this.isFunctionDeclaration()) {
      node = t.variableDeclaration("var", [t.variableDeclarator(node.id, t.toExpression(node))]);
      node._blockHoist = 2;
      return node;
    }
  }
});

// optimizes recursion by removing `this` and `arguments` if they aren't used
var thirdPass = _traverse2["default"].explode({
  ExpressionStatement: function ExpressionStatement(node, parent, scope, state) {
    var expr = node.expression;
    if (!t.isAssignmentExpression(expr)) return;

    if (!state.needsThis && expr.left === state.getThisId()) {
      this.remove();
    } else if (!state.needsArguments && expr.left === state.getArgumentsId() && t.isArrayExpression(expr.right)) {
      return _map2["default"](expr.right.elements, function (elem) {
        return t.expressionStatement(elem);
      });
    }
  }
});

var TailCallTransformer = (function () {
  function TailCallTransformer(path, scope, file) {
    _classCallCheck(this, TailCallTransformer);

    this.hasTailRecursion = false;
    this.needsArguments = false;
    this.setsArguments = false;
    this.needsThis = false;
    this.ownerId = path.node.id;
    this.vars = [];

    this.scope = scope;
    this.path = path;
    this.file = file;
    this.node = path.node;
  }

  TailCallTransformer.prototype.getArgumentsId = function getArgumentsId() {
    return this.argumentsId = this.argumentsId || this.scope.generateUidIdentifier("arguments");
  };

  TailCallTransformer.prototype.getThisId = function getThisId() {
    return this.thisId = this.thisId || this.scope.generateUidIdentifier("this");
  };

  TailCallTransformer.prototype.getLeftId = function getLeftId() {
    return this.leftId = this.leftId || this.scope.generateUidIdentifier("left");
  };

  TailCallTransformer.prototype.getFunctionId = function getFunctionId() {
    return this.functionId = this.functionId || this.scope.generateUidIdentifier("function");
  };

  TailCallTransformer.prototype.getAgainId = function getAgainId() {
    return this.againId = this.againId || this.scope.generateUidIdentifier("again");
  };

  TailCallTransformer.prototype.getParams = function getParams() {
    var params = this.params;

    if (!params) {
      params = this.node.params;
      this.paramDecls = [];

      for (var i = 0; i < params.length; i++) {
        var param = params[i];
        if (!param._isDefaultPlaceholder) {
          this.paramDecls.push(t.variableDeclarator(param, params[i] = this.scope.generateUidIdentifier("x")));
        }
      }
    }

    return this.params = params;
  };

  TailCallTransformer.prototype.hasDeopt = function hasDeopt() {
    // check if the ownerId has been reassigned, if it has then it's not safe to
    // perform optimisations
    var ownerIdInfo = this.scope.getBinding(this.ownerId.name);
    return ownerIdInfo && !ownerIdInfo.constant;
  };

  TailCallTransformer.prototype.run = function run() {
    var scope = this.scope;
    var node = this.node;

    // only tail recursion can be optimized as for now, so we can skip anonymous
    // functions entirely
    var ownerId = this.ownerId;
    if (!ownerId) return;

    // traverse the function and look for tail recursion
    this.path.traverse(firstPass, this);

    if (!this.hasTailRecursion) return;

    if (this.hasDeopt()) {
      this.file.log.deopt(node, messages.get("tailCallReassignmentDeopt"));
      return;
    }

    //

    this.path.traverse(secondPass, this);

    if (!this.needsThis || !this.needsArguments) {
      this.path.traverse(thirdPass, this);
    }

    var body = t.ensureBlock(node).body;

    if (this.vars.length > 0) {
      var declarations = _flatten2["default"](_map2["default"](this.vars, function (decl) {
        return decl.declarations;
      }));
      var assignment = _reduceRight2["default"](declarations, function (expr, decl) {
        return t.assignmentExpression("=", decl.id, expr);
      }, t.identifier("undefined"));
      var statement = t.expressionStatement(assignment);
      statement._blockHoist = Infinity;
      body.unshift(statement);
    }

    var paramDecls = this.paramDecls;
    if (paramDecls.length > 0) {
      body.unshift(t.variableDeclaration("var", paramDecls));
    }

    body.unshift(t.expressionStatement(t.assignmentExpression("=", this.getAgainId(), t.literal(false))));

    node.body = util.template("tail-call-body", {
      AGAIN_ID: this.getAgainId(),
      THIS_ID: this.thisId,
      ARGUMENTS_ID: this.argumentsId,
      FUNCTION_ID: this.getFunctionId(),
      BLOCK: node.body
    });

    var topVars = [];

    if (this.needsThis) {
      topVars.push(t.variableDeclarator(this.getThisId(), t.thisExpression()));
    }

    if (this.needsArguments || this.setsArguments) {
      var decl = t.variableDeclarator(this.getArgumentsId());
      if (this.needsArguments) {
        decl.init = t.identifier("arguments");
      }
      topVars.push(decl);
    }

    var leftId = this.leftId;
    if (leftId) {
      topVars.push(t.variableDeclarator(leftId));
    }

    if (topVars.length > 0) {
      node.body.body.unshift(t.variableDeclaration("var", topVars));
    }
  };

  TailCallTransformer.prototype.subTransform = function subTransform(node) {
    if (!node) return;

    var handler = this["subTransform" + node.type];
    if (handler) return handler.call(this, node);
  };

  TailCallTransformer.prototype.subTransformConditionalExpression = function subTransformConditionalExpression(node) {
    var callConsequent = this.subTransform(node.consequent);
    var callAlternate = this.subTransform(node.alternate);
    if (!callConsequent && !callAlternate) {
      return;
    }

    // if ternary operator had tail recursion in value, convert to optimized if-statement
    node.type = "IfStatement";
    node.consequent = callConsequent ? t.toBlock(callConsequent) : returnBlock(node.consequent);

    if (callAlternate) {
      node.alternate = t.isIfStatement(callAlternate) ? callAlternate : t.toBlock(callAlternate);
    } else {
      node.alternate = returnBlock(node.alternate);
    }

    return [node];
  };

  TailCallTransformer.prototype.subTransformLogicalExpression = function subTransformLogicalExpression(node) {
    // only call in right-value of can be optimized
    var callRight = this.subTransform(node.right);
    if (!callRight) return;

    // cache left value as it might have side-effects
    var leftId = this.getLeftId();
    var testExpr = t.assignmentExpression("=", leftId, node.left);

    if (node.operator === "&&") {
      testExpr = t.unaryExpression("!", testExpr);
    }

    return [t.ifStatement(testExpr, returnBlock(leftId))].concat(callRight);
  };

  TailCallTransformer.prototype.subTransformSequenceExpression = function subTransformSequenceExpression(node) {
    var seq = node.expressions;

    // only last element can be optimized
    var lastCall = this.subTransform(seq[seq.length - 1]);
    if (!lastCall) {
      return;
    }

    // remove converted expression from sequence
    // and convert to regular expression if needed
    if (--seq.length === 1) {
      node = seq[0];
    }

    return [t.expressionStatement(node)].concat(lastCall);
  };

  TailCallTransformer.prototype.subTransformCallExpression = function subTransformCallExpression(node) {
    var callee = node.callee,
        thisBinding,
        args;

    if (t.isMemberExpression(callee, { computed: false }) && t.isIdentifier(callee.property)) {
      switch (callee.property.name) {
        case "call":
          args = t.arrayExpression(node.arguments.slice(1));
          break;

        case "apply":
          args = node.arguments[1] || t.identifier("undefined");
          break;

        default:
          return;
      }

      thisBinding = node.arguments[0];
      callee = callee.object;
    }

    // only tail recursion can be optimized as for now
    if (!t.isIdentifier(callee) || !this.scope.bindingIdentifierEquals(callee.name, this.ownerId)) {
      return;
    }

    this.hasTailRecursion = true;

    if (this.hasDeopt()) return;

    var body = [];

    if (!t.isThisExpression(thisBinding)) {
      body.push(t.expressionStatement(t.assignmentExpression("=", this.getThisId(), thisBinding || t.identifier("undefined"))));
    }

    if (!args) {
      args = t.arrayExpression(node.arguments);
    }

    var argumentsId = this.getArgumentsId();
    var params = this.getParams();

    body.push(t.expressionStatement(t.assignmentExpression("=", argumentsId, args)));

    var i, param;

    if (t.isArrayExpression(args)) {
      var elems = args.elements;
      for (i = 0; i < elems.length && i < params.length; i++) {
        param = params[i];
        var elem = elems[i] || (elems[i] = t.identifier("undefined"));
        if (!param._isDefaultPlaceholder) {
          elems[i] = t.assignmentExpression("=", param, elem);
        }
      }
    } else {
      this.setsArguments = true;
      for (i = 0; i < params.length; i++) {
        param = params[i];
        if (!param._isDefaultPlaceholder) {
          body.push(t.expressionStatement(t.assignmentExpression("=", param, t.memberExpression(argumentsId, t.literal(i), true))));
        }
      }
    }

    body.push(t.expressionStatement(t.assignmentExpression("=", this.getAgainId(), t.literal(true))));
    body.push(t.continueStatement(this.getFunctionId()));

    return body;
  };

  return TailCallTransformer;
})();