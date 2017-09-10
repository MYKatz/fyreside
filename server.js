//
// # SimpleServer
//
// A simple chat server using Socket.IO, Express, and Async.
//
var http = require('http');
var path = require('path');
require("dotenv").load();
var async = require('async');
var socketio = require('socket.io');
var express = require('express');
var cookieParser = require("cookie-parser");

var mongoose = require('mongoose');
var passport = require('passport');
var session = require('express-session');

require('./config/passport')(passport);


//
// ## SimpleServer `SimpleServer(obj)`
//
// Creates a new instance of SimpleServer with the following options:
//  * `port` - The HTTP port to listen on. If `process.env.PORT` is set, _it overrides this value_.
//

mongoose.connect(process.env.MONGO_URI);
mongoose.Promise = global.Promise;



var app = express();
var server = http.createServer(app);
var io = socketio.listen(server);

app.use(session({ secret: 'bigboy' }));
app.use(passport.initialize());
app.use(passport.session());

app.use(cookieParser());

app.get("/", function(req, res){
  res.sendFile(__dirname + "/public/index.html");
});

app.get("/goto/:channel", function(req, res){
  res.cookie("channel", req.params.channel);
  res.redirect("/auth/twitch");
});

app.get("/api/getUser", function(req, res){
  if(req.isAuthenticated()){res.end(req.user.twitch.username);}
  else{res.end("error")}
});

app.get("/viewer", function(req, res){
  if(!req.isAuthenticated()){res.redirect("/");}
  else{
    res.sendFile(__dirname + "/public/viewer.html", {"channel" : req.cookies.channel});
  }
});

app.get("/auth/twitch", passport.authenticate('twitch'));
app.get('/auth/twitch/callback', passport.authenticate('twitch', {
  successRedirect : '/viewer',
  failureRedirect : '/failure'
}));


app.use('/static', express.static('client'));

// Socket.io shit.

function getRandomColor() {
      var letters = '0123456789ABCDEF';
      var color = '#';
      for (var i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
      }
      return color;
}

var messages = [];
var sockets = [];

var limit = 25;

io.on('connection', function (socket) {
    
    socket.leave("");
    
    sockets.push(socket);
    
    
    
    socket.set("color", getRandomColor(), function(err){
      if(err){throw err;}
    })

    socket.on('disconnect', function () {
      sockets.splice(sockets.indexOf(socket), 1);
      updateRoster();
    });

    socket.on('identify', function (name) {
      
      socket.get("name", function(err, nom){
        if(nom){}
        else{
          socket.set('name', name, function (err) {
          });
        }
      });
      
    });
    
    socket.on('switchRoom', function(room){
      var num = 1;
      var rm = room;
      var rooms = io.sockets.manager.roomClients[socket.id]; 
      for(var r in rooms) { 
        socket.leave(r); 
      }
      while(io.sockets.clients(""+rm+"??"+num).length > limit){
        num++;
      }
      console.log("JOINING ROOM: " + rm+"??"+num);
      socket.join(rm+"??"+num);
    });
    
    socket.on('msg', function(msg){
      console.log(msg.room);
      console.log(msg.val);
      socket.get("color", function(err, color){
        socket.get("name", function(err, name){
          //io.sockets.clients(msg.room).forEach(function (socket){
            io.sockets.in(Object.keys(io.sockets.manager.roomClients[socket.id])[0]).emit("msg",{"msg": msg.val, "col": color, "name": name});
        //})
        
      });
    });
      
      
    });
  });

function updateRoster() {
  async.map(
    sockets,
    function (socket, callback) {
      socket.get('name', callback);
    },
    function (err, names) {
      broadcast('roster', names);
    }
  );
}

function broadcast(event, data) {
  sockets.forEach(function (socket) {
    socket.emit(event, data);
  });
}

server.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0", function(){
  var addr = server.address();
  console.log("Chat server listening at", addr.address + ":" + addr.port);
});
