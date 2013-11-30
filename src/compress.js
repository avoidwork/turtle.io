/**
 * Pipes compressed asset to Client
 *
 * @method compressed
 * @param  {Object}  body Response body
 * @param  {Object}  type gzip (gz) or deflate (df)
 * @param  {String}  etag Etag
 * @param  {Object}  req  HTTP(S) request Object
 * @param  {Object}  res  HTTP(S) response Object
 * @param  {Boolean} file Indicates `body` is a file path
 * @return {Objet}        TurtleIO instance
 */
TurtleIO.prototype.compress = function ( body, type, etag, req, res, file ) {
	var self    = this,
	    method  = REGEX_GZIP.test( type ) ? "createGzip" : "createDeflate",
	    sMethod = method.replace( "create", "" ).toLowerCase(),
	    fp      = this.config.tmp + "/" + etag + "." + type;

	fs.exists( fp, function ( exist ) {
		if ( exist ) {
			// Pipe compressed asset to Client
			fs.createReadStream( fp ).on( "error", function () {
				self.error( req, res, self.codes.SERVER_ERROR );
			} ).pipe( res );
		}
		else if ( !file ) {
			// Pipe Stream through compression to Client & disk
			if ( typeof body.pipe === "function" ) {
				body.pipe( zlib[method]() ).pipe( res );
				body.pipe( zlib[method]() ).pipe( fs.createWriteStream( fp ) );
			}
			// Raw response body, compress and send to Client & disk
			else {
				zlib[sMethod]( body, function ( e, data ) {
					if ( e ) {
						self.log( e );
						self.unregister( req.parsed.href );
						self.error( req, res, self.codes.SERVER_ERROR );
					}
					else {
						res.end( data );

						fs.writeFile( fp, data, "utf8", function ( e ) {
							if ( e ) {
								self.log( e );
								self.unregister( req.parsed.href );
							}
						} );
					}
				} );
			}
		}
		else {
			// Pipe compressed asset to Client
			fs.createReadStream( body ).on( "error", function ( e ) {
				self.log( e );
				self.unregister( req.parsed.href );
				self.error( req, res, self.codes.SERVER_ERROR );
			} ).pipe( zlib[method]() ).pipe( res );

			// Pipe compressed asset to disk
			fs.createReadStream( body ).on( "error", function ( e ) {
				self.log( e );
			} ).pipe( zlib[method]() ).pipe( fs.createWriteStream( fp ) );
		}
	} );

	return this;
};
