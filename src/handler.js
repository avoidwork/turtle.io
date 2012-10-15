/**
 * Route handler
 * 
 * @param  {Object} res HTTP response Object
 * @param  {Object} req HTTP request Object
 * @return {Object}     Instance
 */
var handler = function (res, req, fn) {
	var self = this;

	res.on("close", function () {
		self.log(res, req);
	});

	fn.call(self, res, req);
	self.log(prep.call(self, res, req), false, self.config.debug);
};
