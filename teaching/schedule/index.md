---
title: Schedule
breadcrumb: Schedule
redirect_from:
  - /teaching/201320.html
  - /teaching/sem/
  - /teaching/201820.html
layout: bg-image
---
# {{ page.breadcrumb }}

{%- assign url_parts = page.url | split: '/' -%}

{% assign semdirs =  "" %}
{%- for sp in site.pages -%}
  {%- if sp.url contains page.url and sp.url.size > page.url.size %}
    {% capture semdirs %}{{semdirs}}#{{ sp.url | split: "/" | last | remove: ".html" }}{% endcapture %}
  {% endif %}
{% endfor %}
{%- assign rssemdirs = semdirs | split: "#" | sort | reverse %}
<ul>
{% for sd in rssemdirs %}
  {% if sd != "" %}
    {% capture sd_url %}{{page.url}}{{sd}}.html{% endcapture %}
    <li><a href="{{ sd_url | relative_url }}">{{sd}}</a></li>
  {% endif %}
{% endfor %}
</ul>

<script>
let cu = new URL(document.location)
const params = new URLSearchParams(location.search)
let typ = params.get("type")
// let asgn = params.get("asgn")
// get current semester
let today = new Date();
let sem = 0;
if (typ) {
  switch (today.getMonth())
  {
    case 0:
    case 1:
    case 2:
    case 3:
      sem = 10;
      break;
    case 4:
    case 5:
    case 6:
    case 7:
      sem = 20;
      break;
    case 8:
    case 9:
    case 10:
    case 11:
      sem = 30;
  }
  let semid = today.getFullYear().toString() + sem.toString();
  console.log(typ)
  let cu_str = cu.origin + cu.pathname
  if (typ == 'current') {
    let cu_str = cu.origin + cu.pathname + semid + '.html'
    window.location.replace(cu_str)
  }
}
