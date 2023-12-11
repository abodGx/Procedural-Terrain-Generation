class PhysicsComponent {
    velocity;
    acceleration;

    constructor(velocity = new Vector3(), acceleration = new Vector3()) {
        this.velocity = velocity;
        this.acceleration = acceleration;
    }

    apply(body, dt) {
        this.velocity = this.velocity.add(this.acceleration.multiScalar(dt));
        body.transform.position = body.transform.position.add(this.velocity.multiScalar(dt));
    }
}

class Gravity extends PhysicsComponent {

    constructor() {
        super(new Vector3(), new Vector3(0, -9.81, 0));
    }

}