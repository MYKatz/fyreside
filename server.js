//
// # SimpleServer
//
// A simple chat server using Socket.IO, Express, and Async.
//
var http = require('http');
var path = require('path');
var cache = require('memory-cache');
var request = require('request');
require("dotenv").load();
var async = require('async');
var socketio = require('socket.io');
var express = require('express');
var cookieParser = require("cookie-parser");

var mongoose = require('mongoose');
var passport = require('passport');
var session = require('express-session');

var Channel = require("./app/models/channel");

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

app.get("/viewerTest", function(req, res){
  res.sendFile(__dirname + "/public/viewer.html", {"channel" : req.cookies.channel});
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

app.get("/api/topSix", function(req, res){
  Channel.find({}).sort({viewers: -1}).limit(3).lean().exec( 
    function(err, projects) {
        if(err){throw err;}
        else{
          res.send(projects);
        }
    }
  );
});

app.get("/api/topThree", function(req, res){
  var tt = cache.get("three")
  if(tt){
    res.send(tt);
  }
  else{
    Channel.find({}).sort({viewers: -1}).limit(3).lean().exec( 
    function(err, projects) {
        if(err){throw err;}
        else{
          var toR = [];
          for(var i=0;i<projects.length;i++){
            var obj = {};
            obj.name = projects[i]["name"];
            obj.viewers = projects[i]["viewers"];
            toR.push(obj);
          }
          request({
              url: "https://api.twitch.tv/helix/users?login="+toR[0]["name"]+"&login="+toR[1]["name"]+"&login="+toR[2]["name"],
              headers: {
                'Client-ID': "4nam4caqs74579ue5a8gzb7fhtcq7r",
                'Authorization': 'OAuth iu3zvrk91rnndd1s20ix8h0kf968em'
              }
            }, function(err, r, body){
              console.log(body);
              var body = JSON.parse(body);
              if(err){throw err;}
              toR[0].pic = body.data[0]["profile_image_url"];
              toR[1].pic = body.data[1]["profile_image_url"];
              toR[2].pic = body.data[2]["profile_image_url"];
              cache.put('three', toR, 10000);
              res.send(toR);
              
            });
        }
    }
  );
  }
});

app.use('/static', express.static('client'));

// Socket.io.


function createChannel(channelName, fn){
  Channel.findOne({"name": channelName}, function(err, user){
    if(err){throw err;}
    if(user){return}
    else{
      var newChannel = new Channel();
      newChannel.name = channelName;
      newChannel.viewers = 0;
      newChannel.save(function(err){
        if(err){throw err;}
        console.log("channel saved: " + channelName);
        fn(channelName);
      });
    }
  });
}

function addToChannel(channelName){
  Channel.findOne({"name": channelName}, function(err, channel){
    if(err){throw err;}
    if(channel){
      channel.viewers = channel.viewers + 1;
      channel.save(function(err, updatedChannel){
        if(err){console.log("ERROR");}
      });
    }
    else{
      createChannel(channelName, addToChannel);
    }
  });
}

function removeFromChannel(channelName){
  Channel.findOne({"name": channelName}, function(err, channel){
    if(err){throw err;}
    if(channel){
      channel.viewers = channel.viewers - 1;
      channel.save(function(err, updatedChannel){
        if(err){console.log("ERROR");}
      });
    }
    else{
      //
    }
  });
}




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
    });

    socket.on('disconnect', function () {
      sockets.splice(sockets.indexOf(socket), 1);
      socket.get("room", function(err, room){
        removeFromChannel(room);
      });
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
      socket.set("room", room, function(err){
        
      });
      addToChannel(room);
    });
    
    socket.on('msg', function(msg){
      console.log(msg.room);
      console.log(msg.val);
      socket.get("color", function(err, color){
        socket.get("name", function(err, name){
            console.log("HEYOOOOOOO!");
            console.log(Object.keys(io.sockets.manager.roomClients[socket.id])[1]);
            io.sockets.in(Object.keys(io.sockets.manager.roomClients[socket.id])[1].substring(1)).emit("msg",{"msg": msg.val, "col": color, "name": name});
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

server.listen(process.env.PORT || 3000, process.env.IP || "127.0.0.1", function(){
  var addr = server.address();
  console.log("Chat server listening at", addr.address + ":" + addr.port);
});
