---
title: Proposal Marker
breadcrumb: Proposal Marker
layout: bg-image
---
# {{ page.breadcrumb }}

### Compute grade and generate comments to paste into URcourses grading worksheet

<form class="needs-validation" novalidate>
  <div class="form-group border bg-info m-2 p-4" id="pen">
    <h5>Penalties</h5>
    <div class="form-check">
      <input class="form-check-input" type="radio" name="penalties"
      id="penalty-0" value="0" checked>
      <label class="form-check-label" for="penalties">
        No penalty: on-time and followed instructions
      </label>
    </div>
    <div class="form-check">
      <input class="form-check-input" type="radio" name="penalties"
      id="penalty-1" value="10">
      <label class="form-check-label" for="penalty-1">
        Instructions not followed
      </label>
    </div>
    <div class="form-check">
      <input class="form-check-input" type="radio" name="penalties"
      id="penalty-2" value="10">
      <label class="form-check-label" for="penalty-2">
        Assignment submitted late, but within 48 hours
      </label>
    </div>
    <div class="form-check">
      <input class="form-check-input" type="radio" name="penalties"
      id="penalty-3" value="50">
      <label class="form-check-label" for="penalty-3">
        Assignment submitted more than 48 hours late
      </label>
    </div>
  </div>

  <div class="border bg-info m-2 p-4">
    <h5>Rubric Criteria</h5>
    <div class="form-group">
      <label for="rubric_c1">Criterion 1</label>
      <select class="form-control" id="rubric_c1">
        <option selected disabled>Choose...</option>
        <option value="10">Excellent (+)</option>
        <option value="9">Excellent</option>
        <option value="8">Excellent (-)</option>
        <option value="7">Satisfactory (+)</option>
        <option value="6">Satisfactory</option>
        <option value="5">Satisfactory (-)</option>
        <option value="4">Poor (+)</option>
        <option value="3">Poor</option>
        <option value="2">Poor (-)</option>
        <option value="1">Unacceptable (+)</option>
        <option value="0">Unacceptable</option>
      </select>
    </div>
    <div class="form-group">
      <label for="rubric_c2">Criterion 2</label>
      <select class="form-control" id="rubric_c2">
        <option selected disabled>Choose...</option>
        <option value="10">Excellent (+)</option>
        <option value="9">Excellent</option>
        <option value="8">Excellent (-)</option>
        <option value="7">Satisfactory (+)</option>
        <option value="6">Satisfactory</option>
        <option value="5">Satisfactory (-)</option>
        <option value="4">Poor (+)</option>
        <option value="3">Poor</option>
        <option value="2">Poor (-)</option>
        <option value="1">Unacceptable (+)</option>
        <option value="0">Unacceptable</option>
      </select>
    </div>
  </div>
</form>

<button class="btn btn-primary" onclick="process()">Process</button>

Grade: <span id="grade"></span> Percentage: <span id="percent"></span>

Comments: <span id="comments"></span>

<script>
  function process()
  {
    <!-- get multiplier from penalty radio buttons -->
    var penalty = document.getElementById("pen");
    var checked = penalty.querySelector("input[type=radio]:checked");
    var mult = (100.0 - checked.value)/100.0;
    console.log(checked.text);

    <!-- get weight from C1 selector, multiply by weight -->
    var c1 = document.getElementById("rubric_c1");
    var c1_v = (c1.value / 10.0) * 3.0;
    var mg = Math.round(mult * c1_v * 10) / 10;

    var c1_t = c1.options[c1.selectedIndex].text;

    var gradespan = document.getElementById("grade");
    gradespan.textContent = mg.toString();

    var gp = Math.round(mg / 3.0 * 100);
    var percentspan = document.getElementById("percent");
    percentspan.textContent = gp.toString();

    var commentspan = document.getElementById("comments");
    commentspan.textContent = c1_t.toString();
  }
</script>
