"use strict";

function trim (obj) {
	return obj.replace(/^(\s+|\t+|\n+)|(\s+|\t+|\n+)$/g, "");
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

module.exports = {
	capitalize: capitalize,
	clone: clone,
	coerce: coerce,
	isEmpty: isEmpty,
	iterate: iterate,
	merge: merge,
	queryString: queryString,
	parse: parse
};
