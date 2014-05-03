


$(document).ready(function(){

  function ingestIssuesForRepo(full_repo_name, replace_element_with_result){
    
    function fail(reason){
      console.log("fail:", reason);
      $(replace_element_with_result).effect('shake');
    }

    $.ajax({
             type: "POST",
              url: "/ingest/issues",
             data: JSON.stringify({full_repo_name:full_repo_name}),
      contentType: "application/json; charset=utf-8",
         dataType: "json"
    }).fail(function(jqXHR, textStatus, errorThrown){
      fail(textStatus);
    }).done(function(data, textStatus, jqXHR){
      if(data.error)
        return fail(data.details);
      console.log("success:", data, textStatus);
      $(replace_element_with_result).replaceWith(
        $('<div>', {html:'<a href="'+data.url+'">Coggle created</a>'})
      );
    });
  }

  $('.ingestitem').on('click', function(){
    var full_repo_name = $(this).attr('fullname');
    console.log('item', full_repo_name , 'clicked');
    ingestIssuesForRepo(full_repo_name, this);
  });
  

  $('.ingestinput').on('keydown', function(e){
    if(e.keyCode == 13){
      // if enter was pressed
      e.preventDefault();
      ingestIssuesForRepo($(this).val(), this);
    }
  });
});


