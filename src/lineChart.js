// create svg canvas
const canvHeight = 600, canvWidth = 800;
const svg = d3.select("body").append("svg")
    .attr("width", canvWidth)
    .attr("height", canvHeight)
    .style("border", "1px solid");

// calc the width and height depending on margins.
const margin = {top: 50, right: 80, bottom: 100, left: 100};
const width = canvWidth - margin.left - margin.right;
const height = canvHeight - margin.top - margin.bottom;

// create parent group and add left and top margin
const g = svg.append("g")
    .attr("id", "chart-area")
    .attr("transform", "translate(" +margin.left + "," + margin.top + ")");

const colorScale = d3.scaleOrdinal(d3.schemeCategory20);

// chart title
svg.append("text")
    .attr("y", 0)
    .attr("x", margin.left)
    .attr("dy", "1.5em")
    .attr("font-family", "sans-serif")
    .attr("font-size", "24px")
    .style("text-anchor", "left")
    .text("Most popular posts on Reddit Jan/Feb 2018");

/*
The input data file is formatted as NDJSON. D3.JS cannot handle this format.
Therefore we will parse it line by line and add it to the data array.
 */
// Define data array
var data = [];
// Bind file as text
d3.text("./data/top10SubredditsByDate.json", function(error, text) {
    if (error) throw error;
    // split on new line
    var txt = text.split("\n");
    // iterate it
    for (var i = 0; i < txt.length; i += 1) {
        var block = "";
        block += txt[i];
        // parse as JSON and push to data array
        data.push(JSON.parse(block));
    }
/*
 Now we can process the data as normal JSON array
*/
    // format the data
    var parser = d3.timeParse("%Y-%m-%d");

    data.forEach(function(d) {
        d.postedDate = parser(d.postedDate);
        d.postsPerDay = +d.postsPerDay;
    });

    // sort years ascending
    data.sort(function(a, b){
        return a["postedDate"]-b["postedDate"];
    })

    // define the value domains
    const dateDomain = d3.extent(data, function(d) { return d.postedDate; });
    const postsDomain = d3.extent(data, d => Number(d.postsPerDay));

    // create scales for x and y direction
    const xScale = d3.scaleTime()
        .range([0, width])
        .domain(dateDomain);
    const yScale = d3.scaleLinear()
        .rangeRound([height,0])
        .domain(postsDomain)
        .nice(5);

    // create xAxis
    const xAxis = d3.axisBottom(xScale);
    g.append("g")  // create a group and add axis
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis
            .tickFormat(d3.timeFormat("%Y-%m-%d")))
        .selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", ".15em")
        .attr("transform", "rotate(-65)");

    // create yAxis
    const yAxis = d3.axisLeft(yScale);
    g.append("g")  // create a group and add axis
        .call(yAxis);

    // add circles
    var data_points = g.selectAll("circle")
        .data(data)
        .enter().append("circle")
        .attr("cx", function(d) { return xScale(d.postedDate); })
        .attr("cy", d => yScale(d.postsPerDay))
        .attr("r", 4)
        .style("fill", d => colorScale(d["subreddit"]));


/*
// Define the line
    var connectorLine = d3.line()
        .x(function(d) { return xScale(d.postedDate); })
        .y(function(d) { return yScale(d.postsPerDay); });

    // Add the connectorLine path.
    g.append("path")
        .attr("class", "line")
        .attr("d", connectorLine(data));
*/



    // text label for the y axis
    g.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - margin.left / 1.5)
        .attr("x",0 - (height / 2))
        .attr("dy", "1em")
        .attr("font-family", "sans-serif")
        .style("text-anchor", "middle")
        .text("Posts per day");

    // text label for the x axis
    g.append("text")
        .attr("y", height + margin.bottom / 1.5)
        .attr("x", width / 2)
        .attr("dy", "1em")
        .attr("font-family", "sans-serif")
        .style("text-anchor", "middle")
        .text("Date");
});
