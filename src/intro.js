(function (global) {
"use strict";

var $      = require("abaaso"),
    util   = require("util"),
    fs     = require("fs"),
    mmm    = require('mmmagic'),
    Magic  = mmm.Magic,
    magic  = new Magic(mmm.MAGIC_MIME_TYPE),
    moment = require("moment"),
    factory;
