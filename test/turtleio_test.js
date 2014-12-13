var hippie = require( "hippie" ),
	turtleio = require( "../lib/turtle.io" ),
	util = require( "keigai" ).util,
	iterate = util.iterate,
	merge = util.merge,
	PORT = 8000,
	etag = "",
	opts = {
		default: "test",
		root: __dirname + "/../sites",
		logs: {
			stdout: false,
			dtrace: true,
			syslog: false
		},
		vhosts: {
			"test": "test"
		}
	};

function request ( port ) {
	return hippie().base( "http://localhost:" + port );
}

describe( "GET (discovery)", function () {
	var port = ++PORT;

	turtleio().start( merge( { port: port }, opts ) );
	describe( "GET /", function () {
		it( "returns a 'Hello World!' message", function ( done ) {
			request( port )
				.get( "/" )
				.expectStatus( 200 )
				.expectHeader( "allow", "GET, HEAD, OPTIONS" )
				.expectBody(/Hello world!/)
				.end( function ( err, res ) {
					if ( err ) throw err;
					etag = res.headers.etag;
					done();
				} );
		} );
	} );
} );

describe( "GET (ETag)", function () {
	var port = ++PORT;

	turtleio().start( merge( { port: port }, opts ) );
	describe( "GET /", function () {
		it( "returns an empty response with a 304", function ( done ) {
			request( port )
				.header( "If-None-Match", etag )
				.get( "/" )
				.expectStatus( 304 )
				.expectHeader( "etag", etag )
				.end( function ( err ) {
					if ( err ) throw err;
					done();
				} );
		} );
	} );
} );

describe( "GET (ETag - validation)", function () {
	var port = ++PORT;

	turtleio().start( merge( { port: port }, opts ) );
	describe( "GET /", function () {
		it( "returns an empty response with a 304", function ( done ) {
			request( port )
				.header( "If-None-Match", etag )
				.get( "/" )
				.expectStatus( 304 )
				.expectHeader( "etag", etag )
				.end( function ( err ) {
					if ( err ) throw err;
					done();
				} );
		} );
	} );
} );

describe( "GET (invalid - external file)", function () {
	var port = ++PORT;

	turtleio().start( merge( { port: port }, opts ) );
	describe( "GET /../README", function () {
		it( "returns a 'File not found' message", function ( done ) {
			request( port )
				.get( "/../README" )
				.expectStatus( 404 )
				.expectBody(/File not found/)
				.end( function ( err ) {
					if ( err ) throw err;
					done();
				} );
		} );
	} );
} );

describe( "GET (invalid - relative / external file)", function () {
	var port = ++PORT;

	turtleio().start( merge( { port: port }, opts ) );
	describe( "GET /././././../README", function () {
		it( "returns a 'File not found' message", function ( done ) {
			request( port )
				.get( "/././././../README" )
				.expectStatus( 404 )
				.expectBody(/File not found/)
				.end( function ( err ) {
					if ( err ) throw err;
					done();
				} );
		} );
	} );
} );

describe( "POST (invalid)", function () {
	var port = ++PORT;

	turtleio().start( merge( { port: port }, opts ) );
	describe( "POST /", function () {
		it( "returns a 'Method not allowed' message", function ( done ) {
			request( port )
				.post( "/" )
				.expectStatus( 405 )
				.expectHeader( "allow", "GET, HEAD, OPTIONS" )
				.expectBody(/Method not allowed/)
				.end( function ( err ) {
					if ( err ) throw err;
					done();
				} );
		} );
	} );
} );

describe( "PUT (invalid)", function () {
	var port = ++PORT;

	turtleio().start( merge( { port: port }, opts ) );
	describe( "PUT /", function () {
		it( "returns a 'Method not allowed' message", function ( done ) {
			request( port )
				.put( "/" )
				.expectStatus( 405 )
				.expectHeader( "allow", "GET, HEAD, OPTIONS" )
				.expectBody(/Method not allowed/)
				.end( function ( err ) {
					if ( err ) throw err;
					done();
				} );
		} );
	} );
} );

describe( "PATCH (invalid)", function () {
	var port = ++PORT;

	turtleio().start( merge( { port: port }, opts ) );
	describe( "PATCH /", function () {
		it( "returns a 'Method not allowed' message", function ( done ) {
			request( port )
				.patch( "/" )
				.expectStatus( 405 )
				.expectHeader( "allow", "GET, HEAD, OPTIONS" )
				.expectBody(/Method not allowed/)
				.end( function ( err ) {
					if ( err ) throw err;
					done();
				} );
		} );
	} );
} );

describe( "DELETE (invalid)", function () {
	var port = ++PORT;

	turtleio().start( merge( { port: port }, opts ) );
	describe( "DELETE /", function () {
		it( "returns a 'Method not allowed' message", function ( done ) {
			request( port )
				.del( "/" )
				.expectStatus( 405 )
				.expectHeader( "allow", "GET, HEAD, OPTIONS" )
				.expectBody(/Method not allowed/)
				.end( function ( err ) {
					if ( err ) throw err;
					done();
				} );
		} );
	} );
} );
