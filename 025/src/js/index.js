function main() {
  var taiyaki = require('taiyaki');
  var mat4    = require('gl-matrix-mat4');
  var quat    = require('gl-matrix-quat');
  
  var Context = taiyaki.RenderingContext;

  var ctx = new Context( 'canvas' );

  var canvas = document.getElementById( 'canvas' );

  var bufferSize = 512;
  var frameBufferAttr = ctx.createFrameBuffer( bufferSize, bufferSize );

  var qt = quat.identity( quat.create() );
  
  var mouseX = 0;
  var mouseY = 0;
  document.addEventListener( 'mousemove', function( e ) {
    var cw = canvas.width;
    var ch = canvas.height;
    var x = e.clientX - canvas.offsetLeft - cw * 0.5;
    var y = e.clientY - canvas.offsetTop  - ch * 0.5;
    mouseX =  x / cw;
    mouseY = -y / ch;
  });
  
  var canvasTexture = createCanvasTexture();

  render();

  function render() {
    var lightProgram = ctx.createProgram( [ 'light_vs', 'light_fs' ] );
    ctx.useProgram( lightProgram );
    
    ctx.toggleDepthFunc( true );
    ctx.depthFunc();
    
    ctx.toggleBlend( false );
    
    // render the texture ( off screen )
    var board = createBoard( 2, 2 );
    ctx.bindTexture( canvasTexture, 1 );
    setupVbos( lightProgram, board );
    initRender();
    setupUniforms( lightProgram, true );
    ctx.drawElements( ctx.gl.TRIANGLES, board.index.length );

    // render the outline ( off screen )
    var sphere = createSphere( 64, 64, 0.1, [ 0, 1, 0, 1 ] );
    setupVbos( lightProgram, sphere );
    setupUniforms( lightProgram, false );
    ctx.drawElements( ctx.gl.TRIANGLES, sphere.index.length );

    // render the object ( canvas )
    ctx.bindTexture( frameBufferAttr.texture, 0 );
    ctx.drawElements( ctx.gl.TRIANGLES, sphere.index.length );
    
    // disable the depthFunc
    ctx.toggleDepthFunc( false );
    
    // enable the blending    
    ctx.toggleBlend( true );
    ctx.setBlending( Context.AdditiveBlending );
    
    // render the effect ( canvas )    
    initOrthoRender();
    var program = ctx.createProgram( [ 'vs', 'fs' ] );
    ctx.useProgram( program );
    setupOrthoVbos( program, board );
    setupuOrthoUniforms( program );
    ctx.drawElements( ctx.gl.TRIANGLES, board.index.length );
    requestAnimationFrame( render );
  }

  function setupVbos( lightProgram, obj ) {
    ctx.bindVbos(lightProgram,
      [
        { name: 'position',     value: obj.position,     stride: 3 },
        { name: 'normal',       value: obj.normal,       stride: 3 },
        { name: 'color',        value: obj.color,        stride: 4 },
        { name: 'textureCoord', value: obj.textureCoord, stride: 2 }
      ]);

    ctx.bindIbo( obj.index );
  }

  function initRender() {
    ctx.bindFramebuffer( frameBufferAttr.value );
    ctx.clear( { r: 0.3, g: 0.3, b: 0.3, a: 1 } );
    ctx.viewport({
      x:      0,
      y:      0,
      width:  bufferSize,
      height: bufferSize});
  }

  function setupUniforms( lightProgram, isTexture ) {
    var vMatrix  = createVMatrix();
    var pMatrix  = createPMatrix();
    var vpMatrix = createVpMatrix( vMatrix, pMatrix );
    var mMatrix  = mat4.identity( mat4.create() );

    var mvpMatrix = createMvpMatrix( mMatrix, vpMatrix );
    var invMatrix = createInvMatrix( mMatrix );
    var light = [ 1, 1, 1 ];
    ctx.bindUniforms(
      lightProgram,
      [
        { name: 'mvpMatrix',      type: 'matrix4fv', value: mvpMatrix },
        { name: 'invMatrix',      type: 'matrix4fv', value: invMatrix },
        { name: 'light',          type: '3fv',       value: light },
        { name: 'texture',        type: '1i',        value: 1 },
        { name: 'isTexture',      type: '1i',        value: isTexture }
      ]);
  }

  function createVMatrix() {
    var cx   = 1 * Math.sin( 0 );
    var cz   = 1 * Math.cos( 0 );

    var eyePosition    = quat.create();
    eyePosition[0] = cx;
    eyePosition[1] = 0;
    eyePosition[2] = cz;

    var centerPosition = [ 0.0, 0.0, 0.0 ];

    var cameraUp = quat.create();
    cameraUp[0] = 0;
    cameraUp[1] = 1;
    cameraUp[2] = 0;

    var rotatedEyePosition = new Array( 3 );
    convertToVec3( rotatedEyePosition, qt, eyePosition );

    var rotatedCameraUp = new Array( 3 );
    convertToVec3( rotatedCameraUp, qt, cameraUp );

    var vMatrix = mat4.identity( mat4.create() );
    mat4.lookAt( vMatrix, rotatedEyePosition, centerPosition, rotatedCameraUp );

    return vMatrix;
  }

  function createPMatrix() {
    var pMatrix = mat4.identity( mat4.create() );
    mat4.perspective( pMatrix, 45, 1, 0.1, 10 );
    return pMatrix;
  }

  function createVpMatrix( vMatrix, pMatrix ) {
    var vpMatrix = mat4.identity( mat4.create() );
    mat4.multiply( vpMatrix, pMatrix, vMatrix );
    return vpMatrix;
  }

  function createMvpMatrix( mMatrix, vpMatrix) {
    var mvpMatrix = mat4.identity( mat4.create() );
    mat4.multiply( mvpMatrix, vpMatrix, mMatrix );
    return mvpMatrix;
  }

  function createInvMatrix( mMatrix ) {
    var invMatrix = mat4.identity( mat4.create() );
    mat4.invert( invMatrix, mMatrix );
    return invMatrix;
  }

  function initOrthoRender() {
    ctx.bindFramebuffer( null );
    ctx.clear( { r: 0.3, g: 0.3, b: 0.3, a: 1 } );
    ctx.viewport({
      x:      0,
      y:      0,
      width:  canvas.width,
      height: canvas.height});
  }

  function setupOrthoVbos( program, board ) {
    ctx.bindVbos(program,
      [
        { name: 'position',     value: board.position,     stride: 3 },
        { name: 'textureCoord', value: board.textureCoord, stride: 2 }
      ]);
    ctx.bindIbo( board.index );
  }

  function setupuOrthoUniforms( program ) {
    var vMatrix = createOrthoVmatrix();
    var pMatrix = createOrthoPmatrix();
    var orthoMatrix = createOrthoMatrix( vMatrix, pMatrix );
    ctx.bindUniforms(
      program,
      [
        { name: 'orthoMatrix', type: 'matrix4fv', value: orthoMatrix },
        { name: 'texture',     type: '1i',        value: 0 },
        { name: 'resolution',  type: '2fv',       value: [ canvas.width, canvas.height ] },
        { name: 'mouse',       type: '2fv',       value: [ mouseX, mouseY ] }
      ]);
  }

  function createOrthoVmatrix() {
    var vMatrix = mat4.identity( mat4.create() );
    mat4.lookAt( vMatrix, [ 0, 0, 0.5 ], [ 0, 0, 0 ], [ 0, 1, 0 ] );
    return vMatrix;
  }

  function createOrthoPmatrix() {
    var pMatrix = mat4.identity( mat4.create() );
    mat4.ortho( pMatrix, -1, 1, 1, -1, 0.1, 1 );
    return pMatrix;
  }

  function createOrthoMatrix( vMatrix, pMatrix ) {
    var orthoMatrix = mat4.identity( mat4.create() );
    mat4.multiply( orthoMatrix, pMatrix, vMatrix );
    return orthoMatrix;
  }

  function calculateQuat( e ) {
    var cw = canvas.width;
    var ch = canvas.height;
    var wh = 1 / Math.sqrt( cw * cw + ch * ch );

    var x      = e.clientX - canvas.offsetLeft - cw * 0.5;
    var y      = e.clientY - canvas.offsetTop  - ch * 0.5;
    var vector = Math.sqrt( x * x + y * y );

    var theta = vector * 2.0 * Math.PI * wh;

    var axis = [ y / vector, x / vector, 0 ];
    quat.setAxisAngle( qt, axis, theta );
  }

  function convertToVec3( dst, q, p ) {
    var r = quat.create();
    quat.invert( r, q );

    var rp   = quat.create();
    quat.multiply( rp, r, p );

    var rpq = quat.create();
    quat.multiply( rpq, rp, q );

    dst[0] = rpq[0];
    dst[1] = rpq[1];
    dst[2] = rpq[2];
  }
  
  function createCanvasTexture() {
    var canvas2d = document.createElement( 'canvas' );
    
    canvas2d.width  = 512;
    canvas2d.height = 512;
    
    var context2d = canvas2d.getContext( '2d' );
    
    context2d.fillStyle = 'black';
    context2d.fillRect(0, 0, 512, 512);
    
    context2d.fillStyle   = 'white';
    context2d.shadowColor = 'white';
    context2d.shadowBlur  = 1;
    
    context2d.font         = '72px serif';
    context2d.textAlign    = 'center';
    context2d.textBaseline = 'middle';
    
    context2d.fillText('どらやき', 256, 100, 512);
    context2d.fillText('どらやき', 256, 256, 512);
    context2d.fillText('どらやき', 256, 412, 512);
    
    // document.body.appendChild( canvas2d );
    
    return ctx.createCanvasTexture( canvas2d );
  }
  
  function createBoard( widthSegment, heightSegment ) {
    var hw = widthSegment  / 2;// halfWidth
    var hh = heightSegment / 2;// halfHeight
    
		var position = [
			-hw,  hh,  0.0,
			 hw,  hh,  0.0,
			-hw, -hh,  0.0,
			 hw, -hh,  0.0
		];
		var normal = [
			0, 0, 1,
			0, 0, 1,
			0, 0, 1,
			0, 0, 1
		];
		var color = [
			1, 1, 1, 1,
			1, 1, 1, 1,
			1, 1, 1, 1,
			1, 1, 1, 1
		];
		var textureCoord = [
			0, 0,
			1, 0,
			0, 1,
			1, 1
		];
		var index = [
			0, 1, 2,
			2, 1, 3
		];
    
    return {
      position:      position,
      normal:        normal,
      color:         color,
      textureCoord:  textureCoord,
      index:         index
    };

  }  
  
  function createSphere( widthSegment, heightSegment, radius, rgba ) {
    var position      = [],
        normal        = [],
        color         = [],
        textureCoord  = [],
        index         = [];
  
    for( var i = 0; i <= widthSegment; i++ ){
      var r  = Math.PI / widthSegment * i;
      var ry = Math.cos(r);
      var rr = Math.sin(r);
      for( var j = 0; j <= heightSegment; j++ ){
        var tr = Math.PI * 2 / heightSegment * j;
        var tx = rr * radius * Math.cos( tr );
        var ty = ry * radius;
        var tz = rr * radius * Math.sin( tr );
        var rx = rr * Math.cos( tr );
        var rz = rr * Math.sin( tr );
        position.push( tx, ty, tz );
        normal.push( rx, ry, rz );
        color.push( rgba[0], rgba[1], rgba[2], rgba[3] );
        textureCoord.push( 1 - 1 / heightSegment * j, 1 / widthSegment * i );
      }
    }
    r = 0;
    for( var k = 0; k < widthSegment; k++ ){
      for( var l = 0; l < heightSegment; l++ ){
        r = (heightSegment + 1) * k + l;
        index.push( r, r + 1, r + heightSegment + 2 );
        index.push( r, r + heightSegment + 2, r + heightSegment + 1 );
      }
    }
    return {
      position:      position,
      normal:        normal,
      color:         color,
      textureCoord:  textureCoord,
      index:         index
    };
  }
}

window.onload = main;