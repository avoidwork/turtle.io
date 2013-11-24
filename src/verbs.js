/**
 * Sets a DELETE handler
 *
 * @method delete
 * @param  {String}   route RegExp pattern
 * @param  {Function} fn    Handler
 * @param  {String}   host  [Optional] Virtual host, default is `all`
 * @return {Object}         TurtleIO instance
 */
TurtleIO.prototype["delete"] = function ( route, fn, host ) {
	var self = this;

	function op () {
		fn.apply( self, arguments );
	}

	return this.handler( "delete", route, op, host );
};

/**
 * Sets a GET handler
 *
 * @method delete
 * @param  {String}   route RegExp pattern
 * @param  {Function} fn    Handler
 * @param  {String}   host  [Optional] Virtual host, default is `all`
 * @return {Object}         TurtleIO instance
 */
TurtleIO.prototype.get = function ( route, fn, host ) {
	var self = this;

	function op () {
		fn.apply( self, arguments );
	}

	return this.handler( "get", route, op, host );
};

/**
 * Sets a PATCH handler
 *
 * @method delete
 * @param  {String}   route RegExp pattern
 * @param  {Function} fn    Handler
 * @param  {String}   host  [Optional] Virtual host, default is `all`
 * @return {Object}         TurtleIO instance
 */
TurtleIO.prototype.patch = function ( route, fn, host ) {
	var self = this;

	function op () {
		fn.apply( self, arguments );
	}

	return this.handler( "patch", route, op, host );
};

/**
 * Sets a POST handler
 *
 * @method delete
 * @param  {String}   route RegExp pattern
 * @param  {Function} fn    Handler
 * @param  {String}   host  [Optional] Virtual host, default is `all`
 * @return {Object}         TurtleIO instance
 */
TurtleIO.prototype.post = function ( route, fn, host ) {
	var self = this;

	function op () {
		fn.apply( self, arguments );
	}

	return this.handler( "post", route, op, host );
};

/**
 * Sets a PUT handler
 *
 * @method delete
 * @param  {String}   route RegExp pattern
 * @param  {Function} fn    Handler
 * @param  {String}   host  [Optional] Virtual host, default is `all`
 * @return {Object}         TurtleIO instance
 */
TurtleIO.prototype.put = function ( route, fn, host ) {
	var self = this;

	function op () {
		fn.apply( self, arguments );
	}

	return this.handler( "put", route, op, host );
};
