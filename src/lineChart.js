// Create svg canvas
const canvHeight = 600, canvWidth = 800;
const svg = d3.select("body").append("svg")
    .attr("width", canvWidth)
    .attr("height", canvHeight)
    .style("border", "1px solid");

// Calculate the width and height depending on margins.
const margin = {top: 50, right: 80, bottom: 100, left: 100};
const width = canvWidth - margin.left - margin.right;
const height = canvHeight - margin.top - margin.bottom;

// Create parent group and add left and top margin
const chartOuterGroup = svg.append("g")
    //.attr("id", "chart-area")
    .attr("transform", "translate(" +margin.left + "," + margin.top + ")");



const chartInnerGroup = chartOuterGroup.append("g");
//add dummy rect so that the cahrt becomes selectable when zooming
var view = chartInnerGroup.append("rect")
    .attr("width", canvWidth)
    .attr("height", canvHeight)
    .attr("fill","white")
;

const colorScale = d3.scaleOrdinal(d3.schemeCategory20);

// Create the chart title
svg.append("text")
    .attr("y", 0)
    .attr("x", margin.left)
    .attr("dy", "1.5em")
    .attr("font-family", "sans-serif")
    .attr("font-size", "24px")
    .style("text-anchor", "left")
    .text("Most popular Subreddits");


d3.queue()
    .defer(d3.json, "./data/posts.json")
    .defer(d3.json, "./data/postDetails.json")
    .await(analyze)
    ;

function analyze(error, posts, postDetails) {
    if(error) { console.log(error); }
     // Format the date

    const parseDate = d3.timeParse("%Y-%m-%d");

    posts.forEach(function (posts) {
        posts.postedDate = parseDate(posts.postedDate);
        //d.postsPerDay =+ d.postsPerDay;
    });
    postDetails.forEach(function (postDetails) {
        postDetails.postedDate = parseDate(postDetails.postedDate);
        //d.postsPerDay =+ d.postsPerDay;
    });

    // Define the value domains
    const dateDomain = d3.extent(posts, function (d) {
        return d.postedDate;
    });
    const postsDomain = d3.extent(posts, d => Number(d.postsPerDay));

    // Create scales for x and y direction
    var xScale = d3.scaleTime()
        .range([0, width])
        .domain(dateDomain)
        .nice(10);
    var yScale = d3.scaleLinear()
        .rangeRound([height, 0])
        .domain(postsDomain)
        .nice(10);

    // Create xAxis
    var xAxis = d3.axisBottom(xScale);

    chartOuterGroup
        .append("g")  // create a group and add axis
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis
            .tickFormat(d3.timeFormat("%Y-%m-%d")))
        .selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", ".15em")
        .attr("transform", "rotate(-65)")
    ;

    // Create yAxis
    var yAxis = d3.axisLeft(yScale);

    chartOuterGroup
        .append("g")  // create a group and add axis
        .call(yAxis);

    // Text label for the y axis
    chartOuterGroup.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - margin.left / 1.5)
        .attr("x", 0 - (height / 2))
        .attr("dy", "1em")
        .attr("font-family", "sans-serif")
        .style("text-anchor", "middle")
        .text("Posts per day");

    // Text label for the x axis
    chartOuterGroup.append("text")
        .attr("y", height + margin.bottom / 1.5)
        .attr("x", width / 2)
        .attr("dy", "1em")
        .attr("font-family", "sans-serif")
        .style("text-anchor", "middle")
        .text("Date");


    //create line generator
    const line = d3.line()
        .x(function (d) {
            return xScale(d.postedDate);
        })
        .y(function (d) {
            return yScale(d.postsPerDay);
        })
        .curve(d3.curveCardinal)
    ;

    // group date by subreddit
    const nestedBySubreddit = d3.nest()
        .key(function (d) {
            return d.subredditId;
        })
        .entries(posts);


    // draw lines which connect all subreddits with the same name
    nestedBySubreddit.forEach(function (d) {
        chartInnerGroup
            .append("path")
            .attr("d", line(d.values))
            .attr("stroke", function () {
                return colorScale(d.values[0].subreddit)
            });
    });

    // add circles
    const dataPoint = chartInnerGroup.selectAll("circle")
        .data(posts)
        .enter().append("circle")
        .attr("cx", function (d) {
            return xScale(d.postedDate);
        })
        .attr("cy", d => yScale(d.postsPerDay))
        .attr("r", 4)
        .style("fill", d => colorScale(d["subreddit"]));



    // Create tooltip
    const tooltip = d3.select("body").append("div").classed("tooltip", true);
    tooltip.style("visibility", "hidden");
    const dayFormatter = d3.timeFormat("%A, %d. %B %Y%");

    dataPoint
        .on("mouseover", function (d, i) {
            tooltip
                .html(`Subreddit: ${d["subreddit"]}<br/>`
                    + `Posts today: ${d.postsPerDay}<br/>`
                    + `Date: ${dayFormatter(d.postedDate)}<br/>`)
                .style("visibility", "visible")
                .style("left", (d3.event.pageX + 10) + "px")
                .style("top", (d3.event.pageY - 28) + "px");
        })
        .on("mouseout", function (d, i) {
            tooltip.style("visibility", "hidden")
        });

    // show post details on click
    dataPoint
        .on("click", function (d) {
            //todo: combine the two filters (date and subreddit) into one
            var postsToShow = postDetails.filter(function(post) {
                return  post.postedDate.getTime()  === d.postedDate.getTime();
            });
            postsToShow = postsToShow.filter(function(postsToShow) {
                return  postsToShow.subreddit  === d.subreddit;
            });

            d3.selectAll(".postsContainer").html("");
            postsToShow.forEach(
                function (d) {
                    d3.selectAll(".postsContainer")
                      .append("div")
                      .html(d.subreddit + ': ' + d.postedDate.toDateString() + '<br/>'
                          + d.title     + '<br/>'
                          );
                }
            );

        });


    chartInnerGroup.call(d3.zoom()
        .scaleExtent([1, 20])
        .translateExtent([[0, 0], [width, height]])
        .extent([[0, 0], [width, height]])
        .on("zoom",function () {
            chartInnerGroup.attr("transform",d3.event.transform);

    }));






}