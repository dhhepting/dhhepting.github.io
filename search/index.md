---
title: Search
breadcrumb: Search
description: Search this site
layout: bg-image
permalink: /search/
tipue_search_active: true
exclude_from_search: true
---
<div class="bg-light mb-2 p-3">
  <h1>
    {{ page.breadcrumb }}
  </h1>
</div>

<div class="bg-light bg-opacity-75 mb-2 p-3">
  <ul>
    <li>
      Browse the
      <a href="sitemap/">
        HTML sitemap
      </a>
    </li>
    <li>
      Examine the
      <a href="{{ '/sitemap.xml' | relative_url }}">
        standard,
      </a>
      <a href="{{ '/image-sitemap.xml' | relative_url }}">
        image,
      </a>
      and
      <a href="{{ '/video-sitemap.xml' | relative_url }}">
        video
      </a>
      sitemaps in XML
    </li>
    <li>
      Search using
      <a href="http://www.tipue.com/" target="blank">
        Tipue Search:
      </a>
      a site search jQuery plugin. "It's free, open source, responsive and fast."
    </li>
  </ul>
  <form action="{{ page.url | relative_url }}" class="bg-light bg-opacity-75 mb-2 p-3">
  	<div class="tipue_search_left">
  		<img src="{{ "/assets/tipuesearch/search.png" | relative_url }}"
  			alt="Tipue Search Icon"
  			class="tipue_search_icon" />
  	</div>
    	<div class="tipue_search_right">
  		<input type="text" name="q" id="tipue_search_input"
  			pattern=".{3,}" title="At least 3 characters" required />
  	</div>
  	<div style="clear: both;">
  	</div>
  </form>

  <div id="tipue_search_content">
  </div>
</div>

<script>
	$(document).ready(function() {
		$('#tipue_search_input').tipuesearch();
	});
</script>
