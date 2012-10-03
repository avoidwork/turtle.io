(function (global) {
"use strict";

var $          = require("abaaso"),
    crypto     = require("crypto"),
    filesize   = require("filesize"),
    formidable = require("formidable"),
    fs         = require("fs"),
    mime       = require("mime"),
    moment     = require("moment"),
    url        = require("url"),
    util       = require("util"),
    REGEX_HALT = new RegExp("ReferenceError|" + $.label.error.invalidArguments),
    REGEX_BODY = /head|options/i,
    REGEX_GET  = /get|head|options/i;
