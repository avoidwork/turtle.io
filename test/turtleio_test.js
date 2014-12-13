var hippie = require( "hippie" ),
	TurtleIO = require( "../lib/turtle.io" ),
	merge = require( "keigai" ).util.merge,
	opts = {
		default: "test",
		root: __dirname + "/../sites",
		logs: {
			stdout: false,
			dtrace: false,
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
	var port = 8001;

	new TurtleIO().start( merge( { port: port }, opts ) );

	describe( "GET /", function () {
		it( "returns a 'Hello World!' message", function ( done ) {
			request( port )
				.get( "/" )
				.expectStatus( 200 )
				.expectHeader( "allow", "GET, HEAD, OPTIONS" )
				.expectBody("<html>\n<body>\n\t<h1>Hello world!</h1>\n</body>\n</html>\n")
				.end( function ( err ) {
					if ( err ) throw err;
					done();
				} );
		} );
	} );
} );

describe( "GET (invalid - external file)", function () {
	var port = 8002;

	new TurtleIO().start( merge( { port: port }, opts ) );

	describe( "GET /../README", function () {
		it( "returns a 'File not found' message", function ( done ) {
			request( port )
				.get( "/../README" )
				.expectStatus( 404 )
				.expectBody("<html>\n<head>\n\t<title>File not found</title>\n</head>\n<body>\n\t<h1>File not found</h1>\n\t<p>Please verify the URL and try again</p>\n</body>\n</html>\n")
				.end( function ( err ) {
					if ( err ) throw err;
					done();
				} );
		} );
	} );
} );

describe( "GET (invalid - relative / external file)", function () {
	var port = 8003;

	new TurtleIO().start( merge( { port: port }, opts ) );

	describe( "GET /../README", function () {
		it( "returns a 'File not found' message", function ( done ) {
			request( port )
				.get( "/././././../README" )
				.expectStatus( 404 )
				.expectBody("<html>\n<head>\n\t<title>File not found</title>\n</head>\n<body>\n\t<h1>File not found</h1>\n\t<p>Please verify the URL and try again</p>\n</body>\n</html>\n")
				.end( function ( err ) {
					if ( err ) throw err;
					done();
				} );
		} );
	} );
} );

describe( "POST (invalid)", function () {
	var port = 8004;

	new TurtleIO().start( merge( { port: port }, opts ) );

	describe( "POST /", function () {
		it( "returns a 'Method not allowed' message", function ( done ) {
			request( port )
				.post( "/" )
				.expectStatus( 405 )
				.expectHeader( "allow", "GET, HEAD, OPTIONS" )
				.expectBody("<html>\n<head>\n\t<title>Method not allowed</title>\n</head>\n<body>\n\t<h1>Method not allowed</h1>\n\t<p>Please verify the `Allow` header and try again</p>\n</body>\n</html>\n")
				.end( function ( err ) {
					if ( err ) throw err;
					done();
				} );
		} );
	} );
} );

describe( "PUT (invalid)", function () {
	var port = 8005;

	new TurtleIO().start( merge( { port: port }, opts ) );

	describe( "PUT /", function () {
		it( "returns a 'Method not allowed' message", function ( done ) {
			request( port )
				.put( "/" )
				.expectStatus( 405 )
				.expectHeader( "allow", "GET, HEAD, OPTIONS" )
				.expectBody("<html>\n<head>\n\t<title>Method not allowed</title>\n</head>\n<body>\n\t<h1>Method not allowed</h1>\n\t<p>Please verify the `Allow` header and try again</p>\n</body>\n</html>\n")
				.end( function ( err ) {
					if ( err ) throw err;
					done();
				} );
		} );
	} );
} );

describe( "PATCH (invalid)", function () {
	var port = 8006;

	new TurtleIO().start( merge( { port: port }, opts ) );

	describe( "PATCH /", function () {
		it( "returns a 'Method not allowed' message", function ( done ) {
			request( port )
				.patch( "/" )
				.expectStatus( 405 )
				.expectHeader( "allow", "GET, HEAD, OPTIONS" )
				.expectBody("<html>\n<head>\n\t<title>Method not allowed</title>\n</head>\n<body>\n\t<h1>Method not allowed</h1>\n\t<p>Please verify the `Allow` header and try again</p>\n</body>\n</html>\n")
				.end( function ( err ) {
					if ( err ) throw err;
					done();
				} );
		} );
	} );
} );

describe( "DELETE (invalid)", function () {
	var port = 8007;

	new TurtleIO().start( merge( { port: port }, opts ) );

	describe( "PATCH /", function () {
		it( "returns a 'Method not allowed' message", function ( done ) {
			request( port )
				.del( "/" )
				.expectStatus( 405 )
				.expectHeader( "allow", "GET, HEAD, OPTIONS" )
				.expectBody("<html>\n<head>\n\t<title>Method not allowed</title>\n</head>\n<body>\n\t<h1>Method not allowed</h1>\n\t<p>Please verify the `Allow` header and try again</p>\n</body>\n</html>\n")
				.end( function ( err ) {
					if ( err ) throw err;
					done();
				} );
		} );
	} );
} );
