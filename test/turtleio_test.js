var hippie = require( "hippie" ),
	turtleio = require( "../lib/turtle.io" ),
	port = 8001,
	etag = "";

function request ( port ) {
	return hippie().base( "http://localhost:" + port );
}

turtleio().start( {
	default: "test",
	root: __dirname + "/../sites",
	port: port,
	logs: {
		stdout: false,
		dtrace: true,
		syslog: false
	},
	vhosts: {
		"test": "test"
	}
} );

describe( "Status messages & response bodies", function () {
	it( "GET / (200 / 'Hello World!')", function ( done ) {
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

	it( "GET / (304 / empty)", function ( done ) {
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

	it( "GET / (304 / empty / validation)", function ( done ) {
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

	it( "GET /nothere.html (404 / 'File not found')", function ( done ) {
		request( port )
			.get( "/nothere.html" )
			.expectStatus( 404 )
			.expectBody(/File not found/)
			.end( function ( err ) {
				if ( err ) throw err;
				done();
			} );
	} );

	it( "GET /../README (404 / 'File not found')", function ( done ) {
		request( port )
			.get( "/../README" )
			.expectStatus( 404 )
			.expectBody(/File not found/)
			.end( function ( err ) {
				if ( err ) throw err;
				done();
			} );
	} );

	it( "GET /././../README (404 / 'File not found')", function ( done ) {
		request( port )
			.get( "/././../README" )
			.expectStatus( 404 )
			.expectBody(/File not found/)
			.end( function ( err ) {
				if ( err ) throw err;
				done();
			} );
	} );

	it( "POST / (405 / 'Method not allowed')", function ( done ) {
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

	it( "PUT / (405 / 'Method not allowed')", function ( done ) {
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

	it( "PATCH / (405 / 'Method not allowed')", function ( done ) {
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

	it( "DELETE / (405 / 'Method not allowed')", function ( done ) {
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
