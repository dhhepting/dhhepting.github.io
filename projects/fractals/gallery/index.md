---
layout: bg-image
title: Gallery
redirect_from:
  - /research/web/lfgallery/dragons/index.html
  - /research/web/lfgallery/ferns/index.html
  - /research/web/lfgallery/ferns/reflecting.html
  - /projects/fractals/old-fractals/gallery/ferns.html
  - /research/web/lfgallery/gaskets/index.html
  - /research/web/lfgallery/gaskets/mt_esc_gasket.html
breadcrumb: Gallery
collection: gallery
---
<h1>
  Gallery
</h1>
{% for item in site.gallery reversed %}
<div class="row bg-white bg-opacity-50 m-2">
  <div class="col-6 justify-content-end">
    <a href="{{ item.url | relative_url }}">
      <img src="{{ item.thumbnail | relative_url }}"
      class="float-end" alt="{{ item.breadcrumb }}" />
    </a>
  </div>
  <div class="col-6 justify-content-start">
    <a href="{{ item.url | relative_url }}">
      {{ item.breadcrumb }}
    </a>
  </div>
</div>
{% endfor %}
