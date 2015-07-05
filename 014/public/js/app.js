/* global mat4 */
( function() {
  function main() {
    var c  = document.getElementById( 'canvas' );
    var gl = c.getContext( 'webgl' ) || c.getContext( 'experimental-webgl' );

    var canvasSize = Math.min( this.innerWidth, this.innerHeight );

    c.width  = canvasSize;
    c.height = canvasSize;

    var textureAttrib = [ { texture: gl.createTexture(), isLoaded: false } ];

    initTexture( '../img/shade.png', textureAttrib, 0 );

    function initTexture( path, textureAttrib, index ) {
      var img = new Image();
      img.onload = function(){
        gl.bindTexture( gl.TEXTURE_2D, textureAttrib[index].texture );
        gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img );
        gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR );
        gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT );
        gl.generateMipmap( gl.TEXTURE_2D );
        gl.bindTexture( gl.TEXTURE_2D, null );
        textureAttrib[index].isLoaded = true;
      };
      img.src = path;
    }
    
    setTimeout( renderOctahedron, 3000 );

    function renderOctahedron() {
      var vs = createShader( 'vs' );
      var fs = createShader( 'fs' );

      if ( !vs || !fs ) {
        return;
      }

      var program = createProgram( [ vs, fs ] );

      var locations = new Array( 3 );
      locations[0]  = gl.getAttribLocation( program, 'positions' );
      locations[1]  = gl.getAttribLocation( program, 'colors' );
      locations[2]  = gl.getAttribLocation( program, 'normals' );

      var strides = [ 3, 4, 3 ];

      // vboの作成
      var positionVbo  = createVbo( positions );
      gl.bindBuffer( gl.ARRAY_BUFFER, positionVbo );
      gl.enableVertexAttribArray( locations[0] );
      gl.vertexAttribPointer( locations[0], strides[0], gl.FLOAT, false, 0, 0 );

      var colorVbo = createVbo( colors );
      gl.bindBuffer( gl.ARRAY_BUFFER, colorVbo );
      gl.enableVertexAttribArray( locations[1] );
      gl.vertexAttribPointer( locations[1], strides[1], gl.FLOAT, false, 0, 0 );

      var normalVbo = createVbo( normals );
      gl.bindBuffer( gl.ARRAY_BUFFER, normalVbo );
      gl.enableVertexAttribArray( locations[2] );
      gl.vertexAttribPointer( locations[2], strides[2], gl.FLOAT, false, 0, 0 );

      var ibo = gl.createBuffer();
      gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, ibo );
      gl.bufferData( gl.ELEMENT_ARRAY_BUFFER, new Int16Array( indexes ), gl.STATIC_DRAW );
      gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, null );
      gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, ibo );

      gl.enable( gl.DEPTH_TEST );
      gl.depthFunc( gl.LEQUAL );

      var count = 0;
      render();

      function createShader( id ) {
        var shaderSrouce = document.getElementById( id );
        var shader;

        if ( !shaderSrouce ) {
          console.error( '指定された要素が存在しません' );
          return;
        }

        switch( shaderSrouce.type ){
        case 'x-shader/x-vertex':
          shader = gl.createShader( gl.VERTEX_SHADER );
          break;
        case 'x-shader/x-fragment':
          shader = gl.createShader( gl.FRAGMENT_SHADER );
          break;
        default :
          return;
        }

        gl.shaderSource( shader, shaderSrouce.text );
        gl.compileShader( shader );
        if ( gl.getShaderParameter( shader, gl.COMPILE_STATUS ) ){
          return shader;
        } else {
          console.error( gl.getShaderInfoLog( shader ) );
        }
      }

      function createProgram( shaders ) {
        var program = gl.createProgram();

        shaders.forEach( function( shader ){ gl.attachShader( program, shader ); });
        gl.linkProgram( program );
        if( gl.getProgramParameter( program, gl.LINK_STATUS ) ){
          gl.useProgram( program );
          return program;
        }else{
          console.error( gl.getProgramInfoLog( program ) );
        }
      }

      function createVbo( data ) {
        var vbo = gl.createBuffer();
        gl.bindBuffer( gl.ARRAY_BUFFER, vbo );
        gl.bufferData( gl.ARRAY_BUFFER, new Float32Array( data ), gl.STATIC_DRAW );
        gl.bindBuffer( gl.ARRAY_BUFFER, null );
        return vbo;
      }

      function render() {
        count++;

        var deg = count % 360;
        var rad = deg * Math.PI / 180;

        var mMatrix   = mat4.identity( mat4.create() );
        var vMatrix   = mat4.identity( mat4.create() );
        var pMatrix   = mat4.identity( mat4.create() );
        var vpMatrix  = mat4.identity( mat4.create() );
        var mvpMatrix = mat4.identity( mat4.create() );

        var fovy = 45;
        var cx   = 1 * Math.sin( 0 );
        var cz   = 1 * Math.cos( 0 );

        var lightDirection = [ 0.0, 0.0, 1.0 ];
        var eyePosition    = [ cx, 0.0, cz ];
        var centerPosition = [ 0.0, 0.0, 0.0 ];

        // ビュー座標変換
        mat4.lookAt( vMatrix, eyePosition, centerPosition, [ 0.0, 1.0, 0.0 ] );
        // 投影変換・クリッピング
        mat4.perspective( pMatrix, fovy, 1, 0.1, 100.0 );

        mat4.rotateY( mMatrix, mMatrix, rad );

        // かける順番に注意
        mat4.multiply( vpMatrix, pMatrix, vMatrix );
        mat4.multiply( mvpMatrix, vpMatrix, mMatrix );

        var uLocations = new Array( 4 );
        uLocations[0]  = gl.getUniformLocation( program, 'mvpMatrix' );
        uLocations[1]  = gl.getUniformLocation( program, 'invMatrix' );
        uLocations[2]  = gl.getUniformLocation( program, 'lightDirection' );
        uLocations[3]  = gl.getUniformLocation( program, 'shadeTexture' );

        gl.uniformMatrix4fv( uLocations[0], false, mvpMatrix );

        var invMatrix = mat4.identity( mat4.create() );
        mat4.invert( invMatrix, mMatrix );

        gl.activeTexture( gl.TEXTURE0 );
        gl.bindTexture( gl.TEXTURE_2D, textureAttrib[0].texture );
        gl.uniformMatrix4fv( uLocations[1], false, invMatrix );

        gl.uniform3fv( uLocations[2], lightDirection );
        gl.uniform1i( uLocations[3], 0 );

        gl.clearColor( 0.7, 0.7, 0.7, 1.0 );
        gl.viewport( 0, 0, c.width, c.height );
        gl.clearDepth( 1.0 );
        gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );

        gl.drawElements( gl.TRIANGLES, indexes.length, gl.UNSIGNED_SHORT, 0 );
        gl.flush();

        requestAnimationFrame( render );
      }
    }
  }

  var positions = [
    -0.5,  0.0,  0.0,// 0
     0.0,  0.5,  0.0,// 1
     0.0,  0.0,  0.5,// 2
     0.0, -0.5,  0.0,// 3
     0.5,  0.0,  0.0,// 4
  
     0.5,  0.0,  0.0,// 5
     0.0,  0.5,  0.0,// 6
     0.0,  0.0, -0.5,// 7
     0.0, -0.5,  0.0,// 8
    -0.5,  0.0,  0.0 // 9
  ];
  
  // 色情報、左から順にRGBA
  var colors = [
    0.0, 0.0, 1.0, 1.0,// 0
    0.0, 0.0, 1.0, 1.0,// 1
    0.0, 0.0, 1.0, 1.0,// 2
    0.0, 0.0, 1.0, 1.0,// 3
    0.0, 0.0, 1.0, 1.0,// 4
  
    0.0, 0.0, 1.0, 1.0,// 5
    0.0, 0.0, 1.0, 1.0,// 6
    0.0, 0.0, 1.0, 1.0,// 7
    0.0, 0.0, 1.0, 1.0,// 8
    0.0, 0.0, 1.0, 1.0 // 9
  ];
  
  var normals = [
   -1.0, 0.0, 0.0,// 0
    0.0, 1.0, 0.0,// 1
    0.0, 0.0, 1.0,// 2
    0.0,-1.0, 0.0,// 3
    1.0, 0.0, 0.0,// 4
  
    1.0, 0.0, 0.0,// 5
    0.0, 1.0, 0.0,// 6
    0.0, 0.0,-1.0,// 7
    0.0,-1.0, 0.0,// 8
   -1.0, 0.0, 0.0,// 9
  ];
  
  var indexes = [
    0, 1, 2,
    0, 2, 3,
    2, 1, 4,
    2, 4, 3,

    5, 6, 7,
    5, 7, 8,
    7, 6, 9,
    7, 9, 8
  ];

  this.addEventListener( 'load', main );

} )();
