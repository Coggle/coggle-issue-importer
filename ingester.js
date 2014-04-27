var GitHubApi = require('github');
var http      = require('http');


function shortDate(){
  var date = new Date();
  return date.getMonth() + "/" +  date.getDate() + "/" +  date.getFullYear();
}

function createCoggleWithIssues(token, repo_name, all_issues, callback){
  console.log('create coggle for ', repo_name, ' with', all_issues.length, 'issues');

  // create a new Coggle:
  var body = JSON.stringify({
    title:"Imported issues for \n[" + repo_name + "](http://github.com/"+repo_name+")\n " + shortDate()
  });
  var req = http.request({
       host:'localdev.coggle.it',
       port:80,
       path:'/api/1/diagrams?access_token=' + token,
     method:'POST',
    headers:{
        'Content-Type': 'application/json',
        'Content-Length': body.length
      }
  }, function(res){
    console.log('create coggle, response:', res);
    callback(new Error('todo...'));
  });

  req.on('error', function(err){
    callback(new Error('failed to create coggle'));
  });

  req.write(body);
  req.end();
}


exports.ingest = function(options, callback){
  var access_tokens = options.access_tokens;
  var repo_name = options.full_repo_name.split('/');
 
  if(repo_name.length !== 2)
    return callback(new Error("invalid owner/repo string"));
  var owner = repo_name[0];
  var repo  = repo_name[1];

  // first get the data we need from github:
  var github = new GitHubApi({
    version: "3.0.0",
    timeout: 3000
  });
  github.authenticate({
     type: "oauth",
    token: access_tokens.github
  });
  github.issues.repoIssues({user:owner, repo:repo, state:'open', per_page:100}, function(err, issues){
    if(err)
      return callback(err);
    if(!issues.length)
      return callback(new Error("no issues found!"));
    
    var all_issues = [];
    function addReminingIssues(err, issues){
      if(err)
        return callback(err);

      all_issues = all_issues.concat(issues)

      if(github.hasNextPage(issues)){
        github.getNextPage(issues, addReminingIssues);
      }else{
        createCoggleWithIssues(access_tokens.coggle, options.full_repo_name, all_issues, callback);
      }
    }

    addReminingIssues(err, issues);
  });
}
