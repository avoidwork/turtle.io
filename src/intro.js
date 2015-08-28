"use strict";

const constants = require("constants"),
	mmh3 = require("murmurhash3js").x86.hash32,
	path = require("path"),
	fs = require("fs"),
	url = require("url"),
	http = require("http"),
	https = require("https"),
	mime = require("mime"),
	moment = require("moment"),
	os = require("os"),
	zlib = require("zlib"),
	defaultConfig = require(path.join(__dirname, "..", "config.json")),
	dtrace = require("dtrace-provider"),
	precise = require("precise"),
	array = require("retsu"),
	csv = require("csv.js"),
	lru = require("tiny-lru"),
	Promise = require("es6-promise").Promise,
	ALL = "all",
	VERSION = require(path.join(__dirname, "..", "package.json")).version,
	VERBS = ["delete", "get", "post", "put", "patch"];

let LOGLEVEL,
	LOGGING,
	STALE;
