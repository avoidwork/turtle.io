# turtle.io

turtle.io is a HTTP 1.1 web server with a focus on simplicity.

All you need to do is install it, and tell it what directory holds your web sites, & which hostnames to answer for.

[![build status](https://secure.travis-ci.org/avoidwork/turtle.io.png)](http://travis-ci.org/avoidwork/turtle.io)

## Getting Started

1. Install the module with: `npm install turtle.io`
2. Create a script to load & start a server. You could use `sample.js` in the turtle.io directory (./node_modules/turtle.io) as a template, or see the examples below
3. [Optional] Edit `config.json` in the turtle.io directory to configure server defaults; you can override defaults by passing server.start() an Object

## Documentation

API documentation is available at [api.turtle.io](http://api.turtle.io). Configuration details are available on the [wiki](https://github.com/avoidwork/turtle.io/wiki).

## Examples

turtle.io requires a ***default*** virtual host to be specified, because it is the failover, when a request can't be routed.

### Virtual hosts

Virtual host keys are the hostname, and the value is the directory relative to "root".

```javascript
var TurtleIO = require("turtle.io"),
    server   = new TurtleIO(),
    params;

params = {
	default : "mysite.com",
	port    : 80,
	uid     : 100,
	root    : "/var/www",
	pages   : "errors",
	vhosts  : {
		"mysite.com"         : "mysite.com",
		"another-domain.com" : "another-domain.com"
	}
};

server.start(params);
```

### Proxy routes

This example has `/api` act as a reverse proxy to another service.

```javascript
var config   = require("./config.json"),
    TurtleIO = require("turtle.io"),
    server   = new TurtleIO();

server.proxy("/api", "https://api.github.com");

server.start(config);
```

## Support

If you're having problems, use the support forum at CodersClan.

<a href="http://codersclan.net/forum/index.php?repo_id=12"><img src="http://www.codersclan.net/graphics/getSupport_blue_big.png" width="160"></a>

## License
Copyright (c) 2013 Jason Mulligan  
Licensed under the BSD-3 license.