/**
 * Creates a compressed version of the Body of a Response
 * 
 * @param  {String}   filename Filename of the new file (Etag without quotes)
 * @param  {String}   obj      Body or Path to file to compress
 * @param  {Function} format   Compression format (deflate or gzip)
 * @param  {Boolean}  body     [Optional] Indicates obj is the Body of a Response (default is false)
 * @return {Undefined}         undefined
 */
factory.prototype.cache = function (filename, obj, encoding, body) {
	body      = (body === true);
	var self  = this,
	    tmp   = this.config.tmp,
	    ext   = REGEX_DEF.test(encoding) ? ".df" : ".gz",
	    dest  = tmp + "/" + filename + ext;

	if (!body) {
		fs.exists(obj, function (exists) {
			var raw    = fs.createReadStream(obj),
			    stream = fs.createWriteStream(dest);

			raw.pipe(zlib[REGEX_DEF.test(encoding) ? "createDeflate" : "createGzip"]()).pipe(stream);
		});
	}
	else {
		// Converting JSON or XML to a String
		switch (true) {
			case obj instanceof Array:
			case obj instanceof Object:
				obj = $.encode(obj);
				break;
			case obj instanceof Document:
				obj = $.xml.decode(obj);
				break;
		}
		zlib[encoding](obj, function (err, compressed) {
			if (!err) fs.writeFile(dest, compressed);
			else self.log(err, true, false);
		});
	}
};
