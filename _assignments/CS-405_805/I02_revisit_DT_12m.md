---
title: "Revisit Desktop Tetrahedron"
marks: 12
aid: I02
rubric:
- crit: Create Scene
  wt: 6
- crit: Document/Describe
  wt: 3
- crit: Run/Analyse
  wt: 3
---
### {{ page.title }}

Start with [this image of the "Desktop Tetrahedron" from 1990](https://www2.cs.uregina.ca/~hepting/projects/fractals/gallery/1990-HepSni-Desktop-Tetrahedron.html) and create a modern version with pbrt. Some sample code to generate a model can be 
[found here]({% link /teaching/CS-405+805/202510/code/gasket-recurse.py %}). Note that the code as-is generates a triangle not a tetrahedron.

Your image should take inspiration from the original image done in 1990 and feature a fractal tetrahedron modelled with non-diffuse materials on a desktop surface. Include more than 1 light source, one of which is an area light source. You may add other objects on the desktop surface to help demonstrate shadows and other effects, including indirect (diffuse) lighting. The final image should be high resolution (smaller dimension at least 1024).

Explore the input options to generate a high quality image (samples per pixel and samplers). Use the --stats option with pbrt and some analysis of the results (with imgtool diff, for example). Which is best and why?

Fully document your pbrt file with comments inline that describe all the statements used along with all parameters specified and default values for those parameters not specified

{% include grading/main.html %}
