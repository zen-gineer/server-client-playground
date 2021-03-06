// (function (exports, require, module, __filename, __dirname){})
// immediately invoked function expression is always wrapped around each module (each file)
// exports, require, module are all functions you can use in this file.
// __filename, and __dirname is the name of this file and directory

const express = require('express'),
	path = require('path'),
	app = express(),
	mysql = require('mysql');
var bodyParser = require('body-parser');
const sqlpass = require('./sqlpass');
const consumer_key = require('./consumer_key'),
	consumer_secret = require('./consumer_secret'),
	access_token_key = require('./access_token_key'),
	access_token_secret = require('./access_token_secret');
const spawn = require('child_process').spawn;
const jsonData = true;
const isDev = process.env.NODE_ENV !== 'production',
	PORT = process.env.PORT || 5000;

//-- Node practice with MOSH --- --- --- ---- ---- --- ----
const os = require('os');
console.log(`Free Memory: ${(os.freemem() / os.totalmem()) * 100}%`);
const EventEmitter = require('events');
const emitter = new EventEmitter();

//Register listener with callback function
emitter.on('messageLogged', () => console.log('Listener called'));

//Raise event
emitter.emit('messageLogged');
//-- Node practice with MOSH --- --- --- ---- ---- --- ----

app.use(express.json());
var db = null;
// console.log("isDev ", isDev)
if (isDev) {
	db = mysql.createConnection({
		host: 'localhost',
		user: 'root',
		password: sqlpass,
		database: 'nodemysql',
	});

	db.connect(err => {
		if (err) {
			console.log(err);
		}
		console.log('mysql connected');
	});
}

app.post('/api/newblogpost', (req, res) => {
	if (jsonData) {
		res.json('Posted to database');
	} else {
		var body = req.body;
		let sql = `INSERT INTO posts(title, body) VALUES (\"${body.title}\", \"${body.body}\")`;
		console.log(sql);
		db.query(sql, (err, results) => {
			if (err) throw err;
			res.json('Posted to database');
		});
	}
});

app.post('/api/mllog', (req, res) => {
	var body = req.body; //console.log(body);
	resData = { sklearnLogAscii: null, sklearnLogAccuracy: null };

	const ls = spawn('python', ['./python/logReg.py', JSON.stringify(body)]);
	ls.stdout.on('data', data => {
		str = data.toString();
		console.log(str);
		resData.sklearnLogAscii = GetSklearnPredict(str);
		resData.sklearnLogAccuracy = GetSklearnAcc(str);
		res.send(resData);
	});

	ls.stderr.on('data', data => {
		console.log(`stderr: ${data}`);
	});

	ls.on('close', code => {
		console.log(`child process exited with code ${code}`);
	});
	// console.log(resData);
});

GetSklearnAcc = function(str) {
	var n = str.search(/Default sklearn log accuracy:/);
	var m = str.slice(n).search(/:/) + 1;
	var o = str.slice(n).search(/%/);
	return str.slice(n + m, n + o + 1);
};

GetSklearnPredict = function(str) {
	// console.log('function called', str);
	var n = str.search(/sklearn log predictions:\s+\[/);
	var m = str.slice(n).search(/\[/);
	var o = str.slice(n).search(/\*/);
	var myStr = str.slice(n + m, o + n);
	// console.log("myStr: ", myStr)
	// var sklearnLogRegAscii = [];
	// for (var i = 0; i < myStr.length; i++) sklearnLogRegAscii.push(myStr.charCodeAt(i));
	return myStr;
};

app.get('/api/twitter', (req, res) => {
	console.log('twitter api called');
	const client = new Twitter({
		consumer_key: consumer_key,
		consumer_secret: consumer_secret,
		access_token_key: access_token_key,
		access_token_secret: access_token_secret,
	});
	var params = { screen_name: 'nodejs' };
	client.get('https://api.twitter.com/1.1/statuses/user_timeline', params, function(error, tweets, response) {
		if (!error) {
			console.log(tweets);
		} else {
			console.log(error);
		}
		res.json('Hello World');
	});
});

app.get('/api/blogposts', (req, res) => {
	if (isDev) {
		let sql = 'SELECT * from posts';
		db.query(sql, (err, results) => {
			if (err) throw err;
			console.log('mysql results ', results);
			res.json(results);
		});
	} else {
		res.json([]);
	}
});

app.get('/adpost1', (req, res) => {
	let post = { title: 'Post One', body: 'This is post number 1' };
	let sql = 'INSERT INTO posts SET ?';
	let query = db.query(sql, post, (err, result) => {
		if (err) throw err;
		console.log(result);
		res.send(`Post 1 added ${result}`);
	});
});

app.get('/createpoststable', (req, res) => {
	let sql = 'CREATE TABLE posts(id int AUTO_INCREMENT, title VARCHAR(255), body VARCHAR(255), PRIMARY KEY(id))';
	db.query(sql, (err, result) => {
		if (err) throw err;
		console.log(result);
		res.send('Posts table created...');
	});
	res.send('Hello World');
});

app.get('/createdb', (req, res) => {
	let sql = 'CREATE DATABASE nodemysql';
	db.query(sql, (err, result) => {
		if (err) {
			console.log('database error');
			throw err;
		}
		res.send('database created');
	});
	res.send('Hello World');
});
if (isDev) {
	app.listen(PORT, () => `Server running on port ${PORT}`);
} else {
	// Priority serve any static files.
	app.use(express.static(path.resolve(__dirname, './client/build')));

	// Answer API requests.
	app.get('/api', function(req, res) {
		res.set('Content-Type', 'application/json');
		res.send('{"message":"Hello from the custom server!"}');
	});

	// All remaining requests return the React app, so it can handle routing.
	app.get('*', function(request, response) {
		response.sendFile(path.resolve(__dirname, './client/build', 'index.html'));
	});

	app.listen(PORT, function() {
		console.error(`Node ${isDev ? 'dev server' : 'cluster worker ' + process.pid}: listening on port ${PORT}`);
	});
}
