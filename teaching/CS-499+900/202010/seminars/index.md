---
title: Schedule of Seminar Presentations
breadcrumb: Seminars
layout: bg-image
---
{%- include teaching/url.html -%}
<div class="card">
  <h1 class="card-header">
    Seminars in 2020 Winter
  </h1>
  <div class="card-body">
    <table class="table table-striped">
      <thead>
        <tr>
          <th scope="col">Date</th>
          <th scope="col">Presenter</th>
        </tr>
      </thead>
      <tbody>
    {%- for s in site.data.teaching.seminars[joff_id] -%}
      {%- if s.student -%}
        <tr>
          <td>{{ s.date | date: "%a-%d-%b" }}</td>
          <td>
            <a target="_blank"{%comment %}_{% endcomment %}
            href="{{ s.student | replace: " ","-" }}.html">
              {{ s.student }}
            </a>
          </td>
        </tr>
      {%- endif -%}
    {%- endfor -%}
      </tbody>
    </table>
  </div>
</div>
