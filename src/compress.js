/**
 * Pipes compressed asset to Client
 *
 * @method compressed
 * @param  {Object}  body Response body
 * @param  {Object}  type gzip (gz) or deflate (df)
 * @param  {String}  etag Etag
 * @param  {Object}  res  HTTP(S) response Object
 * @return {Objet}        TurtleIO instance
 */
TurtleIO.prototype.compress = function ( body, type, etag, res ) {
	var method = REGEX_DEF.test( type ) ? "createDeflate" : "createGzip",
	    fn;

	if ( etag ) {
		fn = this.config.tmp + "/" + etag + "." + type;
		fs.exists( fn, function ( exist ) {
			if ( exist ) {
				fs.createReadStream( fn ).pipe( res );
			}
			else {
				if ( typeof body.pipe === "function" ) {
					body.pipe( zlib[method]() ).pipe( fs.createWriteStream( fn ) );
					body.pipe( zlib[method]() ).pipe( res );
				}
				else {
					fs.createReadStream( body ).pipe( zlib[method]() ).pipe( fs.createWriteStream( fn ) );
					fs.createReadStream( body ).pipe( zlib[method]() ).pipe( res );
				}
			}
		} );
	}
	// If Buffer, what do you do?
	else {
		zlib[type]( body ).pipe( res );
		zlib[type]( body ).pipe( fs.createWriteStream( fn ) );
	}

	return this;
};
