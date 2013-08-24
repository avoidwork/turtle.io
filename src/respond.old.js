/**
 * Constructs a response
 *
 * @method respond
 * @public
 * @param  {Object}  req      HTTP(S) request Object
 * @param  {Object}  res      HTTP(S) response Object
 * @param  {Mixed}   output   [Optional] Response body
 * @param  {Number}  status   [Optional] HTTP status code, default is 200
 * @param  {Object}  headers  [Optional] HTTP headers to decorate the response with
 * @param  {Object}  timer    [Optional] Date instance
 * @param  {Boolean} compress [Optional] Enable compression of the response (if supported)
 * @param  {Boolean} local    [Optional] Indicates `output` is a file path, default is `false`
 * @return {Objet}            Instance
 */
factory.prototype.respond = function ( req, res, output, status, headers, timer, compress, local ) {
	status   = status || codes.SUCCESS;
	timer    = timer  || new Date(); // Not ideal! This gives a false sense of speed for custom routes
	var body = !REGEX_HEAD.test( req.method ) && output !== null && output !== undefined,
	    self = this,
	    url  = this.url( req ),
	    cached, etag, modified;

	if ( !( headers instanceof Object ) ) {
		headers = {};
	}

	if ( body ) {
		compress = ( compress !== false );
		output   = encode( output );
	}
	else {
		compress = false;
	}

	// Decorating the proper header for a JSON response
	if ( typeof output === "string" && $.regex.json_wrap.test( output ) ) {
		headers["Content-Type"] = "application/json";
	}

	if ( REGEX_GET.test( req.method ) && ( status === codes.SUCCESS || status === codes.NOT_MODIFIED ) ) {
		// CSV hook
		if ( status === codes.SUCCESS && body && headers["Content-Type"] === "application/json" && req.headers.accept && REGEX_CSV.test( req.headers.accept.explode()[0].replace( REGEX_NVAL, "" ) ) ) {
			headers["Content-Type"] = "text/csv";

			if ( !headers["Content-Disposition"] ) {
				headers["Content-Disposition"] = "attachment; filename=\"" + req.url.replace( REGEX_NURI, "" ) + ".csv\"";
			}

			output = $.json.csv( output );
		}

		// Gathering epoch for Etag generation
		if ( !headers["Last-Modified"] ) {
			modified = 0;
		}
		else {
			modified = new Date( headers["Last-Modified"] ).getTime();
		}

		// Decorating `Etag`
		if ( !headers.Etag ) {
			headers.Etag = "\"" + self.etag( url, output && output.length || 0, modified, output ) + "\"";
		}

		etag = headers.Etag.replace( /\"/g, "" );

		// Updating LRU
		cached = self.registry.cache[url];
		self.register( url, {etag: etag, mimetype: headers["Content-Type"]}, ( cached !== undefined && cached.value !== etag ) );
	}

	// Applying headers
	this.headers( req, res, status, headers );

	// Compressing response to disk
	if ( status === codes.SUCCESS && compress ) {
		self.compressed( req, res, headers.Etag.replace( /\"/g, "" ), output, status, headers, local, timer );
	}
	// Serving content
	else {
		if ( body ) {
			res.write( output );
		}

		res.end();

		if ( this.config.probes ) {
			dtp.fire( "respond", function () {
				return [req.headers.host, req.method, url, status, diff( timer )];
			});
		}
	}

	// Logging request
	this.log( prep.call( this, req, res ) );

	return this;
};
