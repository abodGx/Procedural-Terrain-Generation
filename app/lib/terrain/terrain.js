class Terrain extends Model {

    static biomeLength = 100000;
    static oneUnit = 2 ** 4;
    static chunkSize = 2 ** 9;
    static worldSize = 2 ** 4;
    static lod = 12;

    visibleChunksMap = new Map();
    visibleChunksSet = new Set();
    removeChunksWorker;
    addChunksWorker;
    biomesNoise;
    prevX = 0;
    prevY = 0;

    constructor(gl, transformable) {
        super();

        this.biomesNoise = new WorleyNoise();
        for (let i = -2, x = 0; i < 2; i++) {
            x = Terrain.biomeLength * i;
            for (let j = -2; j < 2; j++) {
                this.biomesNoise.addPoint({
                    x,
                    y: -x + j * 2 * Terrain.biomeLength,
                    "biomeIndex": MathUtil.cantorPairingSigned(i, j) % Biomes.biomes.length
                });
            }
        }

        this.mesh = new Mesh(new MeshData(), 1);

        this.removeChunksWorker = Util.spawnWorker(() => {
            const importPath = self.location.origin + "/CGProject/app/lib/";
            self.importScripts(importPath + "math/math.js",
                importPath + "events/event-listener.js",
                importPath + "entity/transformable.js",
                importPath + "entity/body.js",
                importPath + "entity/model.js",
                importPath + "terrain/terrain.js"
            );

            const chunkLength = Terrain.chunkSize, worldSize = Terrain.worldSize;

            self.onmessage = message => {
                const pos = message.data.pos;
                for (const [key, value] of message.data.visibleChunks) {
                    if (MathUtil.euclideanDistance(pos.x,
                        -pos.z,
                        value.x * chunkLength + chunkLength / 2,
                        value.y * chunkLength + chunkLength / 2) > Math.SQRT2 * worldSize * chunkLength) {
                        self.postMessage({key, offsets: value.offsets});
                    }
                }
            }
        });

        this.removeChunksWorker.onmessage = message => {
            if (!this.visibleChunksSet.delete(message.data.key)) return;
            this.mesh.markForRemoval(message.data.offsets);
            this.visibleChunksMap.delete(message.data.key);
        };

        this.addChunksWorker = Util.spawnWorker(() => {
            const importPath = self.location.origin + "/CGProject/app/lib/";
            self.importScripts(importPath + "math/math.js",
                importPath + "math/perlin-noise.js",
                importPath + "math/worley-noise.js",
                importPath + "events/event-listener.js",
                importPath + "entity/transformable.js",
                importPath + "entity/body.js",
                importPath + "entity/model.js",
                importPath + "entity/mesh.js",
                importPath + "terrain/biomes.js",
                importPath + "terrain/terrain.js"
            );

            const chunkLength = Terrain.chunkSize, worldSize = Terrain.worldSize;

            // const delay = (delay) => new Promise(resolve => setTimeout(resolve, delay));

            self.onmessage = async message => {
                const pos = message.data.pos,
                    lowerChunksXLimit = Math.floor(pos.x / chunkLength) - worldSize,
                    upperChunksXLimit = Math.floor(pos.x / chunkLength) + worldSize,
                    lowerChunksYLimit = Math.floor(-pos.z / chunkLength) - worldSize,
                    upperChunksYLimit = Math.floor(-pos.z / chunkLength) + worldSize;


                for (let x = lowerChunksXLimit, key; x < upperChunksXLimit; x++) {
                    for (let y = lowerChunksYLimit; y < upperChunksYLimit; y++) {
                        key = MathUtil.cantorPairingSigned(x, y);
                        if (message.data.visibleChunks.has(key)) continue;
                        self.postMessage({
                            key, x, y: y, meshData: Terrain.generateChunk(x, y, message.data.biomesNoise)
                        });
                        // await delay(0.0000001);
                    }
                }
            };
        });

        this.addChunksWorker.onmessage = message => {
            if (this.visibleChunksSet.has(message.data.key)) return;
            this.visibleChunksSet.add(message.data.key);
            this.visibleChunksMap.set(message.data.key, {
                x: message.data.x,
                y: message.data.y,
                offsets: this.mesh.appendData(MeshData.MeshDataTypes.VC,
                    message.data.meshData
                )
            });
        }

        transformable.addEventListener(this.onPlayMoved.bind(this));
    }

    onPlayMoved(transformable) {
        const pos = transformable.position,
            dX = Math.abs(Math.abs(pos.x) - this.prevX),
            dY = Math.abs(Math.abs(pos.z) - this.prevY);

        if (dX > 2.7 * Terrain.chunkSize) {
            this.prevX = Math.abs(pos.x);
        } else if (dY > 2.7 * Terrain.chunkSize) {
            this.prevY = Math.abs(pos.z);
        } else {
            if (dX > 2.5 * Terrain.chunkSize || dY > 2.5 * Terrain.chunkSize)
                this.removeChunksWorker.postMessage(structuredClone({pos, visibleChunks: this.visibleChunksMap}));
            return;
        }

        this.addChunksWorker.postMessage(structuredClone({
            pos, visibleChunks: this.visibleChunksSet, biomesNoise: this.biomesNoise
        }));
    }

    resetChunks() {
        this.visibleChunksMap.clear();
        this.visibleChunksSet.clear();
        this.mesh.clearBuffers(MeshData.MeshDataTypes.VC);
    }

    * initTerrainGenerator() {
        for (let x = -Terrain.worldSize, i = 1, key; x < Terrain.worldSize; x++) {
            for (let y = -Terrain.worldSize; y < Terrain.worldSize; y++) {
                key = MathUtil.cantorPairingSigned(x, y);
                this.visibleChunksSet.add(key);
                this.visibleChunksMap.set(key, {
                    x,
                    y,
                    offsets: this.mesh.appendData(MeshData.MeshDataTypes.VC,
                        Terrain.generateChunk(x, y, this.biomesNoise))
                });
                yield i++;
            }
        }
    }

    static findDistance(x, y, biomesNoise) {
        const k1 = WorleyNoise.getManhattan({x, y}, 1, biomesNoise.points);
        return {k1, biome: Biomes.biomes[biomesNoise.points[k1.index].biomeIndex]};
    }

    static generateChunk(chunkCoordinateX, chunkCoordinateY, biomesNoise, lod = Terrain.lod) {
        const vertices = [],
            colors = [],
            noises = [],
            perlinNoise = new PerlinNoise(),
            lowerLeftX = chunkCoordinateX * Terrain.chunkSize,
            lowerLeftY = chunkCoordinateY * Terrain.chunkSize,
            normalize = x => Math.max(0, 1 - Math.pow(2, 20 * (x - 0.5)));

        let noise, biomeNoise, random, color = {}, distanceRatio, x, y;


        Terrain.nDivisions(vertices, lowerLeftX, lowerLeftY, Terrain.chunkSize, lod);

        for (let i = 0; i < vertices.length - 2; i += 3) {
            x = vertices[i];
            y = vertices[i + 1];

            const {k1, biome} = Terrain.findDistance(x, y, biomesNoise);

            distanceRatio = k1.distance / (2 * Terrain.biomeLength);

            noise = perlinNoise.noise(x * 0.0005, y * 0.0005) * 2;

            noise += biomeNoise = normalize(distanceRatio) * perlinNoise.fbm(x,
                y,
                1,
                biome.noiseConfig.amplitude,
                biome.noiseConfig.frequency,
                biome.noiseConfig.octaveCount,
                biome.noiseConfig.persistence,
                biome.noiseConfig.lacunarity
            );

            vertices[i + 2] += MathUtil.ease(noise);
            noises.push({noise, biome});
        }


        for (const {noise, biome} of noises) {
            for (const entry of biome.colorsMap) {
                if (MathUtil.normalize(0, 0.8 * biome.noiseMax, noise) >= entry[0]) {
                    color = entry[1];
                    break;
                }
            }

            if (!color.dispersion) color.dispersion = 0;

            random = Math.random();
            colors.push((color.r + color.dispersion * random) / 255,
                (color.g + color.dispersion * random) / 255,
                (color.b + color.dispersion * random) / 255
            );
        }

        // for (let i = 0, normal; i < vertices.length - 8; i += 9) {
        //     normal = MathUtil.triangleNormal(vertices[i], vertices[i + 1], vertices[i + 2],
        //         vertices[i + 3], vertices[i + 4], vertices[i + 5],
        //         vertices[i + 6], vertices[i + 7], vertices[i + 8]
        //     ).getArray();
        //     normals.push(...normal, ...normal, ...normal);
        // }

        return new MeshData(vertices, null, colors);
    }

    static nDivisions(outVertices, lowerLeftX, lowerLeftY, sideLength, n) {
        const oneSideLength = sideLength / n, temp = [];
        for (let i = 0; i <= n; i++)
            for (let j = 0; j <= n; j++)
                temp.push(lowerLeftX + oneSideLength * i, lowerLeftY + oneSideLength * j)

        for (let i = 0, limit = n * n + n; i < limit; i++) {
            if (((i - n) / (n + 1)) % 1 === 0) continue;
            outVertices.push(
                temp[2 * (i + 1)], temp[2 * (i + 1) + 1], 1,
                temp[2 * i], temp[2 * i + 1], 1,
                temp[2 * (i + n + 1)], temp[2 * (i + n + 1) + 1], 1,
                temp[2 * (i + 1)], temp[2 * (i + 1) + 1], 1,
                temp[2 * (i + n + 1)], temp[2 * (i + n + 1) + 1], 1,
                temp[2 * (n + i + 2)], temp[2 * (n + i + 2) + 1], 1,
            );
        }
    }
}