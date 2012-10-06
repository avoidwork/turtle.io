/**
 * Default response headers
 * 
 * @type {Object}
 */
var headers = {
	"Accept"                       : "text/html, text/plain",
	"Allow"                        : "",
	"Content-Type"                 : "text/html",
	"Date"                         : "",
	"Last-Modified"                : "",
	"Server"                       : (function () { return ("turtle.io/{{VERSION}} [abaaso/" + $.version + " node.js/" + process.versions.node.replace(/^v/, "") + " (" + process.platform.capitalize() + " V8/" + process.versions.v8 + ")]"); })(),
	"Access-Control-Allow-Headers" : "Accept, Allow, Cache-Control, Content-Type, Date, Etag, Transfer-Encoding, Server",
	"Access-Control-Allow-Methods" : "",
	"Access-Control-Allow-Origin"  : ""
};
