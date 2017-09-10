var passport = require("passport");
var twitchStrategy = require("passport-twitch").Strategy;

var User = require("../app/models/user");

var configAuth = require("./auth");

module.exports = function(passport){
    passport.serializeUser(function(user, done) {
        done(null, user.id);
    });

    passport.deserializeUser(function(id, done) {
        User.findById(id, function(err, user) {
            done(err, user);
        });
    });
    
    passport.use(new twitchStrategy({
        
        clientID: configAuth.twitchAuth.clientID,
        clientSecret  : configAuth.twitchAuth.consumerSecret,
        callbackURL     : configAuth.twitchAuth.callbackURL,
        scope: "user_read"
        
    }, function(token, tokenSecret, profile, done){
        
        process.nextTick(function(){
           
           User.findOne({"twitch.id": profile.id}, function(err, user){
              
              if(err){return done(err)}
              
              if(user){return done(null, user);}
              else{
                    var newUser = new User();
                    //set data
                    
                    newUser.twitch.id = profile.id;
                    newUser.twitch.username = profile.displayName;
                    newUser.twitch.email = profile.email;
                    newUser.twitch.token = token;
                    
                    
                    newUser.save(function(err){
                        if(err){throw err}
                        return done(null, newUser);
                    });
                    
              }
               
           });
           
            
        });
        
    }));
}