/**
 * Cookies
 *
 * @class cookie
 */
TurtleIO.prototype.cookie = {
	/**
	 * Expires a cookie if it exists
	 *
	 * @method expire
	 * @param  {Object}  res    HTTP(S) response Object
	 * @param  {String}  name   Name of the cookie to expire
	 * @param  {String}  domain [Optional] Domain to set the cookie for
	 * @param  {Boolean} secure [Optional] Make the cookie only accessible via SSL
	 * @param  {String}  path   [Optional] Path the cookie is for
	 * @return {String}        Name of the expired cookie
	 */
	expire : function ( res, name, domain, secure, path ) {
		this.set( res, name, "", "-1s", domain, secure, path );

		return name;
	},

	/**
	 * Gets a cookie from the request headers
	 *
	 * @method get
	 * @param  {Object} req  HTTP(S) request Object
	 * @param  {String} name Name of the cookie to get
	 * @return {Mixed}       Cookie or undefined
	 */
	get : function ( req, name ) {
		return this.list( req )[name];
	},

	/**
	 * Gets a list cookies from the request headers
	 *
	 * @method list
	 * @param  {Object} req  HTTP(S) request Object
	 * @param  {String} name Cookie name
	 * @return {Object}      Collection of cookies
	 */
	list : function ( req ) {
		var result = {},
		    jar    = req.headers.cookie || "";

		if ( !string.isEmpty( jar ) ) {
			array.each( string.explode( jar, ";" ), function ( i ) {
				var item = string.explode( i, "=" );

				result[item[0]] = coerce( item[1] );
			} );
		}

		return result;
	},

	/**
	 * Sets a cookie in the response headers
	 *
	 * @method set
	 * @param  {Object}  res    HTTP(S) response Object
	 * @param  {String}  name   Name of the cookie to create
	 * @param  {String}  value  Value to set
	 * @param  {String}  offset A positive or negative integer followed by "d", "h", "m" or "s"
	 * @param  {String}  domain [Optional] Domain to set the cookie for
	 * @param  {Boolean} secure [Optional] Make the cookie only accessible via SSL
	 * @param  {String}  path   [Optional] Path the cookie is for
	 * @return {Undefined}      undefined
	 */
	set : function ( res, name, value, offset, domain, secure, path ) {
		value      = ( value || "" ) + ";";
		offset     = offset || "";
		domain     = typeof domain == "string" ? ( " Domain=" + domain + ";" ) : "";
		secure     = ( secure === true ) ? " secure" : "";
		path       = typeof path == "string" ? ( " Path=" + path + ";" ) : "";
		var expire = "",
		    span   = null,
		    type   = null,
		    types  = ["d", "h", "m", "s"],
		    regex  = new RegExp(),
		    i      = types.length,
		    cookies;

		if ( !string.isEmpty( offset ) ) {
			while ( i-- ) {
				regex.compile( types[i] );

				if ( regex.test( offset ) ) {
					type = types[i];
					span = number.parse( offset, 10 );
					break;
				}
			}

			if ( isNaN( span ) ) {
				throw new Error( "Invalid Arguments" );
			}

			expire = new Date();

			if ( type === "d" ) {
				expire.setDate( expire.getDate() + span );
			}
			else if ( type === "h" ) {
				expire.setHours( expire.getHours() + span );
			}
			else if ( type === "m" ) {
				expire.setMinutes( expire.getMinutes() + span );
			}
			else if ( type === "s" ) {
				expire.setSeconds( expire.getSeconds() + span );
			}
		}

		if ( expire instanceof Date ) {
			expire = " Expires=" + expire.toUTCString() + ";";
		}

		cookies = res.getHeader( "set-sookie" ) || [];
		cookies.push( ( string.trim( name.toString() ) + "=" + value + expire + domain + path + secure ).replace( REGEX_ENDSMCN, "" ) );
		res.setHeader( "set-cookie", cookies );
	}
};
