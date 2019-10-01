---
breadcrumb: LOD Entry
title: LOD Entry
layout: bg-image
questions:
- type: likert
  scale: 5
  labels:
  - desc: asdfjdslafkd
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
  {% assign nq = page.questions.size %}
  {% for q in (1..nq) %}
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
</form>
