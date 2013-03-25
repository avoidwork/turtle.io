/**
 * Pipes compressed asset to Client, or schedules the creation of the asset
 * 
 * @param  {Object}  res     HTTP response Object
 * @param  {Object}  req     HTTP request Object
 * @param  {String}  etag    Etag header
 * @param  {String}  arg     Response body
 * @param  {Number}  status  Response status code
 * @param  {Object}  headers HTTP headers
 * @param  {Boolean} local   [Optional] Indicates arg is a file path, default is false
 * @return {Objet}           Instance
 */
factory.prototype.compressed = function ( res, req, etag, arg, status, headers, local, timer ) {
	local           = ( local === true );
	timer           = timer || new Date();
	var self        = this,
	    compression = this.compression( req.headers["user-agent"], req.headers["accept-encoding"] ),
	    raw;

	// Local asset, piping result directly to Client
	if ( local ) {
		if (compression !== null) {
			res.setHeader( "Content-Encoding", compression );
			self.cached( etag, compression, function ( ready, npath ) {
				dtp.fire( "compressed", function ( p ) {
					return [etag, local ? "local" : "proxy", req.headers.host, req.url, diff( timer )];
				});

				if ( ready ) {
					self.headers( res, req, status, headers );
					raw = fs.createReadStream( npath );
					raw.pipe( res );
				}
				else {
					self.cache( etag, arg, compression );
					raw = fs.createReadStream( arg );
					raw.pipe( zlib[REGEX_DEF.test( compression ) ? "createDeflate" : "createGzip"]() ).pipe( res );
				}

				dtp.fire( "respond", function ( p ) {
					return [req.headers.host, req.method, req.url, status, diff( timer )];
				});
			});
		}
		else {
			dtp.fire( "compressed", function ( p ) {
				return [etag, local ? "local" : "proxy", req.headers.host, req.url, diff( timer )];
			});

			raw = fs.createReadStream( arg );
			util.pump( raw, res );

			dtp.fire( "respond", function ( p ) {
				return [req.headers.host, req.method, req.url, status, diff( timer )];
			});
		}
	}
	// Custom or proxy route result
	else {
		if ( compression !== null ) {
			self.cached( etag, compression, function ( ready, npath ) {
				res.setHeader( "Content-Encoding" , compression );

				// Responding with cached asset
				if ( ready ) {
					dtp.fire( "compressed", function ( p ) {
						return [etag, local ? "local" : "proxy", req.headers.host, req.url, diff( timer )];
					});

					self.headers( res, req, status, headers );

					raw = fs.createReadStream( npath );
					raw.pipe( res );

					dtp.fire( "respond", function ( p ) {
						return [req.headers.host, req.method, req.url, status, diff( timer )];
					});
				}
				// Compressing asset & writing to disk after responding
				else {
					zlib[compression]( arg, function ( err, compressed ) {
						dtp.fire( "compressed", function ( p ) {
							return [etag, local ? "local" : "proxy", req.headers.host, req.url, diff( timer )];
						});

						if ( err ) {
							self.error( res, req, timer );
						}
						else {
							self.headers( res, req, status, headers );
							res.write( compressed );
							res.end();

							dtp.fire( "respond", function ( p ) {
								return [req.headers.host, req.method, req.url, status, diff( timer )];
							});

							fs.writeFile( npath, compressed, function ( e ) {
								if ( err ) {
									self.log( err, true, false );
								}
								else {
									dtp.fire( "compress", function ( p ) {
										return [etag, npath, compression, diff( timer )];
									});
								}
							});

							self.log( prep.call( self, res, req ) );
						}
					});
				}
			});
		}
		else {
			this.respond( res, req, arg, status, headers, timer, false );
		}
	}

	return this;
};
