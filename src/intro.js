( function () {
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
    REGEX_PORT  = /:.*/,
    REGEX_SERVER= /^\_server/,
    REGEX_SLASH = /\/$/,
    REGEX_SPACE = /\s+/,
    REGEX_REWRITE,
    MSG_ACK     = "acknowledge",
    MSG_ALL     = "announce",
    MSG_MASTER  = "master",
    MSG_READY   = "ready",
    MSG_START   = "start",
    MSG_QUE_ID  = "id_queue",
    MSG_QUE_NEW = "new_queue",
    MSG_QUE_DEL = "delete_queue",
    MSG_QUE_SET = "set_queue",
    MSG_SES_DEL = "delete_session",
    MSG_SES_SET = "set_session",
    TERM_SIG    = "SIGTERM",
    TERM_CODE   = 143;

// Hooking syslog output
syslog.init( "turtle_io", syslog.LOG_PID | syslog.LOG_ODELAY, syslog.LOG_LOCAL0 );

// Disabling abaaso observer
$.discard( true );