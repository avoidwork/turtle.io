/**
 * Request listener
 * 
 * @param  {Object} req HTTP(S) request Object
 * @param  {Object} res HTTP(S) response Object
 * @return {Object}     Instance
 * @todo Implement an async fsRead if the file is found, have error strategy
 */
factory.prototype.request = function (res, req) {
	var parsed = url.parse(req.url);

	return this.respond(res, req, messages.SUCCESS, codes.SUCCESS);
};
