module.exports = {
    
    'twitchAuth' : {
        'clientID': process.env.TWITCH_KEY,
        'consumerSecret':process.env.TWITCH_SECRET,
        'callbackURL': process.env.APP_URL + 'auth/twitch/callback'
    }
    
    
}