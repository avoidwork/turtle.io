# turtle.io

[![build status](https://secure.travis-ci.org/avoidwork/turtle.io.svg)](http://travis-ci.org/avoidwork/turtle.io) [![Gitter](https://badges.gitter.im/Join Chat.svg)](https://gitter.im/avoidwork/turtle.io?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

turtle.io is an HTTP server that gets faster by learning as it handles traffic. It achieves > 99% concurrency with a higher amount of HTTP transactions/s than other popular servers.

turtle.io is very easy to get up and running! All you need to do is install it, and tell it what directory holds your web sites, & which hostnames to answer for.

You can also create complex web applications, with a familiar API.

## Getting Started
1. Install the module with: `npm install turtle.io`
2. Create a script to load & start a server. You could use `sample.js` in the turtle.io directory (./node_modules/turtle.io) as a template, or see the examples below
3. [Optional] Edit `config.json` in the turtle.io directory to configure server defaults; you can override defaults by passing server.start() an Object

## Examples
turtle.io requires a ***default*** virtual host to be specified, because it is the failover when a request can't be routed.

### Virtual hosts
Virtual host keys are the hostname, and the value is the directory relative to "root".

```javascript
var server = require("turtle.io")();
server.start({
	default : "mysite.com",
	port    : 80,
	uid     : 100,
	root    : "/var/www",
	pages   : "errors",
	vhosts  : {
		"mysite.com"         : "mysite.com",
		"another-domain.com" : "another-domain.com"
	}
});
```

### Proxy routes
This example has `/api` act as a reverse proxy to another service.

```javascript
var server = require("turtle.io")();
server.proxy("/api", "https://api.github.com");
server.start(require(__dirname + "/config.json"));
```

## Benchmark with express.js
### Specs
- **Machine** MacBook Air (Early '14) / Core i7 @ 1.7Ghz / 8GB ram / 512 flash / OS X 10.10.2
- **ulimit** 2560
- **express** 4.11.2
- **turtle.io** 3.2.2
- **benchmark** ```siege -c100 -b -q -H 'Connection: Keep-Alive' -t15S localhost:$@```

### Test
#### express.js
`Hello World!` from a route (content-length: 12), no `allow` header.

```javascript
var express = require("express"),
    app = express();

app.get('/', function (req, res) {
  res.send('Hello World!')
})

app.listen(3000);
```

#### turtle.io
`Hello World!` html file streamed from disk (content-length: 53), has accurate `allow` header.

```javascript
"use strict";

var dir    = __dirname,
    server = require(dir + "/lib/turtle.io")();

server.start( {
	default : "test",
	root    : dir + "/sites",
	vhosts  : {
		"test" : "test"
	},
	logs: {
		stdout: false
	}
} );
```
### Transactions/s
- **turtle.io** ```[1233.78, 1203.2, 1187.44]  (1208.14 avg)```
- **express**   ```[1105.85, 1124.25, 1167.57] (1132.56 avg)```

### Concurrency
- **turtle.io** ```[99.33, 99.47, 99.57] (99.46 avg)```
- **express**   ```[42.81, 41.2, 44.27]  (42.76 avg)```

## Handling Uploads
The `request` object is passed to every route handler as the second argument, will have a `body` property with the payload from the Client. It will not be coerced to another format, so if you expect JSON, you'll have to `JSON.parse()` it yourself (for now).

## Configuration
Configuration values can be set by editing `config.json` in the turtle.io directory, or by passing an Object to `start()`.

### cache
_Number (1000)_

Size of LRU cache for Etag validation.

### catchAll
_Boolean (true)_

Handle unterminated requests

### default
_String_

***[Required]*** Default hostname to handle requests which are not specified within _vhosts_; must be a valid entry within _vhosts_.

### headers
_Object_

Response headers. CORS is enabled by default.

### id
_String (turtle_io)_

DTrace application identifier

### index
_Array_

Files to look for when accessing a directory resource.

### json
_Number (2)_

Default "pretty" ident size

### logs
_Object_

Logging configuration.

### logs.format
_String_ (%v %h %l %u %t \"%r\" %>s %b \"%{Referer}i\" \"%{User-agent}i\")

Common Log Format string of tokens, defaulting to standard Virtual Host format.

### logs.level
_String_ ("info")

Minimum Common Log Level which is emitted to `stdout`.

### logs.stdout
_Boolean_ (true)

Override & disable `stdout` emitting by setting to `false`.

### logs.dtrace
_Boolean_ (false)

Override & enable `dtrace` probes which emit nanosecond timing of hot paths.

### logs.time
_String_ (D/MMM/YYYY:HH:mm:ss ZZ)

Format for the date/time portion of a log message.

### maxBytes
_Number (0/unlimited)_

Default maximum request body size, when exceeded a 429 is sent.

### pages
_String (null)_

Directory relative to `root` which has files named for HTTP status codes, to be served upon error, e.g. `404.htm`.

### port
_Number (8000)_

Port the server will listen on.

### proxy
_Object_

Proxy configuration.

### proxy.rewrite
_Array (["index.htm", "index.html"])_

Content-Type header values to apply URL rewrites to.

### root
_String ("")_

Relative path to the web root directory.

### ssl.cert
_Object_

[Optional] SSL certificate

### ssl.key
_Object_

[Optional] SSL certificate key/pem

### uid
_Number (null)_

[Optional] UID the server runs as.

### vhosts
_Object_

***[Required]*** Virtual hosts the server will respond for, `key` is the hostname & `value` is the directory relative to `root`.

## License
Copyright (c) 2014 Jason Mulligan  
Licensed under the BSD-3 license.
