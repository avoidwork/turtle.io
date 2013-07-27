/**
 * Pipes compressed asset to Client, or schedules the creation of the asset
 *
 * @param  {Object}  req     HTTP(S) request Object
 * @param  {Object}  res     HTTP(S) response Object
 * @param  {String}  etag    Etag header
 * @param  {String}  arg     Response body
 * @param  {Number}  status  Response status code
 * @param  {Object}  headers HTTP headers
 * @param  {Boolean} local   [Optional] Indicates arg is a file path, default is false
 * @param  {Object}  timer   [Optional] Date instance
 * @return {Objet}           Instance
 */
factory.prototype.compressed = function ( req, res, etag, arg, status, headers, local, timer ) {
	local           = ( local === true );
	timer           = timer || new Date();
	var self        = this,
	    compression = this.compression( req.headers["user-agent"], req.headers["accept-encoding"] ),
	    raw, body;

	// Local asset, piping result directly to Client
	if ( local ) {
		this.headers( req, res, status, headers );

		if (compression !== null) {
			res.setHeader( "Content-Encoding", compression );

			this.cached( etag, compression, function ( ready, npath ) {
				// File is ready!
				if ( ready ) {
					dtp.fire( "compressed", function () {
						return [etag, local ? "local" : "custom", req.headers.host, req.url, diff( timer )];
					});

					raw = fs.createReadStream( npath );
					raw.pipe( res );
				}
				// File is not ready, cache it locally & pipe to the client while compressing (2x)
				else {
					self.cache( etag, arg, compression, true, function () {
						dtp.fire( "compressed", function () {
							return [etag, local ? "local" : "custom", req.headers.host, req.url, diff( timer )];
						});
					} );

					raw = fs.createReadStream( arg );
					raw.pipe( zlib[REGEX_DEF.test( compression ) ? "createDeflate" : "createGzip"]() ).pipe( res );
				}

				dtp.fire( "respond", function () {
					return [req.headers.host, req.method, req.url, status, diff( timer )];
				});

				self.log( prep.call( self, req, res ) );
			});
		}
		else {
			raw = fs.createReadStream( arg );
			raw.pipe( res );

			dtp.fire( "compressed", function () {
				return [etag, local ? "local" : "custom", req.headers.host, req.url, diff( timer )];
			});
		}
	}
	// Custom or proxy route result
	else {
		if ( compression !== null ) {
			this.cached( etag, compression, function ( ready, npath ) {
				res.setHeader( "Content-Encoding" , compression );

				// Responding with cached asset
				if ( ready ) {
					dtp.fire( "compressed", function () {
						return [etag, local ? "local" : "custom", req.headers.host, req.url, diff( timer )];
					});

					self.headers( req, res, status, headers );

					raw = fs.createReadStream( npath );
					raw.pipe( res );

					self.log( prep.call( self, req, res ) );

					dtp.fire( "respond", function () {
						return [req.headers.host, req.method, req.url, status, diff( timer )];
					});
				}
				// Compressing asset & writing to disk after responding
				else {
					body = encode( arg );

					zlib[compression]( body, function ( e, compressed ) {
						dtp.fire( "compressed", function () {
							return [etag, local ? "local" : "custom", req.headers.host, req.url, diff( timer )];
						});

						if ( e ) {
							self.error( req, res, e, timer );
						}
						else {
							self.respond( req, res, compressed, status, headers, timer, false );

							fs.writeFile( npath, compressed, function ( e ) {
								if ( e ) {
									self.log( e, true, false );
								}
								else {
									dtp.fire( "compress", function () {
										return [etag, npath, compression, diff( timer )];
									});
								}
							});
						}
					});
				}
			});
		}
		else {
			dtp.fire( "compressed", function () {
				return [etag, local ? "local" : "custom", req.headers.host, req.url, diff( timer )];
			});

			this.respond( req, res, arg, status, headers, timer, false );
		}
	}

	return this;
};
