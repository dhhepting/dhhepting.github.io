---
layout: bg-image
---
<div id="content-div">
  <ul>
  </ul>
</div>

<script>
$.get("/rss/CS-205-201910.rss", function(data) {
    var $XML = $(data);
    $XML.find("item").each(function() {
        var $this = $(this),
            item = {
                title:       $this.find("title").text(),
                link:        $this.find("link").text(),
                description: $this.find("description").text(),
                pubDate:     $this.find("pubDate").text(),
                author:      $this.find("author").text()
            };

      $('#content-div ul').append(
        $('<li>').append(
          $('<a>').attr('href',item.link).append(
            item.title
          )));    
    });
});
</script>
