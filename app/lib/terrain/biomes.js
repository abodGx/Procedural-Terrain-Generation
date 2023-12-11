class Biomes {
    static biomes = [];

    static {
        const random = Math.random();
        let noiseMax, noiseConfig, colorsMap;
        const getMax = () =>
            noiseConfig.amplitude + noiseConfig.amplitude * noiseConfig.persistence * (noiseConfig.octaveCount - 1);

        ///////////////////////////////////////////// rocky desert biome
        colorsMap = new Map();
        noiseConfig = {amplitude: 14, frequency: 0.0004, octaveCount: 4, persistence: 0.2, lacunarity: 4};
        noiseMax = getMax();

        colorsMap.set(0.5 + random / 10, {r: 120, g: 100, b: 90, dispersion: 14});
        colorsMap.set(0.0, {r: 220, g: 200, b: 140, dispersion: 10});

        Biomes.biomes.push(
            Biomes.createBiomeObject("Rocky Desert", 25, 70, noiseConfig, noiseMax, colorsMap)
        );

        ///////////////////////////////////////////// savanna biome
        colorsMap = new Map();
        noiseConfig = {amplitude: 10, frequency: 0.00025, octaveCount: 3, persistence: 0.2, lacunarity: 4};
        noiseMax = getMax();

        colorsMap.set(0.6 + random / 10, {r: 160, g: 150, b: 70, dispersion: 30});
        colorsMap.set(0, {r: 210, g: 195, b: 135, dispersion: 30});

        Biomes.biomes.push(
            Biomes.createBiomeObject("Savanna", 40, 20, noiseConfig, noiseMax, colorsMap)
        );

        ///////////////////////////////////////////// rainforest biome
        colorsMap = new Map();
        noiseConfig = {amplitude: 12, frequency: 0.00015, octaveCount: 2, persistence: 0.2, lacunarity: 8};
        noiseMax = getMax();

        colorsMap.set(0.75 + random / 35, {r: 70, g: 75, b: 50, dispersion: 15});
        colorsMap.set(0.65 + random / 35, {r: 65, g: 70, b: 45, dispersion: 20});
        colorsMap.set(0.5 + random / 35, {r: 80, g: 90, b: 50, dispersion: 20});
        colorsMap.set(0.4 + random / 20, {r: 115, g: 105, b: 60, dispersion: 10});
        colorsMap.set(0, {r: 80, g: 70, b: 50, dispersion: 15});

        Biomes.biomes.push(
            Biomes.createBiomeObject("Rainforest", 15, 85, noiseConfig, noiseMax, colorsMap)
        );

        ///////////////////////////////////////////// mountains biome
        colorsMap = new Map();
        noiseConfig = {amplitude: 30, frequency: 0.00003, octaveCount: 4, persistence: 0.1, lacunarity: 8};
        noiseMax = getMax();

        colorsMap.set(0.8 + random / 20, {r: 180, g: 180, b: 180, dispersion: 10});
        colorsMap.set(0.5 + random / 20, {r: 80, g: 70, b: 40, dispersion: 20});
        colorsMap.set(0.45 + random / 20, {r: 115, g: 105, b: 60, dispersion: 10});
        colorsMap.set(0, {r: 100, g: 115, b: 60, dispersion: 30});

        Biomes.biomes.push(
            Biomes.createBiomeObject("Mountains", 20, 60, noiseConfig, noiseMax, colorsMap)
        );

        ///////////////////////////////////////////// snowy tundra biome
        colorsMap = new Map();
        noiseConfig = {amplitude: 14, frequency: 0.0003, octaveCount: 2, persistence: 0.05, lacunarity: 8};
        noiseMax = getMax();

        colorsMap.set(0.725 + random / 20, {r: 200, g: 200, b: 200, dispersion: 4});
        colorsMap.set(0, {r: 30, g: 70, b: 130, dispersion: 4});

        Biomes.biomes.push(
            Biomes.createBiomeObject("Snowy Tundra", -25, 20, noiseConfig, noiseMax, colorsMap)
        );

        ///////////////////////////////////////////// swamp biome
        colorsMap = new Map();
        noiseConfig = {amplitude: 16, frequency: 0.000125, octaveCount: 3, persistence: 0.05, lacunarity: 2};
        noiseMax = getMax();

        colorsMap.set(0.65 + random / 20, {r: 90, g: 130, b: 80, dispersion: 16});
        colorsMap.set(0.55 + random / 20, {r: 80, g: 70, b: 50, dispersion: 10});
        colorsMap.set(0, {r: 75, g: 90, b: 70, dispersion: 12});

        Biomes.biomes.push(
            Biomes.createBiomeObject("Swamp", 25, 60, noiseConfig, noiseMax, colorsMap)
        );
    }

    static createBiomeObject(name, temperature, humidity, noiseConfig, noiseMax, colorsMap) {
        return {name, temperature, humidity, noiseConfig, colorsMap, noiseMax};
    }
}