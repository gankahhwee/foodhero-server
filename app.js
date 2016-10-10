
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
    jwt = require('jsonwebtoken'),
    multiparty = require('multiparty');

var fbAccessToken = "1759718310929584|85b542e45e1043decf73b517c223efb3";
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
var http = require('http');
var server= http.createServer(app);
var https = require('https');
//SHELL SPAWN
const exec = require('child_process').exec;

// Configuration

//app.configure(function(){
//  app.set('views', __dirname + '/views');
//  app.set('view engine', 'jade');
//  app.use(express.bodyParser());
//  app.use(express.methodOverride());
//  app.use(app.router);
app.use(express.static(__dirname + '/public'));
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

var changePassword = function(user, pw) {
	connection.query('UPDATE users SET password="' + pw + '" WHERE username="' + user + '"', function(err, rows, fields) {
		if(err) {
			console.log(err);
		}
	});
}


/**
 * @api {post} /loginGG
 * @apiName Login Google
 * @apiGroup Login
 *
 * @apiParam {String} username token email
 * @apiParam {String} password the password for the google login is set as the access token granted by Google 
 * @apiSuccess {String} jwt auth token
 * @apiSuccess {Integer} mealsSaved mealsShared 
 */
app.post('/loginGG', function(req, res) {
	var username = req.body.email.substr(0, req.body.email.indexOf('@')); 
	var token = req.body.token;
	var email = req.body.email;
	var pw = req.body.access_token;

	https.get('https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=' + token, function(tokenRes) {

		tokenRes.on('data', function(data) {
			var d = JSON.parse(data);
			if (email === d.email) {
				fs.readFile("./secret.txt", function(err, data) {
					if(err) {
						return console.log(err);
					}

					connection.query('SELECT * FROM users WHERE username="'+username + '"', function(err, rows, fields) {
						if(err) {
							return console.log(err);
						}

						var token = jwt.sign({username: username}, data, { issuer: "foodhero.me"});
						if(data && rows.length!==0) {
							console.log("user found");	
							connection.query('SELECT COUNT(username) AS mealsShared FROM food_events WHERE username="' + username + '"', function(err2, rows2, fields2) {
								connection.query('SELECT COUNT(username) AS mealsSaved FROM users_muc_room WHERE username="' + username + '"', function(err3, rows3, fields3) {
									res.status(200).json({token:token, mealsShared: rows2[0].mealsShared, mealsSaved: rows3[0].mealsSaved});
								});
							});
							
							changePassword(username, pw);
							return;
						} 

						else if (data && rows.length === 0) {
							console.log("user not found");
							exec('sudo ~/ejabberd-16.04/bin/ejabberdctl register ' + username + " foodhero.me " + pw, function(error, stdout, stderr) {
								if(error) {
									console.log('exec error: ${error}');
									return;
								}
								console.log("registering");	
								res.status(200).json({token:token, mealsShared: 0, mealsSaved: 0});
						
							});

							return;
						}

						res.send("unauthorized");
						return console.log("no secret found");
					});
			
				});	
			}

		});

	}).on('error', function(e) { console.error(e); });

});

app.post('/loginFB', function(req, res) {
	var username = req.body.user_id;
	var third_party_id = req.body.third_party_id;
	var token = req.body.token;

	https.get('https://graph.facebook.com/debug_token?input_token='+token + '&access_token=' + fbAccessToken, function(tokenRes) {

		tokenRes.on('data', function(data) {
			var d = JSON.parse(data);
			if (username === d.data.user_id) {
				fs.readFile("./secret.txt", function(err, data) {
					if(err) {
						return console.log(err);
					}

					connection.query('SELECT * FROM users WHERE username="'+username + '"', function(err, rows, fields) {
						if(err) {
							return console.log(err);
						}

						var token = jwt.sign({username: username}, data, { issuer: "foodhero.me"});
						if(data && rows.length!==0) {
							console.log("user found");	
							connection.query('SELECT COUNT(username) AS mealsShared FROM food_events WHERE username="' + username + '"', function(err2, rows2, fields2) {
								connection.query('SELECT COUNT(username) AS mealsSaved FROM users_muc_room WHERE username="' + username + '"', function(err3, rows3, fields3) {
									res.status(200).json({token:token, mealsShared: rows2[0].mealsShared, mealsSaved: rows3[0].mealsSaved});
								});
							});
							
							changePassword(username, third_party_id);
							return;
						} 

						else if (data && rows.length === 0) {
							console.log("user not found");
							exec('sudo ~/ejabberd-16.04/bin/ejabberdctl register ' + username + " foodhero.me " + third_party_id, function(error, stdout, stderr) {
								if(error) {
									console.log('exec error: ${error}');
									return;
								}
								console.log("registering");	
								res.status(200).json({token:token, mealsShared: 0, mealsSaved: 0});
						
							});

							return;
						}

						res.send("unauthorized");
						return console.log("no secret found");
					});
			
				});	
			}
		});
	}).on('error', function(e) { console.error(e); });
});

app.post('/login', function(req, res) {
	// connection.query('SELECT * FROM users', function(err, rows, fields) {
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
					connection.query('SELECT COUNT(username) AS mealsShared FROM food_events WHERE username="' + username + '"', function(err2, rows2, fields2) {
						connection.query('SELECT COUNT(username) AS mealsSaved FROM food_events_attendants WHERE username="' + username + '"', function(err3, rows3, fields3) {
							console.log(rows2[0]);
							console.log(rows3[0]);
							res.status(200).json({token:token, mealsShared: rows2[0].mealsShared, mealsSaved: rows3[0].mealsSaved});
						});
					});
					
					return;
				} 

				res.send("unauthorized");
				return console.log("no secret found");
			});
	
		});			
	// });
});

app.post('/going-event', function(req, res) {
	var username = req.body.username;
	var event_id = req.body.event_id;
	var going = req.body.going;

	var query;
	if(going == 1) {
		query = 'INSERT INTO food_events_attendants (username, event_id) VALUES ("'
		+ username + '", '
		+ event_id +' )';
	} else {
		query = 'DELETE FROM food_events_attendants WHERE username="' + username + '" AND event_id=' + event_id;
	}

	connection.query(query, function (err, rows, fields) {
			if(err) {
				console.log(err.stack);
				return;
			}

			res.send({success: true});
		});

});

app.post('/get-meals', function(req, res){
	var username = req.body.username; console.log(username);
	connection.query('SELECT COUNT(username) AS mealsShared FROM food_events WHERE username="' + username + '"', function(err2, rows2, fields2) {
		connection.query('SELECT COUNT(username) AS mealsSaved FROM food_events_attendants WHERE username="' + username + '"', function(err3, rows3, fields3) {
			console.log(rows2[0]);
			console.log(rows3[0]);
			res.status(200).json({mealsShared: rows2[0].mealsShared, mealsSaved: rows3[0].mealsSaved});
		});
	});
});

app.post('/post-events', function(req, res) {
	console.log(req.body);
	var form = new multiparty.Form();
	
	form.parse(req, function(err, fields, files){
		if (err) {
			console.log('ERROR in form.parse: ' + err.stack);
			return;
		}
		var username = fields["username"][0];
        	var roomname = fields["roomname"][0];
 	        var endtime =  fields["endtime"][0];
        	var longitude = parseFloat(fields["longitude"][0]);
  	        var latitude = parseFloat(fields["latitude"][0]);
        	var additionalInfo = fields["additionalInfo"][0];
  	        var foodtype = fields["foodtype"][0];
		var servings = fields["servings"][0];
        	var location = fields["location"][0];
		var contact = fields["contact"][0];
		var allImages = files["file"];
		
	if(!username || !roomname || !endtime || !longitude || !latitude || !foodtype || typeof additionalInfo !== 'undefined' || typeof longitude !== 'number' || typeof latitude !== 'number') {
                
		connection.query('INSERT INTO food_events (username, servings, roomname, additionalInfo, longitude, latitude, endtime, foodtype, contact, location) VALUES ("'
            + username + '", "'
			+ servings + '", "'
            + roomname + '", "'
            + additionalInfo + '", '
            + longitude + ', '
            + latitude + ', "'
            + endtime + '", "'
            + foodtype + '", "'
			+ contact + '", "'
            + location + '")', function(err, rows, fields) {
                    if (err) {
                            res.send("ERROR: mysql insert error: " + err);
                            console.log(err);
                            return;
                    }

            connection.query('select auto_increment as id from information_schema.tables where table_name="food_events" and table_schema=DATABASE()', function(err, r, fields) {
            	if(err) {
            		res.send({success: false});
            	}
            	
            	res.send({success: true , id: r[0].id});
            });
				
			if(allImages) {
				for (var i = 0; i<allImages.length; i++) {
					var img = allImages[i];
					(function(img, i) {
						var fname = __dirname + "/public/images/";
						//var writeStream = fs.createWriteStream(fname);
						//img.pipe(writeStream);
						fs.readFile(img.path, function(err, data) {
							if (err) {
								console.log(err);
								return;
							}

							connection.query('select auto_increment as id from information_schema.tables where table_name="food_events_images" and table_schema=DATABASE()', function(err, r, fields) {

								fs.writeFile(__dirname + "/public/images/" + r[0].id + ".jpg", data, function(err) {
									if(err) {
										console.log(err);
										return;
									}
									connection.query('INSERT INTO food_events_images(roomname, ord, filename) VALUES("'
										+ roomname + '", '
										+ i + ', "'
										+  r[0].id + '.jpg' + '")', function(err, rows, fields) {
										
										if(err) {
											console.log(err); return;
										}
										console.log("images sql inserted");
									}); 
								});
							});
						});
					})(img, i);
				}
			}	                    
		});
                return;
	        }

		
	});


	form.on('error', function(err) {
		console.log('Error parsing form: ' +err.stack);
	});
});

app.post('/is-user-going', function(req, res) {
	var username = req.body.username;
	var event_id = req.body.event_id;

	var query = 'SELECT * FROM food_events_attendants WHERE username="' + username + '" AND event_id=' + event_id;

	connection.query(query, function(err, rows, fields) {
		if(err) {
			res.send({success: false});
		}
		else if(rows.length == 0) {
			res.send({success: true, going: false});
		} else {
			res.send({success: true, going: true});
		}

	});

});

app.post('/get-event', function(req, res) {
	var event_id = req.body.event_id;

	connection.query('SELECT * FROM food_events WHERE id=' + event_id, function(err, rows, fields){
		if(err || rows.length == 0) {
			res.send({success: false});
		} else {
			res.send({success: true, event: rows[0]});
		}
	});
});

app.post('/get-events', function(req, res) {
	var longitude = req.body.longitude;
	var latitude = req.body.latitude;
	var radius = req.body.radius;


	connection.query('SELECT *, ( 6371 * acos( cos( radians('
		+ latitude +') ) * cos( radians( latitude ) )  * cos( radians( longitude ) - radians('
		+ longitude+') ) + sin( radians('
		+ latitude+') ) * sin(radians(latitude)) ) ) AS distance from food_events where endtime > now() having distance < '
	    + radius +' order by distance;', function(err, rows, fields) {
		
			if(err) {
				res.send("ERROR: mysql get error:" + err);
				return console.log(err);
				
			}
			
	//		for(int i=0; i<rows.length; i++) {
	//		connection.query('SELECT * FROM food_events_images WHERE ord=' + 0 + ' AND roomname="' + roomname+'"', function(err2, rows2, fields2){
	//	                if(err2) {
	//	                        res.send("ERROR: mysql get image error:" + err2);
	//	                        console.log(err2);
	//	                        return;
	//	                }
	//	
	//	                if (rows2.length) {
	//				
	//	                        res.sendFile(__dirname + "/public/images/" + rows2[0].filename, function(err) {
	//	                                if(err) console.log(err);
	//	                        });
	//	                } else {
	//				res.json({events: rows});
	//			}
	//	        });
	//		}

			console.log("get-events success");
			res.json({events:rows});
	});
});

app.post('/get-all-images', function(req, res) {
	var roomname = req.body.roomname;
	connection.query('SELECT * FROM food_events_images WHERE roomname="' + roomname + '"', function(err, rows, fields) {
		if(err) {
			res.send("ERROR");
			return console.log(err);
		}

		res.json({imgNames: rows});
	});

});

app.post('/get-room-img', function(req, res) {
	var order = req.body.order;
	var roomname = req.body.roomname;

	connection.query('SELECT * FROM food_events_images WHERE ord=' + order + ' AND roomname="' + roomname+'"', function(err, rows, fields){
		if(err) {
			res.send("ERROR: mysql get image error:" + err);
			console.log(err);
			return;
		}

		if (rows.length) {
			res.sendFile(__dirname + "/public/images/" + rows[0].filename, function(err) {
				if(err) console.log(err);
			});	
		} else {
			res.send({});
		}
	}); 
});

app.post('/register', function(req, res) {
	var username = req.body.username;
	var email = req.body.email;
	var password = req.body.password;
	console.log("In register");
	
	//TODO: Check if this is susceptible to SQL Injection
	connection.query('SELECT * FROM users WHERE username="'+username+'"', function(err,rows,fields) {
	   console.log(rows);
	   if(rows.length === 0){
		exec('sudo ~/ejabberd-16.04/bin/ejabberdctl register ' + username + " foodhero.me " + password, function(error, stdout, stderr) {
			if(error) {
				console.log('exec error: ${error}');
				return;
			}
			
			res.send({success: 1});
	
		});
	   } else {
		res.send({success:0, error: 'Sorry username already exists'});
	   }
	});	
});

server.listen(8000);
