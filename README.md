[![build status](https://secure.travis-ci.org/avoidwork/turtle.io.png)](http://travis-ci.org/avoidwork/turtle.io)
# turtle.io

turtle.io is a HTTP 1.1 web server built on abaaso & node.js, with a focus on simplicity.

All you need to do is install it, and tell it what directory holds your web sites, & which hostnames to answer for.

## Getting Started

1. Install the module with: `npm install turtle.io`
2. Create a script to load & start a server. You could use `sample.js` in the turtle.io directory (./node_modules/turtle.io) as a template, or see the examples below
3. [Optional] Edit `config.json` in the turtle.io directory to configure server defaults; you can override defaults by passing server.start() an Object

## Documentation

Please visit the [wiki](https://github.com/avoidwork/turtle.io/wiki).

## Support

If you're having problems with using the project, use the support forum at CodersClan.

<a href="http://codersclan.net/forum/index.php?repo_id=12"><img src="http://www.codersclan.net/graphics/getSupport_blue_big.png" width="160"></a>

## Examples

### Virtual hosts

Virtual host keys are the hostname, and the value is the directory relative to "root".

```javascript
var turtle_io = require("turtle.io"),
    server    = new turtle_io()
    params;

params = {
	default : "mysite.com";
	port    : 80;
	root    : "/var/www";
	vhosts  : {
		"mysite.com"         : "mysite.com",
		"another-domain.com" : "another-domain.com"
	}
};

server.start(params);
```

### Proxy routes

The /api route acts as a proxy to another service. This example also utilizes a `config.json` file local to the server script, for easy DevOps management.

```javascript
var config    = require("./config.json"),
    turtle_io = require("turtle.io"),
    server    = new turtle_io();

// Setting proxy routes
server.proxy("http://api.abaaso.com", "/api");

server.start(config);
```

## DTrace

DTrace is supported! 'sudo' is required to run _trace.sh_

```console
./trace.sh
```

## License
Copyright (c) 2012 Jason Mulligan  
Licensed under the BSD-3 license.