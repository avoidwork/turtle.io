/**
 * Send a response
 *
 * @method respond
 * @param  {Object}  req     Request Object
 * @param  {Object}  res     Response Object
 * @param  {Mixed}   body    Primitive or Buffer
 * @param  {Number}  status  [Optional] HTTP status, default is `200`
 * @param  {Object}  headers [Optional] HTTP headers
 * @return {Object}          TurtleIO instance
 */
TurtleIO.prototype.respond = function ( req, res, body, status, headers ) {
	var ua       = req.headers["user-agent"],
	    encoding = req.headers["accept-encoding"],
	    type;

	body    = this.encode( body );
	status  = status  || 200;
	headers = this.headers( headers || {"Content-Type": "text/plain"} );

	// Emsuring JSON has proper mimetype
	if ( $.regex.json_wrap.test( body ) ) {
		headers["Content-Type"] = "application/json";
	}

	res.statusCode = status;
	res.writeHead( status, headers );

	// Determining if response should be compressed
	if ( compress && this.config.compress && ( type = this.compression( ua, encoding, headers["Content-Type"] ) ) && type !== null ) {
		this.compress( body, type ).pipe( res );
	}
	else {
		res.end( body );
	}

	return this;
};
