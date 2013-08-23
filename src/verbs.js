/**
 * Sets a route for all verbs
 *
 * @method all
 * @public
 * @param  {RegExp}   route Route
 * @param  {Function} fn    Handler
 * @param  {String}   host  [Optional] Hostname this route is for (default is all)
 * @return {Object}         Instance
 */
factory.prototype.all = function ( route, fn, host ) {
	host      = host || "all";
	var self  = this,
	    timer = new Date();

	$.route.set( route, function ( req, res ) {
		handler.call( self, req, res, fn );
	}, "all", host );

	// Caching route
	if ( !this.config.routesHash[host] ) {
		this.config.routesHash[host] = {all: []};
	}
	else if ( !this.config.routesHash[host].all ) {
		this.config.routesHash[host].all = [];
	}

	this.config.routesHash[host].all.push( route );

	if ( this.config.probes ) {
		dtp.fire( "route-set", function () {
			return [host || "*", route, "ALL", diff( timer )];
		});
	}

	return this;
};

/**
 * Sets a DELETE route
 *
 * @method delete
 * @public
 * @param  {RegExp}   route Route
 * @param  {Function} fn    Handler
 * @param  {String}   host  [Optional] Hostname this route is for (default is all)
 * @return {Object}         Instance
 */
factory.prototype["delete"] = function ( route, fn, host ) {
	host      = host || "all";
	var self  = this,
	    timer = new Date();

	$.route.set( route, function ( req, res ) {
		handler.call( self, req, res, fn );
	}, "delete", host );

	// Caching route
	if ( !this.config.routesHash[host] ) {
		this.config.routesHash[host] = {"delete": []};
	}
	else if ( !this.config.routesHash[host]["delete"] ) {
		this.config.routesHash[host]["delete"] = [];
	}

	this.config.routesHash[host]["delete"].push( route );

	if ( this.config.probes ) {
		dtp.fire( "route-set", function () {
			return [host || "*", route, "DELETE", diff( timer )];
		});
	}

	return this;
};

/**
 * Sets a GET route
 *
 * @method get
 * @public
 * @param  {RegExp}   route Route
 * @param  {Function} fn    Handler
 * @param  {String}   host  [Optional] Hostname this route is for (default is all)
 * @return {Object}         Instance
 */
factory.prototype.get = function ( route, fn, host ) {
	host      = host || "all";
	var self  = this,
	    timer = new Date();

	$.route.set( route, function ( req, res ) {
		handler.call( self, req, res, fn );
	}, "get", host );

	// Caching route
	if ( !this.config.routesHash[host] ) {
		this.config.routesHash[host] = {get: []};
	}
	else if ( !this.config.routesHash[host].get ) {
		this.config.routesHash[host].get = [];
	}

	this.config.routesHash[host].get.push( route );

	if ( this.config.probes ) {
		dtp.fire( "route-set", function () {
			return [host || "*", route, "GET", diff( timer )];
		});
	}

	return this;
};

/**
 * Sets a PATCH route
 *
 * @method patch
 * @public
 * @param  {RegExp}   route Route
 * @param  {Function} fn    Handler
 * @param  {String}   host  [Optional] Hostname this route is for (default is all)
 * @return {Object}         Instance
 */
factory.prototype.patch = function ( route, fn, host ) {
	host      = host || "all";
	var self  = this,
	    timer = new Date();

	$.route.set( route, function ( req, res ) {
		handler.call( self, req, res, fn );
	}, "patch", host );

	// Caching route
	if ( !this.config.routesHash[host] ) {
		this.config.routesHash[host] = {patch: []};
	}
	else if ( !this.config.routesHash[host].patch ) {
		this.config.routesHash[host].patch = [];
	}

	this.config.routesHash[host].patch.push( route );

	if ( this.config.probes ) {
		dtp.fire( "route-set", function () {
			return [host || "*", route, "PATCH", diff( timer )];
		});
	}

	return this;
};

/**
 * Sets a POST route
 *
 * @method post
 * @public
 * @param  {RegExp}   route Route
 * @param  {Function} fn    Handler
 * @param  {String}   host  [Optional] Hostname this route is for (default is all)
 * @return {Object}         Instance
 */
factory.prototype.post = function ( route, fn, host ) {
	host      = host || "all";
	var self  = this,
	    timer = new Date();

	$.route.set( route, function ( req, res ) {
		handler.call( self, req, res, fn );
	}, "post", host );

	// Caching route
	if ( !this.config.routesHash[host] ) {
		this.config.routesHash[host] = {post: []};
	}
	else if ( !this.config.routesHash[host].post ) {
		this.config.routesHash[host].post = [];
	}

	this.config.routesHash[host].post.push( route );

	if ( this.config.probes ) {
		dtp.fire( "route-set", function () {
			return [host || "*", route, "POST", diff( timer )];
		});
	}

	return this;
};

/**
 * Sets a DELETE route
 *
 * @method put
 * @public
 * @param  {RegExp}   route Route
 * @param  {Function} fn    Handler
 * @param  {String}   host  [Optional] Hostname this route is for (default is all)
 * @return {Object}         Instance
 */
factory.prototype.put = function ( route, fn, host ) {
	host      = host || "all";
	var self  = this,
	    timer = new Date();

	$.route.set( route, function ( req, res ) {
		handler.call( self, req, res, fn );
	}, "put", host );

	// Caching route
	if ( !this.config.routesHash[host] ) {
		this.config.routesHash[host] = {put: []};
	}
	else if ( !this.config.routesHash[host].put ) {
		this.config.routesHash[host].put = [];
	}

	this.config.routesHash[host].put.push( route );

	if ( this.config.probes ) {
		dtp.fire( "route-set", function () {
			return [host || "*", route, "PUT", diff( timer )];
		});
	}

	return this;
};
