var $         = require( "abaaso" ),
    crypto    = require( "crypto" ),
    fs        = require( "fs" ),
    http      = require( "http" ),
    https     = require( "https" ),
    http_auth = require( "http-auth" ),
    mime      = require( "mime" ),
    moment    = require( "moment" ),
    syslog    = require( "node-syslog" ),
    toobusy   = require( "toobusy" ),
    zlib      = require( "zlib" );

/**
 * TurtleIO
 *
 * @constructor
 */
function TurtleIO () {
	this.cache    = $.lru( 1000 );
	this.config   = {};
	this.handlers = {all: {regex: [], routes: [], hosts: {}}, "delete": {regex: [], routes: [], hosts: {}}, get: {regex: [], routes: [], hosts: {}}, patch: {regex: [], routes: [], hosts: {}}, post: {regex: [], routes: [], hosts: {}}, put: {regex: [], routes: [], hosts: {}}};
	this.server   = null;
	this.vhosts   = [];
};

// Prototype loop
TurtleIO.prototype.constructor = TurtleIO;

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
	return this.handler( "delete", route, fn, host );
};

/**
 * Error handler
 *
 * @method error
 * @param  {Object} req  Request Object
 * @param  {Object} res  Response Object
 * @return {Object}      TurtleIO instance
 */
TurtleIO.prototype.error = function ( req, res ) {
	return this;
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
	return this.handler( "get", route, fn, host );
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
	return this.handler( "path", route, fn, host );
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
	return this.handler( "post", route, fn, host );
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
	return this.handler( "put", route, fn, host );
};

/**
 * Sets a handler
 *
 * @method handler
 * @param  {String}   method HTTP method
 * @param  {String}   route  RegExp pattern
 * @param  {Function} fn     Handler
 * @param  {String}   host   [Optional] Virtual host, default is `all`
 * @return {Object}          TurtleIO instance
 */
TurtleIO.prototype.handler = function ( method, route, fn, host ) {
	host = host || "all";

	if ( !!this.handlers[method].hosts[host] ) {
		this.handlers[method].hosts[host] = {};
	}

	this.handlers[method].routes.push( route );
	this.handlers[method].regex.push( new RegExp( "^" + route + "$" ) );
	this.handlers[method].hosts[host][route] = fn;

	return this;
};

/**
 * Default request handler
 *
 * @method request
 * @param  {Object} req Request Object
 * @param  {Object} res Response Object
 * @return {Object}     TurtleIO instance
 */
TurtleIO.prototype.request = function ( req, res ) {
	this.respond( req, res, "hi!", 200 );

	return this;
};

/**
 * Send a response
 *
 * @method respond
 * @param  {Object} req     Request Object
 * @param  {Object} res     Response Object
 * @param  {Mixed}  body    Primitive or Buffer
 * @param  {Number} status  [Optional] HTTP status, default is `200`
 * @param  {Object} headers [Optional] HTTP headers
 * @return {Object}         TurtleIO instance
 */
TurtleIO.prototype.respond = function ( req, res, body, status, headers ) {
	status  = status  || 200;
	headers = headers || {Allow: "GET, HEAD, OPTIONS", "Content-Type": "text/plain"};

	res.writeHead( status, headers );
	res.end( body );

	return this;
};

/**
 * Restarts the instance
 *
 * @method restart
 * @return {Object} TurtleIO instance
 */
TurtleIO.prototype.restart = function () {
	var config = this.config;

	this.stop().start( config );
};

/**
 * Routes a request to a handler
 *
 * @method route
 * @param  {Object} req Request Object
 * @param  {Object} res Response Object
 * @return {Object}     TurtleIO instance
 */
TurtleIO.prototype.route = function ( req, res ) {
	var self   = this,
	    parsed = $.parse( req.url ),
	    method = req.method.toLowerCase(),
	    host, route;

	// Finding a matching vhost
	this.vhosts.each( function ( i ) {
		if ( i.test( parsed.host ) ) {
			return ! ( host = i.toString().replace( /^\/\^|\$\/$/g, "" ) );
		}
	} );

	if ( !host ) {
		host = this.config["default"];
	}

	// Looking for a match
	this.handlers[method].regex.each( function ( i, idx ) {
		var x = self.handlers[method].routes[idx];

		if ( x in self.handlers[method].hosts[host] || x in self.handlers[method].hosts.all ) {
			route   = i;
			handler = self.handlers[method].hosts[host][x] || self.handlers[method].hosts.all[x];
			return false;
		}
	} );

	// Looking for a match against generic routes
	if ( !route ) {
		this.handlers.all.regex.each( function ( i, idx ) {
			var x = self.handlers.all.routes[idx];

			if ( x in self.handlers.all.hosts[host] || x in self.handlers.all.hosts.all ) {
				route   = i;
				handler = self.handlers.all.hosts[host][x] || self.handlers.all.hosts.all[x];
				return false;
			}
		} );
	}

	if ( handler ) {
		handler( req, res );
	}
	else {
		this.error( req, res );
	}

	return this;
};

/**
 * Starts the instance
 *
 * @method start
 * @param  {Object}   config Configuration
 * @param  {Function} err    Error handler
 * @param  {Function} msg    Message handler
 * @return {Object}          TurtleIO instance
 */
TurtleIO.prototype.start = function ( config, err, msg ) {
	var self = this;

	config = config || {};
	err    = err    || null;
	msg    = msg    || null;

	// Setting configuration
	if ( !config.port ) {
		config.port = 8000;
	}

	if ( !config.ip ) {
		config.ip = "127.0.0.1";
	}

	this.config = config;

	// Setting default routes
	this.host( "all" );

	// Registering virtual hosts
	$.array.cast( config.vhosts, true ).each( function ( i ) {
		self.host( i );
	} );

	// Setting a default GET route
	if ( !this.handlers.get.routes.contains( ".*" ) ) {
		this.get( ".*", function ( req, res ) {
			self.request( req, res );
		}, "all" );
	}

	// Starting server
	if ( this.config.cert !== undefined ) {
		console.log("ssl!");
	}
	else {
		this.server = http.createServer( function ( req, res ) {
			self.route( req, res );
		} ).listen( config.port, config.ip );
	}

	console.log( "Started turtle.io on port " + config.port );

	return this;
};

/**
 * Stops the instance
 *
 * @method stop
 * @return {Object} TurtleIO instance
 */
TurtleIO.prototype.stop = function () {
	var port = this.config.port;

	this.cache    = $.lru( 1000 );
	this.config   = {};
	this.handlers = {all: {regex: [], routes: [], hosts: {}}, "delete": {regex: [], routes: [], hosts: {}}, get: {regex: [], routes: [], hosts: {}}, patch: {regex: [], routes: [], hosts: {}}, post: {regex: [], routes: [], hosts: {}}, put: {regex: [], routes: [], hosts: {}}};
	this.server   = null;
	this.vhosts   = [];

	console.log( "Stopped turtle.io on port " + port );

	return this;
};

/**
 * Registers a virtual host
 *
 * @method host
 * @param  {String} arg Virtual host
 * @return {Object}     TurtleIO instance
 */
TurtleIO.prototype.host = function ( arg ) {
	this.vhosts.push( new RegExp( "^" + arg + "$" ) );

	this.handlers.all.hosts[arg]       = {};
	this.handlers["delete"].hosts[arg] = {};
	this.handlers.get.hosts[arg]       = {};
	this.handlers.patch.hosts[arg]     = {};
	this.handlers.post.hosts[arg]      = {};
	this.handlers.put.hosts[arg]       = {};

	return this;
};

/**
 * Constructs a URL
 *
 * @method url
 * @param  {Object} req Request Object
 * @return {String}     Requested URL
 */
TurtleIO.prototype.url = function ( req ) {
	return "http" + ( this.config.cert !== undefined ? "s" : "" ) + "://" + req.headers.host + req.url;
};

module.exports = TurtleIO;
