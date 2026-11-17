---
layout: default
title: Code README
breadcrumb: Code README
---
--
# Code directory README

There are 2 main directories inside the code directory.

## code/textbook

This directory contains the minimally-modernized JavaScript code to allow it to be served from this website. Subdirectories 02, 03, .., 11 correspond the chapters with code examples.

## code/samples

This directory contains samples inspired by the textbook and in-class discussions. Each program is in its own subdirectory with an `app.html` entry point, calling `main.mjs` (and possibly others)

### code/common
The textbook/Common directory has been replaced with ../common, which contains:

- globals.mjs
- MV.mjs
- initShadersHTML.mjs
- three-r124.min.js
- initShadersJS.mjs
- uofrGraphics.mjs
- initShadersXHR.mjs
- vertices.mjs