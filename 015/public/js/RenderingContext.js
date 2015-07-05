'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var RenderingContext = (function () {
  function RenderingContext(id) {
    _classCallCheck(this, RenderingContext);

    var canvas = document.getElementById(id);
    var canvasSize = Math.min(window.innerWidth, window.innerHeight);
    canvas.width = canvasSize;
    canvas.height = canvasSize;

    this.canvas = canvas;
    this.gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    this.program = null;
  }

  _createClass(RenderingContext, [{
    key: 'createProgram',
    value: function createProgram(ids) {
      var _this = this;

      var gl = this.gl;
      var program = gl.createProgram();
      ids.map(function (id) {
        gl.attachShader(program, _this.createShader(id));
      });

      gl.linkProgram(program);

      if (gl.getProgramParameter(program, gl.LINK_STATUS)) {
        gl.useProgram(program);
        this.program = program;
      } else {
        console.error(gl.getProgramInfoLog(program));
      }
    }
  }, {
    key: 'createShader',
    value: function createShader(id) {
      var gl = this.gl;
      var source = document.getElementById(id);
      var shader = undefined;

      switch (source.type) {
        case 'x-shader/x-vertex':
          shader = gl.createShader(gl.VERTEX_SHADER);
          break;
        case 'x-shader/x-fragment':
          shader = gl.createShader(gl.FRAGMENT_SHADER);
          break;
        default:
          console.error('The shader type is not an accepted value.');
      }

      gl.shaderSource(shader, source.text);
      gl.compileShader(shader);

      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
      }

      return shader;
    }
  }, {
    key: 'bindVbos',
    value: function bindVbos(vboAttribs) {
      var _this2 = this;

      vboAttribs.map(function (vboAttrib) {
        _this2.bindVbo(vboAttrib.name, vboAttrib.vertices, vboAttrib.stride);
      });
    }
  }, {
    key: 'bindVbo',
    value: function bindVbo(name, vertices, stride) {
      var gl = this.gl;
      var program = this.program;
      var location = gl.getAttribLocation(program, name);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.createVbo(vertices));
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, stride, gl.FLOAT, false, 0, 0);
    }
  }, {
    key: 'createVbo',
    value: function createVbo(vertices) {
      var gl = this.gl;
      var vbo = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
      return vbo;
    }
  }, {
    key: 'bindIbo',
    value: function bindIbo(indexes) {
      var gl = this.gl;
      var ibo = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Int16Array(indexes), gl.STATIC_DRAW);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    }
  }, {
    key: 'enableDepthTest',
    value: function enableDepthTest() {
      var gl = this.gl;
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
    }
  }, {
    key: 'bindUniforms',

    // uniform bind
    value: function bindUniforms(uniformAttribs) {
      var _this3 = this;

      uniformAttribs.map(function (uniformAttrib) {
        return _this3.bindUniform(uniformAttrib.name, uniformAttrib.type, uniformAttrib.value);
      });
    }
  }, {
    key: 'bindUniform',
    value: function bindUniform(name, type, value) {
      var gl = this.gl;
      var location = gl.getUniformLocation(this.program, name);

      switch (type) {
        case 'matrix4fv':
          gl.uniformMatrix4fv(location, false, value);
          break;
        case '4fv':
          gl.uniform4fv(location, value);
          break;
        case '3fv':
          gl.uniform3fv(location, value);
          break;
        case '2fv':
          gl.uniform2fv(location, value);
          break;
        case '1fv':
          gl.uniform1fv(location, value);
          break;
        case '1f':
          gl.uniform1f(location, value);
          break;
        case '1iv':
          gl.uniform1iv(location, value);
          break;
        case '1i':
          gl.uniform1i(location, value);
          break;
        default:
      }
    }
  }, {
    key: 'clear',
    value: function clear(color, viewport) {
      var clearDepth = arguments[2] === undefined ? 1.0 : arguments[2];

      var gl = this.gl;

      if (color) {
        gl.clearColor(color.r, color.g, color.b, color.a);
      } else {
        gl.clearColor(0.3, 0.3, 0.3, 1.0);
      }

      if (viewport) {
        gl.viewport(viewport.x, viewport.y, viewport.width, viewport.height);
      } else {
        gl.viewport(0, 0, this.canvas.width, this.canvas.height);
      }

      gl.clearDepth(clearDepth);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    }
  }, {
    key: 'drawArrays',
    value: function drawArrays(mode, count) {
      var first = arguments[2] === undefined ? 0 : arguments[2];

      var gl = this.gl;
      gl.drawArrays(mode, first, count);
    }
  }, {
    key: 'drawElements',
    value: function drawElements(mode, count) {
      var offset = arguments[2] === undefined ? 0 : arguments[2];

      var gl = this.gl;
      gl.drawElements(mode, count, gl.UNSIGNED_SHORT, offset);
    }
  }]);

  return RenderingContext;
})();

exports = { RenderingContext: RenderingContext };