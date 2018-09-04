---
title: RSS Feeds
breadcrumb: RSS Feeds
layout: bg-image
---
<h1>{{ page.breadcrumb }}</h1>

<ul>
  <li>
    <a rel="alternate" type="application/rss+xml" 
      href="{{ "/rss/news.xml" | absolute_url }}">News (Atom)</a> 
  </li>
</ul>

{% include index-dir.html %}
