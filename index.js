var net = require('net'),
	events = require('events'),
	util = require('util');

var RLogin = function(options) {

	var self = this;
	events.EventEmitter.call(this);	

	const	DC1 = 0x11,
			DC3 = 0x13,
			CR = 0x0D;
			LF = 0x0A;
			CAN = 0x18;
			EOT = 0x04,
			SUB = 0x1A,
			EOM = 0x19,
			DISCARD = 0x02,
			RAW = 0x10,
			COOKED = 0x20,
			WINDOW = 0x80;

	var state = {
		'connected' : false,
		'cooked' : true,
		'suspendInput' : false,
		'suspendOutput' : false,
		'watchForClientEscape' : true,
		'clientHasEscaped' : false
	};

	var properties = {
		'rows' : 24,
		'columns' : 80,
		'pixelsX' : 640,
		'pixelsY' : 480,
		'clientEscape' : '~'
	};

	var clientEscapes = {
		0x2E : self.disconnect,
		EOT : self.disconnect,
		SUB : function() {
			state.suspendInput = (state.suspendInput) ? false : true;
			state.suspendOutput = state.suspendInput;
		},
		EOM : function() {
			state.suspendInput = (state.suspendInput) ? false : true;
			state.suspendOutput = false;
		}
	};

	this.__defineGetter__(
		"connected",
		function() {
			return state.connected;
		}
	);

	this.__defineSetter__(
		"connected",
		function(value) {
			if(typeof value == "boolean" && !value)
				self.disconnect();
		}
	);

	this.__defineGetter__(
		"rows",
		function() {
			return properties.rows;
		}
	);

	this.__defineSetter__(
		"rows",
		function(value) {
			if(typeof value == "number" && value > 0)
				properties.rows = value;
			else
				self.emit("error", "RLogin: Invalid 'rows' setting " + value);
		}
	);

	this.__defineGetter__(
		"columns",
		function() {
			return properties.columns;
		}
	);

	this.__defineSetter__(
		"columns",
		function(value) {
			if(typeof value == "number" && value > 0)
				properties.columns = value;
			else
				self.emit("error", "RLogin: Invalid 'columns' setting " + value);
		}
	);

	this.__defineGetter__(
		"pixelsX",
		function() {
			return properties.pixelsX;
		}
	);

	this.__defineSetter__(
		"pixelsX",
		function(value) {
			if(typeof value == "number" && value > 0)
				properties.pixelsX = value;
			else
				self.emit("error", "RLogin: Invalid 'pixelsX' setting " + value);
		}
	);

	this.__defineGetter__(
		"pixelsY",
		function() {
			return properties.pixelsY;
		}
	);

	this.__defineSetter__(
		"pixelsY",
		function(value) {
			if(typeof value == "number" && value > 0)
				properties.pixelsY = value;
			else
				self.emit("error", "RLogin: Invalid 'pixelsY' setting " + value);
		}
	);

	this.__defineGetter__(
		"clientEscape",
		function() {
			return properties.clientEscape;
		}
	);

	this.__defineSetter__(
		"clientEscape",
		function(value) {
			if(typeof value == "string" && value.length == 1)
				properties.clientEscape = value;
			else
				self.emit("error", "RLogin: Invalid 'clientEscape' setting " + value);
		}
	);

	var handleDisconnect = function() {
		if(!state.connected)
			return;
		state.connected = false;
		self.emit("connect", false);
	}

	var handle = new net.Socket();

	handle.on(
		"connect",
		function() {
			var nul = String.fromCharCode(0);
			handle.write(
				util.format(
					"%s%s%s%s%s%s/%s%s",
					nul,
					options.clientUsername,
					nul,
					options.serverUsername,
					nul,
					options.terminalType,
					options.terminalSpeed,
					nul
				)
			);
		}
	);

	handle.on(
		"error",
		function(err) {
			self.emit("error", err);
		}
	);

	handle.on(
		"data",
		function(data) {

			if(!state.connected) {
				if(data[0] == 0) {
					state.connected = true;
					self.emit("connect", true);
					if(data.length > 1)
						data = data.slice(1);
					else
						return;
				} else {
					self.disconnect();
					self.emit("error", "RLogin: failed to establish connection.");					
				}
			}

			// If I could tell if the TCP urgent-data pointer had been set,
			// I would uncomment (and complete) this block.  We'll settle
			// for a partial implementation for the time being.
			/*
			// We would need something to tell is if urgent data was sent
			var lookingForControlCode = urgentDataPointerIsSet();
			var temp = [];
			for(var d = 0; d < data.length; d++) {
				if(!lookingForControlCode) {
					temp.push(data[d]);
					continue;
				}
				switch(data[d]) {
					case DISCARD:
						temp = [];
						// We found our control code
						lookingForControlCode = false;
						break;
					case RAW:
						state.cooked = false;
						lookingForControlCode = false;
						break;
					case COOKED:
						state.cooked = true;
						lookingForControlCode = false;
						break;
					case WINDOW:
						self.sendWCCS();
						lookingForControlCode = false;
						break;
					default:
						temp.push(data[d]);
						break;
				}
			}
			if(!state.suspendOutput)
				self.emit("data", new Buffer(temp));
			*/
			if(!state.suspendOutput) {
				console.log("Emitting");
				self.emit("data", data);
			}
		}
	);

	handle.on("end", handleDisconnect);
	handle.on("close", handleDisconnect);
	handle.on("timeout", handleDisconnect);

	// Send a Window Change Control Sequence
	this.sendWCCS = function() {
		console.log("Sending WCCS");
		var magicCookie = new Buffer([0xFF, 0xFF, 0x73, 0x73]);
		var rcxy = new Buffer(8);
		rcxy.writeUInt16LE(properties.rows, 0);
		rcxy.writeUInt16LE(properties.columns, 2);
		rcxy.writeUInt16LE(properties.pixelsX, 4);
		rcxy.writeUInt16LE(properties.pixelsY, 6);
		if(state.connected)
			handle.write(Buffer.concat([magicCookie, rcxy]));
	}

	this.send = function(data) {

		if(state.suspendInput)
			return false;
		
		if(typeof data == "string" || Array.isArray(data))
			data = new Buffer(data);
		else if(!Buffer.isBuffer(data))
			self.emit("error", "RLogin.send: data must be String, Array, or Buffer.");

		var temp = [];
		for(var d = 0; d < data.length; d++) {
			if(	state.watchForClientEscape
				&&
				data[d] == properties.clientEscape.charCodeAt(0)
			) {
				state.watchForClientEscape = false;
				state.clientHasEscaped = true;
				continue;
			}
			if(state.clientHasEscaped) {
				state.clientHasEscaped = false;
				if(typeof clientEscapes[data[d]] != "undefined")
					clientEscapes[data[d]]();
				continue;
			}
			if(state.cooked && (data[d] == DC1 || data[d] == DC3)) {
				state.suspendOutput == (data[d] == DC3);
				continue;
			}
			if( (d > 0 && data[d - 1] == CR && data[d] == LF)
				||
				data[d] == CAN
			) {
				state.watchForClientEscape = true;
			}
			temp.push(data[d]);
		}
		if(!state.suspendInput)
			handle.write(new Buffer(temp));

		return true;

	}

	this.addClientEscape = function(ch, callback) {
		if(	(typeof ch != "string" && typeof ch != "number")
			||
			(typeof ch == "string" && ch.length > 1)
			||
			typeof callback != "function"
		) {
			self.emit("error", "RLogin.addClientEscape: invalid arguments.");
		}
		clientEscapes[ch.charCodeAt(0)] = callback;
	}

	this.connect = function() {
		
		if(typeof options.port != "number" || typeof options.host != "string")
			self.emit("error", "RLogin: invalid host or port argument.");
		
		if(typeof options.clientUsername != "string")
			self.emit("error", "RLogin: invalid clientUsername argument.");
		
		if(typeof options.serverUsername != "string")
			self.emit("error", "RLogin: invalid serverUsername argument.");
		
		if(typeof options.terminalType != "string")
			self.emit("error", "RLogin: invalid terminalType argument.");

		if(typeof options.terminalSpeed != "number")
			self.emit("error", "RLogin: invalid terminalSpeed argument.");

		handle.connect(options.port, options.host);

	}

	this.disconnect = function() {
		handle.end();
		handleDisconnect();
	}

}
util.inherits(RLogin, events.EventEmitter);

module.exports = RLogin;