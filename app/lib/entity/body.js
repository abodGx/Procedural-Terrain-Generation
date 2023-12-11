class Body extends Transformable {
    mass;
    physicsComponents = [];

    constructor(mass = 1.0) {
        super();
        this.mass = mass;
    }

    addPhysicsComponent(component) {
        this.physicsComponents.push(component);
    }

    updateTransform(dt) {
        for (const component of this.physicsComponents) component.apply(this, dt);
        super.updateTransform();
    }
}