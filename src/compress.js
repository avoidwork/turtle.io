/**
 * Pipes compressed asset to Client
 *
 * @method compressed
 * @param  {Object}  body Response body
 * @param  {Object}  type gzip (gz) or deflate (df)
 * @param  {String}  etag Etag
 * @param  {Object}  req  HTTP(S) request Object
 * @param  {Object}  res  HTTP(S) response Object
 * @return {Objet}        TurtleIO instance
 */
TurtleIO.prototype.compress = function ( body, type, etag, req, res ) {
	var self   = this,
	    method = REGEX_GZIP.test( type ) ? "createGzip" : "createDeflate",
	    fn     = this.config.tmp + "/" + etag + "." + type;

	fs.exists( fn, function ( exist ) {
		if ( exist ) {
			fs.createReadStream( fn ).on( "error", function () {
				self.error( req, res );
			} ).pipe( res );
		}
		else if ( typeof body.pipe === "function" ) {
				body.pipe( zlib[method]() ).pipe( res );
				body.pipe( zlib[method]() ).pipe( fs.createWriteStream( fn ) );
		}
		else {
			fs.createReadStream( body ).on( "error", function () {
				zlib[method.replace( "create", "" ).toLowerCase()]( body, function ( e, data ) {
					if ( e ) {
						self.log( e );
					}

					res.end( data );
				} );
			} ).pipe( zlib[method]() ).pipe( res );

			fs.createReadStream( body ).on( "error", function () {
				zlib[method.replace( "create", "" ).toLowerCase()]( body, function ( e, data ) {
					if ( e ) {
						self.log( e );
					}
					else {
						fs.writeFile( fn, data, "utf8", function ( e ) {
							if ( e ) {
								self.log( e );
							}
						} );
					}
				} );
			} ).pipe( zlib[method]() ).pipe( fs.createWriteStream( fn ) );
		}
	} );

	return this;
};
