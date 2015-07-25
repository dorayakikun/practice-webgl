/* global mat4 */
/* global quat */
( function() {
  function main() {
    var c  = document.getElementById( 'canvas' );
    var gl = c.getContext( 'webgl' ) || c.getContext( 'experimental-webgl' );

    var canvasSize = Math.min( this.innerWidth, this.innerHeight );

    c.width  = canvasSize;
    c.height = canvasSize;

    var qt = quat.identity( quat.create() );
    c.addEventListener( 'mousemove', calculateQuat );

    var tex = gl.createTexture();
    initTexture( '../img/dorayaki.png', tex );

    // 待ち合わせ
    setTimeout( function() { initRender( tex ); }, 2000 );

    function initTexture( path, texture) {
      var img = new Image();
      img.onload = function(){
        gl.bindTexture( gl.TEXTURE_2D, texture );
        gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img );
        gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR );
        gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT );
        gl.generateMipmap( gl.TEXTURE_2D );
        gl.bindTexture( gl.TEXTURE_2D, null );
      };
      img.src = path;
    }

    function initRender( texture ) {
      var vs = createShader( 'vs' );
      var fs = createShader( 'fs' );
      var program = createProgram( [ vs, fs ] );

      var textureVs = createShader( 'texture_vs' );
      var textureFs = createShader( 'texture_fs' );
      var textureProgram = createProgram( [ textureVs, textureFs ] );

      //
      // 深度テストの有効化
      // -------------------------------------------------------------------
      gl.enable( gl.DEPTH_TEST );
      gl.depthFunc( gl.LEQUAL );

      gl.enable( gl.CULL_FACE );

      var bufferSize  = 512;
      var frameBuffer = createFrameBuffer( bufferSize, bufferSize );

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

      function createFrameBuffer( width, height ) {

        var frameBuffer = gl.createFramebuffer();

      	gl.bindFramebuffer( gl.FRAMEBUFFER,  frameBuffer );

        var renderBuffer = gl.createRenderbuffer();
      	gl.bindRenderbuffer( gl.RENDERBUFFER, renderBuffer );
      	gl.renderbufferStorage( gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height );
      	gl.framebufferRenderbuffer( gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, renderBuffer );

      	var fTexture = gl.createTexture();
      	gl.bindTexture( gl.TEXTURE_2D, fTexture );

        gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null );

      	gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR );
      	gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR );

        gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT );
      	gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT );

        gl.framebufferTexture2D( gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fTexture, 0 );

        // 後片づけ
      	gl.bindTexture( gl.TEXTURE_2D, null );
      	gl.bindRenderbuffer( gl.RENDERBUFFER, null );
      	gl.bindFramebuffer( gl.FRAMEBUFFER, null );

      	return {
          framebuffer: frameBuffer,
          depthRenderbuffer: renderBuffer,
          texture: fTexture
        };
      }

      function render() {
        gl.useProgram( textureProgram );
        
        gl.cullFace( gl.FRONT );

        var cx   = 1 * Math.sin( 0 );
        var cz   = 1 * Math.cos( 0 );

        var eyePosition    = [ cx, 0.0, cz ];
        var centerPosition = [ 0.0, 0.0, 0.0 ];
        var cameraUp       = [ 0.0, 1.0, 0.0 ];
        
        var rotatedEyePosition = new Array( 3 );
        convertToVec3( rotatedEyePosition, qt, eyePosition );
        
        var rotatedCameraUp = new Array( 3 );
        convertToVec3( rotatedCameraUp, qt, cameraUp );

        var tMatrix   = mat4.identity( mat4.create() );
        var tmMatrix  = mat4.identity( mat4.create() );
        var tvMatrix  = mat4.identity( mat4.create() );
        var tpMatrix  = mat4.identity( mat4.create() );
        var tvpMatrix = mat4.identity( mat4.create() );

        tmMatrix[0]  =  0.5; tmMatrix[1]  =  0.0; tmMatrix[2]  =  0.0; tmMatrix[3]  =  0.0;
        tmMatrix[4]  =  0.0; tmMatrix[5]  =  0.5; tmMatrix[6]  =  0.0; tmMatrix[7]  =  0.0;
        tmMatrix[8]  =  0.0; tmMatrix[9]  =  0.0; tmMatrix[10] =  1.0; tmMatrix[11] =  0.0;
        tmMatrix[12] =  0.5; tmMatrix[13] =  0.5; tmMatrix[14] =  0.0; tmMatrix[15] =  1.0;

        mat4.lookAt( tvMatrix, rotatedEyePosition, centerPosition, rotatedCameraUp );
        mat4.perspective( tpMatrix, 45, 1, 0.1, 30.0 );
        mat4.multiply( tvpMatrix, tpMatrix, tvMatrix );
        mat4.multiply( tMatrix, tvpMatrix, tmMatrix );

        // VBOの登録
        var textureLocations = new Array( 2 );
        textureLocations[0] = gl.getAttribLocation( textureProgram, 'textureCoords' );
        textureLocations[1] = gl.getAttribLocation( textureProgram, 'position' );
        
        var sphere = createSphere( 64, 64, 10, [ 1, 1, 1, 1 ] );

        var textureVbo = createVbo( sphere.textureCoords );
        gl.bindBuffer( gl.ARRAY_BUFFER, textureVbo );
        gl.enableVertexAttribArray( textureLocations[0] );
        gl.vertexAttribPointer( textureLocations[0], 2, gl.FLOAT, false, 0, 0 );
        
        var texturePositionVbo = createVbo( sphere.vertices );
        gl.bindBuffer( gl.ARRAY_BUFFER, texturePositionVbo );
        gl.enableVertexAttribArray( textureLocations[1] );
        gl.vertexAttribPointer( textureLocations[1], 3, gl.FLOAT, false, 0, 0 );

        var texturePositionIbo = gl.createBuffer();
        gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, texturePositionIbo );
        gl.bufferData( gl.ELEMENT_ARRAY_BUFFER, new Int16Array( sphere.indexes ), gl.STATIC_DRAW );
        gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, null );
        gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, texturePositionIbo );

        // Uniformの登録
        var textureUniformLocations = new Array( 2 );
        textureUniformLocations[0]  = gl.getUniformLocation( textureProgram, 'mvpMatrix' );
        textureUniformLocations[1]  = gl.getUniformLocation( textureProgram, 'texture' );

        gl.activeTexture( gl.TEXTURE0 );
        gl.bindTexture( gl.TEXTURE_2D, texture );
        gl.bindFramebuffer( gl.FRAMEBUFFER, frameBuffer.framebuffer );

        gl.uniformMatrix4fv( textureUniformLocations[0], false, tvpMatrix );
        gl.uniform1i( textureUniformLocations[1], 0 );

        // frameBufferへの描画
        gl.clearColor( 0.3, 0.3, 0.3, 1.0 );
        gl.viewport( 0, 0, bufferSize, bufferSize );
        gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );
        
        gl.drawElements( gl.TRIANGLES, sphere.indexes.length, gl.UNSIGNED_SHORT, 0 );
        
        // Canvasへの描画
        gl.bindFramebuffer( gl.FRAMEBUFFER, null );
        gl.clearColor( 0.3, 0.3, 0.3, 1.0 );
        gl.viewport( 0, 0, c.width, c.height );
        
        gl.drawElements( gl.TRIANGLES, sphere.indexes.length, gl.UNSIGNED_SHORT, 0 );
        
        // Cubeの描画
        gl.cullFace( gl.BACK );
        gl.bindTexture( gl.TEXTURE_2D, frameBuffer.texture );
        gl.clearColor( 0.3, 0.3, 0.3, 1.0 );
        gl.viewport( 0, 0, c.width, c.height );
                
        gl.useProgram( program );

        var mMatrix   = mat4.identity( mat4.create() );
        var vMatrix   = mat4.identity( mat4.create() );
        var pMatrix   = mat4.identity( mat4.create() );
        var vpMatrix  = mat4.identity( mat4.create() );
        var mvpMatrix = mat4.identity( mat4.create() );

        // ビュー座標変換
        mat4.lookAt( vMatrix, rotatedEyePosition, centerPosition, rotatedCameraUp );
        // 投影変換・クリッピング
        mat4.perspective( pMatrix, 45, 1, 0.1, 30.0 );

        // かける順番に注意
        mat4.multiply( vpMatrix, pMatrix, vMatrix );
        mat4.multiply( mvpMatrix, vpMatrix, mMatrix );

        // VBOの登録
        var locations = new Array( 3 );
        locations[0]  = gl.getAttribLocation( program, 'position' );
        locations[1]  = gl.getAttribLocation( program, 'color' );
        locations[2]  = gl.getAttribLocation( program, 'normal' );
        
        var cube = createCube( 0.5, [ 1, 1, 1, 1 ] );
        var positionVbo = createVbo( cube.vertices );
        gl.bindBuffer( gl.ARRAY_BUFFER, positionVbo );
        gl.enableVertexAttribArray( locations[0] );
        gl.vertexAttribPointer( locations[0], 3, gl.FLOAT, false, 0, 0 );

        var colorVbo = createVbo( cube.colors );
        gl.bindBuffer( gl.ARRAY_BUFFER, colorVbo );
        gl.enableVertexAttribArray( locations[1] );
        gl.vertexAttribPointer( locations[1], 4, gl.FLOAT, false, 0, 0 );

        var normalVbo = createVbo( cube.normals );
        gl.bindBuffer( gl.ARRAY_BUFFER, normalVbo );
        gl.enableVertexAttribArray( locations[2] );
        gl.vertexAttribPointer( locations[2], 3, gl.FLOAT, false, 0, 0 );

        var positionIbo = gl.createBuffer();
        gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, positionIbo );
        gl.bufferData( gl.ELEMENT_ARRAY_BUFFER, new Int16Array( cube.indexes ), gl.STATIC_DRAW );
        gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, null );
        gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, positionIbo );

        // Uniformの登録
        var uniformLocations = new Array( 5 );
        uniformLocations[0] = gl.getUniformLocation( program, 'mMatrix' );
        uniformLocations[1] = gl.getUniformLocation( program, 'mvpMatrix' );
        uniformLocations[2] = gl.getUniformLocation( program, 'tMatrix' );
        uniformLocations[3] = gl.getUniformLocation( program, 'coefficient' );
        uniformLocations[4] = gl.getUniformLocation( program, 'texture' );
        
        gl.uniformMatrix4fv( uniformLocations[0], false, mMatrix );
        gl.uniformMatrix4fv( uniformLocations[1], false, mvpMatrix );
        gl.uniformMatrix4fv( uniformLocations[2], false, tMatrix );
        gl.uniform1f( uniformLocations[3], 50 );
        gl.uniform1i( uniformLocations[4], 0 );

        gl.drawElements( gl.TRIANGLES, cube.indexes.length, gl.UNSIGNED_SHORT, 0 );

        requestAnimationFrame(render);
      }
    }

    function calculateQuat( e ) {
      var cw = c.width;
      var ch = c.height;
      var wh = 1 / Math.sqrt( cw * cw + ch * ch );

      var x      = e.clientX - c.offsetLeft - cw * 0.5;
      var y      = e.clientY - c.offsetTop - ch * 0.5;
      var vector = Math.sqrt( x * x + y * y );

      var theta = vector * 2.0 * Math.PI * wh;// 回転量

      if ( vector !== 1 ) {
      vector = 1 / vector;
      x     *= vector;
      y     *= vector;
      }

      var axis = [ y, x, 0 ];// 任意の回転軸

      quat.setAxisAngle( qt, axis, theta );// クォータニオン, 任意の回転軸, 回転量
    }

    function convertToVec3( dest, qt, vector ) {
      var rQt = quat.create();
      quat.invert( rQt, qt );

      var qQt = quat.create();
      var pQt = quat.create();

      pQt[0] = vector[0];
      pQt[1] = vector[1];
      pQt[2] = vector[2];

      quat.multiply( qQt, rQt, pQt );

      var destQt = quat.create();
      quat.multiply( destQt, qQt, qt );

      dest[0] = destQt[0];
      dest[1] = destQt[1];
      dest[2] = destQt[2];
    }

    function createCube( side, color ) {
      var hs = side * 0.5;
      var vertices = [
      	-hs, -hs,  hs,  hs, -hs,  hs,  hs,  hs,  hs, -hs,  hs,  hs,
      	-hs, -hs, -hs, -hs,  hs, -hs,  hs,  hs, -hs,  hs, -hs, -hs,
      	-hs,  hs, -hs, -hs,  hs,  hs,  hs,  hs,  hs,  hs,  hs, -hs,
      	-hs, -hs, -hs,  hs, -hs, -hs,  hs, -hs,  hs, -hs, -hs,  hs,
      	 hs, -hs, -hs,  hs,  hs, -hs,  hs,  hs,  hs,  hs, -hs,  hs,
      	-hs, -hs, -hs, -hs, -hs,  hs, -hs,  hs,  hs, -hs,  hs, -hs
      ];
      var normals = [
      	-1.0, -1.0,  1.0,  1.0, -1.0,  1.0,  1.0,  1.0,  1.0, -1.0,  1.0,  1.0,
      	-1.0, -1.0, -1.0, -1.0,  1.0, -1.0,  1.0,  1.0, -1.0,  1.0, -1.0, -1.0,
      	-1.0,  1.0, -1.0, -1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0, -1.0,
      	-1.0, -1.0, -1.0,  1.0, -1.0, -1.0,  1.0, -1.0,  1.0, -1.0, -1.0,  1.0,
      	 1.0, -1.0, -1.0,  1.0,  1.0, -1.0,  1.0,  1.0,  1.0,  1.0, -1.0,  1.0,
      	-1.0, -1.0, -1.0, -1.0, -1.0,  1.0, -1.0,  1.0,  1.0, -1.0,  1.0, -1.0
      ];
      var colors = [];
      for( var i = 0; i < vertices.length / 3; i++ ){
      	colors.push( color[0], color[1], color[2], color[3] );
      }
      var textureCoords = [
      	0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
      	0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
      	0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
      	0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
      	0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
      	0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0
      ];
      var indexes = [
      	 0,  1,  2,  0,  2,  3,
      	 4,  5,  6,  4,  6,  7,
      	 8,  9, 10,  8, 10, 11,
      	12, 13, 14, 12, 14, 15,
      	16, 17, 18, 16, 18, 19,
      	20, 21, 22, 20, 22, 23
      ];
      return {
        vertices:      vertices,
        normals:       normals,
        colors:        colors,
        textureCoords: textureCoords,
        indexes:       indexes
      };

    }

    function createSphere( widthSegment, heightSegment, radius, color ) {
      var vertices      = [],
          normals       = [],
          colors        = [],
          textureCoords = [],
          indexes       = [];
      for( var i = 0; i <= widthSegment; i++ ){
        var r = Math.PI / widthSegment * i;
        var ry = Math.cos(r);
        var rr = Math.sin(r);
        for( var j = 0; j <= heightSegment; j++ ){
          var tr = Math.PI * 2 / heightSegment * j;
          var tx = rr * radius * Math.cos( tr );
          var ty = ry * radius;
          var tz = rr * radius * Math.sin( tr );
          var rx = rr * Math.cos( tr );
          var rz = rr * Math.sin( tr );
          vertices.push( tx, ty, tz );
          normals.push( rx, ry, rz );
          colors.push( color[0], color[1], color[2], color[3] );
          textureCoords.push( 1 - 1 / heightSegment * j, 1 / widthSegment * i );
        }
      }
      r = 0;
      for( var k = 0; k < widthSegment; k++ ){
        for( var l = 0; l < heightSegment; l++ ){
          r = (heightSegment + 1) * k + l;
          indexes.push( r, r + 1, r + heightSegment + 2 );
          indexes.push( r, r + heightSegment + 2, r + heightSegment + 1 );
        }
      }
      return {
        vertices:      vertices,
        normals:       normals,
        colors:        colors,
        textureCoords: textureCoords,
        indexes:       indexes
      };
    }
  }

  this.addEventListener( 'load', main );

} )();
