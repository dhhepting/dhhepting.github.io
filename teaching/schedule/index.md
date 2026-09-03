---
title: Schedule
breadcrumb: Schedule
layout: bg-image
---
{%- assign cur = site.data.teaching.all.in_session_term -%}
{%- if cur %}
<h1>{{ cur.semester }}</h1>
{%- else -%}
Between semesters
{% endif -%}
{% include schedule/main.html %}
{% include teaching/schedule.html %}
{% include teaching/weekly_grid.html %}
