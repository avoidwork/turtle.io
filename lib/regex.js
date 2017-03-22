"use strict";

const regex = {
	body: /^(PUT|POST|PATCH)$/,
	compress: /javascript|json|text|xml/,
	del: /^DELETE$/,
	end_slash: /\/$/,
	ext: /\.[\w+]{1,}$/, // 1 is for source code files, etc.
	head: /^(HEAD|OPTIONS)$/,
	"get": /^(GET|HEAD|OPTIONS)$/,
	get_only: /^GET$/i,
	def: /deflate/,
	dir: /\/$/,
	gzip: /gz/,
	indent: /application\/json\;\sindent=(\d+)/,
	put: /^PUT$/,
	post: /^POST$/,
	options: /^OPTIONS$/,
	root: /^\//,
	space: /\s+/
};

module.exports = regex;
