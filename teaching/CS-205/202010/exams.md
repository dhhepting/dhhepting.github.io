---
title: CS 205 Exams
breadcrumb: Exams
layout: bg-image
---
{% include teaching/url.html %}

<h1>Exams</h1>

<h3>Current Offering</h3>
<ul>
{% for sdto in site.data.teaching.offerings %}
  {% if sdto.semester == crs_sem and sdto.id == crs_id %}
    <li>Midterm: {{ sdto.midterm-exam }}</li>
    <li>Final: {{ sdto.final-exam }}</li>
    {% break %}
  {% endif %}
{% endfor %}
</ul>

<h3>Previous Exams</h3>
{% capture exam_url %}/assets/teaching/pdf/{{ crs_id }}{% endcapture %}
<ul>
{% for sp in site.static_files reversed %}
  {% if sp.path contains exam_url %}
    {% if sp.path contains "exam" %}
      <li><a href="{{ sp.path | relative_url }}">{{ sp.path | split: "/" | last }}</a></li>
    {% endif %}
  {% endif %}
{% endfor %}
</ul>

<script>
$(document).ready(function(){
  var duedate_{{ sdta.aid }} = '{{ sdta.duedate }}'
  var duetime_{{ sdta.aid }} =
    new Date(duedate_{{ sdta.aid }}).getTime() + 86340000
  $('#{{ sdta.aid }}-cdt').countdown(duetime_{{sdta.aid}},
    function(event) {
      $(this).html(event.strftime('Due in: <span>%D d %H h %M m</span>'))
    })
})
</script>
