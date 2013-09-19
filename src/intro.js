"use strict";

var $             = require( "abaaso" ),
    crypto        = require( "crypto" ),
    defaultConfig = require( __dirname + "/../config.json" ),
    fs            = require( "fs" ),
    http          = require( "http" ),
    https         = require( "https" ),
    http_auth     = require( "http-auth" ),
    mime          = require( "mime" ),
    moment        = require( "moment" ),
    syslog        = require( "node-syslog" ),
    toobusy       = require( "toobusy" ),
    zlib          = require( "zlib" ),
    REGEX_BODY    = /^(put|post|patch)$/i,
    REGEX_COMP    = /javascript|json|text|xml/,
    REGEX_CSV     = /text\/csv/,
    REGEX_EXT     = /\.[\w+]{1,}$/, // 1 is for source code files, etc.
    REGEX_HEAD    = /^(head|options)$/i,
    REGEX_HEAD2   = /head|options/i,
    REGEX_GET     = /^(get|head|options)$/i,
    REGEX_DEL     = /^(del)$/i,
    REGEX_DEF     = /deflate/,
    REGEX_DIR     = /\/$/,
    REGEX_GZIP    = /gz/,
    REGEX_IE      = /msie/i,
    REGEX_JSON    = /json/,
    REGEX_NEXT    = /\..*/,
    REGEX_NVAL    = /;.*/,
    REGEX_NURI    = /.*\//,
    REGEX_RENAME  = /^rename$/,
    REGEX_SPACE   = /\s+/,
    REGEX_STREAM  = /application|audio|chemical|conference|font|image|message|model|xml|video/,
    REGEX_REWRITE;

// Hooking syslog output
syslog.init( "turtle_io", syslog.LOG_PID | syslog.LOG_ODELAY, syslog.LOG_LOCAL0 );

// Disabling abaaso observer
$.discard( true );
