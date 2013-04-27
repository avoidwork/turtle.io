/**
 * Pipes a stream to a URI
 * 
 * @param  {String}   uri      URI make request against
 * @param  {String}   method   HTTP method
 * @param  {Function} callback Callback function
 * @param  {Object}   arg      Stream or Buffer
 * @return {Object}            Instance
 */
factory.prototype.pipe = function ( uri, method, callback, arg ) {
	var options = {
		uri            : uri,
		method         : method.toUpperCase(),
		timeout        : 30000,
		followRedirect : true,
		maxRedirects   : 10
	};

	request( options, callback ).pipe( arg );

	return this;
};
