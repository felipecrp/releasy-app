
class Releasy {
    constructor(releases, div) {
        div = d3.select(div);
        div.attr('class', 'releasy');
        releases = releases.sort(function(r1,r2) {
            let v1 = r1.name.match(/([0-9]+)\.([0-9]+)/);
            let v2 = r1.name.match(/([0-9]+)\.([0-9]+)/);
            let major1 = parseInt(v1[0]);
            let major2 = parseInt(v2[0]);
            let minor1 = parseInt(v1[0]);
            let minor2 = parseInt(v2[0]);
            if (major1 > major2 || (major1 == major2 && minor1 > minor2)) {
                return -1;
            } else {
                return 1;
            }
        });
    
        const featureRls = [];
        const features = {};
        const patches = {};      
        const position = {};
        let nextPosition = 0;
        for (let i=0; i < releases.length; i++) {
            const release = releases[i];
            const featureVersion = release.name.match(/([0-9]+\.[0-9]+)/)[0];

            if (features[featureVersion] === undefined) {
                features[featureVersion] = {
                    pIndex: nextPosition,
                    maintenance: {},
                    patches: []
                }
                nextPosition++;

                features[featureVersion]['name'] = featureVersion + ".x";
                features[featureVersion]['type'] = release.type;
                features[featureVersion]['start'] = release.start;
                featureRls.push(features[featureVersion]);
            }

            if (release.type == 'MAJOR' || release.type == 'MINOR') {
                features[featureVersion]['start'] = release.start;
                features[featureVersion]['end'] = release.end;
                features[featureVersion]['type'] = release.type;
                
            } else if (release.type == 'PATCH') {
                if (features[featureVersion]['maintenance']['start'] === undefined) {
                    features[featureVersion]['maintenance']['start'] = release.start;
                    features[featureVersion]['maintenance']['end'] = release.end;
                } else if (features[featureVersion]['maintenance']['start'].getTime() >  release.start) {
                    features[featureVersion]['maintenance']['start'] = release.start;
                } else if (features[featureVersion]['maintenance']['end'].getTime() <  release.end) {
                    features[featureVersion]['maintenance']['end'] = release.end;
                }
                features[featureVersion]['patches'].push(release);
            }
        }

        let gantt = new ReleasyGantt(div.append('div'), featureRls);
    }
}

/**
 * Main class that handles 
 */
class ReleasyChart {

    constructor(div) {
        div.attr('class', 'gantt');
        this.svg = div.append("svg");
    }

    size() {
        let parent = this.svg.node().parentNode;
        let width = parent.clientWidth;
        let height = parent.clientHeight;

        if (width == 0) { width = 300; }
        if (height == 0) { height = 600; }

        return { width: width, height: height }
    }

    resize() {
        let size = this.size();

        this.svg
            .attr("width", size.width)
            .attr("height", size.height);

        return size;
    }
}

class ReleasyGantt extends ReleasyChart {
    constructor(div, featureRls) {
        super(div);
        this.featureRls = featureRls;
        let size = this.size();

        this.featureRlsGrp = this.svg.append('g')
            .classed('featureRls', true)

        this.patchRlsGrp = this.svg.append('g')
            .classed('patchRls', true)

        this.gridGrp = this.svg.append('g')
            .classed('grid', true)

        // Axis
        this.xAxisGrp = this.svg.append("g")
            .attr('transform','translate(0,20)');
        this.xScale = d3.scaleTime()
            .domain([this.featureRls[0].start, this.featureRls[this.featureRls.length-1].end])
            .range([50, size.width-1]);
        this.xZScale = this.xScale;

        this.yScale = d3.scaleLinear()
            .domain([0,10])
            .range([35, size.height]);
        this.yZScale = this.yScale;

        // Zoom
        let xZoom = d3.zoom()
            .extent([[50, 0], [size.width, 20]])
            .on("zoom", this.xZoom.bind(this))

        this.svg
            .append("rect")
            .attr("class", "zoom")
            .attr("width", size.width)
            .attr("height", 25)
            .call(xZoom);

        let yZoom = d3.zoom()
            .extent([[0, 0], [50, size.height]])
            .on("zoom", this.yZoom.bind(this))

        this.svg
            .append("rect")
            .attr("class", "zoom")
            .attr("width", 50)
            .attr("height", size.height)
            .call(yZoom);

        this.draw();
    }

    draw() {
        let size = super.resize();

        this.xAxis = d3.axisTop().scale(this.xZScale);
        this.xAxisGrp.call(this.xAxis);

        // Grids
        let gridBnd = this.gridGrp.selectAll('line').data(this.featureRls);
        let newGridBnd = gridBnd.enter().append('line');
        gridBnd.merge(newGridBnd)
            .attr('y1', (rls) => this.yZScale(0) -3 + 25*rls.pIndex)
            .attr('y2', (rls) => this.yZScale(0) -3 + 25*rls.pIndex)
            .attr('x1', -1)
            .attr('x2', size.width+2);

        // Feature releases
        let featureRlsBnd = this.featureRlsGrp.selectAll('rect').data(this.featureRls);
        let newFeatureRlsBnd = featureRlsBnd.enter().append('rect')
            .attr('height', 20)
            .classed('major', (rls) => rls.type == 'MAJOR')
            .classed('minor', (rls) => rls.type == 'MINOR');
        featureRlsBnd.merge(newFeatureRlsBnd)
            .attr('x', (rls) => this.xZScale(rls.start))
            .attr('y', (rls) => this.yZScale(0) + 25*rls.pIndex)
            .attr('width', (rls) => this.xZScale(rls.end) - this.xZScale(rls.start));

        // Feature releases labels
        let featureRlsLbBnd = this.featureRlsGrp.selectAll('text').data(this.featureRls);
        let newFeaturesRlsLbBnd = featureRlsLbBnd.enter().append('text')
            .attr('alignment-baseline', 'middle')
            .text((rls) => rls.name);
        featureRlsLbBnd.merge(newFeaturesRlsLbBnd)
            .attr('y', (rls) => this.yZScale(0) + 10 + 25*rls.pIndex)
            .attr('x', 5)

        // Maintenance period
        let patchRlsBnd = this.patchRlsGrp.selectAll('rect').data(this.featureRls);
        let newPatchRlsBnd = patchRlsBnd.enter().append('rect')
            .attr('height', 10);
        patchRlsBnd.merge(newPatchRlsBnd)
            .attr('x', (rls) => this.xZScale(rls.maintenance.start))
            .attr('y', (rls) => this.yZScale(0) + 5 + 25*rls.pIndex)
            .attr('width', (rls) => this.xZScale(rls.maintenance.end) - this.xZScale(rls.maintenance.start));
    }

    xZoom() {
        let t = d3.event.transform;
        this.xZScale = t.rescaleX(this.xScale);
        this.draw();
    }

    yZoom() {
        let t = d3.event.transform;
        this.yZScale = t.rescaleY(this.yScale);
        console.log(t)
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

class RelGraphOld {
    
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


d3.json("data_ansible.json").then(function(data) {
    let releases = data;
    for (let release of releases) {
        release.start = new Date(release.start);
        release.end = new Date(release.end);
    }
    r = new Releasy(releases, "#ansible");
});

d3.json("data_brew.json").then(function(data) {
    let releases = data;
    for (let release of releases) {
        release.start = new Date(release.start);
        release.end = new Date(release.end);
    }
    r = new Releasy(releases, "#brew");
});

d3.json("data_electron.json").then(function(data) {
    let releases = data;
    for (let release of releases) {
        release.start = new Date(release.start);
        release.end = new Date(release.end);
    }
    r = new Releasy(releases, "#electron");
});


