---
title: Collected Works by Project
breadcrumb: By Project
layout: default
---
<h1>
	{{ page.breadcrumb}}
</h1>

{% assign items = "" %}
{% for sw in site.works %}
  {% assign swp = sw.project | split: "," %}
  {% for wp in swp %}
    {% capture items %}{{items}},{{wp}}{% endcapture %}
    {{ items }}
  {% endfor %}
{% endfor %}
{% comment %} 
  The above returns, for example, which is why we sort by 'name'
  {"name"=>"category1_value", "items"=>[#, #, #, #, #]}{"name"=>"category2_value", "items"=>[#, #, #, #]}
{% endcomment %}
{% comment %} Loop through the groups {% endcomment %}
{% for group in items_grouped %}
{% for n in group.name %}
<h3>{{n | capitalize}}</h3>
{% endfor %}
  {% assign items = group.items | sort: 'wdate' | reverse %}
  {% comment %} Loop through the items {% endcomment %}
<ul>
  {% for item in items %}
    <li><a href="{{item.url | relative_url}}">{{ item.wdate }}</a></li>
  {% endfor %}
</ul>
{% endfor %}
