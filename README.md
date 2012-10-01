# turtle.io

Simple HTTP 1.1 webserver built on abaaso & node.js, making serving (static) websites easy.

## Getting Started
Install the module with: `npm install turtle.io`

```javascript
var turtle_io = require("turtle.io"),
    server    = new turtle_io(),
    params    = {};

params.debug  = true;
params.root   = "/var/www";   // default is "node_modules/turtle.io/sites"
params.vhosts = {
	"demo1.tld" : "demo1.tld" // hostname : directory
}

server.start(params);
```

## Documentation
Please reference the [wiki](https://github.com/avoidwork/turtle.io/wiki)

## Examples
_(Coming soon)_

## License
Copyright (c) 2012 Jason Mulligan  
Licensed under the BSD-3 license.
