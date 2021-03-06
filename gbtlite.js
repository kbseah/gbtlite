// gbtlite.js for plotting coverage-GC plots of metagenomes

// Check for FileReader API support
if (!window.FileReader) {
	alert("This browser does not support FileReader API."); 
}

// Number formatting functions
var f3s = d3.format (".3s"); // SI prefix and 3 significant figures
var f0pc = d3.format (".0%"); // Rounded percentage
var f3r = d3.format (".3r"); // Rounded decimal 3 significant figures

// Load coverage stats file
//   Adapted from 
//   http://stackoverflow.com/questions/36079390/parse-uploaded-csv-file-using-d3-js
var reader = new FileReader();
var data1; // Store input data
function loadFile() {
	var file = document.querySelector('input[type=file]').files[0];
	reader.addEventListener("load",parseFile,false);
	if(file) { reader.readAsText(file); }
}
function parseFile() {
	var doesColumnExist = false;
	data1 = d3.tsvParse(reader.result, function(d) {
		doesColumnExist = d.hasOwnProperty("Ref_GC");
		return d;
	});
	// Interpret relevant fields as numeric - important!
	data1.forEach(function (d) { d.Avg_fold = +d.Avg_fold; } );
	data1.forEach(function (d) { d.Length = +d.Length; } );
	data1.forEach(function (d) { d.Ref_GC = +d.Ref_GC; } );
	// Check for correct input
	// console.log(doesColumnExist); // testing
	if (! doesColumnExist) {
		alert("Please check your input file.");
	}
	console.log(data1);
}

// Define main chart size
var margin = { top:25,
	right: 50,
	left: 50,
	bottom: 50};
var height = 600 - margin.top - margin.bottom;
var width = 900 - margin.left - margin.right;
// Define main chart object
var chart = d3.select(".chart")
	.attr("height",height + margin.bottom + margin.top)
	.attr("width",width + margin.left + margin.right)
	.append("g") // Append g object to space margins
	.attr("transform","translate(" + margin.left + "," + margin.top + ")")
	.call(d3.zoom().on("zoom", zoom));
	
// Background color for main chart plot area
chart.append("rect")
	.attr("height",height)
	.attr("width",width)
	.attr("fill","#feffe7");
// Placeholder text before data are loaded
chart.append("text") 
	.attr ("x",(width/2))
	.attr("y", (height/2))
	.style("text-anchor","middle")
	.style("font-family","sans-serif")
	.style("font-size","24px")
	.style("fill","lightgrey")
	.text("Upload coverage statistics and click 'Draw graphs'");

// Define length histogram chart size
var lenplotMargin = { top:20, 
	right:20, 
	left:50, 
	bottom:20};
var lenplotHeight = 350 - lenplotMargin.top - lenplotMargin.bottom;
var lenplotWidth = 400 - lenplotMargin.left - lenplotMargin.right;
// Define length histogram chart object
var lenplot = d3.select(".lenplot")
	.attr("height",lenplotHeight + lenplotMargin.top + lenplotMargin.bottom)
	.attr("width", lenplotWidth + lenplotMargin.left + lenplotMargin.right)
	.append("g") // Space margins
	.attr("transform","translate(" + lenplotMargin.left + "," + lenplotMargin.top + ")");
// Background color for length histogram chart
lenplot.append("rect")
	.attr("height",lenplotHeight)
	.attr("width",lenplotWidth)
	.attr("fill", "#feffe7");
// Placeholder text before data are loaded
lenplot.append("text")
	.attr("x",(lenplotWidth/2))
	.attr("y",(lenplotHeight/2))
	.style("text-anchor","middle")
	.style("font-family","sans-serif")
	.style("font-size","18px")
	.style("fill","lightgrey")
	.text("Histogram of contig lengths");

// Div element for tooltip animations
var div = d3.select("body")
	.append("div")
	.attr("class","tooltip")
	.style("opacity",0);

// Define summary stats object for later
var summaryStats = d3.select(".summaryStats");
// Placeholder text before data are loaded
summaryStats.append("p") 
	.style("font-family","sans-serif")
	.style("font-size","10pt")
	.style("color","lightgrey")
	.text("Descriptive statistics on assembly");

// Declare variables that need to be outside scope of drawGraph()
var minlen = 1000; // Minimum length to plot contig
var pointRadParam = 0.01; // Default max plot diameter is 2% of plot width
var rad = d3.scaleSqrt(); // Scale for plot points
var x = d3.scaleLinear(); // Scale for x-axis
var y = d3.scaleLog(); // Scale for y-axis
var ylin = d3.scaleLinear(); // Alternative linear scale for y-axis
var ysqrt = d3.scaleSqrt(); // Alternative sqrt scale for y-axis
var currentYaxis = "log"; // Keep track of which y axis is active

function drawGraph(data,dcolor,minlen) { // Draw coverage-GC plot

	var dataPlot;
	// If more than 5k points, plot only longest 5k contigs
	if (data.length > 5000) {
		// Sort by contig length
		dataPlot = data.sort(function(a,b) {
			return b.Length - a.Length; 
			});
		// Take only first 5000 contigs
		dataPlot = dataPlot.slice(0,5000);
	} else {
		dataPlot = data;
	};
	// Draw only points which are above minimum length
	// using javascript Array.filter - avoid empty circles which clutter DOM
	dataPlot = dataPlot.filter(function (d) {return d.Length > minlen; });

	// Clear existing contents
	chart.selectAll("circle").remove();
	chart.selectAll(".axis").remove();
	chart.selectAll("text").remove();
	lenplot.selectAll(".axis").remove();
	lenplot.selectAll(".bar").remove();
	lenplot.selectAll("text").remove();
	summaryStats.selectAll("p").remove();
	// console.log(summaryStats); // testing

	// Linear scale for x-axis (GC%)
	x.domain([d3.min(dataPlot, function(d) {return d.Ref_GC; }) * 0.9,
			d3.max(dataPlot, function(d) {return d.Ref_GC; }) * 1.1
				])
		.range([0,width]);

	// Condition to ignore extreme low y-axis values in scale
	var yMin = d3.min(dataPlot, function(d) {return d.Avg_fold;});
	if (yMin < 0.05) {
		yMin = 0.05;
	} else {
		yMin = +yMin;
	}

	// Log scale for y-axis (coverage)
	y.domain([yMin / 2,
		// Div by 2 to avoid points directly on margin
			d3.max(dataPlot, function(d) {return d.Avg_fold; }) * 1.5
		// Mult by 1.5 to avoid points directly on margin
			])
		.range([height,1]);
		// Invert min and max because SVG coord starts from upper left corner
	
	// Alternative linear scale for y-axis (coverage)
	ylin.domain([yMin*0.9,
		     d3.max(dataPlot,function(d) { return d.Avg_fold; })* 1.1
			])
		.range([height,1]);
	
	// Alternative sqrt scale for y-axis (coverage)
	ysqrt.domain([yMin*0.9,
		     d3.max(dataPlot,function(d) { return d.Avg_fold; })* 1.1
			])
		.range([height,1]);
	
	// Sqrt scale for plot points (length)
	rad.domain([0,d3.max(dataPlot, function(d) {return d.Length;} )])
		.range([0,width*pointRadParam]); // Max point diameter set here

	// horizontal axis
	var xAxis = d3.axisBottom(x)
		.ticks(10, ".0%"); // 10 tickmarks, as percentages

	chart.append("g")
		.attr("class","x axis")
		.attr("transform","translate(0," + height + ")")
		.call(xAxis);

	// horizontal axis label
	chart.append("text")
		.attr("x",width/2)
		.attr("y",height + margin.bottom + margin.top - 40)
		.style("text-anchor","middle")
		.style("font-family","sans-serif")
		.style("font-size","10pt")
		.text("GC %");

	// vertical axis
	var yAxis = d3.axisLeft(y)
		.ticks(10,".1s"); // 10 tickmarks, 1 sig fig with SI prefix

	chart.append("g")
		.attr("class","y axis")
		.call(yAxis);

	// vertical axis label
	chart.append ("text")
		.attr("transform","rotate(-90)")
		.attr ("x",0 - (height/2))
		.attr("y", -25)
		.style("text-anchor","middle")
		.style("font-family","sans-serif")
		.style("font-size","10pt")
		.text("Coverage");

	// Plot the points!
	var point = chart.selectAll("circle")
		//.data(data)
		.data(dataPlot, function(d){return d.ID;}) // Key by contig ID
		.enter().append("circle")
		//.filter(function(d) {return d.Length > 10000; }) // Subset length > 500
		.attr("cx", function(d) { return x(d.Ref_GC); })
		.attr("cy", function(d) { return y(d.Avg_fold); })
		.attr("r", function(d) { return rad(d.Length); })
		.style("fill",dcolor)
		.style("fill-opacity", 0.3)
		//.style("stroke","grey")
		//.style("stroke-opacity",0.1)
		// Tooltip animation
		//   modified from: http://bl.ocks.org/d3noob/257c360b3650b9f0a52dd8257d7a2d73
		.on("mouseover", function (d) {
			div.transition()
				.duration(50)
				.style("opacity", 0.9);
			div.html("ID: " 
				+ d.ID 
				+ "<br /> Cov: " 
				+ f3r(d.Avg_fold) // Numbers reformatted (see above)
				+ "<br />GC: " 
				+ f0pc(d.Ref_GC)
				+ "<br /> Len: " 
				+ f3s(d.Length)
				)
				.style("left",(d3.event.pageX) + "px")
				.style("top", (d3.event.pageY - 28) + "px");
			})
		.on("mouseout",function(d) {
			div.transition()
				.duration(90)
				.style("opacity",0);
			});

	// Generate summary stats
	// Do calculations
	var stats = [ { property: "Total length",
			value: d3.sum(data, function(d) { return d.Length; }),
			units: "bp" },
			{ property: "Number contigs",
			value: data.map(function(d) { return d.ID; }).length,
			units: "" },
			{ property: "Max length",
			value: d3.max(data, function(d) { return d.Length; }),
			units: "bp" },
			{ property: "Median length",
			value: d3.median(data, function (d) { return d.Length; }),
			units: "bp" },
			{ property: "Min length",
			value: d3.min(data, function(d) { return d.Length; }),
			units: "bp" }
		];
	// Output results
	summaryStats.selectAll("p")
		.data(stats)
		.enter().append("p")
		.style("font-family","sans-serif")
		.style("font-size","10pt")
		.text(function(d) { return d.property + ": " + f3s(d.value) + d.units; });

	// Add note to summary stats if plot points have been subsetted
	if (data.length > 5000) {
		summaryStats.append("p")
			.style("font-family","sans-serif")
			.style("font-style","italic")
			.style("font-size","10pt")
			.text("NB: Only longest 5000 contigs plotted");
	}

	// Generate histogram of contig lengths
		// Produce bins
	var lenScaleX = d3.scaleLinear()
		.domain([0, d3.max(data, function(d) { return d.Length; })*1.2])
		.range([0,lenplotWidth]);
	var lenBins = d3.histogram()
		.domain(lenScaleX.domain())
		.thresholds(lenScaleX.ticks(20))
		(data.map(function(d) {return d.Length; }));
	//console.log(lenBins); // Check
		// Set up scales
	var lenScaleY = d3.scaleSqrt() // Prefer sqrt to log because some vals zero
		.domain([0, d3.max(lenBins, function(d) { return d.length; })*1.1])
		.range([lenplotHeight, 0]); // Inverse mapping of y-axis
		// Draw x axis
	var lenplotxAxis = d3.axisBottom(lenScaleX)
		.ticks(5,".1s");
	lenplot.append("g")
		.attr("class","x axis")
		.attr("transform","translate(0," + lenplotHeight + ")")
		.call(lenplotxAxis);
	// Draw y axis
	var lenplotyAxis = d3.axisLeft(lenScaleY)
		.ticks(10,".1s");
	lenplot.append("g")
		.attr("class","y axis")
		.call(lenplotyAxis);
		// Draw histogram elements
		// Adapted from: http://bl.ocks.org/mbostock/3048450
	var bar = lenplot.selectAll(".bar")
		.data(lenBins)
		.enter().append("g")
		.attr("class","bar")
		.attr("transform", function(d) { 
			return "translate(" 
				+ lenScaleX(d.x0) 
				+ "," 
				+ lenScaleY(d.length) 
				+ ")"; 
				}
			);
	bar.append("rect")
		.attr("x",1) // What does this do??
		.attr("class","bar")
		.attr("width", lenScaleX(lenBins[0].x1) - lenScaleX(lenBins[0].x0) - 1)
		.attr("height", function(d) { return lenplotHeight - lenScaleY(d.length); })
		.style("fill",dcolor)
		.style("fill-opacity",0.5);

}

function filter(lenmin) { // Display points by cutoff length
	chart.selectAll("circle")
		.filter(function(d) { return d.Length < lenmin; })
		.attr("display","none");
	chart.selectAll("circle")
		.filter(function(d) { return d.Length >= lenmin; })
		.style("fill-opacity","0.3")
		.attr("display", "initial");
};

function resizePoint(mult) { // Resize plot points
	chart.selectAll("circle").transition()
		.duration(800)
		.attr("r", function(d) { return mult*rad(d.Length); });
}

function yaxisLinear() { // Transition plot to linear y axis
	currentYaxis = "linear"; // Update tracking var
	chart.selectAll("circle").transition()
		.duration(800)
		.attr("cy", function(d) { return ylin(d.Avg_fold); });
	// Rewrite axis
	var yAxislin = d3.axisLeft(ylin)
		.ticks(10,".1s"); 
	chart.select(".y.axis").transition()
		.duration(800)
		.call(yAxislin);
}

function yaxisLog() { // Transition plot (back) to log y axis
	currentYaxis = "log"; // Update tracking var
	chart.selectAll("circle").transition()
		.duration(800)
		.attr("cy", function(d) { return y(d.Avg_fold); });
	var yAxislog = d3.axisLeft(y) // Rewrite axis
		.ticks(10,".1s"); 
	chart.select(".y.axis").transition()
		.duration(800)
		.call(yAxislog);
}

function yaxisSqrt() { // Transition plot to sqrt y axis
	currentYaxis = "sqrt"; // Update tracking var
	chart.selectAll("circle").transition()
		.duration(800)
		.attr("cy", function(d) { return ysqrt(d.Avg_fold); });
	var yAxissqrt = d3.axisLeft(ysqrt) // Rewrite axis
		.ticks(10,".1s"); 
	chart.select(".y.axis").transition()
		.duration(800)
		.call(yAxissqrt);
}

function randomColor() {
	// randomizer from https://www.paulirish.com/2009/random-hex-color-code-snippets/
	var randColor = '#'+Math.floor(Math.random()*16777215).toString(16);
	chart.selectAll("circle").transition()
		.duration(800)
		.style("fill", randColor);
	lenplot.selectAll(".bar").transition()
		.duration(800)
		.style("fill", randColor);
}

function zoom() {
	// Modified from https://bl.ocks.org/feyderm/03602b83146d69b1b6993e5f98123175
	// Rescale by transform
	var xNew = d3.event.transform.rescaleX(x);
	chart.select(".x.axis").transition().duration(50)
		// Have to call d3.axisBottom again because xAxis is in scope of drawGraph()
		.call(d3.axisBottom(x).ticks(10, ".0%") 
			.scale(d3.event.transform.rescaleX(x)));
	var yNew;
	if (currentYaxis == "log") { // Check which y axis active and rescale
		yNew = d3.event.transform.rescaleY(y);
		chart.select(".y.axis").transition().duration(50)
			.call(d3.axisLeft(y).ticks(10,".1s")
				.scale(d3.event.transform.rescaleY(y)));
	} else if (currentYaxis == "linear") {
		yNew = d3.event.transform.rescaleY(ylin);
		chart.select(".y.axis").transition().duration(50)
			.call(d3.axisLeft(y).ticks(10,".1s")
				.scale(d3.event.transform.rescaleY(ylin)));
	} else if (currentYaxis == "sqrt") {
		yNew = d3.event.transform.rescaleY(ysqrt);
		chart.select(".y.axis").transition().duration(50)
			.call(d3.axisLeft(y).ticks(10,".1s")
				.scale(d3.event.transform.rescaleY(ysqrt)));
	}
	// Resize plot points
	chart.selectAll("circle")
		.attr("cx", function(d) { return xNew(d.Ref_GC); })
		.attr("cy", function(d) { return yNew(d.Avg_fold); });
}

function notausgang() {
	chart.append("text")
		.attr("class","notausgang")
		.attr("x",width/2)
		.attr("y",height/3)
		.style("text-anchor","middle")
		.style("font-family","sans-serif")
		.style("font-size","8pt")
		.style("fill-opacity","0")
		.style("fill","green")
		.text("Reticulating splines...");
	chart.selectAll(".notausgang").transition()
		.duration(1600)
		.style("fill-opacity","1")
		.style("font-size","48");
	chart.selectAll("circle").transition()
		.duration(1600)
		.attr("r", function(d) { return 100*rad(d.Length); });
	window.setTimeout(function() { 
		window.location.href = "https://www.youtube.com/watch?v=oHg5SJYRHA0";
		}, 1600);
}