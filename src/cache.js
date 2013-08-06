/**
 * Creates a compressed version of the Body of a Response
 *
 * @method cache
 * @public
 * @param  {String}   filename Filename of the new file (Etag without quotes)
 * @param  {String}   obj      Body or Path to file to compress
 * @param  {Function} encoding Compression encoding (deflate or gzip)
 * @param  {Boolean}  body     [Optional] Indicates obj is the Body of a Response (default is false)
 * @param  {Function} callback [Optional] Callback function
 * @return {Objet}             Instance
 */
factory.prototype.cache = function ( filename, obj, encoding, body, callback ) {
	body      = ( body === true );
	var self  = this,
	    ext   = REGEX_DEF.test(encoding) ? ".df" : ".gz",
	    dest  = this.config.tmp + "/" + filename + ext,
	    timer = new Date();

	fs.exists(dest, function ( exists ) {
		var raw, stream;

		// Local asset
		if ( !body ) {
			if ( exists ) {
				raw    = fs.createReadStream( obj ),
				stream = fs.createWriteStream( dest );

				raw.pipe( zlib[REGEX_DEF.test( encoding ) ? "createDeflate" : "createGzip"]() ).pipe( stream );

				dtp.fire( "compress", function () {
					return [filename, dest, encoding, diff( timer )];
				});
			}

			if ( typeof callback === "function" ) {
				callback();
			}
		}
		// Proxy or custom route response body
		else {
			if ( !exists ) {
				obj = encode( obj );

				zlib[encoding]( obj, function ( e, compressed ) {
					if ( e ) {
						self.log( e, true, false );
					}
					else {
						fs.writeFile( dest, compressed, "utf8", function ( e ) {
							if ( e ) {
								self.log( e, true, false );
							}
							else {
								dtp.fire( "compress", function () {
									return [filename, dest, encoding, diff( timer )];
								});

								if ( typeof callback === "function" ) {
									callback();
								}
							}
						});
					}
				});
			}
			else if ( typeof callback === "function" ) {
				callback();
			}
		}
	});

	return this;
};
