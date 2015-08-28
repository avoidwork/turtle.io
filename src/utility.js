function trim (obj) {
	return obj.replace(/^(\s+|\t+|\n+)|(\s+|\t+|\n+)$/g, "");
}

function connect (req, res, next) {
	let server = req.server,
		payload;

	if (regex.body.test(req.method)) {
		req.setEncoding("utf-8");

		req.on("data", data => {
			payload = payload === undefined ? data : payload + data;

			if (server.config.maxBytes > 0 && Buffer.byteLength(payload) > server.config.maxBytes) {
				req.invalid = true;
				next(new Error(this.codes.REQ_TOO_LARGE));
			}
		});

		req.on("end", function () {
			if (!req.invalid) {
				if (payload) {
					req.body = payload;
				}

				next();
			}
		});
	} else {
		next();
	}
}

function etag (req, res, next) {
	let cached, headers;

	if (regex.get_only.test(req.method) && !req.headers.range && req.headers["if-none-match"] !== undefined) {
		// Not mutating cache, because `respond()` will do it
		cached = req.server.etags.cache[req.parsed.href];

		// Sending a 304 if Client is making a GET & has current representation
		if (cached && (req.headers["if-none-match"] || "").replace(/\"/g, "") === cached.value.etag) {
			headers = clone(cached.value.headers);
			headers.age = parseInt(new Date().getTime() / 1000 - cached.value.timestamp, 10);
			res.respond(MESSAGES.NO_CONTENT, CODES.NOT_MODIFIED, headers).then(null, function (e) {
				next(e);
			});
		} else {
			next();
		}
	} else {
		next();
	}
}

function explode (obj, arg = ",") {
	return trim(obj).split(new RegExp("\\s*" + arg + "\\s*"));
}

function capitalize (obj, all = false) {
	let result;

	if (all) {
		result = explode(obj, " ").map(capitalize).join(" ");
	} else {
		result = obj.charAt(0).toUpperCase() + obj.slice(1);
	}

	return result;
}

function clone (arg) {
	return JSON.parse(JSON.stringify(arg));
}

function coerce (value) {
	let tmp;

	if (value === null || value === undefined) {
		return undefined;
	} else if (value === "true") {
		return true;
	} else if (value === "false") {
		return false;
	} else if (value === "null") {
		return null;
	} else if (value === "undefined") {
		return undefined;
	} else if (value === "") {
		return value;
	} else if (!isNaN(tmp = Number(value))) {
		return tmp;
	} else if (regex.json_wrap.test(value)) {
		return JSON.parse(value);
	} else {
		return value;
	}
}

function cors (req, res, next) {
	req.cors = req.headers.origin !== undefined;
	next();
}

function defer () {
	let promise, resolver, rejecter;

	promise = new Promise(function (resolve, reject) {
		resolver = resolve;
		rejecter = reject;
	});

	return {resolve: resolver, reject: rejecter, promise: promise};
}

function isEmpty (obj) {
	return trim(obj) === "";
}

function iterate (obj, fn) {
	if (obj instanceof Object) {
		array.each(Object.keys(obj), function (i) {
			fn.call(obj, obj[i], i);
		});
	} else {
		array.each(obj, fn);
	}
}

function merge (a, b) {
	let c = clone(a),
		d = clone(b);

	if ((c instanceof Object) && (d instanceof Object)) {
		array.each(Object.keys(d), function (i) {
			if ((c[i] instanceof Object) && (d[i] instanceof Object)) {
				c[i] = merge(c[i], d[i]);
			} else if ((c[i] instanceof Array) && (d[i] instanceof Array)) {
				c[i] = c[i].concat(d[i]);
			} else {
				c[i] = d[i];
			}
		});
	} else if ((c instanceof Array) && (d instanceof Array)) {
		c = c.concat(d);
	} else {
		c = d;
	}

	return c;
}

function queryString (qstring="") {
	let obj = {};
	let aresult = qstring.split("?");
	let result;

	if (aresult.length > 1) {
		aresult.shift();
	}

	result = aresult.join("?");

	array.each(result.split("&"), function (prop) {
		let aitem = prop.replace(/\+/g, " ").split("=");
		let item;

		if (aitem.length > 2) {
			item = [aitem.shift(), aitem.join("=")];
		} else {
			item = aitem;
		}

		if (isEmpty(item[0])) {
			return;
		}

		if (item[1] === undefined) {
			item[1] = "";
		} else {
			item[1] = coerce(decodeURIComponent(item[1]));
		}

		if (obj[item[0]] === undefined) {
			obj[item[0]] = item[1];
		} else if (!(obj[item[0]] instanceof Array)) {
			obj[item[0]] = [obj[item[0]]];
			obj[item[0]].push(item[1]);
		} else {
			obj[item[0]].push(item[1]);
		}
	});

	return obj;
}

function parse (uri) {
	let luri = uri;
	let idxAscii, idxQ, parsed, obj;

	if (luri === undefined || luri === null) {
		luri = "";
	} else {
		idxAscii = luri.indexOf("%3F");
		idxQ = luri.indexOf("?");

		if ((idxQ === -1 && idxAscii > -1) || (idxAscii < idxQ)) {
			luri = luri.replace("%3F", "?");
		}
	}

	obj = url.parse(luri);

	iterate(obj, function (v, k) {
		if (v === null) {
			obj[k] = undefined;
		}
	});

	parsed = {
		auth: obj.auth || "",
		protocol: obj.protocol,
		hostname: obj.hostname,
		port: obj.port || "",
		pathname: obj.pathname,
		search: obj.search,
		hash: obj.hash || "",
		host: obj.host
	};

	parsed.href = obj.href || (parsed.protocol + "//" + (isEmpty(parsed.auth) ? "" : parsed.auth + "@") + parsed.host + parsed.pathname + parsed.search + parsed.hash);
	parsed.path = obj.path || parsed.pathname + parsed.search;
	parsed.query = queryString(parsed.search);

	return parsed;
}
