/**
 * Cookies
 * 
 * @class cookie
 */
factory.prototype.cookie = {
	/**
	 * Expires a cookie if it exists
	 *
	 * @method expire
	 * @param  {Object} res    HTTP(S) response Object
	 * @param  {String} name   Name of the cookie to expire
	 * @param  {String} domain [Optional] Domain to set the cookie for
	 * @param  {Boolea} secure [Optional] Make the cookie only accessible via SSL
	 * @return {String}        Name of the expired cookie
	 */
	expire : function ( res, name, domain, secure ) {
		return $.cookie.expire( name, domain, secure, res );
	},

	/**
	 * Gets a cookie from the request headers
	 *
	 * @method get
	 * @param  {Object} req  HTTP(S) response Object
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
		return $.cookie.list( req.headers.cookie || "" );
	},

	/**
	 * Sets a cookie in the response headers
	 *
	 * @method set
	 * @param  {Object} res    HTTP(S) response Object
	 * @param  {String} name   Name of the cookie to create
	 * @param  {String} value  Value to set
	 * @param  {String} offset A positive or negative integer followed by "d", "h", "m" or "s"
	 * @param  {String} domain [Optional] Domain to set the cookie for
	 * @param  {Boolea} secure [Optional] Make the cookie only accessible via SSL
	 * @return {Object}        The new cookie
	 */
	set : function ( res, name, value, offset, domain, secure ) {
		return $.cookie.set( name, value, offset, domain, secure, res );
	}
};
