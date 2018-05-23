---
title: Collected Works by Category
breadcrumb: Collected Works by Category
layout: default
---
<h1>
	{{ page.breadcrumb}}
</h1>

{% comment %} Create the group. {% endcomment %}
{% assign items_grouped = site.works | group_by: 'category' | sort: 'name' %}
{% comment %} 
  The above returns, for example, which is why we sort by 'name'
  {"name"=>"category1_value", "items"=>[#, #, #, #, #]}{"name"=>"category2_value", "items"=>[#, #, #, #]}
{% endcomment %}
{% comment %} Loop through the groups {% endcomment %}
{% for group in items_grouped %}
  {% comment %} Create the items within the groups, now sorting by the criteria you want them sorted {% endcomment %}
<h3>{{group.name | capitalize}}</h3>
  {% assign items = group.items | sort: 'wdate' | reverse %}
  {% comment %} Loop through the items {% endcomment %}
<ul>
  {% for item in items %}
    <li><a href="{{item.url | relative_url}}">{{ item.wdate }}</a></li>
  {% endfor %}
</ul>
{% endfor %}
