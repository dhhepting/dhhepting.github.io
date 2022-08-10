---
title: Website
breadcrumb: Website
layout: bg-image
---
<div class="bg-light mb-2 p-3">
  <h1>
    {{ page.breadcrumb }}
  </h1>
</div>

<div class="bg-white bg-opacity-75 mb-2 p-3">
  This website is built with the following tools:
  <div>
    <a href="https://getbootstrap.com" target="\_blank" role="button" class="btn m-2">
      <img src="{{ "/assets/logos/bootstrap-logo-new.svg" | relative_url }}"
      alt="bootstrap-logo-new.svg" height="64" />
    </a>
    <a href="https://jekyllrb.com/" target="\_blank" role="button"
    class="btn m-2">
      <img src="{{ "/assets/logos/jekyll-logo-black-red-transparent.png" | relative_url }}"
      alt="jekyll-logo-black-red-transparent.png" height="64" />
    </a>
    <a href="https://github.com/" target="\_blank" role="button"
    class="btn m-2">
      <img src="{{ "/assets/logos/GitHub-Mark-64px.png" | relative_url }}"
      alt="GitHub-Mark-64px.png" height="64" />
    </a>
  </div>
</div>
