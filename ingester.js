var GitHubApi = require('github');
var CoggleApi = require('coggle');
var async     = require('async');

function shortDate(){
  var date = new Date();
  return date.getMonth() + "/" +  date.getDate() + "/" +  date.getFullYear();
}

function xOffsetForChild(base_x_off, y_off, parent_height){
  // Calculate the x-offset necessary for a child with a given vertical offset
  var Arc_Angle = 60 * Math.PI / 180;
  var radius = parent_height / (2 * Math.sin(Arc_Angle/2));
  //
  //                                                         _
  //                                                    _-"  | |
  //                                               _-"       |   + - - - - -
  //                                          _-"            |   ||        |
  //                                     _-"                 |   | |       |
  //                                _-"              parent  |   | |       |
  //                           _-"                  height/2 |   |  |      |
  //                      _-"                                |   |  |      | y_off
  //                 _-"\                                    |   |   |     |
  //            _-"       \                                  |   |   |     |
  //       _-"             \                                 |   |   |     |
  //  _-"     Arc_Angle/2   |                                |   |   |     |
  // -----------------------|--------------------------------|---|---| - - -
  // :                                                       : dx:   :
  // :                                                       :   :   :
  // :                  radius * Math.cos(Arc_Angle/2)       :   :   :
  // |-------------------------------------------------------|   :   :
  // :                                                           :   :
  // :          sqrt(radius*radius - y_off*y_off/4)              :   :
  // |-----------------------------------------------------------|   :
  // :                                                               :
  // :                             radius                            :
  // |---------------------------------------------------------------|
  //
  var dx = Math.sqrt(radius*radius - y_off*y_off) - radius * Math.cos(Arc_Angle/2);
  
  return base_x_off + dx;
}

function fillCoggleWithIssues(diagram, all_issues, callback){
  var used_label_counts = {};
  var primary_label_counts = {};
  // count up how many issues we have for each label that issues have been
  // tagged with. We pick a primary label for each issue:
  all_issues.forEach(function(issue){
    if(issue.labels.length){
      if(issue.labels[0].name in primary_label_counts)
        primary_label_counts[issue.labels[0].name] += 1;
      else
        primary_label_counts[issue.labels[0].name] = 1;
    }
    issue.labels.forEach(function(label){
      if(label.name in used_label_counts)
        used_label_counts[label.name] += 1;
      else
        used_label_counts[label.name] = 1;
    });
  });
  
  var label_yspace = 80;
  var issue_yspace = 50;
  var used_labels = Object.keys(used_label_counts);
  var label_nodes = {};
  var default_label = {name:'(no label)'};
  var label_offsets = {};
  var label_sizes = {};
  var total_used = 0;
  
  // special label for uncategorised issues
  used_labels.forEach(function(l){
    total_used += primary_label_counts[l] || 0;
  });
  used_labels.push(default_label.name);
  primary_label_counts[default_label.name] = all_issues.length - total_used;

  // calculate the size of the items assigned to each label, so that they can
  // be vertically centered
  used_labels.forEach(function(l){
    if(l in primary_label_counts)
      label_sizes[l] = issue_yspace * (primary_label_counts[l] - 1);
    else
      label_sizes[l] = 0;
    label_offsets[l] = -label_sizes[l] * 0.5;
  });
  
  // calculate the size of things on the left/right sides of the root item, so
  // that we can place things relatively neatly
  var left_side_height = 0;
  var right_side_height = 0;
  var left_labels = {};
  for(var i = 0; i < used_labels.length; i++){
    var l = used_labels[i] || 0;
    if(i % 2){
      left_labels[l] = true;
      left_side_height += label_sizes[l] + label_yspace;
    }else{
      right_side_height += label_sizes[l] + label_yspace;
    }
  }

  // get the root node of the diagram in order to add child nodes to it: since
  // we just created the diagram we know that the root node is the one and only
  // node in it
  diagram.getNodes(function(err, nodes){
    if(err)
      return callback(err, diagram.webUrl());
    var root_node = nodes[0];
  
    var left_y_offset  = -left_side_height / 2;
    var right_y_offset = -right_side_height / 2;
    // add first-level branches for each label
    async.map(
      used_labels,
      function(label, cb){
        var h = label_sizes[label];
        var x_off = 0;
        var y_off = 0;
        if(label in left_labels){
          y_off = left_y_offset + h/2;
          x_off = -xOffsetForChild(300, y_off, right_side_height);
          left_y_offset += (h + label_yspace);
        }else{
          y_off = right_y_offset + h/2;
          x_off = xOffsetForChild(300, y_off, right_side_height);
          right_y_offset += (h + label_yspace);
        }
        root_node.addChild(label, {x:x_off, y:y_off}, function(err, node){
          label_nodes[label] = node;
          cb(err, node);
        });
      },
      function(err, results){
        if(err)
          return callback(err, diagram.webUrl());
        // add the issues tagged with each label to each label
        async.each(
          all_issues,
          function(issue, cb){
            var primary_label = issue.labels.length? issue.labels[0] : default_label;
            var other_labels  = issue.labels.slice(1);
            var text = '###[' + issue.title + '](' + issue.html_url + ')\n' + 
                       'assignee: ' + ((issue.assignee && issue.assignee.login) || '**unassigned**') +
                       ' created: ' + issue.created_at;
            if(other_labels.length){
              text += '\nalso tagged:';
            }
            //other_labels.forEach(function(l){
            //  text += ' [#'+l.name+']('+'#'+l.name+')';
            //});
            var y_off = label_offsets[primary_label.name];
            var x_off = xOffsetForChild(200, y_off, label_sizes[primary_label.name]);
            label_nodes[primary_label.name].addChild(
              text,
              {x: x_off, y: y_off},
              function(err, node){
                cb(err);
              }
            );
            label_offsets[primary_label.name] += issue_yspace;
          },
          function(err){
            callback(err, diagram.webUrl());
          }
        );
      }
    );
  });
}

function createCoggleWithIssues(coggle, repo_name, all_issues, callback){
  console.log('create coggle for ', repo_name, ' with', all_issues.length, 'issues');

  coggle.createDiagram(
    "Imported issues for \n[" + repo_name + "](http://github.com/"+repo_name+")\n " + shortDate(),
    function(err, diagram){
      fillCoggleWithIssues(diagram, all_issues, callback);
  });
}



exports.ingest = function(options, callback){
  var access_tokens = options.access_tokens;
  var repo_name = options.full_repo_name.split('/');
 
  if(repo_name.length !== 2)
    return callback(new Error("invalid owner/repo string"));
  var owner = repo_name[0];
  var repo  = repo_name[1];

  // first get the data we need from github: set up the GitHubApi module:
  var github = new GitHubApi({
    version: "3.0.0",
    timeout: 3000
  });
  github.authenticate({
     type: "oauth",
    token: access_tokens.github
  });

  // handle for the Coggle API client (http://github.com/coggle/coggle-js)
  var coggle = new CoggleApi({
    token:access_tokens.coggle
  });

  // Get all the open issues for the specified repository
  github.issues.repoIssues({user:owner, repo:repo, state:'open', per_page:100}, function(err, issues){
    if(err){
      // convert all errors into a standard form:
      try{
        var gh_err = JSON.parse(err.message);
        err = new Error(gh_err.message || gh_err);
      }catch(e){
        if(!err.message)
          err.message = 'unknown github API error';
      }
      console.log('github error:', err.message);
      return callback(err);
    }
    if(!issues.length)
      return callback(new Error("no issues found!"));
    
    // the response might be split across multiple pages, if it is request all
    // the pages and build a list of all the issues
    var all_issues = [];
    function addReminingIssues(err, issues){
      if(err)
        return callback(err);

      all_issues = all_issues.concat(issues);

      if(github.hasNextPage(issues)){
        github.getNextPage(issues, addReminingIssues);
      }else{
        // if we've got all the issues, then import them into Coggle!
        createCoggleWithIssues(coggle, options.full_repo_name, all_issues, callback);
      }
    }
    addReminingIssues(err, issues);
  });
};
