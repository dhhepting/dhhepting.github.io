---
title: Group Work Marking
breadcrumb: GWM
layout: bg-image
---
# {{ page.breadcrumb }}


<form>
  <div class="border bg-info m-2 p-4">
    <div class="form-group row">
      <label class="col-2 col-form-label text-right" for="group_input">Input</label>
      <textarea class="col-10 form-control" id="group_input" rows="1" placeholder="Input"></textarea>
    </div>
    <div class="form-group row">
      <div class="col-2">
      </div>
      <div class="col-10">
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
      <input type="text" class="form-control" name="ratees" id="ratee{{r}}">
    {% endfor %}
    </div>
    {% for c in (1..5) %}
    <div class="form-group col" id="r{{c}}col">
      <label id="rater{{ c }}" for="raters{{ c }}">GM {{ c }} rates</label>
      {% for r in (1..5) %}
        <input type="number" step="1" class="form-control"
        id="{{ r }}b{{ c }}"
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
      <label for="">Rating</label>
      {% for r in (1..5) %}
      <input type="number" step="0.1" disabled class="form-control" id="r{{r}}w" placeholder="Weight">
      {% endfor %}
    </div>
  </div>
</form>

<script>

var groupsize = 5;
var csepv = [];

function input_parse()
{
  var textArea = document.getElementById('group_input');
  csepv = textArea.value.split(',');    // lines is an array of strings

  // Loop through all lines
  console.log('Group: ' + csepv[0])
  if (csepv[csepv.length - 1] == csepv.length - 2)
  {
    grpsize(csepv[csepv.length - 1])
    console.log(groupsize)
    //for (var j = 1; j < csepv.length - 1 ; j++) {
    //  console.log('Group Member ' + j + ' is ' + csepv[j])
    //}
    namefill(csepv)
  }
  else
  {
    alert("Group size: doesn't match")
  }
}

function grpsize(gs)
{
  groupsize = parseInt(gs,10);
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

function namefill(names)
{
  for (var i = 1; i <= groupsize; i++)
  {
    //console.log("ratee" + i.toString())
    //console.log("rater" + i.toString())
    //console.log(csepv)
    //console.log(names)
    //console.log(document.getElementById("ratee" + i.toString()))
    document.getElementById("ratee" + i.toString()).placeholder = names[i].toString()
    document.getElementById("rater" + i.toString()).textContent = names[i].toString()
    for (var j = 1; j <= groupsize; j++)
    {
      if (i == j)
      {
        document.getElementById(i.toString() + 'b' + j.toString()).placeholder = 'Self'
      }
      else
      {
        document.getElementById(i.toString() + 'b' + j.toString()).placeholder = names[i]
      }
    }
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
