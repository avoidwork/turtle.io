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
	var tmp   = this.config.tmp,
	    regex = /deflate/,
	    ext   = regex.test(encoding) ? ".df" : ".gz",
	    dest  = tmp + "/" + filename + ext;

	if (!body) {
		fs.exists(obj, function (exists) {
			var raw    = fs.createReadStream(obj),
			    stream = fs.createWriteStream(dest);

			raw.pipe(zlib[regex.test(encoding) ? "createDeflate" : "createGzip"]()).pipe(stream);
		});
	}
	else zlib[encoding](obj, function (err, compressed) {
		if (!err) fs.writeFile(dest, compressed);
	});
};
