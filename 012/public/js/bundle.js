(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
module.exports = require('./src/TGContext'); 

},{"./src/TGContext":2}],2:[function(require,module,exports){
'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var TGContext = (function () {
  function TGContext(id) {
    _classCallCheck(this, TGContext);

    var canvas = document.getElementById(id);
    this.gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    this.program = null;
  }

  _createClass(TGContext, [{
    key: 'createProgram',
    value: function createProgram(ids) {
      var _this = this;

      var program = this.gl.createProgram();

      ids.map(function (id) {
        _this.gl.attachShader(program, _this.createShader(id));
      });

      this.gl.linkProgram(program);

      if (this.gl.getProgramParameter(program, this.gl.LINKS_STATUS)) {
        this.gl.useProgram(program);
        this.program = program;
      } else {
        console.error(this.gl.getProgramInfoLog(program));
      }
    }
  }, {
    key: 'createShader',
    value: function createShader(id) {
      var source = document.getElementById(id);
      var shader = undefined;

      switch (source.type) {
        case 'x-shader/x-vertex':
          shader = this.gl.createShader(this.gl.VERTEX_SHADER);
          break;
        case 'x-shader/x-fragment':
          shader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
          break;
        default:
          console.error('The shader type is not an accepted value.');
      }

      this.gl.shaderSource(shader, source.text);
      this.gl.compileShader(shader);

      if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
        console.error(this.gl.getShaderInfoLog(shader));
      }

      return shader;
    }
  }, {
    key: 'bindVbos',
    value: function bindVbos(vboAttribs) {
      var _this2 = this;

      vboAttribs.forEach(function (vboAttrib) {
        _this2.bindVbo(vboAttrib.name, vboAttrib.vertices, vboAttrib.stride);
      });
    }
  }, {
    key: 'bindVbo',
    value: function bindVbo(name, vertices, stride) {
      var location = this.gl.getAttribLocation(this.program, name);
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.createVbo(vertices));
      this.gl.enableVertexAttribArray(location);
      this.gl.vertexAttribPointer(location, stride, this.gl.FLOAT, false, 0, 0);
    }
  }, {
    key: 'createVbo',
    value: function createVbo(vertices) {
      var vbo = this.gl.createBuffer();
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vbo);
      this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(vertices), this.gl.STATIC_DRAW);
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
      return vbo;
    }
  }, {
    key: 'bindIbo',
    value: function bindIbo(indexes) {
      var ibo = this.gl.createBuffer();
      this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, ibo);
      this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Int16Array(indexes), this.gl.STATIC_DRAW);
      this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, null);
      this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, ibo);
    }
  }, {
    key: 'enableDepthTest',
    value: function enableDepthTest() {
      this.gl.enable(this.gl.DEPTH_TEST);
      this.gl.depthFunc(this.gl.LEQUAL);
    }
  }, {
    key: 'bindUniforms',

    // uniform bind
    value: function bindUniforms(uniformAttribs) {
      var _this3 = this;

      uniformAttribs.forEach(function (uniformAttrib) {
        return _this3.bindUniform(uniformAttrib.name, uniformAttrib.type, uniformAttrib.value);
      });
    }
  }, {
    key: 'bindUniform',
    value: function bindUniform(name, type, value) {
      var location = this.gl.getUniformLocation(this.program, name);

      switch (type) {
        case 'matrix4fv':
          this.gl.uniformMatrix4fv(location, false, value);
          break;
        case '4fv':
          this.gl.uniform4fv(location, value);
          break;
        case '3fv':
          this.gl.uniform3fv(location, value);
          break;
        case '2fv':
          this.gl.uniform2fv(location, value);
          break;
        case '1fv':
          this.gl.uniform1fv(location, value);
          break;
        case '1f':
          this.gl.uniform1f(location, value);
          break;
        case '1iv':
          this.gl.uniform1iv(location, value);
          break;
        case '1i':
          this.gl.uniform1i(location, value);
          break;
        default:
      }
    }
  }, {
    key: 'drawArrays',
    value: function drawArrays(mode, count) {
      var first = arguments[2] === undefined ? 0 : arguments[2];

      this.gl.drawArrays(mode, first, count);
    }
  }, {
    key: 'drawElements',
    value: function drawElements(mode, count) {
      var offset = arguments[2] === undefined ? 0 : arguments[2];

      this.gl.drawElements(mode, count, this.gl.UNSIGNED_SHORT, offset);
    }
  }]);

  return TGContext;
})();

exports = { TGContext: TGContext };
},{}]},{},[1]);
