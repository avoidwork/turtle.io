"use strict";

const regex = {
	body: /^(PUT|POST|PATCH)$/,
	compress: /(javascript|json|text|xml|yaml)/,
	def: /deflate/,
	del: /^DELETE$/,
	dir: /\/$/,
	end_slash: /\/$/,
	ext: /\.[\w+]{1,}$/, // 1 is for source code files, etc.
	head: /^(HEAD|OPTIONS)$/,
	"get": /^(GET|HEAD|OPTIONS)$/,
	get_only: /^GET$/i,
	gzip: /gz/,
	indent: /application\/json\;\sindent=(\d+)/,
	post: /^POST$/,
	put: /^PUT$/,
	options: /^OPTIONS$/,
	root: /^\//,
	space: /\s+/
};

module.exports = regex;
