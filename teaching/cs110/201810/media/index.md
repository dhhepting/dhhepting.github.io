---
crs_subj: CS
crs_nbr: 110
crs_name: Programming and Problem Solving
crs_sem: 201810
breadcrumb: Media
layout: default
---
{% capture meddat %}{{page.crs_subj}}{{page.crs_nbr}}-{{page.crs_sem}}{% endcapture %}
{% include media-index.html media_dat=meddat %}
