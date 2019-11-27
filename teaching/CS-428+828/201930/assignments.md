---
title: Assignments
breadcrumb: Assignments
layout: bg-image
---
{% include teaching/url.html %}
<h1>Assignments</h1>

<div class="card my-2">
  <div class="card-header text-center btn w-100" role="button" data-toggle="collapse" data-target="#Iasgn">
    <h3>
      Individual
    </h3>
  </div>
  <div class="card-body collapse" id="Iasgn">
    <ul class="nav nav-tabs bg-light" id="i-asgnTabs" role="tablist">
    {% for sdta in site.data.teaching.assignments[joff_id] %}
      {% assign fla = sdta.aid | slice: 0 %}
      {% if fla == "I" %}
      <li class="nav-item">
        <a class="nav-link" id="{{ sdta.aid }}-tab" data-toggle="tab" href="#{{ sdta.aid }}-pane" role="tab" aria-controls="i-asgnTabs" aria-selected="true">
          {{ sdta.title }}
        </a>
      </li>
      {% endif %}
    {% endfor %}
    </ul>
    <div class="tab-content">
    {% for sdta in site.data.teaching.assignments[joff_id] %}
      {% assign fla = sdta.aid | slice: 0 %}
      {% if fla == "I" %}
      <div class="tab-pane fade" id="{{ sdta.aid }}-pane">
      {% if off_now == 1 %}
        {% for sa in site.assignments %}
          {% if sa.aid == sdta.aid %}

<nav class="navbar navbar-expand-lg navbar-dark bg-dark">
  <div class="container">
    <span class="navbar-brand" id="{{sdta.aid}}-cdt"></span>
    <button class="navbar-toggler" type="button" data-toggle="collapse" data-target="#{{sdta.aid}}-navbar" aria-controls="{{sdta.aid}}-navbar" aria-expanded="false" aria-label="Toggle navigation">
      <span class="navbar-toggler-icon"></span>
    </button>

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

    <div class="collapse navbar-collapse"
    id="{{sdta.aid}}-navbar">
      <ul class="navbar-nav mr-auto">
        <li class="nav-item">
          <a class="nav-link btn" href="https://urcourses.uregina.ca/mod/forum/discuss.php?d={{sdta.lms_discuss}}"
          role="button">
            Discuss
          </a>
        </li>
        <li class="nav-item">
          <a class="nav-link btn" href="https://urcourses.uregina.ca/mod/assign/view.php?id={{sdta.lms_submit}}&action=editsubmission" role="button">
            Submit
          </a>
        </li>
        <li class="nav-item">
          <a class="nav-link btn disabled" href="#" aria-disabled="true">
          Updated: {{ sa.moddate }}
          </a>
        </li>
      </ul>
    </div>
  </div>
</nav>

            {{ sa.content | markdownify }}
            {% break %}
          {% endif %}
        {% endfor %}
      {% endif %}
      </div>
      {% endif %}
    {% endfor %}
    </div>
  </div>
</div>

<div class="card my-2">
  <div class="card-header text-center btn w-100" role="button" data-toggle="collapse" data-target="#Pasgn">
    <h3>
      Project
    </h3>
  </div>
  <div class="card-body collapse" id="Pasgn">
    <ul class="nav nav-tabs bg-light" id="p-asgnTabs" role="tablist">
    {% for sdta in site.data.teaching.assignments[joff_id] %}
      {% assign fla = sdta.aid | slice: 0 %}
      {% if fla == "P" %}
      <li class="nav-item">
        <a class="nav-link" id="{{ sdta.aid }}-tab" data-toggle="tab" href="#{{ sdta.aid }}-pane" role="tab" aria-controls="p-asgnTabs" aria-selected="true">
          {{ sdta.title }}
        </a>
      </li>
      {% endif %}
    {% endfor %}
    </ul>
    <div class="tab-content">
    {% for sdta in site.data.teaching.assignments[joff_id] %}
      {% assign fla = sdta.aid | slice: 0 %}
      {% if fla == "P" %}
      <div class="tab-pane fade bg-transparent" id="{{ sdta.aid }}-pane">
        {% if off_now == 1 %}
          {% for sa in site.assignments %}
            {% if sa.aid == sdta.aid %}

<nav class="navbar navbar-expand-lg navbar-dark bg-dark">
  <div class="container">
    <span class="navbar-brand" id="{{sdta.aid}}-cdt"></span>
    <button class="navbar-toggler" type="button" data-toggle="collapse" data-target="#{{sdta.aid}}-navbar" aria-controls="{{sdta.aid}}-navbar" aria-expanded="false" aria-label="Toggle navigation">
      <span class="navbar-toggler-icon"></span>
    </button>

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

    <div class="collapse navbar-collapse"
    id="{{sdta.aid}}-navbar">
      <ul class="navbar-nav mr-auto">
        <li class="nav-item">
          <a class="nav-link btn" href="https://urcourses.uregina.ca/mod/forum/discuss.php?d={{sdta.lms_discuss}}"
          role="button">
            Discuss
          </a>
        </li>
        <li class="nav-item">
          <a class="nav-link btn" href="https://urcourses.uregina.ca/mod/assign/view.php?id={{sdta.lms_submit}}&action=editsubmission" role="button">
            Submit
          </a>
        </li>
        <li class="nav-item">
          <a class="nav-link btn disabled" href="#" aria-disabled="true">
          Updated: {{ sa.moddate }}
          </a>
        </li>
      </ul>
    </div>
  </div>
</nav>

              {{ sa.content | markdownify }}
              {% break %}
            {% endif %}
          {% endfor %}
        {% endif %}
      </div>
      {% endif %}
    {% endfor %}
    </div>
  </div>
</div>

<script>
$(document).ready(function(){
  let params = new URLSearchParams(location.search)
  let asgn = params.get('asgn')
  if (asgn != null)
  {
    let asgns = asgn.toString()
    if (asgns.startsWith('I'))
    {
      $('#' + asgns + '-tab').tab('show')
      $('#Iasgn').collapse('show')
    }
    else if (asgns.startsWith('P'))
    {
      $('#' + asgns + '-tab').tab('show')
      $('#Pasgn').collapse('show')
    }
  }
})
$('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
  let params = new URLSearchParams(location.search)
  console.log(params.get('asgn'))
  params.set('asgn',e.target.id.slice(0, -4))
  console.log(params.get('asgn'))
  var stateObj = { foo: "bar" }
  history.replaceState(stateObj,"" ,location.origin + location.pathname + '?' + params.toString())
  //if (asgn != null)
  //{
  //  let asgns = asgn.toString()

  //console.log(params)
})
</script>
