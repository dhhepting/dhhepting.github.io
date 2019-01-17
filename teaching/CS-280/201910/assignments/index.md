---
title: Assignments for CS 280 in Winter 201910
breadcrumb: Assignments
layout: bg-image
---
# {{ page.breadcrumb }}

{% include teaching-url.html %}

{% if site.data.teaching.assignments[off_med] %}
<div class="accordion" id="accordionExample">
  {% for sdta in site.data.teaching.assignments[off_med] %}
    {% for sa in site.assignments %}
      {% if sa.title == sdta.title %}
        {% assign cm = sa.marks | plus: 0 %}
        {% assign oam = sdta.marks | plus: 0 %}
        {% if cm == oam %}
        <div class="card">
          <div class="card-header" id="headingOne">
            <h2 class="mb-0">
              <button class="btn btn-link" type="button" data-toggle="collapse" data-target="#collapseOne" aria-expanded="true" aria-controls="collapseOne">
                {{ sdta.title }}
              </button>
            </h2>
          </div>
          <div id="collapseOne" class="collapse show" aria-labelledby="headingOne" data-parent="#accordionExample">
            <div class="card-body">
              {{ sa.content | markdownify }}
            </div>
          </div>
        </div>
    {% endif %}
  {% endif %}
  {% endfor %}
{% endfor %}
</div>
  {% endif %}
