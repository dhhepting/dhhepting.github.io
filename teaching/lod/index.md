---
breadcrumb: LOD Entry
title: LOD Entry
layout: bg-image
questions:
- type: likert
  scale: 5
  labels:
  - desc: The instructor is well-prepared for class
  - desc: bfbfdsgfdgjsdfg
  - desc: cccgasadfdfdsf
  - desc: dddsfdafdsfd
  - desc: eeefadfadsfdsf
  - desc: fffdsfadfasdfads
  - desc: gggadsgasgasdgd
  - desc: hhhasdfhdsfhdssdhf
  - desc: iiadsifsdifsdiafif
- type: open
---
<form>
  {% for qt in page.questions %}
    {% if qt.type contains "likert" %}
      <h1>LIKERT</h1>
      {% assign lq = qt.labels.size | minus: 1 %}
      {% for ql in (0..lq) %}

          <div class="form-group row">
            <div class="col-6">
            <label for="Q{{ql}}Radios" class="col-form-label">{{ql | plus: 1 }}. {{ qt.labels[ql].desc }}</label>
            </div>

            <div class="form-check form-check-inline">
              {% for ll in (1 .. qt.scale) %}
              <div class="col-1">
              <input class="form-check-input" name="Q{{ql}}Radios" type="radio" id="inlineQ{{ql}}-{ll}" value="option{{ll}}">
              <label class="form-check-label" for="inlineQ{{ql}}-{ll}">{{ll}}</label>
              </div>
              {% endfor %}
            </div>
          </div>

      {% endfor %}

      {% for ql in (0..lq) %}
      <div class="form-group row">
        <div class="col-6">
          <label class="col-form-label">
            {{ ql | plus: 1 }}. {{ qt.labels[ql].desc }}
          </label>
        </div>
        <div class="col-6">
          <input type="number" min="0" max="{{qt.scale}}" step="1" required>
          <span class="validity"></span>
        </div>
      </div>
      {% endfor %}
    {% else if qt.type contains "open" %}
      <h1>OPEN</h1>

    {% for q in (1..2) %}
    {% assign qi = q | minus: 1 %}
  <div class="form-group row">
    <label for="Q{{q}}Radios" class="col-sm-2 col-form-label">Q{{q}} {{page.questions[qi].type }}</label>
    <div class="form-check form-check-inline">
      <input class="form-check-input" name="Q{{q}}Radios" type="radio" id="inlineQ{{q}}-1" value="option1">
      <label class="form-check-label" for="inlineQ{{q}}-1">1</label>
    </div>
    <div class="form-check form-check-inline">
      <input class="form-check-input" name="Q{{q}}Radios" type="radio" id="inlineQ{{q}}-2" value="option2">
      <label class="form-check-label" for="inlineQ{{q}}-2">2</label>
    </div>
    <div class="form-check form-check-inline">
      <input class="form-check-input" name="Q{{q}}Radios" type="radio" id="inlineQ{{q}}-3" value="option3">
      <label class="form-check-label" for="inlineQ{{q}}-3">3</label>
    </div>
  </div>
  {% endfor %}
  {% endif %}
{% endfor %}
</form>
