'use strict';
var express = require('express');
var assert = require('assert');
var router = express.Router();

var roscon = require('./rosconnect');
assert(roscon.serverip, "something is wrong with the functionality of the server in determining its own IP");
/* GET home page. */
router.get('/', function (req, res) {
    res.render('index', { title: 'ChatbotController', serverip: roscon.serverip });
});

module.exports = router;
