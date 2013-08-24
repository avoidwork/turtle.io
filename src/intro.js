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
    REGEX_CSV     = /text\/csv/,
    REGEX_HEAD    = /^(head|options)$/i,
    REGEX_HEAD2   = /head|options/i,
    REGEX_GET     = /^(get|head|options)$/i,
    REGEX_DEL     = /^(del)$/i,
    REGEX_DEF     = /deflate/,
    REGEX_GZIP    = /gzip/,
    REGEX_IE      = /msie/i,
    REGEX_DIR     = /\/$/,
    REGEX_NEXT    = /\..*/,
    REGEX_NVAL    = /;.*/,
    REGEX_NURI    = /.*\//,
    REGEX_PORT    = /:.*/,
    REGEX_SERVER  = /^\_server/,
    REGEX_SPACE   = /\s+/,
    REGEX_REWRITE;

// Hooking syslog output
syslog.init( "turtle_io", syslog.LOG_PID | syslog.LOG_ODELAY, syslog.LOG_LOCAL0 );

// Disabling abaaso observer
$.discard( true );
