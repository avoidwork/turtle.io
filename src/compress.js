/**
 * Pipes compressed asset to Client
 *
 * @method compressed
 * @param  {Object}  stream Stream or Buffer
 * @param  {Object}  type   gzip (gz) or deflate (df)
 * @param  {String}  etag   Etag
 * @param  {Object}  res    HTTP(S) response Object
 * @return {Objet}          TurtleIO instance
 */
TurtleIO.prototype.compress = function ( stream, type, etag, res ) {
	var fn, fp;

	if ( etag ) {
		fn = this.config.tmp + "/" + etag + "." + type;
		fs.exists( fn, function ( exist ) {
			if ( exist ) {
				fp = fs.createReadStream( fn );
				fp.pipe( res );
			}
			else {
				fp = fs.createWriteStream( fn );
				zlib[type]( stream ).pipe( fp ).pipe( res );
			}
		} );
	}
	else {
		zlib[type]( stream ).pipe( res );
	}

	return this;
};
