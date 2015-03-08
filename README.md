# node-rlogin
An rlogin client for node.js.

Certain aspects of the protocol aren't readily doable with node's net.Socket, but in its current state this module does what I need it to do. :|

Needs some work and tidying up.

'''js
var RLogin = require('rlogin');

var rlogin = new RLogin(
	{	'clientUsername' : "myPassword",
		'serverUsername' : "myUsername",
		'host' : "my.stupid.rlogin.server.com",
		'port' : 513,
		'terminalType' : "tty",
		'terminalSpeed' : 9600
	}
);

rlogin.on(
	"error",
	function(err) {
		console.log(err);
	}
);

rlogin.on(
	"connect",
	function(state) {
		console.log((state) ? "Connected" : "Disconnected");
	}
);

rlogin.on(
	"data",
	function(data) {
		console.log(data.toString());
	}
);

rlogin.connect();
''' 