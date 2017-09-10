var mongoose =  require("mongoose");

var User = mongoose.Schema({
   
   twitch:{
       id: String,
       username: String,
       email: String,
       token: String
   }
   
    
});

module.exports = mongoose.model('User', User);