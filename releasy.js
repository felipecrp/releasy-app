
class Releasy {
    constructor(releases, div) {
        this.div = d3.select(div);
        this.releases = releases//.slice(0,10)
        this.releases.sort((r1,r2) => r1.end.getTime() - r2.end.getTime())
        console.log(this.releases[0].name)
    }

    init() {
        let maxHIndex = 0;
        for (let i=0; i < this.releases.length; i++) {
            const release = this.releases[i];
            release.hindex = 0;
            release.hchurn = 0;
            let conv = true;
            while (conv) {
                conv = false;
                for (let j=0; j < this.releases.length; j++) {
                    const refRelease = this.releases[j];
                    if (i > j) {
                        if (release.start.getTime() <= refRelease.end.getTime()
                                && release.hindex == refRelease.hindex) {
                            release.hindex += 1    
                            conv = true
                        }
                    }
                }
            }
            // if (release.hindex > maxHIndex) {
            //     release.hindex = maxHIndex+1;
            //     maxHIndex += 1;
            // }
        }

        let r = new RelGraph(this.div, this.releases);
        r.draw();
    }
}

class RelGraph {
    
    constructor(div, releases) {
        this.releases = releases;
        this.svg = div.append("svg");
        this.releaseGrpBnd = this.svg.append('g')
            .classed('release', true)
            .classed('data', true);

        let size = this.size();
        
        this.xAxisGroup = this.svg
            .append("g")

        let zoom = d3.zoom()
            .extent([[0, 0], [size.width, 25]])
            .on("zoom", this.zoomed.bind(this))
        
        this.svg
            .append("rect")
            .attr("class", "zoom")
            .attr("width", size.width)
            .attr("height", 500)
            .call(zoom);
    }


    size() {
        let parent = this.svg.node().parentNode;
        let width = parent.clientWidth;
        let height = parent.clientHeight;

        if (width == 0) { width = 300; }
        if (height == 0) { height = 600; }
        height = 300;

        return { width: width, height: height }
    }

    draw() {
        let size = this.size();
        
        this.svg
            .attr("width", size.width)
            .attr("height", size.height);

        this.xScale = d3.scaleTime()
            .domain([this.releases[0].start, this.releases[this.releases.length-1].end])
            .range([0, size.width-1]);

        if (this.xZScale === undefined) { this.xZScale = this.xScale; }
        
        this.xAxis = d3.axisBottom()
            .scale(this.xZScale);
        this.xAxisGroup.call(this.xAxis);
        
        let churnScale = d3.scaleLinear()
            .domain([0, 500]) // d3.max(this.releases, (release) => release.churn)])
            .range([0, 100]);

        let releasesBnd = this.releaseGrpBnd.selectAll('rect.bar').data(this.releases);
        let newReleasesBnd = releasesBnd.enter()
            .append('rect')
                .classed('bar', true)
                .attr('y', (release) => 20 + 30*release.hindex)
                .attr('height', 25)
                .attr('data', (release) => release.name)
        releasesBnd.merge(newReleasesBnd)
            .attr('x', (data) => this.xZScale(data.start))
            .attr('width', (data) => this.xZScale(data.end) - this.xZScale(data.start))

        let labelsBnds = this.releaseGrpBnd.selectAll('text').data(this.releases);
        let newLabelsBnds = labelsBnds.enter()
            .append('text')
                .attr('y', (release) => 40 + 30*release.hindex)
                .attr('height', 25)
                .attr('data', (release) => release.name)
                .text((release) => release.name)
        labelsBnds.merge(newLabelsBnds)
            .attr('x', (data) => this.xZScale(data.start) + 5)
            .attr('width', (data) => this.xZScale(data.end) - this.xZScale(data.start))
    }

    zoomed() {
        let t = d3.event.transform;
        this.xZScale = t.rescaleX(this.xScale);
        // this.xAxis.scale(this.xZScale);
        // this.xAxisGroup.call(this.xZScale);
        console.log(t);
        this.draw();
    }
}

d3.json("data_ansible.json").then(function(data) {
    let releases = data;
    for (let release of releases) {
        release.start = new Date(release.start);
        release.end = new Date(release.end);
    }
    r = new Releasy(releases, "#ansible");
    r.init();
});

d3.json("data_brew.json").then(function(data) {
    let releases = data;
    for (let release of releases) {
        release.start = new Date(release.start);
        release.end = new Date(release.end);
    }
    r = new Releasy(releases, "#brew");
    r.init();
});


