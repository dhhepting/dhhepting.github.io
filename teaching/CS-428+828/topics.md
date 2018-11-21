---
layout: bg-image
breadcrumb: Topics &amp; Learning Outcomes
intro: "This course explores Human Computer Interaction (HCI), with the following knowledge areas (click on one to jump to details):"
tlouts:
- HCI/Foundations
- HCI/Designing-Interaction
- HCI/Programming-Interactive-Systems
- HCI/User_Centered-Design-and-Testing
- HCI/New-Interactive-Technologies
- HCI/Collaboration-and-Communication
- HCI/Statistical-Methods-for-HCI
- HCI/Design_Oriented-HCI
---
# Topics &amp; Learning Outcomes

{% include topics2013.html %}

{{ page.intro }}

{% assign ctr = 1 %}
<ul>
{%- for tlo in page.tlouts -%}
	<li><a href="#know{{ctr}}">{{tlo | replace: "-"," " | replace: "_","-"}}</a></li>
	{%- assign ctr  = ctr | plus: 1 -%}
{% endfor %}
</ul>

{%- assign ctr = 1 -%}
{%- for tlo in page.tlouts -%}
  {%- assign tlo_parts = tlo | split: "/" -%}
  {% assign var1 = tlo_parts[0] %}
  {% assign var2 = tlo_parts[1] %}
  {%- assign tlo_dat = site.data.teaching.CC2013[var1][var2] -%}
  {%- if tlo_dat -%}
	<div class="card" id="know{{ctr}}">
	<div class="card-header">
	  <h3>{{tlo | replace: "-"," " | replace: "_","-"}}</h3>
	</div>
	<div class="card-body">
	  <div class="row mx-1">
	    <h5>Motivation</h5>
	    <br/>
	    <p>
		{{ tlo_dat.Motivation }}
	    </p>
	  </div>
	  <div class="row">
	    <div class="col-md-6">
	      <h5>Topics</h5>
	      <ul>
	      {%- for top in tlo_dat.Topics -%}
		 <li>{{top}}</li>
	      {%- endfor -%}
	      </ul>
	    </div>
	    <div class="col-md-6">
	      <h5>Learning Outcomes</h5>
	      <ol>
	      {%- for lo in tlo_dat.Learning-Outcomes -%}
		 <li>{{lo}}</li>
	      {%- endfor -%}
	      </ol>
	    </div>
	</div>
	</div>
	</div>
	{%- assign ctr  = ctr | plus: 1 -%}
  {%- endif -%}
{%- endfor -%}
