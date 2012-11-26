/**
 * Verifies there's a cached version of the compressed file
 * 
 * @param  {String}   filename Filename (etag)
 * @param  {String}   format   Type of compression (gzip or deflate)
 * @param  {Function} fn       Callback function
 * @return {Objet}             Instance
 */
factory.prototype.cached = function (filename, format, fn) {
	var ext  = /deflate/.test(format) ? ".df" : ".gz",
	    path = this.config.tmp + "/" + filename + ext;

	fs.exists(path, function (exists) {
		fn(exists, path);
	});

	return this;
};
