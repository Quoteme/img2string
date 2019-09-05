oc = document.getElementById('original_canvas')
octx = oc.getContext("2d");
pc = document.getElementById('processing_canvas')
pctx = pc.getContext("2d");
fc = document.getElementById('finish_canvas')
fctx = fc.getContext("2d");

var image, imageInput, nails, radius, opacity, center, logbook, currentNail, update, jsonFile, stringLimit, showStringNumber, currentString, stringColor;
var table = document.getElementById("instructions");
// stop/resume execution
	var execute = false;
function updateValues() {
	// stop the previous program from running
		clearInterval(update);
	// if a string limit is set, use this, or allow for the program to run indefinately
		stringLimit = document.getElementById("useLimit").checked ? parseInt(document.getElementById("stringNumber").value) : Infinity;
	// increases every time a string is drawn
		currentString = 0;
	// this variable stores all the points from where, to where the string goes on each step
		logbook = [];
	// the radius from where the nails start.
	// 0 = all nails together at one point; 1 = edge of the image
		radius = (Math.min(imageInput.height,imageInput.width)/2)*parseInt(document.getElementById("radius").value)-2;
	// set the starting point for the program. This variable will change with each step the progam makes
		currentNail = parseInt(document.getElementById("startingNail").value);
	// center of the image, from where the nails will be centered from
		center = {"x":image.width/2, "y":image.height/2};
	// angle between each nail
		angle = (Math.PI/180)*(360/parseInt(document.getElementById("nails").value));
	// a list of all the nails with their respective position
		nails = (function() {
			var temp = [];
			for (var i = 0; i < parseInt(document.getElementById("nails").value); i++) {
				temp[i] = {};
				temp[i].x = center.x+Math.cos(i*angle)*radius;
				temp[i].y = center.y+Math.sin(i*angle)*radius;
			}
			return temp;
		})();
	// the opacity of the string determines how many times the string needs to pass a point of the canvas, in order to color it 100%
		opacity = parseFloat(document.getElementById("transparency").value);
	// choose to display a little number in the top left corner that says how many steps have been performed already
		showStringNumber = document.getElementById("showStringNumber").checked;
	// update string color
		stringColor = hexToRgb(document.getElementById("stringColor").value);
	// reset the dimensions of each canvas to fit it to the image
		fc.width	= pc.width	= oc.width	= imageInput.width;
		fc.height	= pc.height	= oc.height	= imageInput.height;
	// reset the instruction output, which displays all the instructions at the end
		table.innerHTML = "";
	// update canvas bg
//	fctx.fillStyle= `rgb(${Math.abs(stringColor[0]-255)}, ${Math.abs(stringColor[1]-255)}, ${Math.abs(stringColor[2]-255)})`;
//	fctx.fillRect(0,0,fc.width,fc.height);
}

function drawBG(context) {
	context.clearRect(0,0,oc.width, oc.height)
	context.drawImage(imageInput,0,0);
}
// draw the nails in their respectivepositions
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
	return toLuma(pixel[0]-stringColor[0],pixel[1]-stringColor[0],pixel[2]-stringColor[0]);
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
function onJSONselected(event, callback) {
	var selectedFile = event.target.files[0];
	var reader = new FileReader();
	reader.onload = function(event) {
		jsonFile = JSON.parse(event.target.result);
		callback();
	};

	reader.readAsText(selectedFile);
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
	pctx.fillStyle= `rgba(${Math.abs(stringColor[0]-255)}, ${Math.abs(stringColor[1]-255)}, ${Math.abs(stringColor[2]-255)}, ${opacity})`;
	pctx.fillRect(x,y,1,1);
	fctx.fillStyle= `rgba(${stringColor[0]}, ${stringColor[1]}, ${stringColor[2]}, ${opacity})`;
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
function loadJSON() {
	image = imageInput = {
		"height": jsonFile.settings.height,
		"width": jsonFile.settings.width
	}
	document.getElementById("nails").value = jsonFile.settings.nails;
	updateValues();
	fctx.fillStyle= "#000000";
	function draw(i) {
		updateProgress(i,jsonFile.data.length);
		fillLine(nails[jsonFile.data[i][0]], nails[jsonFile.data[i][1]]);
		addInstruction(jsonFile.data[i][0], jsonFile.data[i][1]);
		i++;
		if (i < jsonFile.data.length) {
			buffer(i);
		}
	}
	draw(0);
	function buffer(i) {
		if (execute) {
			requestAnimationFrame(function() {
				draw(i)
			})
		}else {
			requestAnimationFrame(function() {
				buffer(i)
			})
		}
	}
}
function convertJSON() {
	var temp = new Object();
	temp.settings = {
		"width": image.width,
		"height": image.height,
		"nails": nails.length
	}
	temp.data = logbook;
	temp = JSON.stringify(temp);
	return temp;
}
function saveJSON() {
	download(convertJSON(), "unknown.json", "json");
}
function stopOrResume() {
	execute = !execute;
	document.getElementById("resumeButton").innerHTML = execute ? "stop" : "continue";
}
function updateProgress(x,y) {
	document.getElementById("progress").innerHTML = x+"/"+y;
	document.getElementById("progressBar").value = x;
	document.getElementById("progressBar").max = y;
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
	// only draw the next step if the button to execute was pressed
	if (execute) {
		setTimeout(function () {
			// only draw the next string if the stringLimit is not too low
			if (stringLimit > 0) {
				step(function() {
					loop();
					// reduce the stringLimit by one, because a string has been drawn
					stringLimit--;
					currentString++;
					// add a string counter to the top left of the image
					if (showStringNumber) {
						updateProgress(currentString,stringLimit+currentString);
					}
				});
			}
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
//	fctx.fillStyle= "#FFFFFF";
//	fctx.fillRect(0,0,image.width,image.height);
	fc.style.background=`rgb(${Math.abs(stringColor[0]-255)}, ${Math.abs(stringColor[1]-255)}, ${Math.abs(stringColor[2]-255)})`;
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
function download(data, filename, type) {
    var file = new Blob([data], {type: type});
    if (window.navigator.msSaveOrOpenBlob) // IE10+
        window.navigator.msSaveOrOpenBlob(file, filename);
    else { // Others
        var a = document.createElement("a"),
                url = URL.createObjectURL(file);
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(function() {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }, 0);
    }
}

const hexToRgb = hex =>
  hex.replace(/^#?([a-f\d])([a-f\d])([a-f\d])$/i
             ,(m, r, g, b) => '#' + r + r + g + g + b + b)
    .substring(1).match(/.{2}/g)
    .map(x => parseInt(x, 16))
