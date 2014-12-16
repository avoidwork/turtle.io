var hippie = require( "hippie" ),
	turtleio = require( "../lib/turtle.io" ),
	etag = "";

function request () {
	return hippie().base( "http://localhost:8001" );
}

turtleio().start( {
	default: "test",
	root: __dirname + "/../sites",
	port: 8001,
	logs: {
		stdout: false,
		dtrace: true,
		syslog: false
	},
	vhosts: {
		"test": "test"
	}
} );

describe( "Requests", function () {
	it( "GET / (200 / 'Hello World!')", function ( done ) {
		request()
			.get( "/" )
			.expectStatus( 200 )
			.expectHeader( "status", "200 OK" )
			.expectHeader( "allow", "GET, HEAD, OPTIONS" )
			.expectHeader( "content-length", "53" )
			.expectBody(/Hello world!/)
			.end( function ( err, res ) {
				if ( err ) throw err;
				etag = res.headers.etag;
				done();
			} );
	} );

	it( "HEAD / (200 / empty)", function ( done ) {
		request()
			.head( "/" )
			.expectStatus( 200 )
			.expectHeader( "status", "200 OK" )
			.expectHeader( "allow", "GET, HEAD, OPTIONS" )
			.expectHeader( "content-length", "53" )
			.expectBody(/^$/)
			.end( function ( err ) {
				if ( err ) throw err;
				done();
			} );
	} );

	it( "GET / (206 / 'Partial response - 0 offset')", function ( done ) {
		request()
			.get( "/" )
			.header( "range", "0-5" )
			.expectStatus( 206 )
			.expectHeader( "status", "206 Partial Content" )
			.expectHeader( "content-length", "6" )
			.expectBody(/^\<html\>$/)
			.end( function ( err, res ) {
				if ( err ) throw err;
				etag = res.headers.etag;
				done();
			} );
	} );

	it( "GET / (206 / 'Partial response - offset')", function ( done ) {
		request()
			.get( "/" )
			.header( "range", "1-4" )
			.expectStatus( 206 )
			.expectHeader( "status", "206 Partial Content" )
			.expectHeader( "content-length", "4" )
			.expectBody(/^html$/)
			.end( function ( err, res ) {
				if ( err ) throw err;
				etag = res.headers.etag;
				done();
			} );
	} );

	it( "GET / (304 / empty)", function ( done ) {
		request()
			.header( "If-None-Match", etag )
			.get( "/" )
			.expectStatus( 304 )
			.expectHeader( "status", "304 Not Modified" )
			.expectHeader( "content-length", undefined )
			.expectHeader( "etag", etag )
			.expectBody(/^$/)
			.end( function ( err ) {
				if ( err ) throw err;
				done();
			} );
	} );

	it( "GET / (304 / empty / validation)", function ( done ) {
		request()
			.header( "If-None-Match", etag )
			.get( "/" )
			.expectStatus( 304 )
			.expectHeader( "status", "304 Not Modified" )
			.expectHeader( "content-length", undefined )
			.expectHeader( "etag", etag )
			.expectBody(/^$/)
			.end( function ( err ) {
				if ( err ) throw err;
				done();
			} );
	} );

	it( "GET / (416 / 'Partial response - invalid')", function ( done ) {
		request()
			.get( "/" )
			.header( "range", "a-b" )
			.expectStatus( 416 )
			.expectHeader( "status", "416 Requested Range Not Satisfiable" )
			.expectBody(/Requested Range not Satisfiable/)
			.end( function ( err, res ) {
				if ( err ) throw err;
				etag = res.headers.etag;
				done();
			} );
	} );

	it( "GET / (416 / 'Partial response - invalid #2')", function ( done ) {
		request()
			.get( "/" )
			.header( "range", "5-0" )
			.expectStatus( 416 )
			.expectHeader( "status", "416 Requested Range Not Satisfiable" )
			.expectBody(/Requested Range not Satisfiable/)
			.end( function ( err, res ) {
				if ( err ) throw err;
				etag = res.headers.etag;
				done();
			} );
	} );

	it( "POST / (405 / 'Method not allowed')", function ( done ) {
		request()
			.post( "/" )
			.expectStatus( 405 )
			.expectHeader( "status", "405 Method Not Allowed" )
			.expectHeader( "allow", "GET, HEAD, OPTIONS" )
			.expectBody(/Method not allowed/)
			.end( function ( err ) {
				if ( err ) throw err;
				done();
			} );
	} );

	it( "PUT / (405 / 'Method not allowed')", function ( done ) {
		request()
			.put( "/" )
			.expectStatus( 405 )
			.expectHeader( "status", "405 Method Not Allowed" )
			.expectHeader( "allow", "GET, HEAD, OPTIONS" )
			.expectBody(/Method not allowed/)
			.end( function ( err ) {
				if ( err ) throw err;
				done();
			} );
	} );

	it( "PATCH / (405 / 'Method not allowed')", function ( done ) {
		request()
			.patch( "/" )
			.expectStatus( 405 )
			.expectHeader( "status", "405 Method Not Allowed" )
			.expectHeader( "allow", "GET, HEAD, OPTIONS" )
			.expectBody(/Method not allowed/)
			.end( function ( err ) {
				if ( err ) throw err;
				done();
			} );
	} );

	it( "DELETE / (405 / 'Method not allowed')", function ( done ) {
		request()
			.del( "/" )
			.expectStatus( 405 )
			.expectHeader( "status", "405 Method Not Allowed" )
			.expectHeader( "allow", "GET, HEAD, OPTIONS" )
			.expectBody(/Method not allowed/)
			.end( function ( err ) {
				if ( err ) throw err;
				done();
			} );
	} );

	it( "GET /nothere.html (404 / 'File not found')", function ( done ) {
		request()
			.get( "/nothere.html" )
			.expectStatus( 404 )
			.expectHeader( "status", "404 Not Found" )
			.expectBody(/File not found/)
			.end( function ( err ) {
				if ( err ) throw err;
				done();
			} );
	} );

	// 405 is a result of a cached route that leads to a file system based 404 on GET
	it( "POST /nothere.html (405 / 'Method not allowed')", function ( done ) {
		request()
			.post( "/nothere.html" )
			.expectStatus( 405 )
			.expectHeader( "status", "405 Method Not Allowed" )
			.expectHeader( "allow", "GET, HEAD, OPTIONS" )
			.expectBody(/Method not allowed/)
			.end( function ( err ) {
				if ( err ) throw err;
				done();
			} );
	} );

	it( "PUT /nothere.html (405 / 'Method not allowed')", function ( done ) {
		request()
			.put( "/nothere.html" )
			.expectStatus( 405 )
			.expectHeader( "status", "405 Method Not Allowed" )
			.expectHeader( "allow", "GET, HEAD, OPTIONS" )
			.expectBody(/Method not allowed/)
			.end( function ( err ) {
				if ( err ) throw err;
				done();
			} );
	} );

	it( "PATCH /nothere.html (405 / 'Method not allowed')", function ( done ) {
		request()
			.patch( "/nothere.html" )
			.expectStatus( 405 )
			.expectHeader( "status", "405 Method Not Allowed" )
			.expectHeader( "allow", "GET, HEAD, OPTIONS" )
			.expectBody(/Method not allowed/)
			.end( function ( err ) {
				if ( err ) throw err;
				done();
			} );
	} );

	it( "DELETE /nothere.html (405 / 'Method not allowed')", function ( done ) {
		request()
			.del( "/nothere.html" )
			.expectStatus( 405 )
			.expectHeader( "status", "405 Method Not Allowed" )
			.expectHeader( "allow", "GET, HEAD, OPTIONS" )
			.expectBody(/Method not allowed/)
			.end( function ( err ) {
				if ( err ) throw err;
				done();
			} );
	} );

	it( "GET /../README (404 / 'File not found')", function ( done ) {
		request()
			.get( "/../README" )
			.expectStatus( 404 )
			.expectHeader( "status", "404 Not Found" )
			.expectBody(/File not found/)
			.end( function ( err ) {
				if ( err ) throw err;
				done();
			} );
	} );

	it( "GET /././../README (404 / 'File not found')", function ( done ) {
		request()
			.get( "/././../README" )
			.expectStatus( 404 )
			.expectHeader( "status", "404 Not Found" )
			.expectBody(/File not found/)
			.end( function ( err ) {
				if ( err ) throw err;
				done();
			} );
	} );
} );
