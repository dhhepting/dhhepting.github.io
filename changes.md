---
title: Recent changes
permalink: /changes/
---

Subscribe: [Atom feed]({{ '/changes.xml' | relative_url }})

{{ site.data.changes.summary }}

<table>
  <thead>
    <tr><th>Page</th><th>Last modified</th><th>Change</th><th></th></tr>
  </thead>
  <tbody>
{% for row in site.data.changes.pages %}
    <tr>
      <td>
        <a href="{{ row.url | relative_url }}">{{ row.title | escape }}</a><br>
        <small><code>{{ row.path | escape }}</code></small>
      </td>
      <td><time datetime="{{ row.modified }}">{{ row.modified_date }}</time></td>
      <td>{{ row.change | escape }}</td>
      <td><a href="{{ row.diff_url }}">diff</a></td>
    </tr>
{% endfor %}
  </tbody>
</table>