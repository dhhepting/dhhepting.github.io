---
title: Group Work Marking
breadcrumb: GWM
layout: bg-image
---
# {{ page.breadcrumb }}

<form class="p-2 m-2 bg-light align-middle">
  <label for="groupRadios">
    Number of Group Members:
  </label>
  <div class="form-check-inline">
    <input class="form-check-input" type="radio" name="groupRadios" id="groupRadio3" onclick="grpsize()" value="3">
    <label class="form-check-label" for="groupRadios">
      3
    </label>
  </div>
  <div class="form-check-inline">
    <input class="form-check-input" type="radio" name="groupRadios" id="groupRadio4" onclick="grpsize()" value="4" checked>
    <label class="form-check-label" for="groupRadios">
      4
    </label>
  </div>
  <div class="form-check-inline">
    <input class="form-check-input" type="radio" name="groupRadios" id="groupRadio4" onclick="grpsize()" value="5" checked>
    <label class="form-check-label" for="groupRadios">
      5
    </label>
  </div>
  <button class="btn btn-primary" onclick="reset_grpsize(); return false;">Reset</button>
</form>

<form>
  <div class="border bg-info m-2 p-4">
    <div class="form-group row">
      <label class="col col-form-label text-right" for="ratings_text">Output</label>
      <textarea class="col form-control" id="ratings_text" rows="6" placeholder="Input"></textarea>
    </div>
    <div class="form-group row">
      <div class="col-sm-3">
      </div>
      <div class="col-sm-9">
        <button class="btn btn-primary" onclick="input_parse(); return false">Evaluate</button>
      </div>
    </div>
  </div>
</form>

<form>
  <div class="form-row">
    <div class="form-group col" id="namescol">
      <label for="ratees">Group Members</label>
    {% for r in (1..5) %}
      <input type="text" class="form-control" name="ratees" id="ratee{{r}}" oninput="rate('{{ r }}')" placeholder="GM {{ r }}">
    {% endfor %}
    </div>
    {% for c in (1..5) %}
    <div class="form-group col" id="r{{c}}col">
      <label id="rater{{ c }}" for="raters{{ c }}">GM {{ c }} rates</label>
      {% for r in (1..5) %}
        <input type="number" step="1" class="form-control"
        id="{{ r }}b{{ c }}" onchange="sumby('{{c}}')"
        {% if r == c %}
        placeholder="self">
        {% else %}
        placeholder="GM {{r}}">
        {% endif %}
      {% endfor %}
      <input type="number" step="1" disabled class="form-control" id="sb{{c}}" placeholder="Sum">
    </div>
    {% endfor %}

    <div class="form-group col" id="sumcol">
      <label for="">Sum</label>
      {% for r in (1..5) %}
      <input type="number" step="1" disabled class="form-control" id="r{{r}}s" placeholder="Sum">
      {% endfor %}
    </div>
    <div class="form-group col" id="wtcol">
      <label for="">Weight</label>
      {% for r in (1..5) %}
      <input type="number" step="0.1" disabled class="form-control" id="r{{r}}w" placeholder="Weight">
      {% endfor %}
    </div>
  </div>
</form>

<script>

var groupsize = 5;

function input_parse()
{
  var textArea = document.getElementById('ratings_text');
  var lines = textArea.value.split('\n');    // lines is an array of strings

  // Loop through all lines
  for (var j = 0; j < lines.length; j++) {
    console.log('Line ' + j + ' is ' + lines[j])
  }
}

function grpsize()
{
  var gsrad = document.querySelector("input[name=groupRadios]:checked");
  groupsize = parseInt(gsrad.value);
  for (var i = groupsize+1; i <=5; i++)
  {
    document.getElementById('r' + i.toString() + 'col').style.display = 'none';
    document.getElementById('ratee' + i.toString()).style.display = 'none';
    document.getElementById('r' + i.toString() + 's').style.display = 'none';
    document.getElementById('r' + i.toString() + 'w').style.display = 'none';
    for (var j = 1; j <= groupsize; j++)
    {
      document.getElementById(i.toString() + 'b' + j.toString()).style.display = 'none';
    }
  }
}

function rate(rr)
{
    var src = "ratee" + rr;
    var dst = "rater" + rr;
    document.getElementById(dst).textContent = document.getElementById(src).value + ' rates:';
    for (var i = 1; i <= groupsize; i++)
    {
      if (rr == i.toString())
      {
        document.getElementById(rr + 'b' + i.toString()).placeholder = 'self';
      }
      else
      {
        document.getElementById(rr + 'b' + i.toString()).placeholder = document.getElementById(src).value;
      }
    }
}

function irate(rr)
{
    var src = 'i-ratee' + rr
    for (var i = 1; i <= groupsize; i++)
    {
      document.getElementById('i-' + rr + 'bi').placeholder = document.getElementById(src).value;
    }
}

function weight()
{
  var sum = 0;
  var maxsum = 0;
  for (var i = 1; i <= groupsize; i++)
  {
    var sid = "r" + i.toString() + "s";
    var sbox = document.getElementById(sid);
    var val = parseInt(sbox.value);
    if (val > maxsum)
    {
      maxsum=val;
    }
  }
  if (!isNaN(maxsum))
  {
    for (var i = 1; i <= groupsize; i++)
    {
      var sid = "r" + i.toString() + "s";
      var wid = "r" + i.toString() + "w";
      var sbox = document.getElementById(sid);
      var wbox = document.getElementById(wid);
      var val = parseInt(sbox.value);
      var wval = ((val*1.0)/(maxsum * 1.0)).toFixed(2);
      console.log(wid);
      console.log(wval);
      if (wval < 0.5)
      {
        wval = 0.5;
      }
      else if (wval <= 1.0)
      {
        wbox.valueAsNumber = wval;
        wbox.style.backgroundColor = "silver";
      }
    }
  }
}

function sumfor(rr)
{
    var rowsum = 0;
    for (var i = 1; i <= groupsize; i++)
    {
      var rrid = rr + "b" + i.toString();
      console.log(rrid);
      var rrbox = document.getElementById(rrid);
      var val = parseInt(rrbox.value);
      if (!isNaN(val))
      {
        rrbox.style.backgroundColor = "silver";
      }
      rowsum = rowsum + val;
    }
    var rrsum = "r" + rr + "s";
    var tt = document.getElementById(rrsum);
    if (!isNaN(rowsum))
    {
      tt.valueAsNumber = rowsum;
      tt.style.backgroundColor = "silver";
    }
    weight();
}

function isumby()
{

    var sum = 0;
    for (var i = 1; i <= groupsize; i++)
    {
      var rbox = document.getElementById('i-' + i.toString() + 'bi');
      var val = parseInt(rbox.value);
      if (!isNaN(val))
      {
        rbox.style.backgroundColor = "silver";
      }
      sum = sum + val;
    }
    var tt = document.getElementById('sbi');
    if (!isNaN(sum))
    {
      tt.valueAsNumber = sum;
      if (sum < 99 || sum > 100)
      {
        tt.style.backgroundColor = "red";
      }
      else
      {
        tt.style.backgroundColor = "silver";
      }
    }
}

function sumby(rr)
{

    var sum = 0;
    console.log(sum);
    for (var i = 1; i <= groupsize; i++)
    {
      var rid = i.toString() + "b" + rr;
      var rbox = document.getElementById(rid);
      var val = parseInt(rbox.value);
      if (!isNaN(val))
      {
        rbox.style.backgroundColor = "silver";
      }
      sum = sum + val;
      sumfor(i.toString());
    }
    var rsum = "sb" + rr;
    var tt = document.getElementById(rsum);
    if (!isNaN(sum))
    {
      tt.valueAsNumber = sum;
      if (sum < 99 || sum > 100)
      {
        tt.style.backgroundColor = "red";
      }
      else
      {
        tt.style.backgroundColor = "silver";
      }
    }
}

function format_ratings()
{
  var ratingsspan = document.getElementById("ratings_text");

  ratingsspan.textContent = "\t\t"
  + document.getElementById("i-ratee1").value + "\n";
  for (var i = 1; i <= groupsize; i++)
  {
    // output information for each criterion
    ratingsspan.textContent = ratingsspan.textContent + document.getElementById('i-ratee' + i.toString()).value +
    '\t' + document.getElementById('i-' + i.toString() + 'bi').value + '\n'
  }
}

function reset_grpsize()
{
}
</script>
