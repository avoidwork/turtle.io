/**
 * Pipes compressed asset to Client, or schedules the creation of the asset
 *
 * @method compressed
 * @param  {Object}  req     HTTP(S) request Object
 * @param  {Object}  res     HTTP(S) response Object
 * @param  {String}  etag    Etag header
 * @param  {String}  arg     Response body
 * @param  {Number}  status  Response status code
 * @param  {Object}  headers HTTP headers
 * @param  {Boolean} local   [Optional] Indicates `arg` is a file path, default is `false`
 * @return {Objet}           Instance
 */
TurtleIO.prototype.compressed = function ( req, res, etag, arg, status, headers, local ) {
	local           = ( local === true );
	var self        = this,
	    compression = this.compression( req.headers["user-agent"], req.headers["accept-encoding"] ),
	    url         = this.url( req ),
	    cached      = this.registry.cache[url],
	    body, facade, raw;

	/**
	 * Cache asset & pipe to the Client while compressing (2x)
	 *
	 * @method facade
	 * @private
	 * @param  {String}  etag        Etag header
	 * @param  {String}  path        Path to asset
	 * @param  {String}  compression Type of compression
	 * @param  {Object}  req         HTTP(S) request Object
	 * @param  {Object}  res         HTTP(S) response Object
	 * @return {Undefined}           undefined
	 */
	facade = function ( etag, path, compression, req, res ) {
		self.cache( etag, path, compression, false, function () {
			raw = fs.createReadStream( path );
			raw.pipe( zlib[REGEX_DEF.test( compression ) ? "createDeflate" : "createGzip"]() ).pipe( res );
		} );
	};

	// Local asset, piping result directly to Client
	if ( local ) {
		if ( compression !== null ) {
			res.setHeader( "Content-Encoding", compression );

			if ( cached && cached.value.etag === etag ) {
				this.cached( etag, compression, function ( ready, npath ) {
					if ( ready ) {
						raw = fs.createReadStream( npath );
						raw.pipe( res );
					}
					else {
						facade( etag, arg, compression, req, res );
					}
				});
			}
			else {
				facade( etag, arg, compression, req, res );
			}
		}
		else {
			raw = fs.createReadStream( arg );
			raw.pipe( res );
		}
	}
	// Custom or proxy route result
	else {
		if ( compression !== null ) {
			this.cached( etag, compression, function ( ready, npath ) {
				res.setHeader( "Content-Encoding" , compression );

				// Responding with cached asset
				if ( ready ) {
					raw = fs.createReadStream( npath );
					raw.pipe( res );
				}
				// Compressing asset & writing to disk after responding
				else {
					body = self.encode( arg );
					zlib[compression]( body, function ( e, compressed ) {
						if ( e ) {
							self.error( req, res, e );
						}
						else {
							self.respond( req, res, compressed, status, headers, false );
							fs.writeFile( npath, compressed, function ( e ) {
								if ( e ) {
									self.log( e, true, false );
								}
							});
						}
					});
				}
			});
		}
		else {
			this.respond( req, res, arg, status, headers, false );
		}
	}

	return this;
};
