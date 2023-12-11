class Model extends Body {
    mesh;

    constructor(meshData = null) {
        super();
        this.mesh = meshData;
    }

    preRender(dt) {
        super.updateTransform(dt);
        return this;
    }
}