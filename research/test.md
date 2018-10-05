---
title: Research
breadcrumb: Research
layout: bg-image
---
# {{ page.breadcrumb }}
<!-- This div is a placeholder which will contain the publications -->
<div id="pubszone">
  Loading publications...
</div>
<!-- Function which will handle the content received through JSONP -->
<script type='text/javascript'>
//<![CDATA[
    function mycallback(ad_content) {
    	document.getElementById('pubszone').innerHTML = ad_content.html;
    }
//]]>
</script>
<!-- Load of the remote JS which will call the callback function -->
<script src="https://www.csauthors.net/daryl-h-hepting/embed/bib.js?callback=mycallback"></script>
