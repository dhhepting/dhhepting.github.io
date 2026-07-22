---
breadcrumb: LOD Entry
title: LOD Entry
layout: bg-image
questions:
- type: "<http://localhost:4000/likert.rdf>"
  scale: 5
  labels:
  - desc: The instructor is well-prepared for class
  - desc: The instructor clearly communicates his expectations for student preparation and participation
  - desc: The instructor...
  - desc: The instructor...
  - desc: The instructor...
  - desc: The instructor...
  - desc: The instructor...
  - desc: The instructor...
  - desc: The instructor...
- type: open
  labels:
  - desc: What do you like best about this course?
  - desc: What would you like to change about this course?
  - desc: What do you think the instructor's greatest strengths are?
---
{% comment %}
dataentry: Student Feedback Form
items:
  sequence
  group:
    type: likert
    scale
{% endcomment %}
<form>
  <input id="respno" type="number" />
    Response number
  {% for qt in page.questions %}
    {{ qt.type }}
    {% if qt.type contains "likert" %}
      <h1>LIKERT</h1>
      {% assign lq = qt.labels.size | minus: 1 %}
      {% for ql in (0..lq) %}

          <div class="form-group row">
            <div class="col">
            <label for="Q{{ql}}Radios" class="col-form-label">{{ql | plus: 1 }}. {{ qt.labels[ql].desc }}</label>
            </div>

            <div class="col-1">
              <input id="num-{{ql}}" type="number" min="0" max="{{qt.scale}}" step="1" required onblur="numchek({{ql}})">
              <span class="validity"></span>
            </div>
            <div class="form-check form-check-inline">
              {% for ll in (1 .. qt.scale) %}
              <div class="col-1">
              <input class="form-check-input disabled" name="Q{{ql}}Radios" type="radio" id="inlineQ{{ql}}-{{ll}}" value="{{ll}}">
              <label class="form-check-label disabled" for="inlineQ{{ql}}-{{ll}}">{{ll}}</label>
              </div>
              {% endfor %}
            </div>
          </div>

      {% endfor %}

    {% else if qt.type contains "open" %}
      <h1>OPEN</h1>
      {% assign oq = qt.labels.size | minus: 1 %}
      {% for qo in (0..oq) %}

          <div class="form-group row">
            <div class="col">
            <label for="Q{{qo}}TA" class="col-form-label">{{qo | plus: 1 }}. {{ qt.labels[qo].desc }}</label>
            </div>
          </div>
          <div class="form-group row">
            <div class="col">
              <textarea class="col-sm-9 form-control" id="open_ans{{qo | plus: 1 }}" rows="5" placeholder=""></textarea>
            </div>
          </div>
      {% endfor %}
  {% endif %}
{% endfor %}
</form>

<script>
function numchek(ql)
{
  var elem = document.getElementById('num-' + ql);
  var pi = parseInt(elem.value,10);
  if (pi >= 0 && pi <= 5) {
    var rbid = 'inlineQ' + ql + '-' + pi.toString()
    var rb = document.getElementById(rbid)
    rb.checked = true
  }
}
</script>
