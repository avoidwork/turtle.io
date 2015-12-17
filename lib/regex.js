"use strict";

var regex = {
	body: /^(PUT|POST|PATCH)$/,
	comp: /javascript|json|text|xml/,
	csv: /text\/csv/,
	del: /^DELETE$/,
	end_slash: /\/$/,
	ext: /\.[\w+]{1,}$/, // 1 is for source code files, etc.
	head: /^(HEAD|OPTIONS)$/,
	head_key: /:.*/,
	head_value: /.*:\s+/,
	"get": /^(GET|HEAD|OPTIONS)$/,
	get_only: /^GET$/i,
	def: /deflate/,
	dir: /\/$/,
	gzip: /gz/,
	ie: /msie/i,
	indent: /application\/json\;\sindent=(\d+)/,
	json: /json/,
	json_wrap: /^[\[\{]/,
	next: /\..*/,
	nocache: /no-store|no-cache/,
	nval: /;.*/,
	number: /\d{1,}/,
	put: /^PUT$/,
	post: /^POST$/,
	"private": /private/,
	options: /^OPTIONS$/,
	refused: /ECONNREFUSED/,
	rename: /^rename$/,
	root: /^\//,
	space: /\s+/,
	stream: /application|audio|chemical|conference|font|image|message|model|xml|video/
};

module.exports = regex;
