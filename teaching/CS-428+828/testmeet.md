---
layout: bg-image
focus:
- ka: HCI
  ku: 01-Foundations
  topic: t01
  outcome: l04
---
<h3>Topics</h3>
<ul>
  {% for pf in page.focus %}
  <li>
    {% assign kaku = site.data.teaching.CC2013[pf.ka][pf.ku] %}
    {% for t in kaku.topics %}
      {% if t.label == pf.topic %}
        <a href="/teaching/CC2013/{{pf.ka}}.html">{{ t.desc }}</a>
        {% break %}
      {% endif %}
    {% endfor %}
    ( {{ pf.ka }} {{ pf.ku | slice: 3, pf.ku.size }} )
  </li>
  {% endfor %}
</ul>


<h3>Learning Outcomes</h3>
<ul>
  {% for pf in page.focus %}
  <li>
    {% assign kaku = site.data.teaching.CC2013[pf.ka][pf.ku] %}
    {% for o in kaku.outcomes %}
      {% if o.label == pf.outcome %}
        <a href="/teaching/CC2013/{{pf.ka}}.html">{{ o.desc }}</a>
        {% break %}
      {% endif %}
    {% endfor %}
    ( {{ pf.ka }} {{ pf.ku | slice: 3, pf.ku.size }} )
  </li>
  {% endfor %}
</ul>
