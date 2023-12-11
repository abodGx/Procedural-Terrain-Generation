class Mesh {
    forRemoval = [];
    rtn;

    constructor(meshData, usage = 0) {
        this.rtn = {drawMode: gl.TRIANGLES};

        this.rtn.vao = gl.createVertexArray();
        gl.bindVertexArray(this.rtn.vao);

        if (meshData.vertices != null) {
            this.rtn.verticesCount = meshData.vertices.length / 3;
            this.rtn.bufVertices = this.createBuffer(ShaderUtil.ATTR_POSITION_LOC, meshData.vertices, 3, usage);
        }
        if (meshData.colors !== null) {
            this.rtn.colorsCount = meshData.colors.length / 3;
            this.rtn.bufColor = this.createBuffer(ShaderUtil.ATTR_COLOR_LOC, meshData.colors, 3, usage);
        }
        if (meshData.normals != null) {
            this.rtn.normalsCount = meshData.normals.length / 3;
            this.rtn.bufNormals = this.createBuffer(ShaderUtil.ATTR_NORM_LOC, meshData.normals, 3, usage);
        }
        if (meshData.uvs != null) {
            this.rtn.bufUV = this.createBuffer(ShaderUtil.ATTR_UV_LOC, meshData.uvs, 2);
        }

        if (meshData.indices != null) {
            this.rtn.bufIndex = gl.createBuffer();
            this.rtn.indexCount = meshData.indices.length;
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.rtn.bufIndex);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, meshData.indices, gl.STATIC_DRAW);
        }

        gl.bindVertexArray(null);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        if (meshData.indices != null) gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    }

    createBuffer(location, data, size, usage = 0) {
        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, 2 ** 29, usage === 0 ? gl.STATIC_DRAW : gl.DYNAMIC_DRAW);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, data);
        gl.enableVertexAttribArray(location);
        gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
        return buffer;
    }

    clearBuffers(type) {
        if (type & MeshData.MeshDataTypes.VERTICES) this.rtn.verticesCount = 0;
        if (type & MeshData.MeshDataTypes.COLOR) this.rtn.colorsCount = 0;
        if (type & MeshData.MeshDataTypes.NORMALS) this.rtn.normalsCount = 0;
    }

    appendData(type, meshData) {
        gl.bindVertexArray(this.rtn.vao);

        let offsets = this.forRemoval.shift();

        if (!offsets) {
            offsets = {};

            if (type & MeshData.MeshDataTypes.VERTICES) {
                offsets.verticesOffset = 3 * this.rtn.verticesCount * Float32Array.BYTES_PER_ELEMENT;
                this.rtn.verticesCount += meshData.colors.length / 3;
            }
            if (type & MeshData.MeshDataTypes.COLOR) {
                offsets.colorsOffset = 3 * this.rtn.colorsCount * Float32Array.BYTES_PER_ELEMENT;
                this.rtn.colorsCount += meshData.colors.length / 3;
            }
            if (type & MeshData.MeshDataTypes.NORMALS) {
                offsets.normalsOffset = 3 * this.rtn.normalsCount * Float32Array.BYTES_PER_ELEMENT;
                this.rtn.normalsCount += meshData.colors.length / 3;
            }
        }

        if (type & MeshData.MeshDataTypes.VERTICES) {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.rtn.bufVertices);
            gl.bufferSubData(gl.ARRAY_BUFFER, offsets.verticesOffset, meshData.vertices);
        }
        if (type & MeshData.MeshDataTypes.COLOR) {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.rtn.bufColor);
            gl.bufferSubData(gl.ARRAY_BUFFER, offsets.colorsOffset, meshData.colors);
        }
        if (type & MeshData.MeshDataTypes.NORMALS) {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.rtn.bufNormals);
            gl.bufferSubData(gl.ARRAY_BUFFER, offsets.normalsOffset, meshData.normals);
        }

        gl.bindVertexArray(null);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);

        return offsets;
    }

    markForRemoval(offsets) {
        this.forRemoval.push(offsets);
    }
}

class MeshData {

    static MeshDataTypes = {
        VERTICES: 0b1,
        NORMALS: 0b10,
        COLOR: 0b100,
        UVS: 0b1000,
        INDICES: 0b10000,

        VC: 0b101,
        VNC: 0b111,
    };

    vertices = [];
    normals = [];
    colors = [];
    id;

    constructor(vertices = null, normals = null, colors = null, id = null) {
        this.vertices = new Float32Array(vertices);
        this.normals = new Float32Array(normals);
        this.colors = new Float32Array(colors);
        this.id = id;
    }

}