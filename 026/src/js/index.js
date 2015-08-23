function main() {
  var taiyaki = require('taiyaki');
  var mat4    = require('gl-matrix-mat4');
  var quat    = require('gl-matrix-quat');
  
  var Context = taiyaki.RenderingContext;

  var ctx = new Context( 'canvas' );

  var canvas = document.getElementById( 'canvas' );

  ctx.toggleDepthFunc( true );
  ctx.depthFunc();

  var bufferSize = 512;
  var frameBufferAttr = ctx.createFrameBuffer( bufferSize, bufferSize );

  var qt = quat.identity( quat.create() );
  document.addEventListener( 'mousemove', calculateQuat );
  
  // kernel
	var hWeight = [
		 1.0,  0.0, -1.0,
		 2.0,  0.0, -2.0,
		 1.0,  0.0, -1.0
	];
	var vWeight = [
		 1.0,  2.0,  1.0,
		 0.0,  0.0,  0.0,
		-1.0, -2.0, -1.0
	];

  render();

  function render() {
    var lightProgram = ctx.createProgram( [ 'light_vs', 'light_fs' ] );
    ctx.useProgram( lightProgram );

    var sphere = createSphere( 64, 64, 0.3, [ 0, 1, 0, 1 ] );

    setupVbos( lightProgram, sphere );
    initRender();
    setupUniforms( lightProgram );
    ctx.drawElements( ctx.gl.TRIANGLES, sphere.index.length );

    ctx.bindTexture( frameBufferAttr.texture, 0 );
    initOrthoRender();
    var program = ctx.createProgram( [ 'vs', 'fs' ] );
    ctx.useProgram( program );
    setupOrthoVbos( program );
    setupuOrthoUniforms( program );
    ctx.drawElements( ctx.gl.TRIANGLES, 6 );

    requestAnimationFrame( render );
  }

  function setupVbos( lightProgram, sphere ) {
    ctx.bindVbos(lightProgram,
      [
        { name: 'position',     value: sphere.position, stride: 3 },
        { name: 'normal',       value: sphere.normal,   stride: 3 },
        { name: 'color',        value: sphere.color,    stride: 4 },
      ]);

    ctx.bindIbo( sphere.index );
  }

  function initRender() {
    ctx.bindFramebuffer( frameBufferAttr.value );
    ctx.clear( { r: 0.3, g: 0.3, b: 0.3, a: 1 }, 1 );
    ctx.viewport({
      x:      0,
      y:      0,
      width:  bufferSize,
      height: bufferSize});
  }

  function setupUniforms( lightProgram ) {
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
        { name: 'light',          type: '3fv',       value: light }
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
    ctx.clear( { r: 0.3, g: 0.3, b: 0.3, a: 1 }, 1 );
    ctx.viewport({
      x:      0,
      y:      0,
      width:  canvas.width,
      height: canvas.height});
  }

  function setupOrthoVbos( program ) {
    var position = [
      -1,  1, 0,
        1,  1, 0,
      -1, -1, 0,
        1, -1, 0
    ]

    var textureCoord = [
      0.0, 0.0,
      1.0, 0.0,
      0.0, 1.0,
      1.0, 1.0
    ];

    var index = [
      0, 1, 2,
      2, 1, 3
    ];

    ctx.bindVbos(program,
      [
        { name: 'position',     value: position,     stride: 3 },
        { name: 'textureCoord', value: textureCoord, stride: 2 }
      ]);
    ctx.bindIbo( index );
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
        { name: 'hWeight',     type: '1fv',       value: hWeight },
        { name: 'vWeight',     type: '1fv',       value: vWeight }
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