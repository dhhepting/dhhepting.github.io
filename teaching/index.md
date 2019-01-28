---
title: Teaching
breadcrumb: Teaching
redirect_from:
  - /teaching/bysemester.html
  - /teaching/201810.html
  - /teaching/201320.html
  - /teaching/cs215/
  - /teach/
  - /teach/resources/
  - /teach/resources/scenarios.html
  - /teaching/byKA.html
layout: bg-image
---
# {{ page.breadcrumb }}

<div class="card-deck">
  <div class="card my-2" id="teach-info-card">
    <h3 class="card-header text-center">General Information</h3>
    <div class="card-body">
      <ul class="list-group list-group-flush">
        <li class="list-group-item">
          <a href="philosophy.html">
            Teaching Philosophy
          </a>
        </li>
        <li class="list-group-item">
          <a href="evaluation.html">
            Evaluation of Teaching
          </a>
        </li>
        <li class="list-group-item">
          <a href="groupwork.html">
            Groupwork
          </a>
        </li>
        <li class="list-group-item">
          <a href="wikipedia.html">
            Use of Wikipedia
          </a>
        </li>
      </ul>
    </div>
  </div>
  {% include tch-courses-card.html %}
</div>

<script>
let curr_url = new URL(document.location);
let cu_params = curr_url.searchParams;
console.log(cu_params);
if (cu_params.get("course"))
{
  let today = new Date();
  let sem = 0;
  switch (today.getMonth())
  {
    case 0:
    case 1:
    case 2:
    case 3:
      sem = 10;
      break;
    case 4:
    case 5:
    case 6:
    case 7:
      sem = 20;
      break;
    case 8:
    case 9:
    case 10:
    case 11:
      sem = 30;
  }
  let semid = today.getFullYear().toString() + sem.toString();
  let cu_str = curr_url.origin + curr_url.pathname;
  let nu_str = cu_str + cu_params.get("course") + "/" +
    semid + "/assignments.html";
  console.log(nu_str);
  window.location.replace(nu_str);
}
</script>
