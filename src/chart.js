// Create svg canvas
    var canvHeight = 612, canvWidth = window.innerWidth / 2 ||
        document.documentElement.clientWidth / 2 ||
        document.body.clientWidth / 2;
    if (canvWidth < 612) canvWidth = 612;

    var svg = d3.select("#svg-container").append("svg")
        .attr("width", canvWidth)
        .attr("height", canvHeight)
        //.style("border", "1px solid");

// Calculate the width and height depending on margins.
    var margin = {top: 50, right: 80, bottom: 120, left: 100};
    var width = canvWidth - margin.left - margin.right;
    var height = canvHeight - margin.top - margin.bottom;

// Create the chart title
    svg.append("text")
        .attr("y", 0)
        .attr("x", margin.left)
        .attr("dy", "1.5em")
        .attr("font-family", "sans-serif")
        .attr("font-size", "24px")
        .style("text-anchor", "left")
        .text("Most active subreddits per day");

    d3.queue()
        .defer(d3.json, "./data/posts.json")
        .defer(d3.json, "./data/postDetails.json")
        .await(analyze);

    function analyze(error, posts, postDetails) {
        if (error) {
            console.log(error);
        }

        // Define the color scale
        const colorScale = d3.scaleOrdinal()
            .domain(function (d) {
                return d.subreddit;
            })
            .range(["#22e67a", "#e509ae", "#9dabfa", "#437e8a", "#b21bff", "#ff7b91", "#94aa05", "#ac5906", "#82a68d", "#fe6616", "#7a7352", "#f9bc0f", "#b65d66", "#07a2e6", "#c091ae", "#8a91a7", "#88fc07", "#ea42fe", "#9e8010", "#10b437", "#c281fe", "#f92b75", "#07c99d", "#a946aa", "#bfd544", "#16977e", "#ff6ac8", "#a88178", "#5776a9", "#678007", "#fa9316", "#85c070", "#6aa2a9", "#989e5d", "#fe9169", "#cd714a", "#6ed014", "#c5639c", "#c23271", "#698ffc", "#678275", "#c5a121", "#a978ba", "#ee534e", "#d24506", "#59c3fa", "#ca7b0a", "#6f7385", "#9a634a", "#48aa6f", "#ad9ad0", "#d7908c", "#6a8a53", "#8c46fc", "#8f5ab8", "#fd1105", "#7ea7cf", "#d77cd1", "#a9804b", "#0688b4", "#6a9f3e", "#ee8fba", "#a67389", "#9e8cfe", "#bd443c", "#6d63ff", "#d110d5", "#798cc3", "#df5f83", "#b1b853", "#bb59d8", "#1d960c", "#867ba8", "#18acc9", "#25b3a7", "#f3db1d", "#938c6d", "#936a24", "#a964fb", "#92e460", "#a05787", "#9c87a0", "#20c773", "#8b696d", "#78762d", "#e154c6", "#40835f", "#d73656", "#1afd5c", "#c4f546", "#3d88d8", "#bd3896", "#1397a3", "#f940a5", "#66aeff", "#d097e7", "#fe6ef9", "#d86507", "#8b900a", "#d47270", "#e8ac48", "#cf7c97", "#cebb11", "#718a90", "#e78139", "#ff7463", "#bea1fd"]);

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
        var xScale = d3.scaleTime().range([0, width]).domain(dateDomain).nice();
        var yScale = d3.scaleLinear().rangeRound([height, 0]).domain(postsDomain).nice();

        // Create xAxis
        var xAxis = d3.axisBottom(xScale);
        var yAxis = d3.axisLeft(yScale);

        // see also https://github.com/d3/d3-brush
        var brush = d3.brush()
                .on("end", brushended),
            idleTimeout,
            idleDelay = 350;

        // Brush d3 v4 bug : brush area size cannot be modified, here the rect
        // created by brush is altered manually
        // https://stackoverflow.com/questions/48815355/d3-js-v4-brushy-cant-change-overlay-width
        svg.selectAll("rect")
            .attr("width", width)
            .attr("height", height);

        svg.append("g")
            .attr("class", "axis axis--x")
            .attr("transform", "translate(" + margin.left + "," + (height + margin.top) + ")")
            .call(xAxis
                .tickFormat(d3.timeFormat("%Y-%m-%d")))
            .selectAll("text")
            .style("text-anchor", "end")
            .attr("dx", "-.8em")
            .attr("dy", ".15em")
            .attr("transform", "rotate(-65)");

        svg.append("g")
            .attr("class", "axis axis--y")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
            .call(yAxis);

        var xAxisWidth = svg.selectAll("g.axis--x").selectAll("path.domain").node().getBoundingClientRect();
        var yAxisHeight = svg.selectAll("g.axis--y").selectAll("path.domain").node().getBoundingClientRect();

        // Middle layer is needed as a hacky fix for Chrome and Edge misinterpreting
        // transform - translate with nested svg elements
        var middleLayer = svg.append("g")
            .attr("width", xAxisWidth.width)
            .attr("height", yAxisHeight.height - 3)
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        var focus = middleLayer.append("svg")
            .attr("width", xAxisWidth.width)
            .attr("height", yAxisHeight.height - 3)
            .attr("class", "focus");

        // Brush area
        focus.append("g")
            .attr("class", "brush")
            .call(brush);

        // Text label for the y axis
        svg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", margin.left / 3)
            .attr("x", -(height / 2) - margin.top)
            .attr("dy", "1em")
            .attr("font-family", "sans-serif")
            .style("text-anchor", "middle")
            .text("Posts per day");

        // Text label for the x axis
        svg.append("text")
            .attr("x", width / 2 + margin.left)
            .attr("y", height + margin.bottom)
            .attr("dy", "1em")
            .attr("font-family", "sans-serif")
            .style("text-anchor", "middle")
            .text("Date");

        // Group date by subreddit
        var nestedBySubreddit = d3.nest()
            .key(function (d) {
                return d.subredditId;
            })
            .entries(posts);

        // Create line generator
        const line = d3.line()
            .x(function (d) {
                return xScale(d.postedDate);
            })
            .y(function (d) {
                return yScale(d.postsPerDay);
            })
            //.curve(d3.curveCardinal)
        ;

        // draw lines which connect all subreddits with the same name
        nestedBySubreddit.forEach(function (d) {
            focus
                .append("path")
                .attr("class", "connectorLine")
                .attr("d", line(d.values))
                .attr("stroke", function () {
                    return colorScale(d.values[0].subreddit)
                });
        });

        // Add circles to main chart
        var circlesChart = focus.selectAll("circle.circlesChart")
            .data(posts)
            .enter().append("circle")
            .attr("class", "circlesChart")
            .attr("cx", d => xScale(d.postedDate))
            .attr("cy", d => yScale(d.postsPerDay))
            .attr("r", 4)
            .style("fill", d => colorScale(d["subreddit"]))
        ;

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
                tooltip.style("visibility", "hidden");
            });


        // Show post details on click
        circlesChart
            .on("click", function (d) {
                var postsToShow = postDetails.filter(function (post) {
                    return post.subreddit === d.subreddit;
                });
                console.log(d);


                var minX = xScale.domain()[0].getTime();
                var maxX = xScale.domain()[1].getTime();
                var minY = yScale.domain()[0];
                var maxY = yScale.domain()[1];

                focus.selectAll("circle.circlesChart")
                    .attr("r", 4)
                    .style("stroke", "none")
                    .style("opacity", 0.3)
                    ;

                focus.selectAll("circle.circlesChart").transition().duration(750)
                    .filter(d => d.subreddit === postsToShow[0].subreddit)
                    .attr("r", 6)
                    .style("opacity", 1)
                ;

                d3.select(this)
                    .style("stroke", "black")
                    .style("stroke-width", 2);


                postsToShow = postsToShow.filter(function (postsToShow) {
                    return postsToShow.postedDate.getTime() === d.postedDate.getTime();
                });


                // Clear Container before displaying new data
                d3.selectAll(".postsContainer").html("");

                d3.selectAll(".postsContainer")
                    .append("div")
                    .html('<h1 class="">Top 3 upvoted posts on /r/' + d.subreddit + '</h1><br>'
                        + '<h2 class="date">' + dayFormatter(d.postedDate) + '</h2>'
                    );

                postsToShow.forEach(
                    function (d) {
                        d3.selectAll(".postsContainer")
                            .append("div")
                            .attr("class", "postItem")
                            .html(function () {
                                if (d.thumbnail === "self" || d.thumbnail === "default" || d.thumbnail === "nsfw") {
                                    return '';
                                }
                                else {
                                    return '<a href="https://www.reddit.com/' + d.permalink + '" target="_blank"><img class="postThumbnail" src="' + d.thumbnail + '"></a>';
                                }
                            })
                            .append("div")
                            .attr("class", "postBody")
                            .html(
                                '<p class="postText"> <span class="postAuthor">Author: </span>' + '<a href="https://www.reddit.com/user/' + d.author + '" target="_blank">' + d.author + '</a><br/>'
                                + ' <span class="postPoints">Points: </span>' + d.score + '<br/>'
                                + d.title + '<br/>'
                                + '<a href="https://www.reddit.com/' + d.permalink + '" target="_blank"><i class="fa fa-external-link topright"></i></a></p>'
                            );
                    }
                );
            });

        //method brushended() Source: https://bl.ocks.org/mbostock/f48fcdb929a620ed97877e4678ab15e6
        function brushended() {
            var s = d3.event.selection;
            if (!s) {
                if (!idleTimeout) return idleTimeout = setTimeout(idled, idleDelay);
                xScale.domain(dateDomain).nice(10);
                yScale.domain(postsDomain).nice(10);
                focus.selectAll("circle")
                    .attr("r", 4)
                    .style("stroke", "none")
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
                .attr("transform", "rotate(-65)");

            svg.select(".axis--y").transition(t).call(yAxis);

            var minX = xScale.domain()[0].getTime();
            var maxX = xScale.domain()[1].getTime();
            var minY = yScale.domain()[0];
            var maxY = yScale.domain()[1];

            focus.selectAll("circle.circlesChart").transition(t)
                .attr("cx", function (d) {
                    return xScale(d.postedDate);
                })
                .attr("cy", d => yScale(d.postsPerDay))
                .style("opacity", function (d) {
                    if (d.postedDate.getTime() < minX
                        || d.postedDate.getTime() > maxX
                        || d.postsPerDay < minY
                        || d.postsPerDay > maxY)
                        return 0;
                    else return 1
                });

            focus.selectAll("path.connectorLine").remove();
            setTimeout(function () {
                nestedBySubreddit.forEach(function (d) {
                    focus
                        .append("path").transition(t)
                        .attr("class", "connectorLine")
                        .attr("d", line(d.values))
                        .attr("stroke", function () {
                            return colorScale(d.values[0].subreddit)
                        })
                });
            }, 1000);
        }

}