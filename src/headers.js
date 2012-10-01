/**
 * Default response headers
 * 
 * @type {Object}
 */
var headers = {
	"Accept"                       : "text/html, text/plain",
	"Allow"                        : "GET, HEAD, OPTIONS",
	"Content-Type"                 : "text/html",
	"Date"                         : "",
	"Server"                       : "turtle.io/{{VERSION}} abaaso/" + $.version + " node.js/" + process.versions.node.replace(/^v/, "") + " (" + process.platform.capitalize() + " V8/" + process.versions.v8 + ")",
	"Access-Control-Allow-Methods" : "GET, HEAD, OPTIONS",
	"Access-Control-Allow-Origin"  : "*",
	"Access-Control-Allow-Headers" : "Accept, Allow, Cache-Control, Content-Type, Date, Etag, Transfer-Encoding, Server"
};
