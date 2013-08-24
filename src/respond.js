/**
 * Send a response
 *
 * @method respond
 * @param  {Object}  req      Request Object
 * @param  {Object}  res      Response Object
 * @param  {Mixed}   body     Primitive or Buffer
 * @param  {Number}  status   [Optional] HTTP status, default is `200`
 * @param  {Object}  headers  [Optional] HTTP headers
 * @param  {Boolean} compress [Optional] Compress response is supported, default is `true`
 * @return {Object}           TurtleIO instance
 */
TurtleIO.prototype.respond = function ( req, res, body, status, headers, compress ) {
	status  = status  || 200;
	headers = headers || {Allow: "GET, HEAD, OPTIONS", "Content-Type": "text/plain"};

	if ( compress && this.config.compress ) {
		// compress here
	}

	res.statusCode = status;
	res.writeHead( status, this.headers( headers ) );
	res.end( body );

	return this;
};
