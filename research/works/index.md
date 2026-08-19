---
layout: bg-image
title: Collected Works
breadcrumb: Collected Works
collection: works
---
<div class="bg-light mb-2 p-3">
  <h1>
    {{ page.breadcrumb }}
  </h1>
</div>

<ul class="bg-transparent">
{% for item in site.works reversed %}
  <li class="list-group-item bg-white bg-opacity-75 mb-2 p-3">
    <a href="{{ item.url | relative_url }}">
      {{ item.breadcrumb }}
    </a>
    &nbsp;&nbsp;
    <span class="badge bg-secondary">
      {{ item.category }}
    </span>
  </li>
{% endfor %}
</ul>
