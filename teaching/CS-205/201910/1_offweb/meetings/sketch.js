let sel;
let capture;
let fname;
let param = 2;

function setup() {
  let cnv = createCanvas(320, 240)
  cnv.parent('sketch-holder')
  background(128);
  capture = createCapture(VIDEO);
  capture.size(320, 240);
  capture.hide();
  fname = THRESHOLD;

  sel = createSelect();
  sel.parent('sketch-holder')
  sel.position(10, 10);
  sel.option(THRESHOLD);
  sel.option(GRAY);
  sel.option(OPAQUE);
  sel.option(INVERT);
  sel.option(POSTERIZE);
  sel.option(BLUR);
  sel.option(ERODE);
  sel.option(DILATE);
  sel.changed(mySelectEvent);
}

function draw() {
  background(255);
  image(capture, 0, 0, 320, 240);
  param = 0;
  if (fname === 'threshold') {
    param = 0.4;
  }
  else if (fname === 'posterize') {
    param = 2;
  }
  else if (fname === 'blur') {
    param = 4;
  }
  filter(fname, param);
}


function mySelectEvent() {
  fname = sel.value();
  //background(200);
  //text('it is a ' + item + '!', 50, 50);
}
