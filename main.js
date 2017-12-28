oc = document.getElementById('original_canvas')
octx = oc.getContext("2d");
pc = document.getElementById('processing_canvas')
pctx = pc.getContext("2d");
fc = document.getElementById('finish_canvas')
fctx = fc.getContext("2d");

var image, nails, radius, opacity, center, logbook, currentNail, update;
var table = document.getElementById("instructions");
var execute = false;
function updateValues() {
	clearInterval(update);
	logbook = [];
	radius = (Math.min(imageInput.height,imageInput.width)/2)*parseInt(document.getElementById("radius").value)-2;
	currentNail = parseInt(document.getElementById("startingNail").value);
		center = {"x":image.width/2, "y":image.height/2};
		angle = toRadians(360/parseInt(document.getElementById("nails").value));
	nails = (function() {
		var temp = [];
		for (var i = 0; i < parseInt(document.getElementById("nails").value); i++) {
			temp[i] = {};
			temp[i].x = center.x+Math.cos(i*angle)*radius;
			temp[i].y = center.y+Math.sin(i*angle)*radius;
		}
		return temp;
	})();
	opacity = parseFloat(document.getElementById("transparency").value);
	fc.width	= pc.width	= oc.width	= imageInput.width;
	fc.height	= pc.height	= oc.height	= imageInput.height;
	table.innerHTML = "";
}

function drawBG(context) {
	context.clearRect(0,0,oc.width, oc.height)
	context.drawImage(imageInput,0,0);
}
function drawNails() {
	var size = 10;
	for (var i = 0; i < nails.length; i++) {
		octx.fillStyle="#880000";
		octx.fillRect(nails[i].x-size/2,nails[i].y-size/2, size,size);
		octx.fillStyle= "#FFFFFF";
		octx.fillText(i,nails[i].x,nails[i].y);
	}
}
function luma(x,y) {
	var pixel = pctx.getImageData(x,y,2,2).data;
	return toLuma(pixel[0],pixel[1],pixel[2]);
}
function lumaLine(p,q) {
	var pixels = bresenrahm({"x":p.x,"y":p.y},{"x":q.x,"y":q.y});
	var totalLuma = 0;
	for (var i = 0; i < pixels.length; i++) {
		totalLuma += luma(pixels[i].x, pixels[i].y);
	}
	var averageLuma = totalLuma/pixels.length;
	return averageLuma;
}
function pythagoras(p,q) {
	var dx = p.x - q.x;
	var dy = p.y - q.y;
	var dist = Math.sqrt (dx*dx + dy*dy);
	return dist;
}
function onFileSelected(event) {
	var selectedFile = event.target.files[0];
	var reader = new FileReader();

	imageInput = new Image();

	reader.onload = function(event) {
		imageInput.src = event.target.result;
		image = imageInput;
	};

	reader.readAsDataURL(selectedFile);
}
function findDarkest(start){
	darkest = [Infinity, 0];
	for (var i = 0; i < nails.length; i++) {
		if (i == start) {continue}
		else {
			brightness = lumaLine(nails[start], nails[i]);
			if (darkest[0] > brightness) {
				darkest = [brightness, i];
			}
			// console.log(i+" "+Math.round(brightness));
		}
	}
	return darkest[1];
}
function fillLine(p,q){
	var pixels = bresenrahm({"x":p.x,"y":p.y},{"x":q.x,"y":q.y});
	for (var i = 0; i < pixels.length; i++) {
		whitePixel(pixels[i].x, pixels[i].y);
	}
}
function whitePixel(x,y) {
	pctx.fillStyle= "rgba(255, 255, 255, "+opacity+")";
	pctx.fillRect(x,y,1,1);
	fctx.fillStyle= "rgba(255, 255, 255, "+opacity+")";
	fctx.fillRect(x,y,1,1);
}
function resetPCTX() {
	var temp = new Image();
		temp.src = pc.toDataURL();

	temp.onload = function () {
		pctx.clearRect(0,0,pc.width, pc.height);
		pctx.drawImage(temp,0,0);
	}
}
function step(callback) {
	// find the darkest path, log it and paint it over in white
	path = findDarkest(currentNail);
	logbook.push([currentNail, path]);
	addInstruction(currentNail, path);
	fillLine(nails[currentNail], nails[path]);
	currentNail = path;
	// resetPCTX();
	callback();
}
function loop() {
	if (execute) {
		setTimeout(function () {
			step(loop);
		}, 1);
	}else {
		setTimeout(function () {
			loop();
		}, 10);
	}
}
function generate() {
	updateValues();
	drawBG(octx);
	drawBG(pctx);
	drawNails();
}

function addInstruction(p,q) {
	var temp = document.createElement("TR");
	var number = document.createElement("TD");
		number.appendChild(document.createTextNode(table.childElementCount));
	var from = document.createElement("TD");
		from.appendChild(document.createTextNode(p));
	var arrow = document.createElement("TD");
		arrow.appendChild(document.createTextNode("=>"));
	var to   = document.createElement("TD");
		to.appendChild(document.createTextNode(q));
	temp.appendChild(number);
	temp.appendChild(from);
	temp.appendChild(arrow);
	temp.appendChild(to);
	table.appendChild(temp);
}

// helper function
function slope(p,q) {
	var rise = q[0]-p[0];
	var run = q[1]-p[1];
	return rise/run;
}
function toDegrees (angle) {
  return angle * (180 / Math.PI);
}
function toRadians (angle) {
  return angle * (Math.PI / 180);
}
function toLuma(r,g,b) {
	return Math.sqrt( 0.299*Math.pow(r,2) + 0.587*Math.pow(g,2) + 0.114*Math.pow(b,2) );
}

function bresenrahm (p, q) {
	p.x = Math.round(p.x);
	p.y = Math.round(p.y);
	q.x = Math.round(q.x);
	q.y = Math.round(q.y);
	var arr = new Array();
	// Define differences and error check
	var dx = Math.abs(q.x - p.x);
	var dy = Math.abs(q.y - p.y);
	var sx = (p.x < q.x) ? 1 : -1;
	var sy = (p.y < q.y) ? 1 : -1;
	var err = dx - dy;
	// Set first coordinates
	arr.push({"y":p.y, "x":p.x});
	// Main loop
	while (!((p.x == q.x) && (p.y == q.y))) {
		var e2 = err << 1;
		if (e2 > -dy) {
			err -= dy;
			p.x += sx;
		}
		if (e2 < dx) {
			err += dx;
			p.y += sy;
		}
		// Set coordinates
		arr.push({"y":p.y, "x":p.x});
	}
	// Return the result
	return arr;
}
