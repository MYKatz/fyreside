var mongoose =  require("mongoose");

var Channel = mongoose.Schema({
   
   name: String,
   viewers: Number
   
   
    
});

module.exports = mongoose.model('Channel', Channel);