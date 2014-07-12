var express  = require('express');
var stylus   = require('stylus');
var nib      = require('nib');
var jade     = require('jade');
var crypto   = require('crypto');
var passport = require('passport');
var merge    = require('merge');
var CoggleStrategy = require('passport-coggle-oauth2').OAuth2Strategy;
var GitHubStrategy = require('passport-github').Strategy;
var GitHubApi = require('github');
var ingester = require('./ingester');

// get environment variables we need:
var port                 = Number(process.env.PORT || 5000);
var hostname             = process.env.HOSTNAME || 'localhost';
var host                 = hostname;
if(host.indexOf('herokuapp.com') === -1){
    // only include port in host if we're not running on heroku – the host
    // needs to match the OAuth redirect URL, which doesn't include the port
    // that heroku runs us on internally!
    host                 = port !== 80? (hostname+':'+port) : hostname;
}
var protocol             = 'http';
var coggle_client_id     = process.env.COGGLE_CLIENT_ID;
var coggle_client_secret = process.env.COGGLE_CLIENT_SECRET;
var github_client_id     = process.env.GITHUB_CLIENT_ID;
var github_client_secret = process.env.GITHUB_CLIENT_SECRET;
var analytics_token      = process.env.GOOGLE_ANALYTICS_TOKEN;

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

// Provide the analytics token to all render() calls:
app.locals.analytics_token = analytics_token;

// Passport middleware to authenticate Coggle users
passport.use(new CoggleStrategy({
             clientID: coggle_client_id,
         clientSecret: coggle_client_secret,
    passReqToCallback: true,
          callbackURL: protocol+"://"+host+"/auth/coggle/callback"
  },
  function(req, accessToken, refreshToken, profile, done) {
    //console.log("got authed coggle user:", profile, accessToken, refreshToken);
    
    // save the access token in the session info, merging with any existing
    // access tokens
    req.session.access_tokens = merge(
      req.session.access_tokens || {},
      {coggle:accessToken}
    );

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
    //console.log("got authed github user:", profile, accessToken, refreshToken);
    
    // save the access token in the session info, merging with any existing
    // access tokens
    req.session.access_tokens = merge(
      req.session.access_tokens || {},
      {github:accessToken}
    );

    return done(null, {});
  }
));


// Routes
app.get('/', function(req, res){
  // render the view for the front page
  
  // if the user has access tokens for coggle and github in their session
  // (they've authorized access already), then fetch their github repos so the
  //  view can render a list to select from:
  if(req.session.access_tokens &&
     req.session.access_tokens.coggle &&
     req.session.access_tokens.github){
    var github = new GitHubApi({
      version: "3.0.0",
      timeout: 3000
    });
    github.authenticate({
       type: "oauth",
      token: req.session.access_tokens.github
    });
    github.repos.getAll({type:'owner'}, function(err, result){
      if(err)
        console.log('Github API error', err);
      res.render('index', {
               title: 'Coggle Issue Importer',
       access_tokens: req.session.access_tokens,
        github_repos: result || [],
               error: err
      });
    });
  }else{
    // if we don't have all the access tokens yet, then just render without
    // doing any github requests
    res.render('index', {
             title: 'Coggle Issue Importer',
     access_tokens: req.session.access_tokens
    });
  }
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

// handle requests to ingest issues for a specific github repository
app.post('/ingest/issues', function(req, res, next){
  if(!(req.session.access_tokens &&
       req.session.access_tokens.coggle &&
       req.session.access_tokens.github)){
    return res.send({error:true, details:'not authorized'});
  }

  if(!req.body.full_repo_name){
    return res.send({error:true, details:'no repository specified'});
  }

  ingester.ingest({
     access_tokens:req.session.access_tokens,
    full_repo_name:req.body.full_repo_name
  }, function(err, coggle_url){
    if(err)
      return res.send({error:true, details:err.message});
    else
      return res.send({url:coggle_url});
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

