( function ( global ) {
"use strict";

var $           = require( "abaaso" ),
    cluster     = require( "cluster" ),
    crypto      = require( "crypto" ),
    fs          = require( "fs" ),
    http        = require( "http" ),
    http_auth   = require( "http-auth" ),
    mime        = require( "mime" ),
    moment      = require( "moment" ),
    syslog      = require( "node-syslog" ),
    toobusy     = require( "toobusy" ),
    url         = require( "url" ),
    util        = require( "util" ),
    zlib        = require( "zlib" ),
    d           = require( "dtrace-provider" ),
    dtp         = d.createDTraceProvider( "turtle-io" ),
    REGEX_BODY  = /^(put|post|patch)$/i,
    REGEX_CSV   = /text\/csv/,
    REGEX_HALT  = new RegExp( "^(ReferenceError|" + $.label.error.invalidArguments + ")$" ),
    REGEX_HEAD  = /^(head|options)$/i,
    REGEX_HEAD2 = /head|options/i,
    REGEX_GET   = /^(get|head|options)$/i,
    REGEX_DEL   = /^(del)$/i,
    REGEX_DEF   = /deflate/,
    REGEX_GZIP  = /gzip/,
    REGEX_IE    = /msie/i,
    REGEX_DIR   = /\/$/,
    REGEX_NVAL  = /;.*/,
    REGEX_NURI  = /.*\//,
    REGEX_SERVER= /^\_server/,
    MSG_ACK     = "acknowledge",
    MSG_QUEUE   = "queue",
    MSG_DEL_SES = "delete_session",
    MSG_SET_SES = "set_session",
    fn;

// Hooking syslog output
syslog.init( "turtle_io", syslog.LOG_PID | syslog.LOG_ODELAY, syslog.LOG_LOCAL0 );

// Disabling abaaso observer
$.discard( true );
