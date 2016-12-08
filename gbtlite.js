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
var data;

function loadFile() {
	var file = document.querySelector('input[type=file]').files[0];
	reader.addEventListener("load",parseFile,false);
	if(file) {
        reader.readAsText(file);
    }
}

function parseFile() {
    var doesColumnExist = false;
    data = d3.tsvParse(reader.result, function(d) {
    	doesColumnExist = d.hasOwnProperty("Ref_GC");
        return d;
    });
    // Interpret relevant fields as numeric - important!
    data.forEach(function (d) { d.Avg_fold = +d.Avg_fold; } );
    data.forEach(function (d) { d.Length = +d.Length; } );
    data.forEach(function (d) { d.Ref_GC = +d.Ref_GC; } );
    // Check for correct input
    console.log(doesColumnExist);
    if (! doesColumnExist) {
    	alert("Please check your input file.");
    }
}

// Define main chart size
var margin = { top:25,
    right: 100,
    left: 50,
    bottom: 50};
var height = 600 - margin.top - margin.bottom;
var width = 850 - margin.left - margin.right;
// Define main chart object
var chart = d3.select(".chart")
	.attr("height",height + margin.bottom + margin.top)
	.attr("width",width + margin.left + margin.right)
	.append("g") // Append g object to space margins
	.attr("transform","translate(" + margin.left + "," + margin.top + ")");
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
    .text("Descriptive statistics on assembly")

// Default settings
var pointRadParam = 0.01; // Default max plot diameter is 2% of plot width

function drawGraph(pointRadParam) { // This function is called when "draw" button is pressed

	// Clear existing contents
	chart.selectAll("circle").remove();
	chart.selectAll(".axis").remove();
	chart.selectAll("text").remove();
	lenplot.selectAll(".axis").remove();
	lenplot.selectAll(".bar").remove();
	lenplot.selectAll("text").remove();
	summaryStats.selectAll("p").remove();
	console.log(summaryStats);

    // Linear scale for x-axis (GC%)
    var x = d3.scaleLinear()
    	.domain([d3.min(data, function(d) {return d.Ref_GC; }) * 0.9,
    		d3.max(data, function(d) {return d.Ref_GC; }) * 1.1
   		 	])
    	.range([0,width]);
             
    // Condition to ignore extreme low y-axis values in scale
    var yMin = d3.min(data, function(d) {return d.Avg_fold;});
    if (yMin < 0.05) {
        yMin = 0.05;
    } else {
        yMin = +yMin;
    }
    
    // Log scale for y-axis (coverage)
    var y = d3.scaleLog()
    	.domain([yMin / 2,
        	// Div by 2 to avoid points directly on margin
    		d3.max(data, function(d) {return d.Avg_fold; }) * 1.5
        	// Mult by 1.5 to avoid points directly on margin
    		])
    	.range([height,1]);
        // Invert min and max because SVG coord starts from upper left corner
    // Sqrt scale for plot points (length)
    var rad = d3.scaleSqrt()
        .domain([0,d3.max(data, function(d) {return d.Length;} )])
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
        .data(data)
        .enter().append("circle")
        .filter(function(d) {return d.Length > 500; }) // Subset length > 500
        .attr("cx", function(d) { return x(d.Ref_GC); })
        .attr("cy", function(d) { return y(d.Avg_fold); })
        .attr("r", function(d) { return rad(d.Length); })
        .style("fill","blue")
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
        .ticks(10,".1s");
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
    	.attr("width", lenScaleX(lenBins[0].x1) - lenScaleX(lenBins[0].x0) - 1)
    	.attr("height", function(d) { return lenplotHeight - lenScaleY(d.length); });

}

function filter(lenmin) {
    chart.selectAll("circle")
    	.filter(function(d) { return d.Length < lenmin; })
    	.attr("display", "none");
    chart.selectAll("circle")
    	.filter(function(d) { return d.Length >= lenmin; })
    	.attr("display", "initial");
};