let cnv


function setup() {
  cnv = createCanvas(windowWidth * 0.5, 0.5 * windowHeight);
  cnv.parent('myContainer')
}

function draw() {
  //background(220);
  ellipse(mouseX,mouseY,16,16)
}

function windowResized() {
  resizeCanvas(windowWidth * 0.5, 0.5 * windowHeight);
}
