---
title: RSS Feeds
breadcrumb: RSS Feeds
layout: bg-image
---
<div class="bg-light mb-2 p-3">
  <h1>
    {{ page.breadcrumb }}
  </h1>
</div>
<ul>
  <li>
    <a rel="alternate" type="application/rss+xml"
      href="{{ "/rss/news.rss" | relative_url }}">News</a>
  </li>

{% for sp in site.pages %}
    {% if sp.url contains page.url and sp.url > page.url %}
      {% capture sprl %}{{ sp.url | remove: ".rss" }}{% endcapture %}
      {% assign url_parts = sprl | split: '/' %}
      {% for u in (0..url_parts.size) %}
        {% if url_parts[u] == "rss" %}
          {% assign off_idx = u | plus: 1 %}
          {% break %}
        {% endif %}
      {% endfor %}
      {% assign off_parts = url_parts[off_idx] | split: '-' %}
      {% assign off_year = off_parts[2] | slice: 0,4 %}
      {% assign now_year = "now" | date: "%Y" %}
      {% if off_year == now_year %}
        {% assign off_months = "" %}
        {% assign off_sem = off_parts[2] | slice: 4,2 %}
        {% assign now_month = "now" | date: "%b" %}
        {% if off_sem == "10" %}
          {% assign off_months = "Jan,Feb,Mar,Apr" | split: "," %}
        {% elsif off_sem == "20" %}
          {% assign off_months = "May,Jun,Jul,Aug" | split: "," %}
        {% elsif off_sem == "30" %}
          {% assign off_months = "Sep,Oct,Nov,Dec" | split: "," %}
        {% endif %}
        {% if off_months contains now_month %}
  <li>
    <a rel="alternate" type="application/rss+xml"
    href="{{ sp.url | relative_url }}">{{ url_parts[off_idx] }}</a>
  </li>
        {% endif %}
      {% endif %}
    {% endif %}
{% endfor %}
</ul>
