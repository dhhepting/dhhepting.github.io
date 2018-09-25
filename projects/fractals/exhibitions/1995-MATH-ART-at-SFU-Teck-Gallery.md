---
title: MATH-ART at SFU Teck Gallery (1995)
breadcrumb: MATH-ART at SFU Teck Gallery (1995)
redirect_from:
  - /art/exhibits/teck1995mathart/
  - /art/exhibits/teck1995mathart/index.html
  - /art/exhibits/teck1995mathart/fiery.html
layout: bg-image
---

In honour of the 1995 Canadian Math Society Winter Meeting,
Simon Fraser University presents:

# MATH-ART: 9 December 1995 &mdash; 24 January 1996

<div class="container">
  <img src="{{ "/assets/projects/img/teck-map.jpg" | relative_url }}"
  alt="poster" class="img-fluid" />
</div>

Scroll down for more information about the exhibit
(those images on a yellow background have extra information about how they
were created).

<div class="container">
  <figure>
  <a href="teck-postcard.html">
  <img src="{{ "/assets/projects/img/teck-postcard.jpg" | relative_url }}"
  alt="postcard" class="img-responsive m-2" />
  </a>
  <figcaption>
    Postcard advertising events on opening day: December 9, 1995
  </figcaption>
  </figure>
</div>

### Introduction

Mandates of art galleries are many, but the mandate that immediately
defines a university gallery is the mandate that a gallery demonstrates the
aesthetic dimensions of academic disciplines.  
It was to this end that Simon Fraser Gallery mounted its first math art
exhibition,
<a href="1994-Exploring-the-Image-World-of-Computer-Graphics.html">
EXPLORING THE IMAGE WORLD OF COMPUTER GRAPHICS</a>
works by Daryl Hepting
<em>(and others from the Graphics and Multimedia Research Lab in
the School of Computing Science)</em>, in the W.A.C. Bennett Gallery,
May 30 to July 26, 1994.

Daryl Hepting, a Ph.D. Candidate in the School of Computing Science and one
of the four curators of this exhibition, knows the connections between
computers and aesthetics as few in Simon Fraser University can.  
He takes us on a short course on math art in the notes on these
digital graphics.

Other members of Simon Fraser University who joined me in curating this
exhibition were Dr. Katherine Heinrich, Chair of Mathematics &amp; Statistics
and Dr. Malgorzata Dubiel of the same department.

These eighteen images were selected from scores of possible images so as to
represent the complexities and contrasts of visual aesthetics that are
possible in digital graphics.  
They were also selected to represent the images that are
available from three sources on the WORLD WIDE WEB (internet): computer art
exhibits, pioneer publications,
and computer images created by Daryl Hepting of Simon Fraser University.

Simon Fraser Gallery is grateful for the assistance of Gallery staff, Daryl
Hepting and the other curators for making this exhibition possible.  
It is also grateful to the Graphics and Mulimedia Research Lab for production
assistance.  The Teck and Simon Fraser Galleries are honoured to support
the Department of Mathematics &amp; Statistics in hosting the Canadian
Mathematical Society 1995 Winter Meeting.

Dr. Edward Gibson, Director, December 1995.

### Notes on Exhibition

The majority of works in this exhibition represent a collection
which rely on the computer for their existence.  
And the computer involves mathematics
to describe, manipulate, and translate even the simplest scenes
into the forms we see here.  
The involvement of mathematics plays a greater role in these works &mdash;
it provides the inspiration and the foundation upon which they are constructed.

A prominent feature of the exhibit is its display of fractals, objects from
a non-Euclidean geometry. Fractals &mdash; sharing a root with fracture and
fraction &dash; have been called the geometry of nature by Mandelbrot, who
discovered their capability to describe the non-smooth world in which we
live.  Fractal geometry, which is new to us, has shed light on old things
&mdash; things like the historical record of water levels in the Nile river for
instance.  And in its turn the computer has shed light on fractals,
allowing the underlying beauty of what may seem to be dry-as-dust
mathematics to shine through.
Works like <a href="#blessed"><strong>Blessed State</strong></a>
or
<a href="#infinity"><strong>Steps to Infinity</strong></a>
provide evidence of the profound connection that
seems to exist between fractals and the natural world.

It is fitting that this collection of computer-related art comes to us
in large part through the internet (the World Wide Web). Although Daryl
Hepting is now at SFU, his works are distributed widely across the
internet. In addition to Hepting's collaborations with Musgrave (George
Washington University), Prusinkiewicz (University of Calgary), Saupe
(University of Freiburg), and Snider (University of Regina), the
computer-based works come from:

- Contours of the Mind: A Celebration of Fractals, Feedback and Chaos
- SITO: the operative term is "stimulate"
- <a href="../calendars/">The Fractals Calendar</a>

The other pieces in this exhibit remind the viewer that the computer is
responsible for only a portion of all mathematical art. The works of M. C.
Escher and Marjorie Rice offer a beautiful expression of this fact.

Partial financial support for the exhibit at Harbour Centre was provided by the
British Columbia Ministry for Employment and Investment.

<div class="card m-2">
  <div class="card-header">
    <h3 id="fiery">Fiery Dragon</h3>
    by Daryl H. Hepting
  </div>
  <div class="card-body">
    <div class="container">
    <img class="img-responsive" alt="Fiery Dragon"
    src="{{"/assets/gallery/img/1990-Hep-Fiery-Dragon.png" | relative_url }}" />
    </div>

Martin Gardener tells the story of how this curve,
first discovered by John E. Heighway, used by William G. Harter as a
decoration symbolic of cryptic structure, and later analysed by them and
another colleague, Bruce A. Banks.  Though its final structure is complex,
its description is not.  The following two transformations are required to
generate this shape:

<div class="container border bg-info p-2 m-2">
<pre>
xform
	scale { sqrt(2)/2 }
	rotate -45

xform
	scale { sqrt(2)/2 }
	rotate 135
	translate 1.0 0.0
</pre>
</div>

Beginning with a single point, the whole curve can be generated by repeated
application of these two transformations.  This specification of the shape
in terms of contractive, affine transformations is called an iterated function
system (IFS).

This image of a dragon curve was created by covering with disks (spheres) the
parts of the plane which do not include the fractal.  These parts are
determined by computing the minimum distance from a point <em>P</em>
to the fractal.  
If this distance is <em>d</em>,  
then a disk of radius <em>d</em> can be
drawn about the point <em>P</em> and all points inside that disk are known
not to belong to the fractal.  
<!--
Click
<a href="{{ "/assets/projects/videos/teck-dragondisks.mov" | relative_url}}">
here</a> to see a movie which illustrates this process at work.
-->

Like many of my other works, I've used
<a href="http://graphics.stanford.edu/~cek/rayshade/info.html">
<em>rayshade</em></a>
to ray-trace this image.
This process creates the final image (which you see above) by simulating a
camera inside the computer.
</div>
</div>

<div class="card m-2">
  <div class="card-header">
    <h3>Dragon Mesa</h3>
    by Przemyslaw Prusinkiewicz, Dietmar Saupe, and Daryl H. Hepting
  </div>
  <div class="card-body">
    <div class="container">
    <img class="img-responsive" alt="Dragon Mesa"
    src="{{"/assets/gallery/img/1989-PruSauHep-Dragon-Mesa.png" | relative_url }}" />
    </div>
</div>
</div>

<div class="card m-2">
  <div class="card-header">
    <h3 id="infinity">Steps to Infinity (1994)</h3>
    by Daryl H. Hepting and F. Kenton Musgrave
  </div>
  <div class="card-body">
    <div class="container">
      <img class="img-responsive" alt="Steps to Infinity (1994)"
      src="{{"/assets/gallery/img/1994-HepMus-Steps-to-Infinity.png" | relative_url }}" />
    </div>

<p>
The steps in this image come from a dragon curve, like the one seen on the
poster for this event (and described in the notes for
<a href="#fiery"><em>Fiery Dragon</em></a>.  
Below, I show two different colourings for a dragon
curve in the plane.  The curve is made up of smaller and smaller copies of
itself, as the colourings indicate.   
</p>

    <div class="container">
      <img class="img-responsive" alt="Steps to Infinity (1994) Explainer D1"
      src="{{"/assets/projects/img/teck-infinity_exp_d1.jpg" | relative_url }}" />
    </div>

<p>
There are two transformations which define the dragon curve each small dragon
seen above can be described by a sequence of these two transformations.  To
create the steps, I've assigned a unique height to each small dragon.  Below,
I show the steps inside a white sphere, which represents the sky.  It doesn't
look much like a very believable sky here, but I'll fix that.  The lighting
I've used here is much simpler than in the final image and it shows.
</p>

    <div class="container">
      <img class="img-responsive" alt="Steps to Infinity (1994) Explainer H1"
      src="{{"/assets/projects/img/teck-infinity_exp_h1.jpg" | relative_url }}" />
    </div>

<p>
If you look carefully at <strong>Steps to Infinity</strong>,
you will notice (part of) a Mandelbrot set in the sky, amongst the clouds.  
I began with a portion of the Mandelbrot set, shown below.  
It may be familiar
to you from Ken Musgrave's image on the cover of the 1994
Fractals Calendar.  In this case, I've changed to colours more appropriate
for a blue sky.
</p>

    <div class="container">
      <img class="img-responsive" alt="Steps to Infinity (1994) Explainer S1"
      src="{{"/assets/projects/img/teck-infinity_exp_s1.jpg" | relative_url }}" />
    </div>

<p>
For the next step, I've mapped the square image onto the inside of a white
sphere, which will represent the dome of the sky in the model of my scene.
Notice that this image is considerably lighter than the first, and this is
due only to the white colour of the original sphere.
</p>

    <div class="container">
      <img class="img-responsive" alt="Steps to Infinity (1994) Explainer S2"
      src="{{"/assets/projects/img/teck-infinity_exp_s2.jpg" | relative_url }}" />
    </div>

<p>
I create some clouds for the sky by using a fractal texture function which
selects blues and whites for each pixel based on something called fractional
Brownian motion.
</p>

    <div class="container">
      <img class="img-responsive" alt="Steps to Infinity (1994) Explainer S3"
      src="{{"/assets/projects/img/teck-infinity_exp_s3.jpg" | relative_url }}" />
    </div>

<p>
When the clouds are combined with the Mandelbrot set image, the final
Mandelbrot sky image comes to life.
</p>

    <div class="container">
      <img class="img-responsive" alt="Steps to Infinity (1994) Explainer S4"
      src="{{"/assets/projects/img/teck-infinity_exp_s4.jpg" | relative_url }}" />
    </div>

<p>
And the final image once again...
</p>

    <div class="container">
      <img class="img-responsive" alt="Steps to Infinity (1994)"
      src="{{"/assets/gallery/img/1994-HepMus-Steps-to-Infinity.png" | relative_url }}" />
    </div>
   </div>
  </div>

<div class="card m-2">
  <div class="card-header">
    <h3>Desktop Tetrahedron (1990)</h3>
    by Daryl H. Hepting and Allan Snider
  </div>
  <div class="card-body">
    <div class="container">
      <img class="img-responsive" alt="Desktop Tetrahedron (1990)"
      src="{{"/assets/gallery/img/1990-HepSni-Desktop-Tetrahedron.png" | relative_url }}" />
    </div>
  </div>
</div>

<div class="card m-2">
  <div class="card-header">
    <h3>Carrot in Blue (1991)</h3>
    by Daryl H. Hepting and Przemyslaw Prusinkiewicz
  </div>
  <div class="card-body">
    <div class="container">
      <img class="img-responsive" alt="Carrot in Blue (1991)"
      src="{{"/assets/gallery/img/1991-HepPru-Carrot-in-Blue.png" | relative_url }}" />
    </div>
  </div>
</div>

<div class="card m-2">
  <div class="card-header">
    <h3>Fractal Emblem (1992)</h3>
    by Daryl H. Hepting
  </div>
  <div class="card-body">
    <div class="container">
      <img class="img-responsive" alt="Fractal Emblem (1992)"
      src="{{"/assets/gallery/img/1992-Hep-Fractal-Emblem.png" | relative_url }}" />
    </div>
  </div>
</div>

<div class="card m-2">
  <div class="card-header">
    <h3>Splash (1993)</h3>
    by F. Kenton Musgrave
  </div>
  <div class="card-body">
    <div class="container">
      <img class="img-responsive" alt="Splash (1993)"
      src="{{"/assets/projects/img/teck-splash.jpg" | relative_url }}" />
    </div>
  </div>
</div>

<div class="card m-2">
  <div class="card-header">
    <h3>The Great Fern Dune (1994)</h3>
    by Daryl H. Hepting
  </div>
  <div class="card-body">
    <div class="container">
      <img class="img-responsive" alt="The Great Fern Dune (1994)"
      src="{{"/assets/gallery/img/1994-Hep-The-Great-Fern-Dune.png" | relative_url }}" />
    </div>
  </div>
</div>

<div class="card m-2">
  <div class="card-header">
    <h3 id="blessed">Blessed State (1988)</h3>
    by F. Kenton Musgrave
  </div>
  <div class="card-body">
    <div class="container">
      <img class="img-responsive" alt="Blessed State (1988)"
      src="{{"/assets/projects/img/teck-blessed.jpg" | relative_url }}" />
    </div>
  </div>
</div>

<div class="card m-2">
  <div class="card-header">
    <h3>Captivating Rhythm (1995)</h3>
    by Daryl H. Hepting
  </div>
  <div class="card-body">
    <div class="container">
      <img class="img-responsive" alt="Captivating Rhythm (1995)"
      src="{{"/assets/gallery/img/1995-Hep-Captivating-Rhythm.png" | relative_url }}" />
    </div>

This image is based on a fractal which is similar to the one used to
create <em><a href="#fiery">Fiery Dragon</a></em> and
<em><a href="#infinity">Steps to Infinity</a></em>.  This curve is also
defined by two transformations, but with slightly different parameters:

<div class="container border bg-info p-2 m-2">
<pre>
xform
	scale 0.618	    /* Dragon scales by approximately .7071 */
	rotate -137.5

xform
	scale -0.618
	rotate 137.5
	translate 1.0 0.0
</pre>
</div>

This image is an interpretation of the process by which the points of the
plane are captured by the transformations in the description of the curve to
form the actual curve.

I've assigned an initial point to each of the two transformations and I apply
the transformations to their respective points and then to the results, over
and over again.  As I compose the transformations into longer and longer
strings, the contractivity of each composite transformation increases.  These
"stronger" transformations capture more and more of the plane.  
<!-- I've
illustrated this process in a
<a href="/~hepting/assets/videos/fractals/ex/teck-rhythmcones.mov">movie</a>,
using cones to show the effect of the transformations.  
-->
As the strength of a
transformation increases, a cone under that transformation gets wider and
shorter.

    <div class="container m-2">
      <img class="img-responsive" alt="Captivating Rhythm - explainer 1"
      src="{{ "/assets/projects/img/teck-rhythm_exp1.jpg" | relative_url }}" />
    </div>

The upper black and white image above shows one possible colouring for the
image used to construct <em>Captivating Rhythm</em>.  Each band corresponds
to a different level of "capture", increasing away from the curve.
The reverse of "capture" (lower left above) is "escape" (lower right above).
Notice how the arrangement of disks differs between them.

The image below shows another way to view the same data, ultimately selected
for the final image.  Here, I have broken up what were solid bands in the
earlier image by using information about which transformation was applied
at a particular time.  In creating the final image, I applied a fractional
Brownian motion texture and added an outline of the fractal.

    <div class="container m-2">
      <img class="img-responsive" alt="Captivating Rhythm - explainer 2"
      src="{{ "/assets/projects/img/teck-rhythm_exp2.jpg" | relative_url }}" />
    </div>
  </div>
</div>

<div class="card m-2">
  <div class="card-header">
    <h3>Untitled</h3>
    by Stan Ostoja-KotkowskI
  </div>
  <div class="card-body">
    <div class="container">
      <img class="img-responsive" alt="Untitled"
      src="{{"/assets/projects/img/teck-ostoja.jpg" | relative_url }}" />
    </div>
  </div>
</div>

<div class="card m-2">
  <div class="card-header">
    <h3>Fractal World (1994)</h3>
    by L. Kerry Mitchell
  </div>
  <div class="card-body">
    <div class="container">
      <img class="img-responsive" alt="Fractal World (1994)"
      src="{{"/assets/projects/img/teck-fracworld.jpg" | relative_url }}" />
    </div>
  </div>
</div>

<div class="card m-2">
  <div class="card-header">
    <h3>Anemones (1992)</h3>
    by Kevin Suffern
  </div>
  <div class="card-body">
    <div class="container">
      <img class="img-responsive" alt="Anemones (1992)"
      src="{{"/assets/projects/img/teck-anemones.jpg" | relative_url }}" />
    </div>
  </div>
</div>

<div class="card m-2">
  <div class="card-header">
    <h3>The Subject of All Objects (1994)</h3>
    by Sophie Anapliotis
  </div>
  <div class="card-body">
    <div class="container">
      <img class="img-responsive" alt="The Subject of All Objects (1994)"
      src="{{"/assets/projects/img/teck-subject.jpg" | relative_url }}" />
    </div>
  </div>
</div>

<div class="card m-2">
  <div class="card-header">
    <h3>Gravity (1994)</h3>
    by L. Kerry Mitchell
  </div>
  <div class="card-body">
    <div class="container">
      <img class="img-responsive" alt="Gravity (1994)"
      src="{{"/assets/projects/img/teck-gravity.jpg" | relative_url }}" />
    </div>
  </div>
</div>

<div class="card m-2">
  <div class="card-header">
    <h3 id="amateur"> Ingenious mathematical amateurs</h3>
    A talk by Dr. Doris Schattschneider
  </div>
  <div class="card-body">
<div class="container m-2">
  <figure>
    <img src="{{"/assets/projects/img/teck-rice.jpg" | relative_url }}"
    class="img-responsive m-2" alt="Hibiscus" />
    <img src="{{"/assets/projects/img/teck-mce42.jpg" | relative_url }}"
    class="img-responsive m-2" alt="Escher No. 42"/>
    <img src="{{"/assets/projects/img/teck-mce20.jpg" | relative_url }}"
    class="img-responsive m-2" alt="Escher No. 20"/>
    <figcaption class="mb-2">
      Left to right:
      <em>Hibiscus</em> by Marjorie Rice,
      <em>Escher No. 42</em> by M. C. Escher, and
      <em>Escher No. 20</em> by M. C. Escher.
    </figcaption>
  <figure>
</div>
  <p>
    It is possible for someone without formal
    credentials to make contributions to mathematics.
    Well-known artist M.C. Escher and unknown homemaker Marjorie Rice both
    tackled mathematical problems, developing unorthodox notation that was
    essential to their methodical investigations.
    Each worked alone, essentially in secret,
    rewarded by the exhilaration of finding answers to a large puzzle.
  </p>
  <p>
    Lecture by Dr. Doris Schattschneider,
    Professor of Mathematics, Moravian College.<br />
    5 - 6 pm, 9 December 1995,
    Fletcher Challenge Canada Theatre (Room 1900), SFU Harbour Centre Campus.
  </p>
  <p>
    These images will be on display as part of the MATH-ART exhibit.
  </p>
  <p>
    References:
  </p>
    <ul>
      <li>
	Schattschneider, Doris.
	<em>M.C. Escher: Visions of Symmetry</em>,
	W. H. Freeman Company, 1990.
      </li>
      <li>
	Klarner, David A. (editor).
	<em>The Mathematical Gardener</em>,
	Wadsworth International, 1981.
      </li>
    </ul>
</div>
