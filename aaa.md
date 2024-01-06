---
---
{% assign plan = site.data.teaching.CS-280.202410.plan %}
<h1>
    {{ plan.offering}}
</h1>
<h3>Overview</h3>
<p>
    {{ plan.overview | markdownify }}
</p>
<h3>Exams</h3>
<ul>
    {% for exam in plan.exams %}
     <li>
        <strong>{{ exam.name | capitalize }}</strong>:
        {{ exam.date }} ( 
        <a href="{{ exam.urc }}" target="_blank">
            Link to UR Courses
        </a> )
    </li>
    {% endfor %}
</ul>
<h3>Meetings</h3>
<ul>
    {% for mtg in plan.meetings %}
   <li>
        <strong>Meeting {{ mtg.number }} / {{ plan.totmeet }} (Week {{ mtg.week }})</strong>:
        {{ mtg.date }}
    </li>
    <li> 
        Administration 
        {{ mtg.admin | markdownify }}
    </li>
    <li> {{ mtg.next | markdownify }} </li>
    <li> Test {{ mtg.test | markdownify }} </li>
    {% endfor %}
</ul>
