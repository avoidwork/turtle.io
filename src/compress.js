/**
 * Pipes compressed asset to Client
 *
 * @method compressed
 * @param  {Object}  req     HTTP(S) request Object
 * @param  {Object}  res     HTTP(S) response Object
 * @param  {Object}  body    Response body
 * @param  {Object}  type    gzip (gz) or deflate (df)
 * @param  {String}  etag    Etag
 * @param  {Boolean} file    Indicates `body` is a file path
 * @param  {Object}  options Stream options
 * @param  {Number}  status  HTTP status
 * @param  {Object}  headers HTTP headers
 * @return {Object}          TurtleIO instance
 */
compress ( req, res, body, type, etag, file, options, status, headers ) {
	let self = this,
		timer = precise().start(),
		method = REGEX.gzip.test( type ) ? "createGzip" : "createDeflate",
		sMethod = method.replace( "create", "" ).toLowerCase(),
		fp = etag ? this.config.tmp + "/" + etag + "." + type : null;

	let next = ( exist ) => {
		if ( !file ) {
			// Pipe Stream through compression to Client & disk
			if ( typeof body.pipe == "function" ) {
				if ( !res._header && !res._headerSent ) {
					res.writeHead( status, headers );
				}

				body.pipe( zlib[ method ]() ).pipe( res );
				body.pipe( zlib[ method ]() ).pipe( fs.createWriteStream( fp ) );

				timer.stop();

				self.signal( "compress", () => {
					return [ etag, fp, timer.diff() ];
				} );
			}
			// Raw response body, compress and send to Client & disk
			else {
				zlib[ sMethod ]( body, ( e, data ) => {
					if ( e ) {
						self.log( new Error( "[client " + ( req.headers[ "x-forwarded-for" ] ? array.last( string.explode( req.headers[ "x-forwarded-for" ] ) ) : req.connection.remoteAddress ) + "] " + e.message ), "error" );
						self.unregister( req.parsed.href );
						self.error( req, res, CODES.SERVER_ERROR );
					}
					else {
						if ( !res._header && !res._headerSent ) {
							headers[ "content-length" ] = data.length;
							res.writeHead( status, headers );
						}

						res.end( data );

						if ( fp ) {
							fs.writeFile( fp, data, "utf8", ( e ) => {
								if ( e ) {
									self.log( new Error( "[client " + ( req.headers[ "x-forwarded-for" ] ? array.last( string.explode( req.headers[ "x-forwarded-for" ] ) ) : req.connection.remoteAddress ) + "] " + e.message ), "error" );
									self.unregister( req.parsed.href );
								}
							} );
						}

						timer.stop();

						self.signal( "compress", () => {
							return [ etag, fp || "dynamic", timer.diff() ];
						} );
					}
				} );
			}
		}
		else {
			if ( !res._header && !res._headerSent ) {
				res.writeHead( status, headers );
			}

			// Pipe compressed asset to Client
			fs.createReadStream( body, options ).on( "error", ( e ) => {
				self.log( new Error( "[client " + ( req.headers[ "x-forwarded-for" ] ? array.last( string.explode( req.headers[ "x-forwarded-for" ] ) ) : req.connection.remoteAddress ) + "] " + e.message ), "error" );
				self.unregister( req.parsed.href );
				self.error( req, res, CODES.SERVER_ERROR );
			} ).pipe( zlib[ method ]() ).pipe( res );

			// Pipe compressed asset to disk
			if ( exist === false ) {
				fs.createReadStream( body ).on( "error", ( e ) => {
					self.log( new Error( "[client " + ( req.headers[ "x-forwarded-for" ] ? array.last( string.explode( req.headers[ "x-forwarded-for" ] ) ) : req.connection.remoteAddress ) + "] " + e.message ), "error" );
				} ).pipe( zlib[ method ]() ).pipe( fs.createWriteStream( fp ) );
			}

			timer.stop();

			self.signal( "compress", () => {
				return [ etag, fp, timer.diff() ];
			} );
		}
	}

	if ( fp ) {
		fs.exists( fp, ( exist ) => {
			// Pipe compressed asset to Client
			if ( exist ) {
				fs.lstat( fp, ( e, stats ) => {
					if ( e ) {
						self.error( req, res, e );
					}
					else {
						if ( !res._header && !res._headerSent ) {
							headers[ "content-length" ] = stats.size;

							if ( options ) {
								headers[ "content-range" ] = "bytes " + options.start + "-" + options.end + "/" + headers[ "content-length" ];
								headers[ "content-length" ] = number.diff( options.end, options.start ) + 1;
							}

							res.writeHead( status, headers );
						}

						fs.createReadStream( fp, options ).on( "error", ( e ) => {
							self.log( new Error( "[client " + ( req.headers[ "x-forwarded-for" ] ? array.last( string.explode( req.headers[ "x-forwarded-for" ] ) ) : req.connection.remoteAddress ) + "] " + e.message ), "error" );
							self.unregister( req.parsed.href );
							self.error( req, res, CODES.SERVER_ERROR );
						} ).pipe( res );

						timer.stop();

						self.signal( "compress", () => {
							return [ etag, fp, timer.diff() ];
						} );
					}
				} );
			}
			else {
				next( exist );
			}
		} );
	}
	else {
		next( false );
	}

	return this;
}
