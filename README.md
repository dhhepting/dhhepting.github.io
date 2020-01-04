# [dhhepting.github.io](https://dhhepting.github.io)

[![Build Status](https://travis-ci.org/dhhepting/dhhepting.github.io.svg?branch=master)](https://travis-ci.org/dhhepting/dhhepting.github.io)

My personal website, built with Jekyll.

### /about/

### /projects/

### /research/

* works: generated from BibTeX file

### /teaching/
* each course has a directory, named by crs_subj-crs_nbr (such as CS-110), which contains:
    * general information about the course (in files and directories) that remains valid across course offerings
    * a directory for each offering of the course, named by the semester (such as 201810), which may contain:
        * meetings
        * media
        * syllabus
        * feedback from students
        
   At the start of a new semester, do the following:
   * create (or duplicate) a csv file for the semester schedule _data/teaching/schedule/s202010.csv (I found that jekyll does not like files that start with digits, I start these (and other data file names) with a character).

### /rss/

### /search/
* HTML sitemap generated with liquid, see [sitemap-index.html](https://github.com/dhhepting/dhhepting.github.io/blob/master/_includes/sitemap-index.html)
* site search with Tipue Search: https://github.com/jekylltools/jekyll-tipue-search

### /news/
