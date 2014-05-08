


$(document).ready(function(){

  var spinner = '<div class="spinner"> <div class="bounce1"></div> <div class="bounce2"></div> <div class="bounce3"></div> </div>';

  function ingestIssuesForRepo(full_repo_name, replace_element_with_result){
    
    function fail(reason){
      console.log("fail:", reason);
      $('#error').html(
        $('<div>', {text:reason})
      );
      $(replace_element_with_result).find('.spinner').remove();
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
        $('<div>', {html:'<a href="'+data.url+'">Coggle created</a>'}).addClass('created')
      );
      $('#error').html('');
    });
  }

  $('.ingestitem').on('click', function(){
    var full_repo_name = $(this).attr('fullname');
    console.log('item', full_repo_name , 'clicked');
    $(this).append($(spinner));
    ingestIssuesForRepo(full_repo_name, this);
  });
  

  $('.ingestinput').on('keydown', function(e){
    if(e.keyCode == 13){
      // if enter was pressed
      e.preventDefault();
      $(this).parent().append($(spinner));
      ingestIssuesForRepo($(this).val(), $(this).parent());
    }
  });
});


