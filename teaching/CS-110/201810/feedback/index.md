---
breadcrumb: Feedback
layout: default
---
# Feedback

{% if site.data.feedback.CS-110-201510-midterm-1 %}
<div class="container-fluid">
<table class="table table-striped table-bordered">
<thead>
  <tr>
    <th>Response</th>
    <th>Q1</th>
    <th>Q2</th>
    <th>Q3</th>
    <th>Q4</th>
    <th>Q5</th>
    <th>Q6</th>
    <th>Q7</th>
    <th>Q8</th>
    <th>Q9</th>
  </tr>
</thead>
<tbody>
{% for r in site.data.feedback.CS-110-201510-midterm-1 %}
  <tr>
    <td>{{r.response }}</td>	
    {% assign rqs = "" %}
    {% capture rqs %}{{rqs}}{{r.q1}},{% endcapture %}
    {% capture rqs %}{{rqs}}{{r.q2}},{% endcapture %}
    {% capture rqs %}{{rqs}}{{r.q3}},{% endcapture %}
    {% capture rqs %}{{rqs}}{{r.q4}},{% endcapture %}
    {% capture rqs %}{{rqs}}{{r.q5}},{% endcapture %}
    {% capture rqs %}{{rqs}}{{r.q6}},{% endcapture %}
    {% capture rqs %}{{rqs}}{{r.q7}},{% endcapture %}
    {% capture rqs %}{{rqs}}{{r.q8}},{% endcapture %}
    {% capture rqs %}{{rqs}}{{r.q9}},{% endcapture %}
    {% assign rqa = rqs | split: "," %}
    {% for rq in rqa %}
      {% assign rqi = rq | plus: 0 %}
      {% if rqi > 0 %}
        <td>{{rqi}}</td>	
      {% else %}
        <td>&mdash;</td>	
      {% endif %}
    {% endfor %}
  </tr>
{% endfor %}
</tbody>
</table>
</div>
{% endif %}
