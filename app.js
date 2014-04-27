var express  = require('express');
var stylus   = require('stylus');
var nib      = require('nib');
var jade     = require('jade');
var crypto   = require('crypto');
var passport = require('passport');
var merge    = require('merge');
var CoggleStrategy = require('passport-coggle-oauth2').OAuth2Strategy;
var GitHubStrategy = require('passport-github').Strategy;

// get environment variables we need:
var port                 = Number(process.env.PORT || 5000);
var hostname             = process.env.HOSTNAME || 'localhost';
var host                 = port !== 80? (hostname+':'+port) : hostname;
var protocol             = 'http';
var coggle_client_id     = process.env.COGGLE_CLIENT_ID;
var coggle_client_secret = process.env.COGGLE_CLIENT_SECRET;
var github_client_id     = process.env.GITHUB_CLIENT_ID;
var github_client_secret = process.env.GITHUB_CLIENT_SECRET;

var env_errors = [];

if(!coggle_client_id)
    env_errors.push("you must set the COGGLE_CLIENT_ID environment variable with your client ID from http://coggle.it/developer");
if(!coggle_client_secret)
    env_errors.push("you must set the COGGLE_CLIENT_SECRET environment variable with your client secret from http://coggle.it/developer");
if(!github_client_id)
    env_errors.push("you must set the GITHUB_CLIENT_ID environment variable with a valid github application client ID, get one at https://github.com/settings/applications/new");
if(!github_client_secret)
    env_errors.push("you must set the GITHUB_CLIENT_SECRET environment variable with your client secret from https://github.com/settings/applications");

if(env_errors.length)
    throw new Error('Invalid environment:\n' + env_errors.join('\n'));


// set up the express app
var app = express();

app.use(express.logger('dev'));
// Serve static files from ./public
app.use(express.static(__dirname + '/public'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.cookieParser());
// we don't persist any info across server restarts, so just create a new
// session secret
app.use(express.session({secret:crypto.randomBytes(32).toString('hex')}));
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

// Passport middleware to authenticate Coggle users
passport.use(new CoggleStrategy({
             clientID: coggle_client_id,
         clientSecret: coggle_client_secret,
    passReqToCallback: true,
          callbackURL: protocol+"://"+host+"/auth/coggle/callback"
  },
  function(req, accessToken, refreshToken, profile, done) {
    console.log("got authed coggle user:", profile);
    
    // save the access token in the session info, merging with any existing
    // access tokens
    req.session.access_tokens = merge(req.session.access_tokens || {}, {coggle:accessToken});

    return done(null, {});
  }
));
// Passport middleware to additionally authorize access to github on behalf of
// the user
passport.use(new GitHubStrategy({
             clientID: github_client_id,
         clientSecret: github_client_secret,
    passReqToCallback: true,
          callbackURL: protocol+"://"+host+"/auth/github/callback"
  },
  function(req, accessToken, refreshToken, profile, done) {
    console.log("got authed github user:", profile, accessToken, refreshToken);
    
    // save the access token in the session info, merging with any existing
    // access tokens
    req.session.access_tokens = merge(req.session.access_tokens || {}, {github:accessToken});

    return done(null, {});
  }
));


// Routes
app.get('/', function(req, res){
  console.log("render /, req.session.access_tokens=", req.session.access_tokens);
  res.render('index', {
           title: 'Coggle Issue Importer',
   access_tokens: req.session.access_tokens
  });
});
// Routes for coggle auth
app.get('/auth/coggle',          passport.authenticate('coggle', {session:false, scope:['read', 'write']}));
app.get('/auth/coggle/callback', passport.authenticate('coggle', {session:false, successReturnToOrRedirect:'/', failureRedirect:'/auth/coggle/failed'}));
app.get('/auth/coggle/failed', function(req, res){
    res.render('auth-failed-coggle', {
        title: 'Coggle Access Denied!'
    });
});
// Routes for github auth
app.get('/auth/github',          passport.authenticate('github', {session:false, scope:[]}));
app.get('/auth/github/callback', passport.authenticate('github', {session:false, successReturnToOrRedirect:'/', failureRedirect:'/auth/github/failed'}));
app.get('/auth/github/failed', function(req, res){
    res.render('auth-failed-github', {
        title: 'Github Access Denied!'
    });
});

// Deauthorize by clearing the session info
app.get('/auth/deauth', function(req, res){
    req.session.access_tokens = {};
    return res.redirect('/');
});

// Start the server!
var server = app.listen(port, function() {
    console.log('Listening on port %d', server.address().port);
});

