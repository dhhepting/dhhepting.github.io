---
breadcrumb: CS 110
layout: bg-image
redirect-from:
  - /teaching/cs110/
description: An introduction to problem-solving techniques, the fundamental concepts of programming, and the software design process. Topics will include data types, control structures, scope rules, functions, files, and the mechanics of running, testing and debugging. Problems will be drawn from various science disciplines.
---
{% include course-url.html %}
# {{crs_sbj}} {{crs_nbr}}
{% for crs in site.data.courses %}
  {% if crs.id == crs_id %}
## {{page.crs_name}}
  {% endif %}
{% endfor %}

{% include crs-caldesc-card.html %}
{% include crs-sems-card.html %}
