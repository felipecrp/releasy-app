
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

        let ganttDiv = div.append('div');
        let detailDiv = div.append('div');

        let rDetail = new ReleasyDetail(detailDiv);
        let rGantt = new ReleasyGantt(ganttDiv, featureRls, [rDetail]);
    }
}

/**
 * Main class that handles 
 */
class ReleasyChart {

    constructor(div) {
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
    constructor(div, featureRls, events) {
        super(div);
        div.attr('class', 'gantt');
        this.featureRls = featureRls;
        this.events = events;
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
            .range([50, size.width-20]);
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
            .classed('minor', (rls) => rls.type == 'MINOR')
            .on('click', select)

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

        let self = this;
        function select(rls) {
            let a = self.featureRlsGrp.select('rect');
            self.featureRlsGrp.selectAll('rect').classed('selected', false);
            d3.select(this).classed('selected', true);
            for (event of self.events) {
                event.update(rls);    
            }
        }
    }

    xZoom() {
        let t = d3.event.transform;
        this.xZScale = t.rescaleX(this.xScale);
        this.draw();
    }

    yZoom() {
        let t = d3.event.transform;
        this.yZScale = t.rescaleY(this.yScale);
        this.draw();
    }
}

class ReleasyDetail extends ReleasyChart {
    constructor(div, featureRl, rDetail) {
        super(div);
        div.attr('class', 'detail');
        this.rDetail = rDetail;

        this.featureRlsGrp = this.svg.append('g')
            .classed('featureRls', true)

        this.patchRlsGrp = this.svg.append('g')
            .classed('patchRls', true)

        
        this.patchRlsTmGrp = this.svg.append('g')
            .classed('patchRls', true)

        // Axis
        this.xAxisGrp = this.svg.append("g")
            .attr('transform','translate(0,120)');
        this.x2AxisGrp = this.svg.append("g")
            .attr('transform','translate(0,220)');
    }
    
    update(rls) {
        this.rls = rls;
        let size = this.size()

        let start = Math.min(rls.maintenance.start, rls.end);
        this.xScale = d3.scaleTime()
            .domain([start, this.rls.maintenance.end])
            .range([50, size.width-20]);
        this.xZScale = this.xScale;

        let nodes = Array.from(rls.patches);
        nodes.push(rls);
        var simulation = d3.forceSimulation(nodes)
            .force('x', d3.forceX().x(rls => this.xZScale(rls.end)).strength(0.9))
            .force('y', d3.forceY().y(50).strength(0.8))
            .force('collision', d3.forceCollide().radius(25).strength(0.4))
            .on('tick', this.draw.bind(this));
    }

    draw() {
        let size = super.resize();

        this.xAxis = d3.axisTop().scale(this.xZScale);
        this.xAxisGrp.call(this.xAxis);

        this.x2Axis = d3.axisBottom().scale(this.xZScale);
        this.x2AxisGrp.call(this.x2Axis);


        let featureRlsTmBnd = this.featureRlsGrp.selectAll('line').data([this.rls]);
        let newFeatureRlsTmBnd = featureRlsTmBnd.enter().append('line')
        featureRlsTmBnd.merge(newFeatureRlsTmBnd)
            .classed('major', (rls) => rls.type == 'MAJOR')
            .classed('minor', (rls) => rls.type == 'MINOR')
            .attr('x1', rls => rls.x)
            .attr('y1', rls => rls.y)
            .attr('x2', rls => this.xZScale(rls.end))
            .attr('y2', 120)
        featureRlsTmBnd.exit().remove();

        let patchRlsTmBnd = this.patchRlsGrp.selectAll('line').data(this.rls.patches);
        let newPatchRlsTmBnd = patchRlsTmBnd.enter().append('line')
            .classed('patch', true);
        patchRlsTmBnd.merge(newPatchRlsTmBnd)
            .attr('x1', rls => rls.x)
            .attr('y1', rls => rls.y)
            .attr('x2', rls => this.xZScale(rls.end))
            .attr('y2', 120)
        patchRlsTmBnd.exit().remove();

        // feature releases
        let featureRlsBnd = this.featureRlsGrp.selectAll('circle').data([this.rls]);
        let newFeatureRlsBnd = featureRlsBnd.enter().append('circle')
            .attr('r', 20)
        featureRlsBnd.merge(newFeatureRlsBnd)
            .attr('cx', rls => rls.x)
            .attr('cy', rls => rls.y)
            .classed('major', (rls) => rls.type == 'MAJOR')
            .classed('minor', (rls) => rls.type == 'MINOR')
        
        let featureRlsTxtBnd = this.featureRlsGrp.selectAll('text').data([this.rls]);
        let newFeatureRlsTxtBnd = featureRlsTxtBnd.enter().append('text')
            .attr('alignment-baseline', 'middle')
        featureRlsTxtBnd.merge(newFeatureRlsTxtBnd)
            .text(rls => rls.name)
            .attr('x', rls => rls.x)
            .attr('y', rls => rls.y)
        featureRlsTxtBnd.exit().remove();

        // patches
        let patchRlsBnd = this.patchRlsGrp.selectAll('circle').data(this.rls.patches);
        let newPatchRlsBnd = patchRlsBnd.enter().append('circle')
            .attr('r', 20)
            .classed('patch', true);
        patchRlsBnd.merge(newPatchRlsBnd)
            .attr('cx', rls => rls.x)
            .attr('cy', rls => rls.y)
        patchRlsBnd.exit().remove();

        let patchRlsTxtBnd = this.patchRlsGrp.selectAll('text').data(this.rls.patches);
        let newpatchRlsTxtBnd = patchRlsTxtBnd.enter().append('text')
            .attr('alignment-baseline', 'middle')
        patchRlsTxtBnd.merge(newpatchRlsTxtBnd)
            .text(rls => rls.name)
            .attr('x', rls => rls.x)
            .attr('y', rls => rls.y)
        patchRlsTxtBnd.exit().remove();
        
        // timeline
        let patchRlsTm2Bnd = this.patchRlsTmGrp.selectAll('line').data(this.rls.patches);
        let newPatchRlsTm2Bnd = patchRlsTm2Bnd.enter().append('line')
            .classed('patch', true);
        patchRlsTm2Bnd.merge(newPatchRlsTm2Bnd)
            .attr('x1', rls => this.xZScale(rls.end))
            .attr('y1', 120)
            .attr('x2', rls => this.xZScale(rls.start))
            .attr('y2', 220)
        patchRlsTm2Bnd.exit().remove();
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


