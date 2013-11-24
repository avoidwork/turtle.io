"use strict";

var http = require("http"),
    server;

server = http.createServer( function ( req, res ) {
	res.writeHead( 200, {Allow: "GET, HEAD, OPTIONS"} );
	res.end( "Hello World" );
} ).listen( 8000 );
