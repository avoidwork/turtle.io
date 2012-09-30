(function (global) {
"use strict";

var $          = require("abaaso"),
    util       = require("util"),
    crypto     = require("crypto"),
    fs         = require("fs"),
    mmm        = require('mmmagic'),
    Magic      = mmm.Magic,
    magic      = new Magic(mmm.MAGIC_MIME_TYPE),
    moment     = require("moment"),
    REGEX_HALT = new RegExp("ReferenceError|" + $.label.error.invalidArguments),
    REGEX_BODY = /head|options/i,
    REGEX_GET  = /get|head|options/i;
