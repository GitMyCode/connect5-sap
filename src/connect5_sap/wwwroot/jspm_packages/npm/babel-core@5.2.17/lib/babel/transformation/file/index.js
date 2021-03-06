/* */ 
"format cjs";
"use strict";

var _interopRequireWildcard = function (obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (typeof obj === "object" && obj !== null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } };

var _interopRequireDefault = function (obj) { return obj && obj.__esModule ? obj : { "default": obj }; };

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

exports.__esModule = true;

var _convertSourceMap = require("convert-source-map");

var _convertSourceMap2 = _interopRequireDefault(_convertSourceMap);

var _import = require("./option-parsers");

var optionParsers = _interopRequireWildcard(_import);

var _moduleFormatters = require("../modules");

var _moduleFormatters2 = _interopRequireDefault(_moduleFormatters);

var _PluginManager = require("./plugin-manager");

var _PluginManager2 = _interopRequireDefault(_PluginManager);

var _shebangRegex = require("shebang-regex");

var _shebangRegex2 = _interopRequireDefault(_shebangRegex);

var _TraversalPath = require("../../traversal/path");

var _TraversalPath2 = _interopRequireDefault(_TraversalPath);

var _isFunction = require("lodash/lang/isFunction");

var _isFunction2 = _interopRequireDefault(_isFunction);

var _isAbsolute = require("path-is-absolute");

var _isAbsolute2 = _interopRequireDefault(_isAbsolute);

var _resolveRc = require("../../tools/resolve-rc");

var _resolveRc2 = _interopRequireDefault(_resolveRc);

var _sourceMap = require("source-map");

var _sourceMap2 = _interopRequireDefault(_sourceMap);

var _transform = require("./../index");

var _transform2 = _interopRequireDefault(_transform);

var _generate2 = require("../../generation");

var _generate3 = _interopRequireDefault(_generate2);

var _codeFrame = require("../../helpers/code-frame");

var _codeFrame2 = _interopRequireDefault(_codeFrame);

var _defaults = require("lodash/object/defaults");

var _defaults2 = _interopRequireDefault(_defaults);

var _includes = require("lodash/collection/includes");

var _includes2 = _interopRequireDefault(_includes);

var _traverse = require("../../traversal");

var _traverse2 = _interopRequireDefault(_traverse);

var _assign = require("lodash/object/assign");

var _assign2 = _interopRequireDefault(_assign);

var _Logger = require("./logger");

var _Logger2 = _interopRequireDefault(_Logger);

var _parse2 = require("../../helpers/parse");

var _parse3 = _interopRequireDefault(_parse2);

var _Scope = require("../../traversal/scope");

var _Scope2 = _interopRequireDefault(_Scope);

var _slash = require("slash");

var _slash2 = _interopRequireDefault(_slash);

var _clone = require("lodash/lang/clone");

var _clone2 = _interopRequireDefault(_clone);

var _import2 = require("../../util");

var util = _interopRequireWildcard(_import2);

var _import3 = require("../../api/node");

var api = _interopRequireWildcard(_import3);

var _path = require("path");

var _path2 = _interopRequireDefault(_path);

var _each = require("lodash/collection/each");

var _each2 = _interopRequireDefault(_each);

var _import4 = require("../../types");

var t = _interopRequireWildcard(_import4);

var checkTransformerVisitor = {
  exit: function exit(node, parent, scope, state) {
    checkPath(state.stack, this);
  }
};

function checkPath(stack, path) {
  _each2["default"](stack, function (pass) {
    if (pass.shouldRun || pass.ran) return;
    pass.checkPath(path);
  });
}

var File = (function () {
  function File(_x4, pipeline) {
    var opts = arguments[0] === undefined ? {} : arguments[0];

    _classCallCheck(this, File);

    this.dynamicImportTypes = {};
    this.dynamicImportIds = {};
    this.dynamicImports = [];

    this.declarations = {};
    this.usedHelpers = {};
    this.dynamicData = {};
    this.data = {};
    this.uids = {};

    this.pipeline = pipeline;
    this.log = new _Logger2["default"](this, opts.filename || "unknown");
    this.opts = this.normalizeOptions(opts);
    this.ast = {};

    this.buildTransformers();
  }

  File.prototype.normalizeOptions = function normalizeOptions(opts) {
    opts = _assign2["default"]({}, opts);

    if (opts.filename) {
      var rcFilename = opts.filename;
      if (!_isAbsolute2["default"](rcFilename)) rcFilename = _path2["default"].join(process.cwd(), rcFilename);
      opts = _resolveRc2["default"](rcFilename, opts);
    }

    //

    for (var key in opts) {
      if (key[0] === "_") continue;

      var option = File.options[key];
      if (!option) this.log.error("Unknown option: " + key, ReferenceError);
    }

    for (var key in File.options) {
      var option = File.options[key];

      var val = opts[key];
      if (!val && option.optional) continue;

      if (val && option.deprecated) {
        throw new Error("Deprecated option " + key + ": " + option.deprecated);
      }

      if (val == null) {
        val = _clone2["default"](option["default"]);
      }

      var optionParser = optionParsers[option.type];
      if (optionParser) val = optionParser(key, val, this.pipeline);

      if (option.alias) {
        opts[option.alias] = opts[option.alias] || val;
      } else {
        opts[key] = val;
      }
    }

    if (opts.inputSourceMap) {
      opts.sourceMaps = true;
    }

    // normalize windows path separators to unix
    opts.filename = _slash2["default"](opts.filename);
    if (opts.sourceRoot) {
      opts.sourceRoot = _slash2["default"](opts.sourceRoot);
    }

    if (opts.moduleId) {
      opts.moduleIds = true;
    }

    opts.basename = _path2["default"].basename(opts.filename, _path2["default"].extname(opts.filename));

    opts.ignore = util.arrayify(opts.ignore, util.regexify);
    opts.only = util.arrayify(opts.only, util.regexify);

    _defaults2["default"](opts, {
      moduleRoot: opts.sourceRoot
    });

    _defaults2["default"](opts, {
      sourceRoot: opts.moduleRoot
    });

    _defaults2["default"](opts, {
      filenameRelative: opts.filename
    });

    _defaults2["default"](opts, {
      sourceFileName: opts.filenameRelative,
      sourceMapName: opts.filenameRelative
    });

    //

    if (opts.externalHelpers) {
      this.set("helpersNamespace", t.identifier("babelHelpers"));
    }

    return opts;
  };

  File.prototype.isLoose = function isLoose(key) {
    return _includes2["default"](this.opts.loose, key);
  };

  File.prototype.buildTransformers = function buildTransformers() {
    var file = this;

    var transformers = this.transformers = {};

    var secondaryStack = [];
    var stack = [];

    // build internal transformers
    _each2["default"](this.pipeline.transformers, function (transformer, key) {
      var pass = transformers[key] = transformer.buildPass(file);

      if (pass.canTransform()) {
        stack.push(pass);

        if (transformer.metadata.secondPass) {
          secondaryStack.push(pass);
        }

        if (transformer.manipulateOptions) {
          transformer.manipulateOptions(file.opts, file);
        }
      }
    });

    // init plugins!
    var beforePlugins = [];
    var afterPlugins = [];
    var pluginManager = new _PluginManager2["default"]({
      file: this,
      transformers: this.transformers,
      before: beforePlugins,
      after: afterPlugins
    });
    for (var i = 0; i < file.opts.plugins.length; i++) {
      pluginManager.add(file.opts.plugins[i]);
    }
    stack = beforePlugins.concat(stack, afterPlugins);

    // register
    this.transformerStack = stack.concat(secondaryStack);
  };

  File.prototype.set = function set(key, val) {
    return this.data[key] = val;
  };

  File.prototype.setDynamic = function setDynamic(key, fn) {
    this.dynamicData[key] = fn;
  };

  File.prototype.get = function get(key) {
    var data = this.data[key];
    if (data) {
      return data;
    } else {
      var dynamic = this.dynamicData[key];
      if (dynamic) {
        return this.set(key, dynamic());
      }
    }
  };

  File.prototype.resolveModuleSource = (function (_resolveModuleSource) {
    function resolveModuleSource(_x) {
      return _resolveModuleSource.apply(this, arguments);
    }

    resolveModuleSource.toString = function () {
      return _resolveModuleSource.toString();
    };

    return resolveModuleSource;
  })(function (source) {
    var resolveModuleSource = this.opts.resolveModuleSource;
    if (resolveModuleSource) source = resolveModuleSource(source, this.opts.filename);
    return source;
  });

  File.prototype.addImport = function addImport(source, name, type) {
    name = name || source;
    var id = this.dynamicImportIds[name];

    if (!id) {
      source = this.resolveModuleSource(source);
      id = this.dynamicImportIds[name] = this.scope.generateUidIdentifier(name);

      var specifiers = [t.importDefaultSpecifier(id)];
      var declar = t.importDeclaration(specifiers, t.literal(source));
      declar._blockHoist = 3;

      if (type) {
        var modules = this.dynamicImportTypes[type] = this.dynamicImportTypes[type] || [];
        modules.push(declar);
      }

      if (this.transformers["es6.modules"].canTransform()) {
        this.moduleFormatter.importSpecifier(specifiers[0], declar, this.dynamicImports);
        this.moduleFormatter.hasLocalImports = true;
      } else {
        this.dynamicImports.push(declar);
      }
    }

    return id;
  };

  File.prototype.attachAuxiliaryComment = function attachAuxiliaryComment(node) {
    var comment = this.opts.auxiliaryComment;
    if (comment) {
      node.leadingComments = node.leadingComments || [];
      node.leadingComments.push({
        type: "Line",
        value: " " + comment
      });
    }
    return node;
  };

  File.prototype.addHelper = function addHelper(name) {
    var isSolo = _includes2["default"](File.soloHelpers, name);

    if (!isSolo && !_includes2["default"](File.helpers, name)) {
      throw new ReferenceError("Unknown helper " + name);
    }

    var program = this.ast.program;

    var declar = this.declarations[name];
    if (declar) return declar;

    this.usedHelpers[name] = true;

    if (!isSolo) {
      var generator = this.get("helperGenerator");
      var runtime = this.get("helpersNamespace");
      if (generator) {
        return generator(name);
      } else if (runtime) {
        var id = t.identifier(t.toIdentifier(name));
        return t.memberExpression(runtime, id);
      }
    }

    var ref = util.template("helper-" + name);

    var uid = this.declarations[name] = this.scope.generateUidIdentifier(name);

    if (t.isFunctionExpression(ref) && !ref.id) {
      ref.body._compact = true;
      ref._generated = true;
      ref.id = uid;
      ref.type = "FunctionDeclaration";
      this.attachAuxiliaryComment(ref);
      this.path.unshiftContainer("body", ref);
    } else {
      ref._compact = true;
      this.scope.push({
        id: uid,
        init: ref,
        unique: true
      });
    }

    return uid;
  };

  File.prototype.errorWithNode = function errorWithNode(node, msg) {
    var Error = arguments[2] === undefined ? SyntaxError : arguments[2];

    var loc = node.loc.start;
    var err = new Error("Line " + loc.line + ": " + msg);
    err.loc = loc;
    return err;
  };

  File.prototype.checkPath = (function (_checkPath) {
    function checkPath(_x2) {
      return _checkPath.apply(this, arguments);
    }

    checkPath.toString = function () {
      return _checkPath.toString();
    };

    return checkPath;
  })(function (path) {
    if (Array.isArray(path)) {
      for (var i = 0; i < path.length; i++) {
        this.checkPath(path[i]);
      }
      return;
    }

    var stack = this.transformerStack;

    checkPath(stack, path);

    path.traverse(checkTransformerVisitor, {
      stack: stack
    });
  });

  File.prototype.mergeSourceMap = function mergeSourceMap(map) {
    var opts = this.opts;

    var inputMap = opts.inputSourceMap;

    if (inputMap) {
      map.sources[0] = inputMap.file;

      var inputMapConsumer = new _sourceMap2["default"].SourceMapConsumer(inputMap);
      var outputMapConsumer = new _sourceMap2["default"].SourceMapConsumer(map);
      var outputMapGenerator = _sourceMap2["default"].SourceMapGenerator.fromSourceMap(outputMapConsumer);
      outputMapGenerator.applySourceMap(inputMapConsumer);

      var mergedMap = outputMapGenerator.toJSON();
      mergedMap.sources = inputMap.sources;
      mergedMap.file = inputMap.file;
      return mergedMap;
    }

    return map;
  };

  File.prototype.getModuleFormatter = function getModuleFormatter(type) {
    var ModuleFormatter = _isFunction2["default"](type) ? type : _moduleFormatters2["default"][type];

    if (!ModuleFormatter) {
      var loc = util.resolveRelative(type);
      if (loc) ModuleFormatter = require(loc);
    }

    if (!ModuleFormatter) {
      throw new ReferenceError("Unknown module formatter type " + JSON.stringify(type));
    }

    return new ModuleFormatter(this);
  };

  File.prototype.parse = (function (_parse) {
    function parse(_x3) {
      return _parse.apply(this, arguments);
    }

    parse.toString = function () {
      return _parse.toString();
    };

    return parse;
  })(function (code) {
    var opts = this.opts;

    //

    var parseOpts = {
      highlightCode: opts.highlightCode,
      nonStandard: opts.nonStandard,
      filename: opts.filename,
      plugins: {}
    };

    var features = parseOpts.features = {};
    for (var key in this.transformers) {
      var transformer = this.transformers[key];
      features[key] = transformer.canTransform();
    }

    parseOpts.looseModules = this.isLoose("es6.modules");
    parseOpts.strictMode = features.strict;
    parseOpts.sourceType = "module";

    this.log.debug("Parse start");
    var tree = _parse3["default"](code, parseOpts);
    this.log.debug("Parse stop");
    return tree;
  });

  File.prototype._addAst = function _addAst(ast) {
    this.path = _TraversalPath2["default"].get(null, null, ast, ast, "program", this);
    this.scope = this.path.scope;
    this.ast = ast;

    this.path.traverse({
      enter: function enter(node, parent, scope) {
        if (this.isScope()) {
          for (var key in scope.bindings) {
            scope.bindings[key].setTypeAnnotation();
          }
        }
      }
    });
  };

  File.prototype.addAst = function addAst(ast) {
    this.log.debug("Start set AST");
    this._addAst(ast);
    this.log.debug("End set AST");

    this.log.debug("Start prepass");
    this.checkPath(this.path);
    this.log.debug("End prepass");

    this.log.debug("Start module formatter init");
    var modFormatter = this.moduleFormatter = this.getModuleFormatter(this.opts.modules);
    if (modFormatter.init && this.transformers["es6.modules"].canTransform()) {
      modFormatter.init();
    }
    this.log.debug("End module formatter init");

    this.call("pre");
    _each2["default"](this.transformerStack, function (pass) {
      pass.transform();
    });
    this.call("post");
  };

  File.prototype.wrap = function wrap(code, callback) {
    code = code + "";

    try {
      if (this.shouldIgnore()) {
        return {
          metadata: {},
          code: code,
          map: null,
          ast: null
        };
      }

      callback();

      return this.generate();
    } catch (err) {
      if (err._babel) {
        throw err;
      } else {
        err._babel = true;
      }

      var message = err.message = "" + this.opts.filename + ": " + err.message;

      var loc = err.loc;
      if (loc) {
        err.codeFrame = _codeFrame2["default"](code, loc.line, loc.column + 1, this.opts);
        message += "\n" + err.codeFrame;
      }

      if (err.stack) {
        var newStack = err.stack.replace(err.message, message);
        try {
          err.stack = newStack;
        } catch (e) {}
      }

      throw err;
    }
  };

  File.prototype.addCode = function addCode(code, parseCode) {
    code = (code || "") + "";
    code = this.parseInputSourceMap(code);
    this.code = code;

    if (parseCode) {
      this.parseShebang();
      this.addAst(this.parse(this.code));
    }
  };

  File.prototype.shouldIgnore = function shouldIgnore() {
    var opts = this.opts;
    return util.shouldIgnore(opts.filename, opts.ignore, opts.only);
  };

  File.prototype.call = function call(key) {
    var stack = this.transformerStack;
    for (var i = 0; i < stack.length; i++) {
      var transformer = stack[i].transformer;
      var fn = transformer[key];
      if (fn) fn(this);
    }
  };

  File.prototype.parseInputSourceMap = function parseInputSourceMap(code) {
    var opts = this.opts;

    if (opts.inputSourceMap !== false) {
      var inputMap = _convertSourceMap2["default"].fromSource(code);
      if (inputMap) {
        opts.inputSourceMap = inputMap.toObject();
        code = _convertSourceMap2["default"].removeComments(code);
      }
    }

    return code;
  };

  File.prototype.parseShebang = function parseShebang() {
    var shebangMatch = _shebangRegex2["default"].exec(this.code);
    if (shebangMatch) {
      this.shebang = shebangMatch[0];
      this.code = this.code.replace(_shebangRegex2["default"], "");
    }
  };

  File.prototype.generate = (function (_generate) {
    function generate() {
      return _generate.apply(this, arguments);
    }

    generate.toString = function () {
      return _generate.toString();
    };

    return generate;
  })(function () {
    var opts = this.opts;
    var ast = this.ast;

    var result = {
      metadata: {},
      code: "",
      map: null,
      ast: null
    };

    if (this.opts.metadataUsedHelpers) {
      result.metadata.usedHelpers = Object.keys(this.usedHelpers);
    }

    if (opts.ast) result.ast = ast;
    if (!opts.code) return result;

    this.log.debug("Generation start");

    var _result = _generate3["default"](ast, opts, this.code);
    result.code = _result.code;
    result.map = _result.map;

    this.log.debug("Generation end");

    if (this.shebang) {
      // add back shebang
      result.code = "" + this.shebang + "\n" + result.code;
    }

    if (result.map) {
      result.map = this.mergeSourceMap(result.map);
    }

    if (opts.sourceMaps === "inline" || opts.sourceMaps === "both") {
      result.code += "\n" + _convertSourceMap2["default"].fromObject(result.map).toComment();
    }

    if (opts.sourceMaps === "inline") {
      result.map = null;
    }

    return result;
  });

  _createClass(File, null, [{
    key: "helpers",
    value: ["inherits", "defaults", "create-class", "create-decorated-class", "create-decorated-object", "define-decorated-property-descriptor", "tagged-template-literal", "tagged-template-literal-loose", "to-array", "to-consumable-array", "sliced-to-array", "sliced-to-array-loose", "object-without-properties", "has-own", "slice", "bind", "define-property", "async-to-generator", "interop-require-wildcard", "interop-require-default", "typeof", "extends", "get", "set", "class-call-check", "object-destructuring-empty", "temporal-undefined", "temporal-assert-defined", "self-global", "default-props", "instanceof",

    // legacy
    "interop-require"],
    enumerable: true
  }, {
    key: "soloHelpers",
    value: ["ludicrous-proxy-create", "ludicrous-proxy-directory"],
    enumerable: true
  }, {
    key: "options",
    value: require("./options"),
    enumerable: true
  }]);

  return File;
})();

exports["default"] = File;
module.exports = exports["default"];

// `err.stack` may be a readonly property in some environments