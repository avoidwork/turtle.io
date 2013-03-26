/**
 * Sets response headers
 * 
 * @param  {Object}  res             HTTP(S) response Object
 * @param  {Object}  req             HTTP(S) request Object
 * @param  {Number}  status          [Optional] Response status code
 * @param  {Object}  responseHeaders [Optional] HTTP headers to decorate the response with
 * @return {Objet}                   Instance
 */
factory.prototype.headers = function ( res, req, status, responseHeaders ) {
	status      = status || codes.SUCCESS;
	var get     = REGEX_GET.test( req.method ),
	    headers = $.clone( this.config.headers );

	if ( !( responseHeaders instanceof Object ) ) {
		responseHeaders = {};
	}

	// Decorating response headers
	$.merge( headers, responseHeaders );

	// Setting headers
	headers["Date"]                         = new Date().toUTCString();
	headers["Access-Control-Allow-Methods"] = headers.Allow;

	// Setting the response status code
	res.statusCode = status;

	// Decorating "Last-Modified" header
	if ( headers["Last-Modified"].isEmpty() ) {
		headers["Last-Modified"] = headers["Date"];
	}

	// Removing headers not wanted in the response
	if ( !get || status >= codes.INVALID_ARGUMENTS ) {
		delete headers["Cache-Control"];
	}

	switch ( true ) {
		case status >= codes.FORBIDDEN && status < codes.NOT_FOUND:
		case status >= codes.ERROR_APPLICATION:
			delete headers.Allow;
			delete headers["Access-Control-Allow-Methods"];
			delete headers["Last-Modified"];
			break;
	}

	// Decorating response with headers
	$.iterate( headers, function ( v, k ) {
		res.setHeader( k, v );
	});

	return this;
};
