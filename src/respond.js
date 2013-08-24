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
	body    = this.encode( body );
	status  = status  || 200;
	headers = this.headers( headers || {"Content-Type": "text/plain"} );

	// Emsuring JSON has proper mimetype
	if ( $.regex.json_wrap.test( body ) ) {
		headers["Content-Type"] = "application/json";
	}

	//if ( compress && this.config.compress ) {
		// compress here
	//}

	res.statusCode = status;
	res.writeHead( status, headers );
	res.end( body );

	return this;
};
