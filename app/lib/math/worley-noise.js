class WorleyNoise {

    static euclidean = (dx, dy, dz) => dx * dx + dy * dy + dz * dz;
    static manhattan = (dx, dy, dz) => Math.abs(dx) + Math.abs(dy) + Math.abs(dz);

    points = [];
    max;

    constructor(config = {pointsCount: 10, max: 10, dim: 2}) {
        this.max = config.max;
    }

    addPoint(coord) {
        this.points.push(coord);
    }

    static getEuclidean(coord, k, points) {
        const result = WorleyNoise.calculateValue(coord, k, WorleyNoise.euclidean, points);
        return {"distance": Math.sqrt(result.minDist), "index": result.minIdx};
    }

    static getManhattan(coord, k, points) {
        const result = WorleyNoise.calculateValue(coord, k, WorleyNoise.manhattan, points);
        return {"distance": result.minDist, "index": result.minIdx};
    }

    renderImage(resolution, config) {
        config = config || {};
        const step = 1 / (resolution - 1);
        const img = [];
        const callback = config.callback || ((e, m) => e(1));
        let x, y;

        const e = k => Math.sqrt(this.calculateValue({
            x: x * step,
            y: y * step,
            z: config.z || 0,
        }, k, euclidean));

        const m = k => this.calculateValue({
            x: x * step,
            y: y * step,
            z: config.z || 0,
        }, k, manhattan);

        for (y = 0; y < resolution; ++y) {
            for (x = 0; x < resolution; ++x) {
                img[y * resolution + x] = callback(e, m);
            }
        }

        if (!config.normalize)
            return img;

        let min = Number.POSITIVE_INFINITY;
        let max = Number.NEGATIVE_INFINITY;

        img.forEach(v => {
            min = Math.min(min, v);
            max = Math.max(max, v);
        });

        let scale = 1 / (max - min);
        return img.map(v => (v - min) * scale);
    }

    // TODO: this method implementation is bad,
    //  reimplement this method using maximum time of O(n), where n is points.length, also remove 'selected' property
    static calculateValue(coord, k, distFn, points) {
        let minDist, minIdx;
        points.forEach(p => p.selected = false);

        for (let i = 0; i < k; ++i) {
            minDist = Number.POSITIVE_INFINITY;

            for (let i = 0; i < points.length; ++i) {
                const p = points[i], dist = distFn(coord.x - p.x, coord.y - p.y, 0);
                if (dist < minDist && !p.selected) {
                    minDist = dist;
                    minIdx = i;
                }
            }

            points[minIdx].selected = true;
        }

        return {minDist, minIdx};
    }
}