---
title: Projects
breadcrumb: Projects People
layout: bg-image
desc:
---
# {{ page.breadcrumb }}

<ul>
  {%- assign snames = site.data.projects.people | sort: 'name' -%}
  {%- for p in snames -%}
  <li class="list-group-item">
    {{ p.name }}
    {% assign pra = p.projects | split: "," %}
    {%- for pro in pra %}
      {% capture purl %}/projects/{{ pro }}/{% endcapture %}
      {%-  for xx in site.data.projects.projects -%}
        {% if xx.label == pro %}
          {% assign pname = xx.name %}
          {% break %}
        {% endif %}
      {%- endfor -%}
      <a href="{{ purl | relative_url }}">
        <span class="badge bg-secondary">{{ pname }}</span>
      </a>
    {%- endfor -%}
  {%- endfor -%}
  </li>
</ul>
