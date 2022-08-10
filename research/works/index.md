---
layout: bg-image
title: Collected Works
breadcrumb: Collected Works
collection: works
redirect_from:
  - /research/works.html
  - /assets/pdfs/works/2006-00-C-CMiSoID.pdf.html
  - /research/works/2007-06-hep-software-for-systematic-and-imaginative-exploration.html
  - /research/dwnld/sfu1995vismvm.pdf.html
  - /research/dwnld/sfu1999PhD.pdf.html
  - /research/dwnld/iv2002visint.pdf.html
  - /research/dwnld/cc2007systematic.pdf.html
  - /assets/pdfs/works/2007-06-Hep.pdf.html
  - /research/dwnld/wss2004intdisc.pdf.html
  - /research/dwnld/sfu1993mmdb.pdf.html
  - /research/dwnld/annie2003interactevo.pdf.html
  - /research/works/2013-10-Discernibility-in-the-Analysis-of-Binary-Card-Sort-Data.html
  - /research/works/2014-06-Operationalizing-Ethics-in-Food-Choice-Decisions.html
---
<div class="bg-light mb-2 p-3">
  <h1>
    {{ page.breadcrumb }}
  </h1>
</div>

<ul class="bg-transparent">
{% for item in site.works reversed %}
  <li class="list-group-item bg-white bg-opacity-75 mb-2 p-3">
    <a href="{{ item.url | relative_url }}">
      {{ item.breadcrumb }}
    </a>
    &nbsp;&nbsp;
    <span class="badge bg-secondary">
      {{ item.category }}
    </span>
  </li>
{% endfor %}
</ul>
