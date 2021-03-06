/* */ 
"format cjs";
"use strict";

var _interopRequireDefault = function (obj) { return obj && obj.__esModule ? obj : { "default": obj }; };

exports.__esModule = true;
exports.TaggedTemplateExpression = TaggedTemplateExpression;
exports.TemplateElement = TemplateElement;
exports.TemplateLiteral = TemplateLiteral;

var _each = require("lodash/collection/each");

var _each2 = _interopRequireDefault(_each);

function TaggedTemplateExpression(node, print) {
  print(node.tag);
  print(node.quasi);
}

function TemplateElement(node) {
  this._push(node.value.raw);
}

function TemplateLiteral(node, print) {
  var _this = this;

  this.push("`");

  var quasis = node.quasis;
  var len = quasis.length;

  _each2["default"](quasis, function (quasi, i) {
    print(quasi);

    if (i + 1 < len) {
      _this.push("${ ");
      print(node.expressions[i]);
      _this.push(" }");
    }
  });

  this._push("`");
}