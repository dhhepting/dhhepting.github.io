---
title: Search
breadcrumb: Search
description: Search this site
layout: bg-image
permalink: /search/
tipue_search_active: true
exclude_from_search: true
---
<h1>Search</h1>
<ul>
<li>Browse the <a href="sitemap/">sitemap</a></li>
<li>Search using
<a href="http://www.tipue.com/" target="blank">
	Tipue
</a> 
Search: a site search jQuery plugin. "It's free, open source, responsive and fast."
</li>
</ul>
<form action="{{ page.url | relative_url }}">
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

<script>
	$(document).ready(function() {
		$('#tipue_search_input').tipuesearch();
	});
</script>
