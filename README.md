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

Virtual hosts keys are hostname, and value is the directory relative to "root".

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

The /api route acts as a proxy to another service. This example also utilizes a `config.json` file local to the server script, for easy DevOps management.

```javascript
var $      = require("abaaso"),
    config = require("./config.json"),
    turtle = require("turtle.io"),
    server = new turtle();

// Setting proxy routes
server.proxy(server.config.api, "/v1");
server.proxy(server.config.api, "/v1/[a-z]+");
server.proxy(server.config.api, "/v1/[a-z]+/[a-z0-9]+");

server.start(config);
```

## License
Copyright (c) 2012 Jason Mulligan  
Licensed under the BSD-3 license.