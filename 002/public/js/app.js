(function() {
  function main() {
    var c  = document.getElementById('canvas');
    var gl = c.getContext('webgl') || c.getContext('experimental-webgl');

    var canvasSize = Math.min(this.innerWidth, this.innerHeight);

    c.width  = canvasSize;
    c.height = canvasSize;

    var vs = createShader('vs');
    var fs = createShader('fs');

    if (!vs || !fs) {
      return;
    }

    var program = createProgram([vs, fs]);

    var locations = new Array(2);
    locations[0]  = gl.getAttribLocation(program, 'position');
    locations[1]  = gl.getAttribLocation(program, 'color');

    var strides = [3, 4];

    var position = [
      -0.5,  0.5, 0.0,
       0.5,  0.5, 0.0,
      -0.5, -0.5, 0.0,
       0.5, -0.5, 0.0
    ];

    // 色情報、左から順にRGBA
    var color = [
      1.0, 0.0, 0.0, 1.0,
      0.0, 1.0, 0.0, 1.0,
      0.0, 0.0, 1.0, 1.0,
      1.0, 1.0, 1.0, 1.0
    ];

    // vboの作成
    var positionVbo  = createVbo(position);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionVbo);
    gl.enableVertexAttribArray(locations[0]);
    gl.vertexAttribPointer(locations[0], strides[0], gl.FLOAT, false, 0, 0);

    var colorVbo = createVbo(color);
    gl.bindBuffer(gl.ARRAY_BUFFER, colorVbo);
    gl.enableVertexAttribArray(locations[1]);
    gl.vertexAttribPointer(locations[1], strides[1], gl.FLOAT, false, 0, 0);

    // iboの作成
    var indexes = [
      0, 1, 2,
      1, 2, 3
    ];

    var ibo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Int16Array(indexes), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);

    var mMatrix   = mat4.identity(mat4.create());
    var vMatrix   = mat4.identity(mat4.create());
    var pMatrix   = mat4.identity(mat4.create());
    var vpMatrix  = mat4.identity(mat4.create());
    var mvpMatrix = mat4.identity(mat4.create());

    var fovy = 45;
    var d    = 1 / Math.tan(fovy / 2 * Math.PI / 180);

    // ビュー座標変換
    mat4.lookAt(vMatrix, [0.0, 0.0, d], [0.0, 0.0, 0.0], [0.0, 1.0, 0.0]);

    // 投影変換・クリッピング
    mat4.perspective(pMatrix, fovy, 1, 0.1, 100.0);

    // かける順番に注意
    mat4.multiply(vpMatrix, pMatrix, vMatrix);
    mat4.multiply(mvpMatrix, mMatrix, vpMatrix);

    var uniLocation = gl.getUniformLocation(program, 'mvpMatrix');
    gl.uniformMatrix4fv(uniLocation, false, mvpMatrix);

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.viewport(0, 0, c.width, c.height);
    gl.clearDepth(1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.drawElements(gl.TRIANGLES, indexes.length, gl.UNSIGNED_SHORT, 0);
    gl.flush();

    function createShader(id) {
      var shaderSrouce = document.getElementById(id);
      var shader;

      if (!shaderSrouce) {
        console.error('指定された要素が存在しません');
        return;
      }

      switch(shaderSrouce.type){
      case 'x-shader/x-vertex':
        shader = gl.createShader(gl.VERTEX_SHADER);
        break;
      case 'x-shader/x-fragment':
        shader = gl.createShader(gl.FRAGMENT_SHADER);
        break;
      default :
        return;
      }

      gl.shaderSource(shader, shaderSrouce.text);
      gl.compileShader(shader);
      if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)){
        return shader;
      } else {
        console.error(gl.getShaderInfoLog(shader));
      }
    }

    function createProgram(shaders) {
      var program = gl.createProgram();

      shaders.forEach(function(shader){ gl.attachShader(program, shader); });
      gl.linkProgram(program);
      if(gl.getProgramParameter(program, gl.LINK_STATUS)){
        gl.useProgram(program);
        return program;
      }else{
        console.error(gl.getProgramInfoLog(program));
      }
    }

    function createVbo(data) {
      var vbo = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
      return vbo;
    }
  }

  this.addEventListener('load', main);

})();
