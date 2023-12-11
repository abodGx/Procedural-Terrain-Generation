class Shader {
    gl;
    program;
    attribLoc;
    uniformLoc;

    constructor(gl, vertShaderSrc, fragShaderSrc) {
        this.gl = gl;
        this.program = ShaderUtil.createProgramFromText(gl, vertShaderSrc, fragShaderSrc, true);
        if (this.program != null) {
            gl.useProgram(this.program);
            this.attribLoc = ShaderUtil.getStandardAttribLocations(gl, this.program);
            this.uniformLoc = ShaderUtil.getStandardUniformLocations(gl, this.program);
        }
    }

    activate() {
        this.gl.useProgram(this.program);
        return this;
    }

    deactivate() {
        this.gl.useProgram(null);
        return this;
    }

    setPerspective(matData) {
        this.gl.uniformMatrix4fv(this.uniformLoc.perspective, false, matData);
        return this;
    }

    setModalMatrix(model) {
        this.gl.uniformMatrix4fv(this.uniformLoc.modalMatrix, false, model.transform.viewMatrix);
        this.gl.uniformMatrix3fv(this.uniformLoc.normalMatrix, false, model.transform.normalMatrix);
        return this;
    }

    setCameraMatrix(matData) {
        this.gl.uniformMatrix4fv(this.uniformLoc.cameraMatrix, false, matData);
        return this;
    }

    dispose() {
        //unbind the program if its currently active
        if (this.gl.getParameter(this.gl.CURRENT_PROGRAM) === this.program) this.gl.useProgram(null);
        this.gl.deleteProgram(this.program);
    }

    preRender() {
    }

    renderModal(model) {
        this.setModalMatrix(model);
        this.gl.bindVertexArray(model.mesh.rtn.vao);

        if (model.mesh.rtn.indexCount) {
            this.gl.drawElements(model.mesh.rtn.drawMode, model.mesh.rtn.indexCount, gl.UNSIGNED_SHORT, 0);
        } else {
            this.gl.drawArrays(model.mesh.rtn.drawMode, 0, model.mesh.rtn.verticesCount);
        }

        this.gl.bindVertexArray(null);
        return this;
    }
}

class ShaderUtil {
    static ATTR_POSITION_NAME = "a_position";
    static ATTR_POSITION_LOC = 0;
    static ATTR_COLOR_NAME = "a_color";
    static ATTR_COLOR_LOC = 1;
    static ATTR_NORM_NAME = "a_norm";
    static ATTR_NORM_LOC = 2;
    static ATTR_UV_NAME = "a_uv";
    static ATTR_UV_LOC = 3;

    //-------------------------------------------------
    // Main utility functions
    //-------------------------------------------------

    //get the text of a script tag that are storing shader code.
    static domShaderSrc(elmID) {
        const elm = document.getElementById(elmID);
        if (!elm || elm.text === "") throw new DOMException(elmID + " shader not found or no text.");

        return elm.text;
    }

    //Create a shader by passing in its code and what type
    static createShader(gl, src, type) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, src);
        gl.compileShader(shader);

        //Get Error data if shader failed compiling
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error("Error compiling shader : " + src, gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }

        return shader;
    }

    //Link two compiled shaders to create a program for rendering.
    static createProgram(gl, vShader, fShader, doValidate) {
        //Link shaders together
        const program = gl.createProgram();
        gl.attachShader(program, vShader);
        gl.attachShader(program, fShader);

        gl.bindAttribLocation(program, ShaderUtil.ATTR_POSITION_LOC, ShaderUtil.ATTR_POSITION_NAME);
        gl.bindAttribLocation(program, ShaderUtil.ATTR_COLOR_LOC, ShaderUtil.ATTR_COLOR_NAME);
        gl.bindAttribLocation(program, ShaderUtil.ATTR_NORM_LOC, ShaderUtil.ATTR_NORM_NAME);
        gl.bindAttribLocation(program, ShaderUtil.ATTR_UV_LOC, ShaderUtil.ATTR_UV_NAME);

        gl.linkProgram(program);

        //Check if successful
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error("Error creating shader program.", gl.getProgramInfoLog(program));
            gl.deleteProgram(program);
            return null;
        }

        //Only do this for additional debugging.
        if (doValidate) {
            gl.validateProgram(program);
            if (!gl.getProgramParameter(program, gl.VALIDATE_STATUS)) {
                console.error("Error validating program", gl.getProgramInfoLog(program));
                gl.deleteProgram(program);
                return null;
            }
        }

        //Can delete the shaders since the program has been made.
        gl.detachShader(program, vShader); //TODO, detaching might cause issues on some browsers, Might only need to delete.
        gl.detachShader(program, fShader);
        gl.deleteShader(fShader);
        gl.deleteShader(vShader);

        return program;
    }

    //-------------------------------------------------
    // Helper functions
    //-------------------------------------------------

    //Pass in Script Tag IDs for our two shaders and create a program from it.
    static domShaderProgram(gl, vectID, fragID, doValidate) {
        const vShaderTxt = ShaderUtil.domShaderSrc(vectID);
        if (!vShaderTxt) return null;
        const fShaderTxt = ShaderUtil.domShaderSrc(fragID);
        if (!fShaderTxt) return null;
        const vShader = ShaderUtil.createShader(gl, vShaderTxt, gl.VERTEX_SHADER);
        if (!vShader) return null;
        const fShader = ShaderUtil.createShader(gl, fShaderTxt, gl.FRAGMENT_SHADER);
        if (!fShader) {
            gl.deleteShader(vShader);
            return null;
        }

        return ShaderUtil.createProgram(gl, vShader, fShader, true);
    }

    static createProgramFromText(gl, vShaderTxt, fShaderTxt, doValidate) {
        const vShader = ShaderUtil.createShader(gl, vShaderTxt, gl.VERTEX_SHADER);
        if (!vShader) return null;
        const fShader = ShaderUtil.createShader(gl, fShaderTxt, gl.FRAGMENT_SHADER);
        if (!fShader) {
            gl.deleteShader(vShader);
            return null;
        }

        return ShaderUtil.createProgram(gl, vShader, fShader, true);
    }

    static getStandardAttribLocations(gl, program) {
        return {
            position: gl.getAttribLocation(program, ShaderUtil.ATTR_POSITION_NAME),
            color: gl.getAttribLocation(program, ShaderUtil.ATTR_COLOR_NAME),
            norm: gl.getAttribLocation(program, ShaderUtil.ATTR_NORM_NAME),
            uv: gl.getAttribLocation(program, ShaderUtil.ATTR_UV_NAME)
        };
    }

    static getStandardUniformLocations(gl, program) {
        return {
            perspective: gl.getUniformLocation(program, "uPMatrix"),
            modalMatrix: gl.getUniformLocation(program, "uMVMatrix"),
            cameraMatrix: gl.getUniformLocation(program, "uCameraMatrix"),
            normalMatrix: gl.getUniformLocation(program, "uNormalMatrix"),
            mainTexture: gl.getUniformLocation(program, "uMainTex")
        };
    }
}