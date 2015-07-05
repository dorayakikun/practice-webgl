/* global RenderingContext */
/* global mat4 */
( function() {
  function main() {
    var context = new RenderingContext( 'canvas' );

    context.createProgram( [ 'vs', 'fs' ] );

    context.bindVbos([
      { name: 'positions', vertices: positions, stride: 3 },
      { name: 'colors',    vertices: colors, stride: 4 },
      { name: 'normals',   vertices: normals, stride: 3 },
    ]);

    context.bindIbo( indexes );

    context.enableDepthTest();

    var count = 0;
    render();


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

      var lightDirection = [ 0.0, 0.25, 0.75 ];
      var eyePosition    = [ cx, 0.0, cz ];
      var centerPosition = [ 0.0, 0.0, 0.0 ];
      var cameraUp       = [ 0.0, 1.0, 0.0 ];
      var ambientColor   = [ 0.5, 0.1, 0.1, 0.0 ];

      // ビュー座標変換
      mat4.lookAt( vMatrix, eyePosition, centerPosition, cameraUp );
      // 投影変換・クリッピング
      mat4.perspective( pMatrix, fovy, 1, 0.1, 100.0 );

      mat4.rotateY( mMatrix, mMatrix, rad );

      // かける順番に注意
      mat4.multiply( vpMatrix, pMatrix, vMatrix );
      mat4.multiply( mvpMatrix, vpMatrix, mMatrix );

      var invMatrix = mat4.identity( mat4.create() );
      mat4.invert( invMatrix, mMatrix );

      context.bindUniforms( [
        { name: 'mvpMatrix',      type: 'matrix4fv', value: mvpMatrix },
        { name: 'invMatrix',      type: 'matrix4fv', value: invMatrix },
        { name: 'lightDirection', type: '3fv',       value: lightDirection },
        { name: 'eyePosition',    type: '3fv',       value: eyePosition },
        { name: 'centerPoint',    type: '3fv',       value: centerPosition },
        { name: 'ambientColor',   type: '4fv',       value: ambientColor },
      ]);
      
      context.clear();

      context.drawElements( context.gl.TRIANGLES, indexes.length );
      
      requestAnimationFrame( render );
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
  
  window.addEventListener( 'load', main );
})();
