# Change Log
Significant changes only

## 3.2.4
- Fixed a regression in error passing within `run()`
- Removed an unneeded comparison from `run()`
- Added `io.js` (latest stable) to travis-ci build

## 3.2.2
- Refactored `run()` to use an `array.iterator()` from keigai & constrained `try / catch` scope
- Sorted `config.json` keys alphabetically

## 3.2.1
- Dropped `node-syslog`, as it won't compile for node.js 0.12.0 or io.js 1.x.x

## 3.2.0
- Refactored to ECMAScript 6 syntax, utilizing '6to5' to transpile to ECMAScript 5

## 3.1.0
- Refactored `hash()` to utilize murmur3 for middleware

## 3.0.0
- Refactored dual pipeline to a single, middleware based pipeline

## 2.3.0
- Removed baked in `authentication` in favor of middleware

## 2.2.0
- Removed baked in `cookie` & `session` in favor of middleware

## 2.1.0
- Fixed Etag related issues

## 2.0.0
- Added support for Connect middleware, via `this.use()`

## 1.2.0
- Refactored to use keigai, instead of abaaso

## 1.1.4
- Added `logs.syslog` boolean to configuration flags, to disable emitting to syslog

## 1.1.0
- Deprecated `this.cipher()`, fixed `this.respond()` & `this.session{}`

## 0.12.29
- Changed order of parameters for `this.proxy()`

## 0.12.0
- Rewrote most of the app, changing the API. Dtrace probes & clustering are gone.

## 0.10.0
- The `req` & `res` parameters have reversed order in all APIs to be consistent with node.js and other projects.

## 0.11.0
- LRU cache is introduced for Etag validation; size of cache is controlled by `cache` property.

## 0.6.1
- Custom routes receive a third parameter of a Date instance. This should be passed as a sixth parameter to `this.respond` if DTrace probes are important to you!
