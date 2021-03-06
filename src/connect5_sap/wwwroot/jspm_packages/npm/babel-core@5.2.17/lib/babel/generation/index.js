/* */ 
"format cjs";
"use strict";

var _interopRequireWildcard = function (obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (typeof obj === "object" && obj !== null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } };

var _interopRequireDefault = function (obj) { return obj && obj.__esModule ? obj : { "default": obj }; };

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _detectIndent = require("detect-indent");

var _detectIndent2 = _interopRequireDefault(_detectIndent);

var _Whitespace = require("./whitespace");

var _Whitespace2 = _interopRequireDefault(_Whitespace);

var _repeating = require("repeating");

var _repeating2 = _interopRequireDefault(_repeating);

var _SourceMap = require("./source-map");

var _SourceMap2 = _interopRequireDefault(_SourceMap);

var _Position = require("./position");

var _Position2 = _interopRequireDefault(_Position);

var _import = require("../messages");

var messages = _interopRequireWildcard(_import);

var _Buffer = require("./buffer");

var _Buffer2 = _interopRequireDefault(_Buffer);

var _extend = require("lodash/object/extend");

var _extend2 = _interopRequireDefault(_extend);

var _each = require("lodash/collection/each");

var _each2 = _interopRequireDefault(_each);

var _n = require("./node");

var _n2 = _interopRequireDefault(_n);

var _import2 = require("../types");

var t = _interopRequireWildcard(_import2);

var CodeGenerator = (function () {
  function CodeGenerator(ast, opts, code) {
    _classCallCheck(this, CodeGenerator);

    opts = opts || {};

    this.comments = ast.comments || [];
    this.tokens = ast.tokens || [];
    this.format = CodeGenerator.normalizeOptions(code, opts, this.tokens);
    this.opts = opts;
    this.ast = ast;

    this.whitespace = new _Whitespace2["default"](this.tokens, this.comments, this.format);
    this.position = new _Position2["default"]();
    this.map = new _SourceMap2["default"](this.position, opts, code);
    this.buffer = new _Buffer2["default"](this.position, this.format);
  }

  CodeGenerator.normalizeOptions = function normalizeOptions(code, opts, tokens) {
    var style = "  ";
    if (code) {
      var indent = _detectIndent2["default"](code).indent;
      if (indent && indent !== " ") style = indent;
    }

    var format = {
      retainLines: opts.retainLines,
      comments: opts.comments == null || opts.comments,
      compact: opts.compact,
      quotes: CodeGenerator.findCommonStringDelimiter(code, tokens),
      indent: {
        adjustMultilineComment: true,
        style: style,
        base: 0
      }
    };

    if (format.compact === "auto") {
      format.compact = code.length > 100000; // 100KB

      if (format.compact) {
        console.error("[BABEL] " + messages.get("codeGeneratorDeopt", opts.filename, "100KB"));
      }
    }

    return format;
  };

  CodeGenerator.findCommonStringDelimiter = function findCommonStringDelimiter(code, tokens) {
    var occurences = {
      single: 0,
      double: 0
    };

    var checked = 0;

    for (var i = 0; i < tokens.length; i++) {
      var token = tokens[i];
      if (token.type.label !== "string") continue;
      if (checked >= 3) continue;

      var raw = code.slice(token.start, token.end);
      if (raw[0] === "'") {
        occurences.single++;
      } else {
        occurences.double++;
      }

      checked++;
    }

    if (occurences.single > occurences.double) {
      return "single";
    } else {
      return "double";
    }
  };

  CodeGenerator.prototype.generate = function generate() {
    var ast = this.ast;

    this.print(ast);

    var comments = [];
    _each2["default"](ast.comments, function (comment) {
      if (!comment._displayed) comments.push(comment);
    });
    this._printComments(comments);

    return {
      map: this.map.get(),
      code: this.buffer.get()
    };
  };

  CodeGenerator.prototype.buildPrint = function buildPrint(parent) {
    var _this = this;

    var print = function print(node, opts) {
      return _this.print(node, parent, opts);
    };

    print.sequence = function (nodes) {
      var opts = arguments[1] === undefined ? {} : arguments[1];

      opts.statement = true;
      return _this.printJoin(print, nodes, opts);
    };

    print.join = function (nodes, opts) {
      return _this.printJoin(print, nodes, opts);
    };

    print.list = function (items) {
      var opts = arguments[1] === undefined ? {} : arguments[1];

      if (opts.separator == null) opts.separator = ", ";
      print.join(items, opts);
    };

    print.block = function (node) {
      return _this.printBlock(print, node);
    };

    print.indentOnComments = function (node) {
      return _this.printAndIndentOnComments(print, node);
    };

    return print;
  };

  CodeGenerator.prototype.catchUp = function catchUp(node, parent) {
    // catch up to this nodes newline if we're behind
    if (node.loc && this.format.retainLines && this.buffer.buf) {
      var needsParens = false;
      if (parent && this.position.line < node.loc.start.line && t.isTerminatorless(parent)) {
        needsParens = true;
        this._push("(");
      }
      while (this.position.line < node.loc.start.line) {
        this._push("\n");
      }
      return needsParens;
    }
    return false;
  };

  CodeGenerator.prototype.print = function print(node, parent) {
    var _this2 = this;

    var opts = arguments[2] === undefined ? {} : arguments[2];

    if (!node) return;

    if (parent && parent._compact) {
      node._compact = true;
    }

    var oldConcise = this.format.concise;
    if (node._compact) {
      this.format.concise = true;
    }

    var newline = function newline(leading) {
      if (!opts.statement && !_n2["default"].isUserWhitespacable(node, parent)) {
        return;
      }

      var lines = 0;

      if (node.start != null && !node._ignoreUserWhitespace) {
        // user node
        if (leading) {
          lines = _this2.whitespace.getNewlinesBefore(node);
        } else {
          lines = _this2.whitespace.getNewlinesAfter(node);
        }
      } else {
        // generated node
        if (!leading) lines++; // always include at least a single line after
        if (opts.addNewlines) lines += opts.addNewlines(leading, node) || 0;

        var needs = _n2["default"].needsWhitespaceAfter;
        if (leading) needs = _n2["default"].needsWhitespaceBefore;
        if (needs(node, parent)) lines++;

        // generated nodes can't add starting file whitespace
        if (!_this2.buffer.buf) lines = 0;
      }

      _this2.newline(lines);
    };

    if (this[node.type]) {
      var needsNoLineTermParens = _n2["default"].needsParensNoLineTerminator(node, parent);
      var needsParens = needsNoLineTermParens || _n2["default"].needsParens(node, parent);

      if (needsParens) this.push("(");
      if (needsNoLineTermParens) this.indent();

      this.printLeadingComments(node, parent);

      var needsParensFromCatchup = this.catchUp(node, parent);

      newline(true);

      if (opts.before) opts.before();
      this.map.mark(node, "start");

      this[node.type](node, this.buildPrint(node), parent);

      if (needsNoLineTermParens) {
        this.newline();
        this.dedent();
      }
      if (needsParens || needsParensFromCatchup) this.push(")");

      this.map.mark(node, "end");
      if (opts.after) opts.after();

      this.format.concise = oldConcise;

      newline(false);

      this.printTrailingComments(node, parent);
    } else {
      throw new ReferenceError("unknown node of type " + JSON.stringify(node.type) + " with constructor " + JSON.stringify(node && node.constructor.name));
    }
  };

  CodeGenerator.prototype.printJoin = function printJoin(print, nodes) {
    var _this3 = this;

    var opts = arguments[2] === undefined ? {} : arguments[2];

    if (!nodes || !nodes.length) return;

    var len = nodes.length;

    if (opts.indent) this.indent();

    _each2["default"](nodes, function (node, i) {
      print(node, {
        statement: opts.statement,
        addNewlines: opts.addNewlines,
        after: function after() {
          if (opts.iterator) {
            opts.iterator(node, i);
          }

          if (opts.separator && i < len - 1) {
            _this3.push(opts.separator);
          }
        }
      });
    });

    if (opts.indent) this.dedent();
  };

  CodeGenerator.prototype.printAndIndentOnComments = function printAndIndentOnComments(print, node) {
    var indent = !!node.leadingComments;
    if (indent) this.indent();
    print(node);
    if (indent) this.dedent();
  };

  CodeGenerator.prototype.printBlock = function printBlock(print, node) {
    if (t.isEmptyStatement(node)) {
      this.semicolon();
    } else {
      this.push(" ");
      print(node);
    }
  };

  CodeGenerator.prototype.generateComment = function generateComment(comment) {
    var val = comment.value;
    if (comment.type === "Line") {
      val = "//" + val;
    } else {
      val = "/*" + val + "*/";
    }
    return val;
  };

  CodeGenerator.prototype.printTrailingComments = function printTrailingComments(node, parent) {
    this._printComments(this.getComments("trailingComments", node, parent));
  };

  CodeGenerator.prototype.printLeadingComments = function printLeadingComments(node, parent) {
    this._printComments(this.getComments("leadingComments", node, parent));
  };

  CodeGenerator.prototype.getComments = function getComments(key, node, parent) {
    var _this4 = this;

    if (t.isExpressionStatement(parent)) {
      return [];
    }

    var comments = [];
    var nodes = [node];

    if (t.isExpressionStatement(node)) {
      nodes.push(node.argument);
    }

    _each2["default"](nodes, function (node) {
      comments = comments.concat(_this4._getComments(key, node));
    });

    return comments;
  };

  CodeGenerator.prototype._getComments = function _getComments(key, node) {
    return node && node[key] || [];
  };

  CodeGenerator.prototype._printComments = function _printComments(comments) {
    var _this5 = this;

    if (this.format.compact) return;

    if (!this.format.comments) return;
    if (!comments || !comments.length) return;

    _each2["default"](comments, function (comment) {
      var skip = false;

      // find the original comment in the ast and set it as displayed
      _each2["default"](_this5.ast.comments, function (origComment) {
        if (origComment.start === comment.start) {
          // comment has already been output
          if (origComment._displayed) skip = true;

          origComment._displayed = true;
          return false;
        }
      });

      if (skip) return;

      _this5.catchUp(comment);

      // whitespace before
      _this5.newline(_this5.whitespace.getNewlinesBefore(comment));

      var column = _this5.position.column;
      var val = _this5.generateComment(comment);

      if (column && !_this5.isLast(["\n", " ", "[", "{"])) {
        _this5._push(" ");
        column++;
      }

      //
      if (comment.type === "Block" && _this5.format.indent.adjustMultilineComment) {
        var offset = comment.loc.start.column;
        if (offset) {
          var newlineRegex = new RegExp("\\n\\s{1," + offset + "}", "g");
          val = val.replace(newlineRegex, "\n");
        }

        var indent = Math.max(_this5.indentSize(), column);
        val = val.replace(/\n/g, "\n" + _repeating2["default"](" ", indent));
      }

      if (column === 0) {
        val = _this5.getIndent() + val;
      }

      // force a newline for line comments when retainLines is set in case the next printed node
      // doesn't catch up
      if (_this5.format.retainLines && comment.type === "Line") {
        val += "\n";
      }

      //
      _this5._push(val);

      // whitespace after
      _this5.newline(_this5.whitespace.getNewlinesAfter(comment));
    });
  };

  _createClass(CodeGenerator, null, [{
    key: "generators",
    value: {
      templateLiterals: require("./generators/template-literals"),
      comprehensions: require("./generators/comprehensions"),
      expressions: require("./generators/expressions"),
      statements: require("./generators/statements"),
      classes: require("./generators/classes"),
      methods: require("./generators/methods"),
      modules: require("./generators/modules"),
      types: require("./generators/types"),
      flow: require("./generators/flow"),
      base: require("./generators/base"),
      jsx: require("./generators/jsx")
    },
    enumerable: true
  }]);

  return CodeGenerator;
})();

_each2["default"](_Buffer2["default"].prototype, function (fn, key) {
  CodeGenerator.prototype[key] = function () {
    return fn.apply(this.buffer, arguments);
  };
});

_each2["default"](CodeGenerator.generators, function (generator) {
  _extend2["default"](CodeGenerator.prototype, generator);
});

module.exports = function (ast, opts, code) {
  var gen = new CodeGenerator(ast, opts, code);
  return gen.generate();
};

module.exports.CodeGenerator = CodeGenerator;