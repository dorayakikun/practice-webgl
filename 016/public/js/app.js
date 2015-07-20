/* global mat4 */
( function() {
  function main() {
    var c  = document.getElementById( 'canvas' );
    var gl = c.getContext( 'webgl' ) || c.getContext( 'experimental-webgl' );

    var canvasSize = Math.min( this.innerWidth, this.innerHeight );

    c.width  = canvasSize;
    c.height = canvasSize;

    var tex = gl.createTexture();

    initTexture( '../img/dorayaki.png', tex, initRender );

    function initTexture( path, texture, fn ) {
      var img = new Image();
      img.onload = function(){
        gl.bindTexture( gl.TEXTURE_2D, texture );
        gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img );
        gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR );
        gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT );
        gl.generateMipmap( gl.TEXTURE_2D );
        gl.bindTexture( gl.TEXTURE_2D, null );
        if( fn !== null ){
          fn( texture );
        }
      };
      img.src = path;
    }

    function initRender( texture ) {
      var vs = createShader( 'vs' );
      var fs = createShader( 'fs' );

      if ( !vs || !fs ) {
        return;
      }

      var program = createProgram( [ vs, fs ] );
      
      var orthoVs = createShader( 'ortho_vs' );
      var orthoFs = createShader( 'ortho_fs' );
      
      var orthoProgram = createProgram( [ orthoVs, orthoFs ] );

      var locations = new Array( 3 );
      locations[0]  = gl.getAttribLocation( program, 'position' );
      locations[1]  = gl.getAttribLocation( program, 'color' );
      locations[2]  = gl.getAttribLocation( program, 'textureCoords' );

      var orthoLocations = new Array( 2 );
      orthoLocations[0] = gl.getAttribLocation( orthoProgram, 'position' );
      orthoLocations[1] = gl.getAttribLocation( orthoProgram, 'textureCoords' );

      var strides = [ 3, 4, 2 ];

      var orthoStrides = [ 3, 2 ];

      var position = [
        -0.5,  0.5,  0.0,// 0 left
         0.5,  0.5,  0.0,// 1 top
        -0.5, -0.5,  0.0,// 2 center
         0.5, -0.5,  0.0,// 3 bottom
      ];

      // 色情報、左から順にRGBA
      var color = [
        1.0, 0.0, 0.0, 1.0,// 0
        0.0, 1.0, 0.0, 1.0,// 1
        0.0, 0.0, 1.0, 1.0,// 2
        1.0, 1.0, 1.0, 1.0,// 3
      ];

      var textureCoords = [
        0.0, 0.0,
        1.0, 0.0,
        0.0, 1.0,
        1.0, 1.0
      ];

      // vboの作成
      var positionVbo  = createVbo( position );
      gl.bindBuffer( gl.ARRAY_BUFFER, positionVbo );
      gl.enableVertexAttribArray( locations[0] );
      gl.vertexAttribPointer( locations[0], strides[0], gl.FLOAT, false, 0, 0 );

      var colorVbo = createVbo( color );
      gl.bindBuffer( gl.ARRAY_BUFFER, colorVbo );
      gl.enableVertexAttribArray( locations[1] );
      gl.vertexAttribPointer( locations[1], strides[1], gl.FLOAT, false, 0, 0 );

      var textureVbo = createVbo( textureCoords );
      gl.bindBuffer( gl.ARRAY_BUFFER, textureVbo );
      gl.enableVertexAttribArray( locations[2] );
      gl.vertexAttribPointer( locations[2], strides[2], gl.FLOAT, false, 0, 0 );
      
      
      var orthoPositionVbo = createVbo( position );
      gl.bindBuffer( gl.ARRAY_BUFFER, orthoPositionVbo );
      gl.enableVertexAttribArray( orthoLocations[0] );
      gl.vertexAttribPointer( orthoLocations[0], orthoStrides[0], gl.FLOAT, false, 0, 0 );
      
      var orthoTextureVbo = createVbo( textureCoords );
      gl.bindBuffer( gl.ARRAY_BUFFER, orthoTextureVbo );
      gl.enableVertexAttribArray( orthoLocations[1] );
      gl.vertexAttribPointer( orthoLocations[1], orthoStrides[1], gl.FLOAT, false, 0, 0 );
      
      // iboの作成
      var indexes = [
        0, 1, 2,
        3, 2, 1
      ];

      var ibo = gl.createBuffer();
      gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, ibo );
      gl.bufferData( gl.ELEMENT_ARRAY_BUFFER, new Int16Array( indexes ), gl.STATIC_DRAW );
      gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, null );
      gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, ibo );

      gl.enable( gl.DEPTH_TEST );
      gl.depthFunc( gl.LEQUAL );
      
      var frameTexture = null;
      
      var bufferSize  = 512;
      var frameBuffer = createFrameBuffer( bufferSize, bufferSize );
      
      gl.activeTexture( gl.TEXTURE0 );

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
      
      function createFrameBuffer( width, height ) {
      	
        var frameBuffer = gl.createFramebuffer();
        
      	gl.bindFramebuffer( gl.FRAMEBUFFER, frameBuffer);
      	
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
        
        frameTexture = fTexture;

      	return {
          framebuffer: frameBuffer, 
          depthRenderbuffer: renderBuffer, 
          texture: fTexture
        };
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

        gl.useProgram( program );

        var locations = new Array( 2 );
        locations[0]  = gl.getUniformLocation( program, 'mvpMatrix' );
        locations[1]  = gl.getUniformLocation( program, 'texture' );

        gl.uniformMatrix4fv( locations[0], false, mvpMatrix );

        gl.activeTexture( gl.TEXTURE0 );
        gl.bindTexture( gl.TEXTURE_2D, texture );
        gl.uniform1i( locations[1], 0 );

        gl.bindTexture( gl.TEXTURE_2D, texture );
		    gl.bindFramebuffer( gl.FRAMEBUFFER, frameBuffer.framebuffer );

        gl.clearColor( 0.3, 0.3, 0.3, 1.0 );
        gl.viewport( 0, 0, bufferSize, bufferSize );
        gl.clearDepth( 1.0 );
        gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );

        gl.drawElements( gl.TRIANGLES, indexes.length, gl.UNSIGNED_SHORT, 0 );

        gl.bindTexture( gl.TEXTURE_2D, frameTexture );
		    gl.bindFramebuffer( gl.FRAMEBUFFER, null );
		    gl.clearColor( 0.3, 0.3, 0.3, 1.0 );
        gl.viewport( 0, 0, c.width, c.height );

        gl.useProgram( orthoProgram );

        var orthoLocations = new Array( 1 );
        orthoLocations[0] = gl.getUniformLocation( orthoProgram, 'orthoMatrix' );
        
        var orthoPMatrix   = mat4.identity( mat4.create() );
        var orthoVpMatrix  = mat4.identity( mat4.create() );
        var orthoMvpMatrix = mat4.identity( mat4.create() );
        
        mat4.multiply( orthoVpMatrix, orthoPMatrix, vMatrix );
        mat4.multiply( orthoMvpMatrix, vpMatrix, mMatrix );
        
        gl.uniformMatrix4fv( orthoLocations[0], false, orthoMvpMatrix );
        
        gl.drawElements( gl.TRIANGLES, indexes.length, gl.UNSIGNED_SHORT, 0 );
      }
    }
  }

  this.addEventListener( 'load', main );

} )();
