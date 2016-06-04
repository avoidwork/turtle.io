# turtle.io

[![build status](https://secure.travis-ci.org/avoidwork/turtle.io.svg)](http://travis-ci.org/avoidwork/turtle.io)[![Gitter](https://badges.gitter.im/Join Chat.svg)](https://gitter.im/avoidwork/turtle.io?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

turtle.io is very easy to get up and running! All you need to do is install it, and tell it what directory holds your web sites, & which hostnames to answer for.

You can also create complex web applications, with a familiar API.

The most recent stable version of node.js is ideal; ES6 syntax support is required.

## Getting Started
1. Install the module with: `npm install turtle.io`
2. Create a script to load & start a server. You could use `sample.js` in the turtle.io directory (./node_modules/turtle.io) as a template, or see the examples below
3. [Optional] You can override defaults by passing the factory an Object

The following examples assume you've installed turtle.io into `/opt/turtleio`, if this is not the case you need to edit the applicable file to correct the path.

#### Upstart
Use the provided upstart recipe: `sudo sh -c 'cp node_modules/turtle.io/turtleio.conf /etc/init; initctl reload-configuration; service turtleio start;'`

#### Systemd
Use the provided systemd service: `sudo sh -c 'cp node_modules/turtle.io/turtleio.service /etc/systemd/system; systemctl enable turtleio; systemctl start turtleio;'`

#### What about Windows?
It runs great on Windows, but you're on your own to daemonize it!

## Examples
turtle.io requires a ***default*** virtual host to be specified, because it is the failover when a request can't be routed.

#### Virtual hosts
Virtual host keys are the hostname, and the value is the directory relative to "root".

```javascript
var turtleio = require("turtle.io");
var server = turtleio({
    default: "mysite.com",
    port: 80,
    uid: 100,
    root: "/var/www",
    hosts: {
        "mysite.com"         : "mysite.com",
        "another-domain.com" : "another-domain.com"
    }
});

server.start();
```

## Benchmark with express.js
`siege` was used instead of `ab` because we want to compare _accurate_ transaction rates.

#### Specs
- **Machine** MacBook Air (Early '14) / Core i7 @ 1.7Ghz / 8GB ram / 512 flash / OS X 10.10.2
- **ulimit** 2560
- **express** 4.11.2
- **turtle.io** 3.2.2
- **benchmark** ```siege -c100 -b -q -H 'Connection: Keep-Alive' -t15S localhost:$@```

#### Test
##### express.js
`Hello World!` from a route (content-length: 12), no `allow` header.

```javascript
var express = require("express"),
    app = express();

app.get('/', function (req, res) {
  res.send('Hello World!')
})

app.listen(3000);
```

##### turtle.io
`Hello World!` html file streamed from disk (content-length: 53), has accurate `allow` header.

```javascript
"use strict";

var turtleio = require("index.js"),
    app;

app = turtleio({
	default: "test",
	root: __dirname + "/sites",
	port: 8000,
	hosts: {
		"test" : "test"
	},
	logging: {
		enabled: false
	}
}).start();
```

#### Transactions/s
Transaction rates are similar.
- **turtle.io** ```[1233.78, 1203.2, 1187.44]  (1208.14 avg)```
- **express**   ```[1105.85, 1124.25, 1167.57] (1132.56 avg)```

## Handling Uploads
The `request` object is passed to every route handler as the second argument, will have a `body` property with the payload from the Client. It will not be coerced to another format, so if you expect JSON, you'll have to `JSON.parse()` it yourself (for now).

## API & decoration
#### request
##### allow
_String_

Allowed HTTP methods

##### ip
_Number_

Request IP

##### parsed
_Object_

Parsed HTTP request

##### query
_String_

Parsed query string

##### server
_Object_

turtle.io instance

##### host
_String_

Virtual host handling the request.

#### response
##### error
_Function (status, body)_

Send an error response.

##### redirect
_Function (url)_

Send a redirection.

##### respond
_Function (body[, status, headers])_

Send a response.

##### send
_Function (body[, status, headers])_

Send a response.

## Configuration
Configuration values can be set by passing an Object to the factory, or any time afterward.

#### address
_String (0.0.0.0)_

Network address to listen on.

#### cacheSize
_Number (1000)_

Size of LRU cache for Etag validation.

#### catchAll
_Boolean (true)_

Handle unterminated requests.

#### compress
_Boolean (true)_

Compress responses when supported.

#### default
_String_

***[Required]*** Default hostname to handle requests which are not specified within _vhosts_; must be a valid entry within _vhosts_.

#### headers
_Object_

Response headers. CORS is enabled by default.

#### hosts
_Object_

***[Required]*** Virtual hosts the server will respond for, `key` is the hostname & `value` is the directory relative to `root`.

#### index
_Array_

Files to look for when accessing a directory resource.

#### json
_Number (2)_

Default "pretty" ident size

#### logging
_Object_

Logging configuration.

#### logging.enabled
_Boolean_ (true)

Override & disable `stdout` emitting by setting to `false`.

#### logging.format
_String_ (%v %h %l %u %t \"%r\" %>s %b \"%{Referer}i\" \"%{User-agent}i\")

Common Log Format string of tokens, defaulting to standard Virtual Host format.

#### logging.level
_String_ ("info")

Minimum Common Log Level which is emitted to `stdout`.

#### logging.time
_String_ (D/MMM/YYYY:HH:mm:ss ZZ)

Format for the date/time portion of a log message.

#### maxBytes
_Number (1048576)_

Maximum request body size; when exceeded a 429 is sent.

#### port
_Number (8000)_

Port the server will listen on.

#### root
_String ("")_

Relative path to the web root directory.

#### seed
_Number (625)_

Seed for hashing of middleware with MurmurHash3.

#### ssl.cert
_Object_

[Optional] SSL certificate

#### ssl.key
_Object_

[Optional] SSL certificate key/pem

#### uid
_Number (null)_

[Optional] UID the server runs as.

## License
Copyright (c) 2016 Jason Mulligan  
Licensed under the BSD-3 license.
