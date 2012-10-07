[![build status](https://secure.travis-ci.org/avoidwork/turtle.io.png)](http://travis-ci.org/avoidwork/turtle.io)
# turtle.io

turtle.io is a HTTP 1.1 web server built on abaaso & node.js, with a focus on simplicity.

All you need to do is install it, and tell it what directory holds your web sites, & which hostnames to answer for.

## Getting Started

1. Install the module with: `npm install turtle.io`
2. Create a script to load & start a server turtle.io. You could use `sample.js` in the turtle.io directory (./node_modules/turtle.io) as a template, or see the examples below
3. [Optional] Edit config.json in turtle.io directory to configure server defaults; this is optional because you can start the server with a configuration Object to override defaults

## Examples

### Virtual hosts

```javascript
var turtle_io = require("turtle.io"),
    server    = new turtle_io(),
    params    = {};

params.debug  = true; // verbose console output
params.port   = 80;
params.root   = "/var/www";
params.vhosts = {
	"mysite.com"         : "mysite.com",
	"another-domain.com" : "another-domain.com"
}

server.start(params);
```

### API proxy

The /api route would acts as a proxy to another service on a different internal port.

This example also utilizes a `config.json` file local to the server script, for easy DevOps management.

```javascript
var $      = require("abaaso"),
    turtle = require("turtle.io"),
    config = require("./config.json"),
    server = new turtle(),
    verbs  = ["delete", "get", "put", "post"],
    headers, proxy;

/**
 * Capitalizes HTTP headers
 * 
 * @param  {Object} args Response headers
 * @return {Object}      Reshaped response headers
 */
headers = function (args) {
	var result = {},
	    rvalue  = /.*:\s+/,
	    rheader = /:.*/;

	args.trim().split("\n").each(function (i) {
		var header, value;

		value          = i.replace(rvalue, "");
		header         = i.replace(rheader, "");
		header         = header.indexOf("-") === -1 ? header.capitalize() : (function () { var x = []; header.explode("-").each(function (i) { x.push(i.capitalize()) }); return x.join("-"); })();
		result[header] = value;
	});

	return result;
};

/**
 * Proxy handler
 * 
 * @param  {Object} res HTTP response Object
 * @param  {Object} req HTTP request Object
 * @return {Undefined}  undefined
 */
proxy = function (res, req) {
	var uri = server.config.api + req.url,
	    failure, success;

	failure = function (arg, xhr) {
		var headerz;

		xhr     = xhr || {};
		headerz = typeof xhr.getAllResponseHeaders === "function" ? headers(xhr.getAllResponseHeaders()) : {};

		server.respond(res, req, arg, xhr.status || 500, headerz);
	};

	success = function (arg, xhr) {
		var headerz;

		xhr     = xhr || {};
		headerz = typeof xhr.getAllResponseHeaders === "function" ? headers(xhr.getAllResponseHeaders()) : {};

		server.respond(res, req, arg, xhr.status || 200, headerz);
	};

	uri[req.method.toLowerCase()](success, failure);
};

// Setting proxy routes
verbs.each(function (i) {
	server[i]("/api", proxy);
	server[i]("/api/[a-z]+", proxy);
	server[i]("/api/[a-z]+/[a-z0-9]+", proxy);
	server[i]("/api/reports/[a-z0-9]+/[a-z0-9-]+", proxy);
});

server.start(config);
```

## License
Copyright (c) 2012 Jason Mulligan  
Licensed under the BSD-3 license.