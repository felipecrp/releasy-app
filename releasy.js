
let releases = [
    { 
        name: '1.0.1',
        start: new Date(2019,0,1),
        end: new Date(2019,0,5),
        churn: 400
    },
    { 
        name: '1.0.2',
        start: new Date(2019,0,6),
        end: new Date(2019,0,7),        
        churn: 200
    },
    { 
        name: '1.1.0',
        start: new Date(2019,0,12),
        end: new Date(2019,0,15),
        churn: 100
    },
    { 
        name: '1.1.1',
        start: new Date(2019,0,9),
        end: new Date(2019,1,5),
        churn: 150
    },
    { 
        name: '1.1.2',
        start: new Date(2019,0,9),
        end: new Date(2019,1,5),
        churn: 300
    },
    { 
        name: '1.1.3',
        // start: new Date(2019,0,15),
        // end: new Date(2019,0,25),
        start: new Date(2019,0,9),
        end: new Date(2019,1,5),
        churn: 500
    },
    { 
        name: '1.2.0',
        start: new Date(2019,1,1),
        end: new Date(2019,1,15),
        churn: 100
    }
]

class Releasy {
    constructor(releases) {
        this.releases = releases
    }

    init() {
        for (const release of this.releases) {
            release.hindex = 0;
            for (const refRelease of this.releases) {
                if (release != refRelease) {
                    if (release.start.getTime() <= refRelease.end.getTime()
                            && release.start.getTime() >= refRelease.start.getTime()) {
                        
                        release.hindex += 1;
                    }

                    if (release.start.getTime() == refRelease.start.getTime()
                        && release.hindex == refRelease.hindex) {
                        console.log(release.name)
                            release.hindex -= 1;
                    }
                }
            }    
        }

        let r = new RelGraph('#chart', this.releases);
        r.draw()
    }
}

class RelGraph {
    
    constructor(div, releases) {
        this.releases = releases;
        this.svg = d3.select(div).append("svg");
    }

    draw() {
        let parent = this.svg.node().parentNode;
        let width = parent.clientWidth;
        let height = parent.clientHeight;

        if (width == 0) { width = 300; }
        if (height == 0) { height = 500; }
        height = 500;
        this.svg
            .attr("width", width)
            .attr("height", height);

        let xScale = d3.scaleTime()
            .domain([releases[0].start, releases[releases.length-1].end])
            .range([0, width-1]);
        
        let xAxisGroup = this.svg
            .append("g")

        let xAxis = d3.axisBottom()
            .scale(xScale);
        
        xAxisGroup.call(xAxis);

        this.svg.selectAll('rect').data(this.releases).enter()
            .append('rect')
                .classed('bar', true)
                .attr('x', (data) => xScale(data.start))
                .attr('y', (data) => 50 + 30*data.hindex)
                .attr('width', (data) => xScale(data.end) - xScale(data.start))
                .attr('height', 25)
    }
}

r = new Releasy(releases);
r.init();

