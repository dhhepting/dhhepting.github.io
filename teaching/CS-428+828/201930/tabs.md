---
title: Assignments
breadcrumb: Assignments
layout: bg-image
---
{% include teaching/url.html %}
<h1>Assignments</h1>

<div class="card my-2">
  <h3 class="card-header text-center">
    Individual
  </h3>
  <div class="card-body">
    <ul class="nav nav-tabs bg-light" id="i-asgnTabs" role="tablist">
    {% for sdta in site.data.teaching.assignments[joff_id] %}
      {% assign fla = sdta.aid | slice: 0 %}
      {% if fla == "I" %}
      <li class="nav-item">
        <a class="nav-link" id="{{ sdta.aid }}-tab" data-toggle="tab" href="#{{ sdta.aid }}-pane" role="tab" aria-controls="i-asgnTabs" aria-selected="true">
          {{ sdta.title }}
        </a>
      </li>
      {% endif %}
    {% endfor %}
    </ul>
    <div class="tab-content">
    {% for sdta in site.data.teaching.assignments[joff_id] %}
      {% assign fla = sdta.aid | slice: 0 %}
      {% if fla == "I" %}
      <div class="tab-pane fade" id="{{ sdta.aid }}-pane">
      {% if off_now == 1 %}
        {% for sa in site.assignments %}
          {% if sa.aid == sdta.aid %}
            {{ sa.content | markdownify }}
            {% break %}
          {% endif %}
        {% endfor %}
      {% endif %}
      </div>
      {% endif %}
    {% endfor %}
    </div>
  </div>
</div>

<div class="card my-2">
  <h3 class="card-header text-center">
    Project
  </h3>
  <div class="card-body">
    <ul class="nav nav-tabs bg-light" id="p-asgnTabs" role="tablist">
    {% for sdta in site.data.teaching.assignments[joff_id] %}
      {% assign fla = sdta.aid | slice: 0 %}
      {% if fla == "P" %}
      <li class="nav-item">
        <a class="nav-link" id="{{ sdta.aid }}-tab" data-toggle="tab" href="#{{ sdta.aid }}-pane" role="tab" aria-controls="p-asgnTabs" aria-selected="true">
          {{ sdta.title }}
        </a>
      </li>
      {% endif %}
    {% endfor %}
    </ul>
    <div class="tab-content">
    {% for sdta in site.data.teaching.assignments[joff_id] %}
      {% assign fla = sdta.aid | slice: 0 %}
      {% if fla == "P" %}
      <div class="tab-pane fade" id="{{ sdta.aid }}-pane">
        {% if off_now == 1 %}
          {% for sa in site.assignments %}
            {% if sa.aid == sdta.aid %}
              {{ sa.content | markdownify }}
              {% break %}
            {% endif %}
          {% endfor %}
        {% endif %}
      </div>
      {% endif %}
    {% endfor %}
    </div>
  </div>
</div>
