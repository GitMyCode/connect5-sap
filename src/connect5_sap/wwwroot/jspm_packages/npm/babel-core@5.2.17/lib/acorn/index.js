/* */ 
"format cjs";
"use strict";

var _defaults = function (obj, defaults) { var keys = Object.getOwnPropertyNames(defaults); for (var i = 0; i < keys.length; i++) { var key = keys[i]; var value = Object.getOwnPropertyDescriptor(defaults, key); if (value && value.configurable && obj[key] === undefined) { Object.defineProperty(obj, key, value); } } return obj; };

var _interopRequireWildcard = function (obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (typeof obj === "object" && obj !== null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } };

var _interopRequireDefault = function (obj) { return obj && obj.__esModule ? obj : { "default": obj }; };

exports.__esModule = true;

require("./plugins/flow");

var _inject = require("acorn-jsx/inject");

var _inject2 = _interopRequireDefault(_inject);

var _import = require("./src/index");

var acorn = _interopRequireWildcard(_import);

_defaults(exports, _interopRequireWildcard(_import));

_inject2["default"](acorn);