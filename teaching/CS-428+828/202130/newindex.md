---
title: CS 428+828 in Fall 2021
breadcrumb: 202130
sem: 202130
layout: bg-image
---
<h1>CS 428+828 in 202130</h1>
<div class="card">
  <div class="card card-header lightcthru">
    <ul class="nav nav-pills" id="navbar-example2">
      <li class="nav-item">
        <a class="nav-link" href="#scrollspyHeading1">Syllabus</a>
      </li>
      <li class="nav-item">
        <a class="nav-link" href="#scrollspyHeading2">Second</a>
      </li>
      <li class="nav-item">
        <a class="nav-link" href="#scrollspyHeading3">Third</a>
      </li>
      <li class="nav-item">
        <a class="nav-link" href="#scrollspyHeading4">Fourth</a>
      </li>
      <li class="nav-item">
        <a class="nav-link" href="#scrollspyHeading5">Fifth</a>
      </li>
    </ul>
  </div>
  <div class="card card-body cbss"
    data-bs-spy="scroll" data-bs-target="#navbar-example2" data-bs-offset="0" tabindex="0">
    <h4 id="scrollspyHeading1">Syllabus</h4>

    <p>
      This is some placeholder content for the scrollspy page. Note that as you scroll down the page, the appropriate navigation link is highlighted. It's repeated throughout the component example. We keep adding some more example copy here to emphasize the scrolling and highlighting.
    </p>

    <h4 id="scrollspyHeading2">Second heading</h4>

    <p>
      This is some placeholder content for the scrollspy page. Note that as you scroll down the page, the appropriate navigation link is highlighted. It's repeated throughout the component example. We keep adding some more example copy here to emphasize the scrolling and highlighting.
    </p>

    <h4 id="scrollspyHeading3">Third heading</h4>

    <p>
      This is some placeholder content for the scrollspy page. Note that as you scroll down the page, the appropriate navigation link is highlighted. It's repeated throughout the component example. We keep adding some more example copy here to emphasize the scrolling and highlighting.
    </p>

    <h4 id="scrollspyHeading4">Fourth heading</h4>

    <p>
      This is some placeholder content for the scrollspy page. Note that as you scroll down the page, the appropriate navigation link is highlighted. It's repeated throughout the component example. We keep adding some more example copy here to emphasize the scrolling and highlighting.
    </p>

    <h4 id="scrollspyHeading5">Fifth heading</h4>

    <p>
      This is some placeholder content for the scrollspy page. Note that as you scroll down the page, the appropriate navigation link is highlighted. It's repeated throughout the component example. We keep adding some more example copy here to emphasize the scrolling and highlighting.
    </p>
  </div>
</div>



  {%- assign off_lvl = "h5" -%}
  <!-- syllabus -->
  {%- capture syll_url -%}/assets/teaching/pdf/{{ off_id }}_syllabus.pdf{%- endcapture -%}
  {%-
    include helper/lnk-card.html
    label="Syllabus" url=syll_url
    level=off_lvl id="OFF_SYLLABUS"
  -%}

  <!-- (schedule and) office hours -->
  {% comment %}
  Need to test if this URL exists
  {% endcomment %}
  {%- capture sched_url -%}/teaching/schedule/{{ crs_sem }}.html{%- endcapture -%}
  {%-
    include helper/lnk-card.html
    url=sched_url label="Office Hours"
    level=off_lvl id="OFF_SCHED"
   -%}

  <!--  meetings: next and all -->
  {%- capture mtg_dir -%}{{ page.url }}meetings/{%- endcapture -%}
  {%- include helper/pd-card.html
     test=mtg_dir label="Meetings" level=off_lvl
     open='y' id='OFF_NXTMTG' body='offering/mtgs-body.html'
  -%}

  <!-- UR Courses -->
  {%- if crs_urc != "" and off_now == true -%}
    {%- capture urc_url -%}https://urcourses.uregina.ca/course/view.php?id={{ crs_urc }}{%- endcapture -%}
    {%-
      include helper/lnk-card.html
      url=urc_url label="UR Courses"
      level=off_lvl id="OFF_URC"
    -%}
  {%- endif -%}

  <!-- Assignments -->
  {%- capture asgn_url -%}{{ page.url }}assignments/{%- endcapture -%}
  {%-
    include helper/lnk-card.html
    url=asgn_url label="Assignments"
    level=off_lvl id="OFF_ASGNS"
  -%}

  <!-- Exams -->
  {%-
    include helper/pd-card.html
    test=true label="Exams" level=off_lvl
    open='n' id='OFF_EXAMS' body='offering/exams-body.html'
  -%}

  <!-- Media -->
  {%- capture media_url -%}{{ page.url }}media/{%- endcapture -%}
  {%-
    include helper/lnk-card.html
    url=media_url label="Media"
    level=off_lvl id="OFF_MEDIA"
  -%}
  {% comment %}
  Need to test if feedback data exists
  {% endcomment %}
  <!-- Feedback -->
  {%- capture fdbk_url -%}{{ page.url }}feedback.html{%- endcapture -%}
  {%-
    include helper/lnk-card.html
    url=fdbk_url label="Feedback"
    level=off_lvl id="OFF_FEEDBACK"
  -%}
  <!--  Topics -->
  {%- assign tlofile = site.data.teaching[jcrs_id][crs_sem]tlo -%}
  {%-
    include helper/pd-card.html
    test=tlofile label="Topics &amp; Learning Outcomes"
    level=off_lvl open='n' id='OFF_TLO'
    body='offering/tlo-body.html'
  -%}

  {%- assign planfile = site.data.teaching[jcrs_id][crs_sem]plan -%}
  {%-
    include helper/pd-card.html
    test=planfile label="Plan" level=off_lvl
    open='n' pass='y' id='OFF_PLAN' body='offering/plan-body.html'
  -%}
  </div>
</div>
<script>
//const params = new URLSearchParams(location.search)
const hashid = window.location.hash
//alert(hashid.slice(1))
if (hashid !== '') {
  document.getElementById(hashid.slice(1)).classList.toggle('show')
}
</script>
