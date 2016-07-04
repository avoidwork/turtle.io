"use strict";

const merge = require("tiny-merge");

function trim (obj) {
	return obj.replace(/^(\s+|\t+|\n+)|(\s+|\t+|\n+)$/g, "");
}

function explode (obj, arg = ",") {
	return trim(obj).split(new RegExp("\\s*" + arg + "\\s*"));
}

function capitalize (obj, all = false, delimiter = " ") {
	let result;

	if (all) {
		result = explode(obj, delimiter).map(capitalize).join(delimiter);
	} else {
		result = obj.charAt(0).toUpperCase() + obj.slice(1);
	}

	return result;
}

function clone (arg) {
	return JSON.parse(JSON.stringify(arg));
}

module.exports = {
	capitalize: capitalize,
	clone: clone,
	explode: explode,
	merge: merge
};
