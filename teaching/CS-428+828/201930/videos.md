---
title: Video Presentations
breadcrumb: Video Presentations
layout: bg-image
---
{% include teaching/url.html %}
<ul>
  {% for v in site.data.teaching.videos[joff_id] %}
  <li>
    <a target="_blank" {%comment%}_{%endcomment%}
    href="{{ v.vidurl }}">
      {{ v.group }} ({{ v.topic }})
    </a>
  </li>
  {% endfor %}
</ul>
