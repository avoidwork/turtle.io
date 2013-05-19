/**
 * Constructs a response
 * 
 * @method respond
 * @param  {Object}  res      HTTP(S) response Object
 * @param  {Object}  req      HTTP(S) request Object
 * @param  {Mixed}   output   [Optional] Response body
 * @param  {Number}  status   [Optional] HTTP status code, default is 200
 * @param  {Object}  headers  [Optional] HTTP headers to decorate the response with
 * @param  {Object}  timer    [Optional] Date instance
 * @param  {Boolean} compress [Optional] Enable compression of the response (if supported)
 * @return {Objet}            Instance
 */
factory.prototype.respond = function ( res, req, output, status, headers, timer, compress ) {
	status       = status || codes.SUCCESS;
	timer        = timer  || new Date(); // Not ideal! This gives a false sense of speed for custom routes
	compress     = ( compress === true );
	var body     = !REGEX_HEAD.test( req.method ) && output !== null,
	    encoding = this.compression( req.headers["user-agent"], req.headers["accept-encoding"] ),
	    self     = this,
	    nth, salt;

	if ( !( headers instanceof Object ) ) {
		headers = {};
	}

	// Determining wether compression is supported
	compress = compress && body && encoding !== null;

	// Stringifying Array or Object
	output = encode( output );

	// Decorating the proper header for a JSON response
	if ( typeof output === "string" && $.regex.json_wrap.test( output ) ) {
		headers["Content-Type"] = "application/json";
	}

	if ( status === 200 ) {
		// CSV hook
		if ( body && headers["Content-Type"] === "application/json" && req.headers["accept"] !== undefined && REGEX_CSV.test( req.headers["accept"].explode()[0].replace( REGEX_NVAL, "" ) ) ) {
			headers["Content-Type"] = "text/csv";

			if ( headers["Content-Disposition"] === undefined ) {
				headers["Content-Disposition"] = "attachment; filename=\"" + req.url.replace( REGEX_NURI, "" ) + ".csv\"";
			}

			output = $.json.csv( output );
		}

		// Setting Etag if not present
		if ( headers.Etag === undefined ) {
			salt = req.url + "-" + req.method + "-" + $.encode( req.headers ) + "-" + ( output !== null && typeof output.length !== "undefined" ? output.length : null ) + "-" + output;
			headers.Etag = "\"" + self.hash( salt ) + "\"";
		}
	}

	// Comparing against request headers incase this is a custom route response
	if ( headers.Etag !== undefined && req.headers["if-none-match"] === headers.Etag ) {
		status = 304;
		body   = false;
	}

	// Compressing response to disk
	if ( status === 200 && compress ) {
		self.compressed( res, req, headers.Etag.replace(/"/g, ""), output, status, headers, false, timer );
	}
	// Serving content
	else {
		this.headers( res, req, status, headers );

		if ( body ) {
			res.write( output );
		}

		res.end();

		dtp.fire( "respond", function ( p ) {
			return [req.headers.host, req.method, req.url, status, diff( timer )];
		});

		self.log( prep.call( self, res, req ) );
	}

	return this;
};
