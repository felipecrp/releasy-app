
class Releasy {
    constructor(releases, div) {
        this.div = d3.select(div);
        this.releases = releases//.slice(0,10)
        this.releases.sort((r1,r2) => r1.end.getTime() - r2.end.getTime())
        console.log(this.releases[0].name)
    }

    calcPos() {
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
        }
    }

    init() {
        this.patchesGroup = {};
        let nextPos = 0;
        const releasePos = {}
        const releaseLength = {}
        for (let i=0; i < this.releases.length; i++) {
            const release = this.releases[i];
            const mmVer = release.name.match(/([0-9]+\.[0-9]+)/)[0];
            if (releasePos[mmVer] === undefined) {
                releasePos[mmVer] = nextPos;
                nextPos++;
            } 
            release.hindex = releasePos[mmVer];

            if (this.patchesGroup[mmVer] === undefined) {
                this.patchesGroup[mmVer] = {}
            }
            if (release.type == 'PATCH') {
                if (this.patchesGroup[mmVer]['start'] === undefined) {
                    this.patchesGroup[mmVer]['start'] = release.start;
                    this.patchesGroup[mmVer]['end'] = release.end;
                    this.patchesGroup[mmVer]['hindex'] = release.hindex;
                    this.patchesGroup[mmVer]['name'] = mmVer;
                } else {
                    if (release.start.getTime() < this.patchesGroup[mmVer]['start'].getTime()) {
                        this.patchesGroup[mmVer]['start'] = release.start;
                    }
                    if (release.end.getTime() > this.patchesGroup[mmVer]['end'].getTime()) {
                        this.patchesGroup[mmVer]['end'] = release.start;
                    }
                }
            }
        }
        this.patchesGroup = Object.keys(this.patchesGroup).map(key => this.patchesGroup[key]);

        let relCfd = this.div.append('div');
        let relGraph = this.div.append('div');
        let relGraph2 = this.div.append('div');
        let relTimeLine = this.div.append('div')

        let graph = new RelGraph(relGraph, this.releases);
        graph.draw();

        let graph2 = new RelGraph2(relGraph2, this.releases, this.patchesGroup);
        graph2.draw();

        //let cfd = new RelCfd(relCfd, this.releases);

        //let relTime = new RelTimeLine(relTimeLine, this.releases);
        //relTime.draw();
    }
}

class RelCfd {
    constructor(div, releases) {
        this.releases = releases;
        this.svg = div.append('svg');

        let parent = this.svg.node().parentNode;
        let width = parent.clientWidth;
        let height = parent.clientHeight;

        if (width == 0) { width = 300; }
        if (height == 0) { height = 600; }
        height = 200;

        let size = { width: width, height: height };
        this.svg
            .attr('width', width)
            .attr('height', height)

        this.endSerie = [];
        let churn = 0;
        this.releases = this.releases.sort((r1,r2) => r1.end.getTime() - r2.end.getTime());
        for (let i=0; i < releases.length; i++) {
            let release = releases[i];
            churn += release.churn;
            this.endSerie.push({ time: release.end, churn: churn })
        }
            
        this.startSerie = [];
        churn = 0 
        this.releases = this.releases.sort((r1,r2) => r1.start.getTime() - r2.start.getTime());
        for (let i=0; i < releases.length; i++) {
            let release = releases[i];
            churn += release.churn;
            this.startSerie.push({ time: release.start, churn: churn })
        }
        
        this.yScale = d3.scaleLinear()
            .domain([0, churn])
            .range([size.height, 0]);

        this.xScale = d3.scaleTime()
            .domain([this.releases[0].start, this.releases[this.releases.length-1].end])
            .range([0, size.width-1]);

        this.line = d3.line()
            .x((d) => this.xScale(d.time)) 
            .y((d) => this.yScale(d.churn))
            .curve(d3.curveMonotoneX)

        this.draw();
    }

    draw() {
        let lnStart = this.svg.append("path")
            .datum(this.startSerie)
            .attr("class", "line")
            .attr("d", this.line)
            .attr("class", 'start');


        let lnEnd = this.svg.append("path")
            .datum(this.endSerie)
            .attr("class", "line")
            .attr("d", this.line)
            .attr("class", 'end');
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
        height = 350;

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
                .attr('class', (release) => release.type)
                .classed('bar', true)
                .attr('y', (release) => 20 + 20*release.hindex)
                .attr('height', 15)
                .attr('data', (release) => release.name)
        releasesBnd.merge(newReleasesBnd)
            .attr('x', (data) => this.xZScale(data.start))
            .attr('width', (data) => this.xZScale(data.end) - this.xZScale(data.start))

        let labelsBnds = this.releaseGrpBnd.selectAll('text').data(this.releases);
        let newLabelsBnds = labelsBnds.enter()
            .append('text')
                .attr('y', (release) => 40 + 20*release.hindex)
                .attr('height', 15)
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

class RelGraph2 {
    
    constructor(div, releases, patchesGroup) {
        this.releases = releases;
        this.patchesGroup = patchesGroup;
        this.svg = div.append("svg");
        this.releaseGrpBnd = this.svg.append('g')
            .classed('release', true)
            .classed('data', true);
        this.patchesGrpBnd = this.svg.append('g')
            .classed('patches', true)
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
        height = 400;

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

        let releasesBnd = this.releaseGrpBnd.selectAll('rect.bar').data(this.releases.filter(obj => obj.type != 'PATCH'));
        let newReleasesBnd = releasesBnd.enter()
            .append('rect')
                .classed('bar', true)
                .attr('y', (release) => 20 + 20*release.hindex)
                .attr('height', 15)
                .attr('data', (release) => release.name)
        releasesBnd.merge(newReleasesBnd)
            .attr('x', (data) => this.xZScale(data.start))
            .attr('width', (data) => this.xZScale(data.end) - this.xZScale(data.start))

        let patchesBnd = this.patchesGrpBnd.selectAll('rect.bar').data(this.patchesGroup);
        let newPatchesBnd = patchesBnd.enter()
            .append('rect')
                .classed('bar', true)
                .attr('y', (data) => 20 + 20*data.hindex)
                .attr('height', 15)
                .attr('data', (data) => data.name)
        patchesBnd.merge(newPatchesBnd)
            .attr('x', (data) => this.xZScale(data.start))
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

class RelTimeLine {
    constructor(div, releases) {
        this.releases = releases;
        this.svg = div.append("svg");
        this.releaseGrpBnd = this.svg.append('g')
            .classed('release', true)
            .classed('data', true)
            .attr('transform', 'translate(0,25)');

        let size = this.size();
        
        this.startAxisGroup = this.svg
            .append('g')
            .attr('transform', 'translate(0,225)')
        this.endAxisGroup = this.svg
            .append('g')
            .attr('transform', 'translate(0,25)')
    }

    size() {
        let parent = this.svg.node().parentNode;
        let width = parent.clientWidth;
        let height = parent.clientHeight;

        if (width == 0) { width = 300; }
        if (height == 0) { height = 600; }
        height = 250;

        return { width: width, height: height }
    }

    draw() {
        let size = this.size();
        
        this.svg
            .attr("width", size.width)
            .attr("height", 200);

        this.xScale = d3.scaleTime()
            .domain([this.releases[0].start, this.releases[this.releases.length-1].end])
            .range([0, size.width-1]);

        if (this.xZScale === undefined) { this.xZScale = this.xScale; }
        
        let startAxis = d3.axisBottom()
            .scale(this.xZScale);

        let endAxis = d3.axisTop()
            .scale(this.xZScale);
        
        this.startAxisGroup.call(startAxis);
        this.endAxisGroup.call(endAxis);

        let bind = this.releaseGrpBnd.selectAll('line').data(this.releases)

        bind.enter()
            .append('line')
            .attr('x1', (data) => this.xZScale(data.start))
            .attr('y1', 200)
            .attr('x2', (data) => this.xZScale(data.end))
            .attr('y2', 0);

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

d3.json("data_electron.json").then(function(data) {
    let releases = data;
    for (let release of releases) {
        release.start = new Date(release.start);
        release.end = new Date(release.end);
    }
    r = new Releasy(releases, "#electron");
    r.init();
});


