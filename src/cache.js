/**
 * Creates a compressed version of a file
 * 
 * @param  {String}   filename Filename of the new file (Etag without quotes)
 * @param  {String}   path     Path to file to compress
 * @param  {Function} format   Compression format (deflate or gzip)
 * @return {Undefined}         undefined
 */
factory.prototype.cache = function (filename, path, encoding) {
	var tmp = this.config.tmp;

	fs.exists(path, function (exists) {
		var raw    = fs.createReadStream(path),
		    regex  = /deflate/,
		    ext    = regex.test(encoding) ? ".df" : ".gz",
		    dest   = tmp + "/" + filename + ext,
		    stream = fs.createWriteStream(dest);

		raw.pipe(zlib[regex.test(encoding) ? "createDeflate" : "createGzip"]()).pipe(stream);
	});
};
