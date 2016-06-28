
/**
 * Module dependencies.
 */
//DATABASE CONNECT
var express = require('express'),
    app = express(),
    routes = require('./routes'),
    fs = require('fs'),
    bodyParser = require('body-parser'),
    expressJWT = require('express-jwt'),
    jwt = require('jsonwebtoken');


//DATABASE CONNECT
//TODO: CREATE CUSTOM DATABASE USER FOR EXPRESS SERVER
//TODO: Right now the passwords are stored in plaintext in mysql. Look up on how to encrypt or hash them
var mysql = require('mysql');
var connection = mysql.createConnection({
	host: 'localhost',
	user: 'root',
	password: 'S9371014B',
	database: 'ejabberd'
});

//var app = module.exports = express.createServer();
//var server = require('https').createServer({
//	key: fs.readFileSync('www.hayhaytheapp.com.key'),
//	cert: fs.readFileSync('www.hayhaytheapp.com.chained.crt')
//}, app);
var server= require('http').createServer(app);

//SHELL SPAWN
const exec = require('child_process').exec;

// Configuration

//app.configure(function(){
//  app.set('views', __dirname + '/views');
//  app.set('view engine', 'jade');
//  app.use(express.bodyParser());
//  app.use(express.methodOverride());
//  app.use(app.router);
//  app.use(express.static(__dirname + '/public'));
//});
//
//app.configure('development', function(){
//  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
//});
//
//app.configure('production', function(){
//  app.use(express.errorHandler());
//});
//

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
	extended: true
}));

fs.readFile("./secret.txt", function(err, data) {
	if(err) {
		return console.log(err);
	}
	app.use(expressJWT({ secret: data }).unless({ path: ["/test", "/login"]}));
});
// Routes

app.get('/', routes.index);

app.get('/test', function(req, res) {
	//DATABASE TEST
	connection.query('SELECT * FROM users', function(err,rows,fields) {
		if (err) throw err;
	});
	
	//COMMAND SHELL TEST
	exec('ls', function(error, stdout, stderr) {
		if(error) {
			console.log('exec error: ${error}');
			return;
		}

		console.log(stdout);
		res.send("success");
	});
});

app.post('/login', function(req, res) {
	connection.query('SELECT * FROM users', function(err, rows, fields) {
		var username = req.body.username;
		var password = req.body.password;

		if(!username || !password) {
			res.send("unauthorized");
			return;
		}

		fs.readFile("./secret.txt", function(err, data) {
			if(err) {
				return console.log(err);
			}

			connection.query('SELECT * FROM users WHERE username="'+username +'" AND password="'+password + '"', function(err, rows, fields) {
				if(err) {
					return console.log(err);
				}

				if(data && rows.length!==0) {
					var token = jwt.sign({username: username}, data, { issuer: "foodhero.me"});
					res.status(200).send({token: token});
					return;
				} 

				res.send("unauthorized");
				return console.log("no secret found");
			});
	
		});			
	});
});

app.post('/post-events', function(req, res) {
	var username = req.body.username;
	var roomname = req.body.title;
	var endtime =  req.body.endtime;
	var longitude = parseFloat(req.body.longitude);
	var latitude = parseFloat(req.body.latitude);
	var additionalInfo = req.body.additionalInfo;
	var foodtype = req.body.foodtype;

	if(!username || !roomname || !endtime || !longitude || !latitude || !foodtype || typeof additionalInfo !== 'undefined' || typeof longitude !== 'number' || typeof latitude !== 'number') {
		connection.query('INSERT INTO food_events (username, roomname, additionalInfo, longitude, latitude, endtime, foodtype) VALUES ("'
			+ username + '", "'
			+ roomname + '", "'
			+ additionalInfo + '", '
			+ longitude + ', '
			+ latitude + ', '
			+ endtime + ', "'
			+ foodtype + '"', function(err, rows, fields) {
				if (err) {
					res.send("ERROR: mysql insert error: " + err);
					console.log(err);
					return;
				}

				console.log("created");
				res.send("SUCCESS");
			});

		return;
	}

	res.send("ERROR: One of the fields are NULL or wrong data type")

});

app.post('/get-events', function(req, res) {
	connection.query('SELECT * FROM muc_room', function(err, rows, fields) {
		console.log(rows);
	});
});

app.post('get-room-number', function(req, res) {
	var username = req.body.username;
});

app.post('/register', function(req, res) {
	var username = req.body.username;
	var email = req.body.email;
	var password = req.body.password;
	
	//TODO: Check if this is susceptible to SQL Injection
	connection.query('SELECT * FROM users WHERE username="'+username+'"', function(err,rows,fields) {
	   console.log(rows);
	   if(rows.length === 0){
		exec('sudo ~/ejabberd-16.04/bin/ejabberdctl register ' + username + " foodhero.me " + password, function(error, stdout, stderr) {
			if(error) {
				console.log('exec error: ${error}');
				return;
			}
			
			res.send(stdout);
	
		});
	   } else {
		res.send('Sorry username already exists');
	   }
	});	
});

server.listen(8000);
