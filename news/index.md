---
layout: bg-image
title: News
breadcrumb: News
category: news
---
<div class="bg-light p-3 mb-2">
  <h1>
    {{ page.breadcrumb }}
  </h1>
</div>

<ul class="bg-transparent">
{% for post in site.categories["news"] %}
  <li class="list-group-item bg-white bg-opacity-75 mb-2 p-3">
    <a href="{{ post.url | relative_url }}">
      {{ post.title }} ( {{ post.date | date: "%Y-%m-%d" }} )
    </a>
  </li>
{% endfor %}
</ul>
