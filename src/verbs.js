/**
 * Sets a handler for all methods
 *
 * @method all
 * @param  {String}   route RegExp pattern
 * @param  {Function} fn    Handler
 * @param  {String}   host  [Optional] Virtual host, default is `all`
 * @return {Object}         TurtleIO instance
 */
TurtleIO.prototype.all = function ( route, fn, host ) {
	var self = this;

	array.each( VERBS, function ( i ) {
		self.use( route, fn, host, i );
	} );

	return this;
};

/**
 * Sets a DELETE handler
 *
 * @method delete
 * @param  {String}   route RegExp pattern
 * @param  {Function} fn    Handler
 * @param  {String}   host  [Optional] Virtual host, default is `all`
 * @return {Object}         TurtleIO instance
 */
TurtleIO.prototype.del = function ( route, fn, host ) {
	return this.use( route, fn, host, "delete" );
};

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
	return this.use( route, fn, host, "delete" );
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
	return this.use( route, fn, host, "get" );
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
	return this.use( route, fn, host, "patch" );
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
	return this.use( route, fn, host, "post" );
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
	return this.use( route, fn, host, "put" );
};
