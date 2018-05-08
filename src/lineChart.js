// Create svg canvas
const canvHeight = 600, canvWidth = 800;
const svg = d3.select("body").append("svg")
    .attr("width", canvWidth)
    .attr("height", canvHeight)
    .style("border", "1px solid");

// Calculate the width and height depending on margins.
const margin = {top: 50, right: 80, bottom: 120, left: 100};
const width = canvWidth - margin.left - margin.right;
const height = canvHeight - margin.top - margin.bottom;

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
    const dateDomain = d3.extent(posts, function (d) {return d.postedDate; });
    const postsDomain = d3.extent(posts, d => Number(d.postsPerDay));
    // Create scales for x and y direction
    var xScale =           d3.scaleTime()  .range([0, width])                .domain(dateDomain) .nice(10);
    var yScale =           d3.scaleLinear().rangeRound([height, 0])          .domain(postsDomain).nice(10);


    // Create xAxis
    var xAxis = d3.axisBottom(xScale);
    var yAxis = d3.axisLeft(yScale);

    // see also https://github.com/d3/d3-brush
    var brush = d3.brush()
        .on("end", brushended),
        idleTimeout,
        idleDelay = 350
    ;

    var focus = svg.append("g")
        .attr("class", "focus")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
        ;

    // Brush area
    focus.append("g")
        .attr("class", "brush")
        .call(brush)
    ;

    // Brush d3 v4 bug : brush area size cannot be modified, here the rect
    // created by brush is altered manually
    // https://stackoverflow.com/questions/48815355/d3-js-v4-brushy-cant-change-overlay-width
    svg.selectAll("rect")
        .attr("width", width)
        .attr("height", height)
    ;

    focus.append("g")
        .attr("class", "axis axis--x")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis
            .tickFormat(d3.timeFormat("%Y-%m-%d")))
        .selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", ".15em")
        .attr("transform", "rotate(-65)");
/*
        .selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", ".15em")
        .attr("transform", "rotate(-65)")
  */
    ;

    focus.append("g")
        .attr("class", "axis axis--y")
        .call(yAxis);

    // Text label for the y axis
    focus.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - margin.left / 1.5)
        .attr("x", 0 - (height / 2))
        .attr("dy", "1em")
        .attr("font-family", "sans-serif")
        .style("text-anchor", "middle")
        .text("Posts per day");

    // Text label for the x axis
    focus.append("text")
        .attr("y", height + margin.bottom / 1.5)
        .attr("x", width / 2)
        .attr("dy", "1em")
        .attr("font-family", "sans-serif")
        .style("text-anchor", "middle")
        .text("Date")
    ;
    // Group date by subreddit
    var nestedBySubreddit = d3.nest()
        .key(function (d) {return d.subredditId;})
        .entries(posts);

    //create line generator
    const line = d3.line()
        .x(function (d) {return xScale(d.postedDate);})
        .y(function (d) {return yScale(d.postsPerDay);})
        .curve(d3.curveCardinal)
    ;

    // draw lines which connect all subreddits with the same name
    nestedBySubreddit.forEach(function (d) {
        focus
            .append("path")
            .attr("d",line(d.values))
            .attr("stroke", function (){return colorScale(d.values[0].subreddit)});
    });

    // Add circles to main chart
    var circlesChart = focus.selectAll("circle.circlesChart")
        .data(posts)
        .enter().append("circle")
            .attr("class", "circlesChart")
            .attr("cx", d => xScale(d.postedDate))
            .attr("cy", d => yScale(d.postsPerDay))
            .attr("r", 4)
            .style("fill", d => colorScale(d["subreddit"]));

    // Create tooltip
    const tooltip = d3.select("body").append("div").classed("tooltip", true);
    tooltip.style("visibility", "hidden");
    const dayFormatter = d3.timeFormat("%A, %d. %B %Y%");

    circlesChart
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

    // Show post details on click
    circlesChart
        .on("click", function (d) {
            var postsToShow = postDetails.filter(function(post) {
                return  post.subreddit  === d.subreddit;
            });

            var minX =  xScale.domain()[0].getTime();
            var maxX =  xScale.domain()[1].getTime();
            var minY =  yScale.domain()[0];
            var maxY =  yScale.domain()[1];

            focus.selectAll("circle.circlesChart")
                .attr("r", 4)
                .style("opacity", function(d){
                if(    d.postedDate.getTime() < minX
                    || d.postedDate.getTime() > maxX
                    || d.postsPerDay          < minY
                    || d.postsPerDay          > maxY)
                    return 0;
                else return 0.3
            });

            focus.selectAll("circle.circlesChart").transition().duration(750)
                .filter(d => d.subreddit === postsToShow[0].subreddit)
                .attr("r", 6)
                .style("opacity", function(d){
                    if(    d.postedDate.getTime() < minX
                        || d.postedDate.getTime() > maxX
                        || d.postsPerDay          < minY
                        || d.postsPerDay          > maxY)
                        return 0;
                    else return 1
                });


            postsToShow = postsToShow.filter(function(postsToShow) {
                return  postsToShow.postedDate.getTime()  === d.postedDate.getTime();
            });


            // Clear Container before displaying new data
            d3.selectAll(".postsContainer").html("");

            d3.selectAll(".postsContainer")
                .append("div")
                .html('<h1 class="">Top 3 upvoted posts on ' + d.subreddit + '</h1><br>'
                + '<h2 class="date">' + dayFormatter(d.postedDate) + '</h2>'
                );

            postsToShow.forEach(
                function (d) {
                    d3.selectAll(".postsContainer")
                      .append("div")
                        .attr("class", "postItem")
                      .html(function() {
                          if (d.thumbnail === "self" || d.thumbnail === "default" || d.thumbnail === "nsfw") {
                              return '';
                          }
                          else {
                              return '<a href="https://www.reddit.com/' + d.permalink + '" target="_blank"><img class="postThumbnail" src="' + d.thumbnail + '"></a>';
                          }})
                        .append("div")
                        .attr("class", "postBody")
                        .html(
                              '<p class="postText"> <span class="postAuthor">Author: </span>' + '<a href="https://www.reddit.com/user/' + d.author + '" target="_blank">' + d.author + '</a><br/>' +
                            ' <span class="postPoints">Points: </span>' + d.score + '<br/>'
                              + d.title + '<br/>' +
                              '<a href="https://www.reddit.com/' + d.permalink + '" target="_blank"><i class="fa fa-external-link topright"></i></a></p>'
                          );

                }
            );
        });

    //Source: https://bl.ocks.org/mbostock/f48fcdb929a620ed97877e4678ab15e6
    function brushended() {
        var s = d3.event.selection;
        if (!s) {
            if (!idleTimeout) return idleTimeout = setTimeout(idled, idleDelay);
            xScale.domain(dateDomain).nice(10);
            yScale.domain(postsDomain).nice(10);
            focus.selectAll("circle")
                .attr("r", 4)
        } else {
            xScale.domain([s[0][0], s[1][0]].map(xScale.invert, xScale));
            yScale.domain([s[1][1], s[0][1]].map(yScale.invert, yScale));
            svg.select(".brush").call(brush.move, null);
        }
        zoom();
    }

    function idled() {
        idleTimeout = null;
    }

    function zoom() {
        var t = svg.transition().duration(750);
        svg.select(".axis--x").transition(t).call(xAxis)
            .selectAll("text")
            .style("text-anchor", "end")
            .attr("dx", "-.8em")
            .attr("dy", ".15em")
            .attr("transform", "rotate(-65)");;
        svg.select(".axis--y").transition(t).call(yAxis);

        var minX =  xScale.domain()[0].getTime();
        var maxX =  xScale.domain()[1].getTime();
        var minY =  yScale.domain()[0];
        var maxY =  yScale.domain()[1];

        focus.selectAll("circle.circlesChart").transition(t)
            .attr("cx", function(d) {
                return xScale(d.postedDate);
            })
            .attr("cy", d => yScale(d.postsPerDay))
            .style("opacity", function(d){
                if(    d.postedDate.getTime() < minX
                    || d.postedDate.getTime() > maxX
                    || d.postsPerDay          < minY
                    || d.postsPerDay          > maxY)
                    return 0;
                else return 1
            });
        ;

        focus.selectAll("path").remove();

        nestedBySubreddit.forEach(function (d) {
            focus
                .append("path").transition(t)
                .attr("d",line(d.values))
                .attr("stroke", function (){return colorScale(d.values[0].subreddit)});
        });
    }
}
