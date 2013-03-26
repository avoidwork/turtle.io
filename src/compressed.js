/**
 * Pipes compressed asset to Client, or schedules the creation of the asset
 * 
 * @param  {Object}  res     HTTP(S) response Object
 * @param  {Object}  req     HTTP(S) request Object
 * @param  {String}  etag    Etag header
 * @param  {String}  arg     Response body
 * @param  {Number}  status  Response status code
 * @param  {Object}  headers HTTP headers
 * @param  {Boolean} local   [Optional] Indicates arg is a file path, default is false
 * @param  {Object}  timer   [Optional] Date instance
 * @return {Objet}           Instance
 */
factory.prototype.compressed = function ( res, req, etag, arg, status, headers, local, timer ) {
	local           = ( local === true );
	timer           = timer || new Date();
	var self        = this,
	    compression = this.compression( req.headers["user-agent"], req.headers["accept-encoding"] ),
	    raw, body;

	// Setting the response status code if not already set from `respond`
	if ( isNaN ( res.statusCode ) ) {
		res.statusCode = status;
	}

	// Local asset, piping result directly to Client
	if ( local ) {
		this.headers( res, req, status, headers );

		if (compression !== null) {
			res.setHeader( "Content-Encoding", compression );

			self.cached( etag, compression, function ( ready, npath ) {
				dtp.fire( "compressed", function ( p ) {
					return [etag, local ? "local" : "custom", req.headers.host, req.url, diff( timer )];
				});

				// File is ready!
				if ( ready ) {
					raw = fs.createReadStream( npath );
					raw.pipe( res );
				}
				// File is not ready, cache it locally & pipe to the client while compressing (2x)
				else {
					self.cache( etag, arg, compression );
					raw = fs.createReadStream( arg );
					raw.pipe( zlib[REGEX_DEF.test( compression ) ? "createDeflate" : "createGzip"]() ).pipe( res );
				}

				dtp.fire( "respond", function ( p ) {
					return [req.headers.host, req.method, req.url, status, diff( timer )];
				});

				self.log( prep.call( self, res, req ) );
			});
		}
		else {
			raw = fs.createReadStream( arg );
			util.pump( raw, res );

			dtp.fire( "compressed", function ( p ) {
				return [etag, local ? "local" : "custom", req.headers.host, req.url, diff( timer )];
			});
		}
	}
	// Custom or proxy route result
	else {
		if ( compression !== null ) {
			this.headers( res, req, status, headers );

			self.cached( etag, compression, function ( ready, npath ) {
				res.setHeader( "Content-Encoding" , compression );

				// Responding with cached asset
				if ( ready ) {
					dtp.fire( "compressed", function ( p ) {
						return [etag, local ? "local" : "custom", req.headers.host, req.url, diff( timer )];
					});

					raw = fs.createReadStream( npath );
					raw.pipe( res );

					self.log( prep.call( self, res, req ) );

					dtp.fire( "respond", function ( p ) {
						return [req.headers.host, req.method, req.url, status, diff( timer )];
					});
				}
				// Compressing asset & writing to disk after responding
				else {
					body = encode( arg );

					zlib[compression]( body, function ( e, compressed ) {
						dtp.fire( "compressed", function ( p ) {
							return [etag, local ? "local" : "custom", req.headers.host, req.url, diff( timer )];
						});

						if ( e ) {
							self.respond( res, req, e, codes.ERROR_APPLICATION, headers, timer, false );
						}
						else {
							self.respond( res, req, compressed, status, headers, timer, false );

							fs.writeFile( npath, compressed, function ( e ) {
								if ( e ) {
									self.log( e, true, false );
								}
								else {
									dtp.fire( "compress", function ( p ) {
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
			dtp.fire( "compressed", function ( p ) {
				return [etag, local ? "local" : "custom", req.headers.host, req.url, diff( timer )];
			});

			this.respond( res, req, arg, status, headers, timer, false );
		}
	}

	return this;
};
