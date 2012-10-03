/**
 * Writes files to disk
 * 
 * @param  {String} path File descriptor
 * @param  {Object} res  HTTP response Object
 * @param  {Object} req  HTTP request Object
 * @return {Object}      Instance
 */
factory.prototype.write = function (path, res, req) {
	var form = new formidable.IncomingForm(),
	    self = this;

	form.parse(req, function(err, fields, files) {
		var put = (req.method === "PUT");

		if (err) self.respond(res, req, messages.ERROR_APPLICATION, codes.ERROR_APPLICATION);
		else {
			self.respond(res, req, (put ? messages.NO_CONTENT : messages.CREATED), (put ? codes.NO_CONTENT : codes.CREATED))
			util.inspect({fields: fields, files: files});
		}
	});

	return this;
};
