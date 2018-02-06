var net = require('net');

var irc = require('../lib/irc');
var test = require('tape');

var testHelpers = require('./helpers');

var expected = testHelpers.getFixtures('basic');
var greeting = ':localhost 001 testbot :Welcome to the Internet Relay Chat Network testbot\r\n';

test ('flood', function(t) {
    var port = 6667;
    var mock = testHelpers.MockIrcd(port, 'utf-8', false);
    var start = new Date();
    var client = new irc.Client('localhost', 'testbot', {
        secure: false,
        floodProtectionImmediate: 5,
        floodProtectionDelay: 400,
        port: port,
        retryCount: 0,
        debug: true
    });
    var floodExpected = testHelpers.getFixtures('flood');

    mock.server.on('connection', function() {
        mock.send(greeting);
    });

    client.on('registered', function () {
        client.activateFloodProtection();
        for (var i = 0; i < floodExpected.messages.length; i++)
            client.say('test', floodExpected.messages[i]);
    });

    setTimeout(function () {
        client.disconnect();
    }, 1000);

    t.plan(expected.sent.length + floodExpected.sent.length + 2);

    setTimeout(function () {
        var msgs = mock.getIncomingMsgs();

        for (var i = 0; i < expected.sent.length - 1; i++) {
            t.equal(msgs[i], expected.sent[i][0], expected.sent[i][1]);
        }
        for (var i = 0; i < floodExpected.sent.length - 2; i++) {
            t.equal(msgs[i + expected.sent.length - 1], floodExpected.sent[i][0], floodExpected.sent[i][1]);
        }
        t.equal(msgs.length, expected.sent.length + floodExpected.sent.length - 3, "Flood rate limited");
    }, 200);

    setTimeout(function () {
        var msgs = mock.getIncomingMsgs();
        var msgs = mock.getIncomingMsgs();

	t.equal(msgs[expected.sent.length + 4], floodExpected.sent[5][0], floodExpected.sent[5][1]);
        t.equal(msgs.length, expected.sent.length + floodExpected.sent.length - 2, "Flood rate limited");
    }, 600);

    mock.on('end', function () {
        var msgs = mock.getIncomingMsgs();
	t.equal(msgs[expected.sent.length + floodExpected.sent.length - 2], floodExpected.sent[floodExpected.sent.length - 1][0], floodExpected.sent[floodExpected.sent.length - 1][1]);
	t.equal(msgs[expected.sent.length + floodExpected.sent.length - 1], expected.sent[expected.sent.length - 1][0], expected.sent[expected.sent.length - 1][1]);
        mock.close();
    });
});
