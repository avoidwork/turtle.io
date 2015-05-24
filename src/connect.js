/**
 * Connection handler
 *
 * @method connect
 * @param  {Array} args [req, res]
 * @return {Object}     Promise
 */
connect ( args ) {
	let deferred = defer(),
		req = args[ 0 ],
		res = args[ 1 ],
		method = req.method.toLowerCase(),
		payload;

	// Setting listeners if expecting a body
	if ( regex.body.test( method ) ) {
		req.setEncoding( "utf-8" );

		req.on( "data", data => {
			payload = payload === undefined ? data : payload + data;

			if ( this.config.maxBytes > 0 && Buffer.byteLength( payload ) > this.config.maxBytes ) {
				req.invalid = true;
				deferred.reject( new Error( CODES.REQ_TOO_LARGE ) );
			}
		} );

		req.on( "end", function () {
			if ( !req.invalid ) {
				if ( payload ) {
					req.body = payload;
				}

				deferred.resolve( [ req, res ] );
			}
		} );
	} else {
		deferred.resolve( [ req, res ] );
	}

	return deferred.promise;
}
