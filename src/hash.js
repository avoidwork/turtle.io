/**
 * Creates a hash of arg
 *
 * @method hash
 * @param  {Mixed}    arg String or Buffer
 * @param  {Function} cb  [Optional] Callback function, triggers async behavior
 * @return {String}       Hash of arg
 */
TurtleIO.prototype.hash = function ( arg, cb ) {
	if ( typeof arg != "string" && !( arg instanceof Buffer ) ) {
		arg = "";
	}

	if ( cb === undefined ) {
		return mmh3.murmur32HexSync( arg, this.config.seed );
	}
	else {
		mmh3.murmurHex32( arg, this.config.seed, function( e, value ) {
			if ( e ) {
				cb( e, null );
			}
			else {
				cb( null, value );
			}
		} );
	}
};
