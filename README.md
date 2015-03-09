# node-rlogin
An rlogin client for node.js.

Certain aspects of the protocol aren't readily doable with node's net.Socket, but in its current state this module does what I need it to do. :|

Needs some work and tidying up.

Has some untested features which I might document someday.  There are some relevant comments in index.js.

###Installation

```sh
npm install rlogin
```

###Example

```js
var RLogin = require('rlogin');

// All of these options are required
var rlogin = new RLogin(
	{	'clientUsername' : "myPassword",
		'serverUsername' : "myUsername",
		'host' : "my.stupid.rlogin.server.com",
		'port' : 513,
		'terminalType' : "tty",
		'terminalSpeed' : 9600
	}
);

// If there was an error ...
rlogin.on(
	"error",
	function(err) {
		console.log(err);
	}
);

// If we connected or failed to connect ...
rlogin.on(
	"connect",
	/*	The 'connect' event handler will be supplied with one argument,
		a boolean indicating whether or not the connection was established. */
	function(state) {
		if(state) {
			console.log("Connected.");
			// Send a String or Buffer to the server.
			rlogin.send("Hi guise, here I am on this stupid rlogin server.");
			// That was fun.  Let's hang up now.
			rlogin.disconnect();
		} else {
			console.log("Failed to connect.");
		}
	}
);

// If we've been disconnected ...
rlogin.on(
	"disconnect",
	function() {
		console.log("Disconnected.");
	}
);

// If data (a Buffer) has been received from the server ...
rlogin.on(
	"data",
	function(data) {
		console.log(data.toString());
	}
);

// Now that the events will be handled properly, we can connect ...
rlogin.connect();
``` 