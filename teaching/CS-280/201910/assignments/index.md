---
title: Assignments for CS 280 in Winter 201910
breadcrumb: Assignments
layout: bg-image
---
# {{ page.breadcrumb }}

{% include teaching-url.html %}
{% if site.data.teaching.assignments[off_med] %}
<ul>
{% for sdta in site.data.teaching.assignments[off_med] %}
    {% for sa in site.assignments %}
      {% if sa.title == sdta.title %}
        {% assign cm = sa.marks | plus: 0 %}
        {% assign oam = sdta.marks | plus: 0 %}
      <li>
        {% if cm == oam %}
          {{ sa.title }} {{sa.type}} {{sa.marks}} // {{sdta.marks}} {{sdta.duedate}}
          <br />
          {{ sa.content }}
        {% else %}
          {{ sa.title }} : marks don't match!
        {% endif %}
      </li>
      {% endif %}
    {% endfor %}
  {% endfor %}
</ul>
{% endif %}
