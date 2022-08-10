---
title: Projects
breadcrumb: Projects
layout: bg-image
desc:
---
<div class="bg-light p-3 mb-2">
  <h1>
    {{ page.breadcrumb }}
  </h1>
  <p>
    Collected here are the various projects that
    I have undertaken over the years, in collaboration
    with many wonderful
    <a href="people/">
      people.
    </a>
  </p>
</div>

<ul class="bg-transparent">
  {%- for p in site.data.projects.projects -%}
    {% capture purl %}/projects/{{ p.label }}/{% endcapture %}
    <li class="list-group-item bg-white bg-opacity-75 mb-2 p-3">
      <a href="{{ purl | relative_url }}">
        {{ p.name }}
      </a>
    </li>
  {%- endfor -%}
</ul>
