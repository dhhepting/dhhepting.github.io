---
title: Assignments for CS-205 in Winter 201910
breadcrumb: Assignments
layout: bg-image
---
<ul>
{% for sa in site.assignments %}
  <li>
    {{ sa.title }} {{sa.url}}  {{sa.course}}
  </li>
{% endfor %}
</ul>
