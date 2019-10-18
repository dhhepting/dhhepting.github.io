---
title: Exams
breadcrumb: Exams
layout: bg-image
---
{% include teaching/url.html %}

<h1>Exams</h1>

<h3>Current Offering</h3>
<ul>
  <li>Midterm: 24 Oct 2019</li>
  <li>Final: 19 Dec 2019</li>
</ul>

<h3>Past Offerings</h3>
{% capture exam_url %}/assets/teaching/pdf/{{ crs_id }}{% endcapture %}
<ul>
{% for sp in site.static_files reversed %}
  {% if sp.path contains exam_url %}
    {% if sp.path contains "exam" %}
      <li><a href="{{ sp.path | relative_url }}">{{ sp.path | split: "/" | last }}</a></li>
    {% endif %}
  {% endif %}
{% endfor %}
</ul>
