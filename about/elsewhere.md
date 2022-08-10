---
breadcrumb: Elsewhere on the Web
title: Elsewhere on the Web
redirect_from:
  - /research/academic.html
layout: bg-image
---
<div class="bg-light mb-2 p-3">
  <h1>
    {{ page.breadcrumb }}
  </h1>
</div>

<ul class="bg-transparent">
  {% for ew in site.data.about.elsewhere %}
  <li class="list-group-item bg-white bg-opacity-75 mb-2 p-3">
    <a href="{{ ew.url }}">
      {{ ew.label }}
    </a>
  </li>
  {% endfor %}
</ul>
