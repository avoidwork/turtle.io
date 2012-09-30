(function (global) {
"use strict";

var $          = require("abaaso"),
    crypto     = require("crypto"),
    fs         = require("fs"),
    mmm        = require("mmmagic"),
    moment     = require("moment"),
    url        = require("url"),
    util       = require("util"),
    Magic      = mmm.Magic,
    magic      = new Magic(mmm.MAGIC_MIME_TYPE),
    REGEX_HALT = new RegExp("ReferenceError|" + $.label.error.invalidArguments),
    REGEX_BODY = /head|options/i,
    REGEX_GET  = /get|head|options/i;
