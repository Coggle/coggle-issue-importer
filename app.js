var express = require('express');
var stylus  = require('stylus');
var nib     = require('nib');
var jade    = require('jade');

// set up the express app
var app = express();

app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(app.router);

// Jade template engine, rendering content from ./private/views
app.set('views', __dirname + '/private/views');
app.set('view engine', 'jade');

// Stylus css compiler: convert .styl files (private/.../*.styl) to .css files
// (./public/.../*.css), custom compiler adds nib add-ons to stylus
function compileStyl(str, path) {
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

// Routes
app.get('/', function(req, res){
  res.render('index', {
      title: 'Coggle Issue Importer'
  });
});

// Start the server!
var port = Number(process.env.PORT || 5000);
var server = app.listen(port, function() {
    console.log('Listening on port %d', server.address().port);
});

