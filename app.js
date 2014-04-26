var express  = require('express');
var stylus   = require('stylus');
var nib      = require('nib');
var jade     = require('jade');
var passport = require('passport');
var CoggleStrategy = require('passport-coggle-oauth2').OAuth2Strategy;
// !!! FIXME: it would be good to not depend on a specific DB quite so strongly
var mongoose = require('mongoose');

// get environment variables we need:
var port                 = Number(process.env.PORT || 5000);
var hostname             = process.env.HOSTNAME || 'localhost';
var host                 = port !== 80? (hostname+':'+port) : hostname;
var protocol             = 'http';
var coggle_client_id     = process.env.COGGLE_CLIENT_ID;
var coggle_client_secret = process.env.COGGLE_CLIENT_SECRET;

var env_errors = [];

if(!coggle_client_id)
    env_errors.push("you must set the COGGLE_CLIENT_ID environment variable with your client ID from http://coggle.it/developer");
if(!coggle_client_secret)
    env_errors.push("you must set the COGGLE_CLIENT_SECRET environment variable with your client secret from http://coggle.it/developer");

if(env_errors.length)
    throw new Error('Invalid environment:\n' + env_errors.join('\n'));


// set up the express app
var app = express();

app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
// Serve static files from ./public
app.use(express.static(__dirname + '/public'));
app.use(passport.initialize());
app.use(passport.session());
app.use(app.router);


// Jade template engine, rendering content from ./private/views
app.set('views', __dirname + '/private/views');
app.set('view engine', 'jade');

// Stylus css compiler: convert .styl files (private/.../*.styl) to .css files
// (./public/.../*.css), custom compiler adds nib add-ons to stylus
function compileStyl(str, path){
  return stylus(str)
    .set('filename', path)
    .use(nib());
}
app.use(stylus.middleware({
        src: __dirname + '/private',
       dest: __dirname + '/public',
    compile: compileStyl
}));

// Passport login:
passport.use(new CoggleStrategy({
        clientID: coggle_client_id,
    clientSecret: coggle_client_secret,
     callbackURL: protocol+"://"+host+"/auth/coggle/callback"
  },
  function(accessToken, refreshToken, profile, done) {
    console.log("got authed coggle user:", profile);

    return done(false, profile);
  }
));

// these methods would serialise/deserialise the user into the database, and
// associate with session ids – but for this example we don't have a database,
// so they save the user itself as the "id" into the passport session and
// return the id as the user when deserialising
passport.serializeUser(function(user, done) {
  done(null, user);
});
passport.deserializeUser(function(id, done) {
  done(null, id);
});

// Routes
app.get('/', function(req, res){
  res.render('index', {
      title: 'Coggle Issue Importer'
  });
});
// Routes for coggle auth
app.get('/auth/coggle', passport.authenticate('coggle', {scope:['read', 'write']}));
app.get('/auth/coggle/callback', passport.authenticate('coggle', {successReturnToOrRedirect: '/', failureRedirect: '/auth/coggle/failed'}));

// Start the server!
var server = app.listen(port, function() {
    console.log('Listening on port %d', server.address().port);
});

