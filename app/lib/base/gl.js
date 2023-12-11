class Gl {
    static getInstance(canvas) {
        const gl = canvas.getContext("webgl2", {antialias: true});
        if (!gl) throw new DOMException("WebGL context is not available.");

        gl.cullFace(gl.BACK);
        gl.frontFace(gl.CCW);
        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.CULL_FACE);
        gl.depthFunc(gl.LEQUAL);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.clearColor(1.0, 1.0, 1.0, 1.0);

        gl.doClear = () => {
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            return gl;
        }

        gl.setViewport = (w, h) => {
            gl.viewport(0, 0, w, h);
            return gl;
        };

        return gl;
    }
}