---
title: Schedule
breadcrumb: Schedule for Current Semester
redirect_from:
  - /teaching/201320.html
  - /teaching/sem/
  - /teaching/201810/
  - /teaching/201820.html
  - /teaching/schedule/201830.html
  - /teaching/schedule/201910.html
  - /teaching/schedule/201920.html
  - /teaching/schedule/201930.html
  - /teaching/schedule/202010.html
  - /teaching/schedule/202030.html
  - /teaching/schedule/202110.html
  - /teaching/schedule/202130.html
  - /teaching/schedule/202210.html
  - /teaching/schedule/202220.html
layout: bg-image
---
# {{ page.breadcrumb }}
### (&ldquo;current&rdquo; as of {{ site.time }})

{% assign today_Y = site.time | date: "%y" | plus: 0 %}
{% assign today_M = site.time | date: "%m" | plus: 0 %}
{% assign today_D = site.time | date: "%d" | plus: 0 %}

{% assign currsem = "" %}
{% for sem in site.data.teaching.semesters %}
  {% assign sem_Y = sem.term-end | date: "%y" | plus: 0 %}
  {% assign sem_M = sem.term-end | date: "%m" | plus: 0 %}
  {% assign sem_D = sem.term-end | date: "%d" | plus: 0 %}
  {% if today_Y == sem_Y %}
    {% if today_M == sem_M %}
      {% if today_D <= sem_D %}
        {% assign currsem = sem.semester %}
        {% break %}
      {% endif %}
    {% elsif today_M < sem_M %}
      {% assign currsem = sem.semester %}
      {% break %}
    {% endif %}
  {% endif %}
{% endfor %}

{% if currsem == "" %}
  {% assign currsem = "undefined" %}
{% endif %}
The current semester is: {{ currsem }}

{% include teaching/semester.html cs=currsem %}
{% include teaching/schedule.html cs=currsem %}
