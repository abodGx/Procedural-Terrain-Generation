class PerlinNoise {

    static permutation = [151, 160, 137, 91, 90, 15,
        131, 13, 201, 95, 96, 53, 194, 233, 7, 225, 140, 36, 103, 30, 69, 142, 8, 99, 37, 240, 21, 10, 23,
        190, 6, 148, 247, 120, 234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 35, 11, 32, 57, 177, 33,
        88, 237, 149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175, 74, 165, 71, 134, 139, 48, 27, 166,
        77, 146, 158, 231, 83, 111, 229, 122, 60, 211, 133, 230, 220, 105, 92, 41, 55, 46, 245, 40, 244,
        102, 143, 54, 65, 25, 63, 161, 1, 216, 80, 73, 209, 76, 132, 187, 208, 89, 18, 169, 200, 196,
        135, 130, 116, 188, 159, 86, 164, 100, 109, 198, 173, 186, 3, 64, 52, 217, 226, 250, 124, 123,
        5, 202, 38, 147, 118, 126, 255, 82, 85, 212, 207, 206, 59, 227, 47, 16, 58, 17, 182, 189, 28, 42,
        223, 183, 170, 213, 119, 248, 152, 2, 44, 154, 163, 70, 221, 153, 101, 155, 167, 43, 172, 9,
        129, 22, 39, 253, 19, 98, 108, 110, 79, 113, 224, 232, 178, 185, 112, 104, 218, 246, 97, 228,
        251, 34, 242, 193, 238, 210, 144, 12, 191, 179, 162, 241, 81, 51, 145, 235, 249, 14, 239, 107,
        49, 192, 214, 31, 181, 199, 106, 157, 184, 84, 204, 176, 115, 121, 50, 45, 127, 4, 150, 254,
        138, 236, 205, 93, 222, 114, 67, 29, 24, 72, 243, 141, 128, 195, 78, 66, 215, 61, 156, 180];

    static p = [];

    static offset = 2 ** 16;

    static {
        for (let i = 0; i < 512; i++) PerlinNoise.p[i] = (PerlinNoise.permutation)[i % 256];
    }

    repeat;

    constructor(repeat = -1) {
        this.repeat = repeat;
    }

    octavePerlin(x, y, z, octaves, persistence) {
        let total = 0, frequency = 1, amplitude = 1, maxValue = 0;
        for (let i = 0; i < octaves; i++) {
            total += this.noise(x * frequency, y * frequency, z * frequency) * amplitude;
            maxValue += amplitude;
            amplitude *= persistence;
            frequency *= 2;
        }

        return total / maxValue;
    }

    fbm(x, y, z, amplitude, frequency, octaveCount, persistence, lacunarity) {
        let value = 0;
        for (let i = 0; i < octaveCount; i++) {
            value += amplitude * this.noise(x * frequency, y * frequency, z * frequency);
            amplitude *= persistence;
            frequency *= lacunarity;
        }
        return value;
    }

    noise(x, y, z = 1) {
        x = x + PerlinNoise.offset;
        y = y + PerlinNoise.offset;
        z = z + PerlinNoise.offset;
        if (this.repeat > 0) {
            x = x % this.repeat;
            y = y % this.repeat;
            z = z % this.repeat;
        }

        const xi = Math.floor(x & 255),
            yi = Math.floor(y & 255),
            zi = Math.floor(z & 255),
            xf = x - Math.floor(x),
            yf = y - Math.floor(y),
            zf = z - Math.floor(z),
            u = this.fade(xf),
            v = this.fade(yf),
            w = this.fade(zf);

        let aaa, aba, aab, abb, baa, bba, bab, bbb;
        aaa = (PerlinNoise.p)[(PerlinNoise.p)[(PerlinNoise.p)[xi] + yi] + zi];
        aba = (PerlinNoise.p)[(PerlinNoise.p)[(PerlinNoise.p)[xi] + this.inc(yi)] + zi];
        aab = (PerlinNoise.p)[(PerlinNoise.p)[(PerlinNoise.p)[xi] + yi] + this.inc(zi)];
        abb = (PerlinNoise.p)[(PerlinNoise.p)[(PerlinNoise.p)[xi] + this.inc(yi)] + this.inc(zi)];
        baa = (PerlinNoise.p)[(PerlinNoise.p)[(PerlinNoise.p)[this.inc(xi)] + yi] + zi];
        bba = (PerlinNoise.p)[(PerlinNoise.p)[(PerlinNoise.p)[this.inc(xi)] + this.inc(yi)] + zi];
        bab = (PerlinNoise.p)[(PerlinNoise.p)[(PerlinNoise.p)[this.inc(xi)] + yi] + this.inc(zi)];
        bbb = (PerlinNoise.p)[(PerlinNoise.p)[(PerlinNoise.p)[this.inc(xi)] + this.inc(yi)] + this.inc(zi)];

        let x1, x2, y1, y2;
        x1 = this.lerp(this.grad(aaa, xf, yf, zf), this.grad(baa, xf - 1, yf, zf), u);
        x2 = this.lerp(this.grad(aba, xf, yf - 1, zf), this.grad(bba, xf - 1, yf - 1, zf), u);
        y1 = this.lerp(x1, x2, v);

        x1 = this.lerp(this.grad(aab, xf, yf, zf - 1), this.grad(bab, xf - 1, yf, zf - 1), u);
        x2 = this.lerp(this.grad(abb, xf, yf - 1, zf - 1), this.grad(bbb, xf - 1, yf - 1, zf - 1), u);
        y2 = this.lerp(x1, x2, v);

        return (this.lerp(y1, y2, w) + 1) / 2;
    }

    inc(num) {
        num++;
        if (this.repeat > 0) num %= this.repeat;
        return num;
    }

    grad(hash, x, y, z) {
        const h = hash & 15, u = h < 8 ? x : y;
        let v = h < 4 ? y : h === 12 || h === 14 ? x : z;
        return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    }

    fade(t) {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }

    lerp(a, b, x) {
        return a + x * (b - a);
    }
}