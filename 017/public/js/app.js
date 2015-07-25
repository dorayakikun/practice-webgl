/* global mat4 */
( function() {
  function main() {
    var c  = document.getElementById( 'canvas' );
    var gl = c.getContext( 'webgl' ) || c.getContext( 'experimental-webgl' );

    var canvasSize = Math.min( this.innerWidth, this.innerHeight );

    c.width  = canvasSize;
    c.height = canvasSize;
    
    var qt = quat.identity( quat.create() );
    c.addEventListener( 'mousemove', calculateQuat );
    var imgs   = [];
    
    var paths = [
      '../img/negx.jpg',
      '../img/negy.jpg',
      '../img/negz.jpg',
      '../img/posx.jpg',
      '../img/posy.jpg',
      '../img/posz.jpg'
    ];
    
    var targets = [
		  gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
		  gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
		  gl.TEXTURE_CUBE_MAP_NEGATIVE_Z,
      gl.TEXTURE_CUBE_MAP_POSITIVE_X,
		  gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
		  gl.TEXTURE_CUBE_MAP_POSITIVE_Z
    ];

    initCubeTexture( paths );

    // 待ち合わせ 
    setTimeout( function() { createCubeTexture( targets, initRender ); }, 2000 );
    
    function initCubeTexture( paths ) {
      paths.forEach( function( path ) {
        
        var img = new Image();
        // img.onload = function() { loaded += 1; };
        img.src = path;
        
        imgs.push( img );
        
      } );
    }
    
    function createCubeTexture( targets, fn ) {
      
      var tex    = gl.createTexture();
      
      gl.bindTexture( gl.TEXTURE_CUBE_MAP, tex );
      
      // imgs.forEach(function( value, index ){
      for ( var i = 0; i < targets.length; i++ ) {
        gl.pixelStorei( gl.UNPACK_FLIP_Y_WEBGL, false );
        gl.texImage2D( targets[i], 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imgs[i] );
      } 
          
      // });
      
      gl.generateMipmap( gl.TEXTURE_CUBE_MAP );
      
      gl.texParameteri( gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR );
      gl.texParameteri( gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR );
      gl.texParameteri( gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE );
      gl.texParameteri( gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE );
      
      gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
      
      fn( tex );
    }

    function initRender( texture ) {
      var vs = createShader( 'vs' );
      var fs = createShader( 'fs' );

      if ( !vs || !fs ) {
        return;
      }

      var program = createProgram( [ vs, fs ] );

      var locations = new Array( 3 );
      locations[0]  = gl.getAttribLocation( program, 'position' );
      locations[1]  = gl.getAttribLocation( program, 'color' );
      locations[2]  = gl.getAttribLocation( program, 'normal' );

      gl.enable( gl.DEPTH_TEST );
      gl.depthFunc( gl.LEQUAL );
      
      gl.enable( gl.CULL_FACE );

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
        var cameraUp       = [ 0.0, 1.0, 0.0 ];

        var rotatedEyePosition = new Array( 3 );
        convertToVec3( rotatedEyePosition, qt, eyePosition );
        
        var rotatedCameraUp = new Array( 3 );
        convertToVec3( rotatedCameraUp, qt, cameraUp );

        // ビュー座標変換
        mat4.lookAt( vMatrix, rotatedEyePosition, centerPosition, rotatedCameraUp );
        // 投影変換・クリッピング
        mat4.perspective( pMatrix, fovy, 1, 0.1, 30.0 );

        // かける順番に注意
        mat4.multiply( vpMatrix, pMatrix, vMatrix );
        mat4.multiply( mvpMatrix, vpMatrix, mMatrix );

        gl.useProgram( program );

        var uniformLocations = new Array( 5 );
        uniformLocations[0]  = gl.getUniformLocation( program, 'mMatrix' );
        uniformLocations[1]  = gl.getUniformLocation( program, 'mvpMatrix' );
        uniformLocations[2]  = gl.getUniformLocation( program, 'reflection' );
        uniformLocations[3]  = gl.getUniformLocation( program, 'eyePosition' );
        uniformLocations[4]  = gl.getUniformLocation( program, 'texture' );

        gl.uniformMatrix4fv( uniformLocations[0], false, mMatrix );
        gl.uniformMatrix4fv( uniformLocations[1], false, mvpMatrix );

        gl.uniform1i( uniformLocations[2], false );
        gl.uniform3fv( uniformLocations[3], eyePosition );

        gl.activeTexture( gl.TEXTURE0 );
        gl.bindTexture( gl.TEXTURE_CUBE_MAP, texture );
        gl.uniform1i( uniformLocations[4], 0 );

        //
        // 立方体
        // -----------------------------------------------------
        gl.cullFace( gl.FRONT );
        
        var strides = [ 3, 4, 3 ];
        
        var cube = createCube( 20, [ 1, 1, 1, 1 ] );
        
        
        // vboの作成
        var positionVbo  = createVbo( cube.vertices );
        gl.bindBuffer( gl.ARRAY_BUFFER, positionVbo );
        gl.enableVertexAttribArray( locations[0] );
        gl.vertexAttribPointer( locations[0], strides[0], gl.FLOAT, false, 0, 0 );
        
        var colorVbo = createVbo( cube.colors );
        gl.bindBuffer( gl.ARRAY_BUFFER, colorVbo );
        gl.enableVertexAttribArray( locations[1] );
        gl.vertexAttribPointer( locations[1], strides[1], gl.FLOAT, false, 0, 0 );
        
        var normalVbo = createVbo( cube.normals );
        gl.bindBuffer( gl.ARRAY_BUFFER, normalVbo );
        gl.enableVertexAttribArray( locations[2] );
        gl.vertexAttribPointer( locations[2], strides[2], gl.FLOAT, false, 0, 0 );
        
        var ibo = gl.createBuffer();
        gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, ibo );
        gl.bufferData( gl.ELEMENT_ARRAY_BUFFER, new Int16Array( cube.indexes ), gl.STATIC_DRAW );
        gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, null );
        gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, ibo );
        
        gl.clearColor( 0.3, 0.3, 0.3, 1.0 );
        gl.viewport( 0, 0, c.width, c.height );
        gl.clearDepth( 1.0 );
        gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );

        gl.drawElements( gl.TRIANGLES, cube.indexes.length, gl.UNSIGNED_SHORT, 0 );
        
        
        //
        // 球
        // -----------------------------------------------------
        gl.cullFace( gl.BACK );
        var sphere = createSphere( 32, 32, 0.1, [ 1, 1, 1, 1 ] );
        
        var spherepositionVbo  = createVbo( sphere.vertices );
        gl.bindBuffer( gl.ARRAY_BUFFER, spherepositionVbo );
        gl.enableVertexAttribArray( locations[0] );
        gl.vertexAttribPointer( locations[0], strides[0], gl.FLOAT, false, 0, 0 );
        
        var sphereColorVbo = createVbo( sphere.colors );
        gl.bindBuffer( gl.ARRAY_BUFFER, sphereColorVbo );
        gl.enableVertexAttribArray( locations[1] );
        gl.vertexAttribPointer( locations[1], strides[1], gl.FLOAT, false, 0, 0 );
        
        var sphereNormalVbo = createVbo( sphere.normals );
        gl.bindBuffer( gl.ARRAY_BUFFER, sphereNormalVbo );
        gl.enableVertexAttribArray( locations[2] );
        gl.vertexAttribPointer( locations[2], strides[2], gl.FLOAT, false, 0, 0 );
        
        var sphereIbo = gl.createBuffer();
        gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, sphereIbo );
        gl.bufferData( gl.ELEMENT_ARRAY_BUFFER, new Int16Array( sphere.indexes ), gl.STATIC_DRAW );
        gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, null );
        gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, sphereIbo );
        
        gl.uniformMatrix4fv( uniformLocations[0], false, mMatrix );
        gl.uniformMatrix4fv( uniformLocations[1], false, mvpMatrix );
        gl.uniform1i( uniformLocations[2], true );
        gl.uniform3fv( uniformLocations[3], eyePosition );
        gl.uniform1i( uniformLocations[4], 0 );
        
        gl.drawElements( gl.TRIANGLES, sphere.indexes.length, gl.UNSIGNED_SHORT, 0 );
        
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
