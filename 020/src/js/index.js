window.taiyaki = require('taiyaki');
window.mat4    = require('gl-matrix-mat4');
window.quat    = require('gl-matrix-quat');

window.createSphere = function( widthSegment, heightSegment, radius, rgba ) {
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
};
