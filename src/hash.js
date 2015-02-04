/**
 * Creates a hash of arg
 *
 * @method hash
 * @param  {Mixed}    arg String or Buffer
 * @param  {Function} cb  [Optional] Callback function, triggers async behavior
 * @return {String}       Hash of arg
 */
hash ( arg, cb ) {
	if ( typeof arg != "string" && !( arg instanceof Buffer ) ) {
		arg = "";
	}

	if ( cb === undefined ) {
		return mmh3.murmur32HexSync( arg, this.config.seed );
	}
	else {
		mmh3.murmur32Hex( arg, this.config.seed, ( e, value ) => {
			if ( e ) {
				cb( e, null );
			}
			else {
				cb( null, value );
			}
		} );
	}
}
