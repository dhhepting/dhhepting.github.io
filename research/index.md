---
title: Research
breadcrumb: Research
redirect_from:
  - /research/external.html
  - /research/pubs/
  - /research/dwnld/
  - /research/scholarly.html
files:
  - n: funding
    b: Funding
  - n: inspirations.html
    b: Inspirations
  - n: students
    b: Students
  - n: works
    b: Collected Works
  - n: dhhepting.bib
    b: BibTeX-formatted file of collected works
layout: bg-image
---
<div class="bg-light mb-2 p-3">
  <h1>
    {{ page.breadcrumb }}
  </h1>
</div>

<ul class="bg-transparent">
  {%- for pf in page.files -%}
  <li class="list-group-item bg-white bg-opacity-75 mb-2 p-3">
    {% capture pfurl %}{{ page.url }}/{{ pf.n }}{% endcapture %}
    <a href="{{ pfurl | relative_url }}">
      {{ pf.b }}
    </a>
  </li>
  {% endfor %}
</ul>
