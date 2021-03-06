/* */ 
"format cjs";
"use strict";

var _interopRequireWildcard = function (obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (typeof obj === "object" && obj !== null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } };

var _interopRequireDefault = function (obj) { return obj && obj.__esModule ? obj : { "default": obj }; };

exports.__esModule = true;
exports.canCompile = canCompile;
exports.resolve = resolve;
exports.resolveRelative = resolveRelative;
exports.list = list;
exports.regexify = regexify;
exports.arrayify = arrayify;
exports.booleanify = booleanify;
exports.shouldIgnore = shouldIgnore;

//

exports.template = template;
exports.parseTemplate = parseTemplate;

require("./patch");

var _escapeRegExp = require("lodash/string/escapeRegExp");

var _escapeRegExp2 = _interopRequireDefault(_escapeRegExp);

var _buildDebug = require("debug/node");

var _buildDebug2 = _interopRequireDefault(_buildDebug);

var _cloneDeep = require("lodash/lang/cloneDeep");

var _cloneDeep2 = _interopRequireDefault(_cloneDeep);

var _isBoolean = require("lodash/lang/isBoolean");

var _isBoolean2 = _interopRequireDefault(_isBoolean);

var _import = require("./messages");

var messages = _interopRequireWildcard(_import);

var _minimatch = require("minimatch");

var _minimatch2 = _interopRequireDefault(_minimatch);

var _contains = require("lodash/collection/contains");

var _contains2 = _interopRequireDefault(_contains);

var _traverse = require("./traversal");

var _traverse2 = _interopRequireDefault(_traverse);

var _isString = require("lodash/lang/isString");

var _isString2 = _interopRequireDefault(_isString);

var _isRegExp = require("lodash/lang/isRegExp");

var _isRegExp2 = _interopRequireDefault(_isRegExp);

var _Module = require("module");

var _Module2 = _interopRequireDefault(_Module);

var _isEmpty = require("lodash/lang/isEmpty");

var _isEmpty2 = _interopRequireDefault(_isEmpty);

var _parse = require("./helpers/parse");

var _parse2 = _interopRequireDefault(_parse);

var _path = require("path");

var _path2 = _interopRequireDefault(_path);

var _each = require("lodash/collection/each");

var _each2 = _interopRequireDefault(_each);

var _has = require("lodash/object/has");

var _has2 = _interopRequireDefault(_has);

var _fs = require("fs");

var _fs2 = _interopRequireDefault(_fs);

var _import2 = require("./types");

var t = _interopRequireWildcard(_import2);

var _slash = require("slash");

var _slash2 = _interopRequireDefault(_slash);

var _inherits$inspect = require("util");

exports.inherits = _inherits$inspect.inherits;
exports.inspect = _inherits$inspect.inspect;
var debug = _buildDebug2["default"]("babel");

exports.debug = debug;

function canCompile(filename, altExts) {
  var exts = altExts || canCompile.EXTENSIONS;
  var ext = _path2["default"].extname(filename);
  return _contains2["default"](exts, ext);
}

canCompile.EXTENSIONS = [".js", ".jsx", ".es6", ".es"];

function resolve(loc) {
  try {
    return require.resolve(loc);
  } catch (err) {
    return null;
  }
}

var relativeMod;

function resolveRelative(loc) {
  // we're in the browser, probably
  if (typeof _Module2["default"] === "object") return null;

  if (!relativeMod) {
    relativeMod = new _Module2["default"]();
    relativeMod.paths = _Module2["default"]._nodeModulePaths(process.cwd());
  }

  try {
    return _Module2["default"]._resolveFilename(loc, relativeMod);
  } catch (err) {
    return null;
  }
}

function list(val) {
  if (!val) {
    return [];
  } else if (Array.isArray(val)) {
    return val;
  } else if (typeof val === "string") {
    return val.split(",");
  } else {
    return [val];
  }
}

function regexify(val) {
  if (!val) return new RegExp(/.^/);
  if (Array.isArray(val)) val = new RegExp(val.map(_escapeRegExp2["default"]).join("|"), "i");
  if (_isString2["default"](val)) return _minimatch2["default"].makeRe(val, { nocase: true });
  if (_isRegExp2["default"](val)) return val;
  throw new TypeError("illegal type for regexify");
}

function arrayify(val, mapFn) {
  if (!val) return [];
  if (_isBoolean2["default"](val)) return arrayify([val], mapFn);
  if (_isString2["default"](val)) return arrayify(list(val), mapFn);

  if (Array.isArray(val)) {
    if (mapFn) val = val.map(mapFn);
    return val;
  }

  return [val];
}

function booleanify(val) {
  if (val === "true") return true;
  if (val === "false") return false;
  return val;
}

function shouldIgnore(filename, ignore, only) {
  filename = _slash2["default"](filename);
  if (only.length) {
    for (var i = 0; i < only.length; i++) {
      if (only[i].test(filename)) return false;
    }
    return true;
  } else if (ignore.length) {
    for (var i = 0; i < ignore.length; i++) {
      if (ignore[i].test(filename)) return true;
    }
  }

  return false;
}

var templateVisitor = {
  enter: function enter(node, parent, scope, nodes) {
    if (t.isExpressionStatement(node)) {
      node = node.expression;
    }

    if (t.isIdentifier(node) && _has2["default"](nodes, node.name)) {
      this.skip();
      this.replaceInline(nodes[node.name]);
    }
  }
};
function template(name, nodes, keepExpression) {
  var ast = exports.templates[name];
  if (!ast) throw new ReferenceError("unknown template " + name);

  if (nodes === true) {
    keepExpression = true;
    nodes = null;
  }

  ast = _cloneDeep2["default"](ast);

  if (!_isEmpty2["default"](nodes)) {
    _traverse2["default"](ast, templateVisitor, null, nodes);
  }

  if (ast.body.length > 1) return ast.body;

  var node = ast.body[0];

  if (!keepExpression && t.isExpressionStatement(node)) {
    return node.expression;
  } else {
    return node;
  }
}

function parseTemplate(loc, code) {
  var ast = _parse2["default"](code, { filename: loc, looseModules: true }).program;
  ast = _traverse2["default"].removeProperties(ast);
  return ast;
}

function loadTemplates() {
  var templates = {};

  var templatesLoc = _path2["default"].join(__dirname, "transformation/templates");
  if (!_fs2["default"].existsSync(templatesLoc)) {
    throw new ReferenceError(messages.get("missingTemplatesDirectory"));
  }

  _each2["default"](_fs2["default"].readdirSync(templatesLoc), function (name) {
    if (name[0] === ".") return;

    var key = _path2["default"].basename(name, _path2["default"].extname(name));
    var loc = _path2["default"].join(templatesLoc, name);
    var code = _fs2["default"].readFileSync(loc, "utf8");

    templates[key] = parseTemplate(loc, code);
  });

  return templates;
}

try {
  exports.templates = require("../../templates.json");
} catch (err) {
  if (err.code !== "MODULE_NOT_FOUND") throw err;
  exports.templates = loadTemplates();
}