/**
 * Default response headers
 * 
 * @type {Object}
 */
var headers = {
	"Accept"        : "text/html, application/json, text/plain",
	"Allow"         : "GET, HEAD, OPTIONS",
	"Cache-Control" : "max-age=3600 must-revalidate",
	"Content-Type"  : "text/html",
	"Date"          : "",
	"Server"        : "turtle.io/{{VERSION}} abaaso/" + $.version + " node.js/" + process.versions.node.replace(/^v/, "") + " (" + process.platform.capitalize() + " V8/" + process.versions.v8 + ")",
	"Access-Control-Allow-Methods" : "GET, HEAD, OPTIONS",
	"Access-Control-Allow-Origin"  : "*",
	"Access-Control-Allow-Headers" : "Allow, Cache-Control, Content-Type, Etag",
};
