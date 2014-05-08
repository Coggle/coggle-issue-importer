


$(document).ready(function(){

  var spinner = '<div class="spinner"> <div class="bounce1"></div> <div class="bounce2"></div> <div class="bounce3"></div> </div>';

  function ingestIssuesFor(full_repo_name){
    return $.ajax({
             type: "POST",
              url: "/ingest/issues",
             data: JSON.stringify({full_repo_name:full_repo_name}),
      contentType: "application/json; charset=utf-8",
         dataType: "json"
    });
  }

  function createdButton(url, name){
    return $('<div>', {html:'<a href="'+url+'">Issues for '+name+'</a>'}).addClass('created');
  }

  function displayError(text){
      $('#error').html(
        $('<div>', {text:text})
      );
  }

  function clearError(){
      $('#error').html('');
  }

  $('.ingestitem').on('click', function(){
    var $self = $(this);
    var repo_name = $self.attr('fullname');
    $self.append($(spinner));

    function fail(details){
      displayError(details);
      $self.find('.spinner').remove();
      $self.effect('shake');
    }

    ingestIssuesFor(
      repo_name
    ).fail(function(jqXHR, textStatus, errorThrown){
      fail(textStatus);
    }).done(function(data, textStatus, jqXHR){
      if(data.error)
        return fail(data.details);
      $self.replaceWith(createdButton(data.url, repo_name));
      clearError();
    });
  });
  

  $('.ingestinput').on('keydown', function(e){
    var $self = $(this);

    function fail(details){
      displayError(details);      
      $self.parent().find('.spinner').remove();
      $self.effect('shake');
    }

    if(e.keyCode == 13){
      // if enter was pressed
      e.preventDefault();
      $self.parent().append($(spinner));
      var repo_name = $self.val();
      ingestIssuesFor(
        repo_name
      ).fail(function(jqXHR, textStatus, errorThrown){
        fail(details);
      }).done(function(data, textStatus, jqXHR){
        if(data.error)
          return fail(data.details);
        createdButton(data.url, repo_name).insertBefore($self);
        $self.parent().find('.spinner').remove();
        clearError();
      });
    }
  });
});


