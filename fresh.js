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
	this.server   = null;
	this.routes   = {};
	this.handlers = {};
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

	if ( !!this.routes[host] ) {
		this.host( host );
	}

	this.routes[host][method].push( new RegExp( "^" + route + "$" ) );
	this.handlers[host][method][route] = fn;

	return this;
};

TurtleIO.prototype.request = function ( req, res ) {

};

TurtleIO.prototype.respond = function ( req, res, body, status, headers ) {

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
	var parsed = $.parse( req.url ),
	    method = req.method.toLowerCase(),
	    host, handler;

	// Finding a matching vhost
	this.vhosts.each( function ( i ) {
		if ( i.test( parsed.host ) ) {
			return ! ( host = i.toString().replace( /^\/\^|\$\/$/g, "" ) );
		}
	} );

	if ( !host ) {
		host = this.config["default"];
	}

	this.handlers[host][method].

	res.writeHead(200, {'Content-Type': 'text/plain'});
	res.end( "hi from " + host );

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

	this.cache  = $.lru( 1000 );
	this.config = {};
	this.server = null;
	this.routes = {};
	this.vhosts = [];

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
	this.routes[arg] = {
		all      : [],
		get      : [],
		"delete" : [],
		post     : [],
		put      : [],
		patch    : []
	};

	this.handlers[arg] = {
		all      : {},
		get      : {},
		"delete" : {},
		post     : {},
		put      : {},
		patch    : {}
	};

	this.vhosts.push( new RegExp( "^" + arg + "$" ) );

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
