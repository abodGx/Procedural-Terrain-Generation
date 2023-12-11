let gl, shader, camera, cameraCtrl, terrain, rLoop, delegatedTarget, initData;


if ('function' === typeof importScripts) {
    self.importScripts("worker-event-delegation.js",
        "gl.js",
        "../util/utils.js",
        "../math/math.js",
        "../math/worley-noise.js",
        "../events/event-listener.js",
        "shaders.js",
        "renderLoop.js",
        "../entity/mesh.js",
        "../physics/physics-component.js",
        "../math/perlin-noise.js",
        "../entity/transformable.js",
        "../entity/body.js",
        "../entity/model.js",
        "../terrain/biomes.js",
        "../terrain/terrain.js",
        "camera.js",
    );

    self.addEventListener("eventtargetadded", ({dt}) => {
        delegatedTarget = dt;
        init();
    });

    const teleport = tokens => {
        const biomeName = tokens.join(" ").toLocaleLowerCase(),
            index = Biomes.biomes.findIndex(value => value.name.toLocaleLowerCase() === biomeName);
        if (index === -1) {
            self.postMessage(`No biome with the name "${biomeName}"`);
            return;
        }
        const biomeNoise = terrain.biomesNoise.points.find(value => value.biomeIndex === index);
        camera.transform.position.x = biomeNoise.x;
        camera.transform.position.z = -biomeNoise.y;
        terrain.resetChunks();
        camera.fireEvent(camera.transform);

        self.postMessage({
            messageType: MessageType.COMMAND_ECHO,
            message: `Teleported to ${Biomes.biomes[index].name} at ` +
                `x: ${biomeNoise.x / Terrain.oneUnit}, ` +
                `y: ${-biomeNoise.y / Terrain.oneUnit}, ` +
                `z: ${Math.round(camera.transform.position.y / Terrain.oneUnit)}`,
        });
    };

    const commands = {"tp": teleport};

    self.onmessage = message => {
        const data = message.data;
        switch (data.messageType) {
            case MessageType.INIT:
                initData = data;
                break;
            case MessageType.COMMAND:
                const tokens = data.command.split(/\s+/), command = tokens.shift();
                for (const cmd in commands) {
                    if (cmd === command) {
                        commands[cmd].call(null, tokens);
                        break;
                    }
                }
                break;
            case MessageType.SETTINGS_UPDATE:
                if (data.id.startsWith("world-size")) {
                    Terrain.worldSize = data.value;
                } else if (data.id.startsWith("chunk-size")) {
                    Terrain.chunkSize = data.value;
                } else if (data.id.startsWith("lod")) {
                    Terrain.lod = data.value;
                } else if (data.id.startsWith("rotation-rate")) {
                    CameraController.rotationRate = data.value;
                } else if (data.id.startsWith("pan-rate")) {
                    CameraController.panRate = data.value;
                } else if (data.id.startsWith("zoom-rate")) {
                    CameraController.zoomRate = data.value;
                }
                break;
        }
    };

    function init() {
        gl = Gl.getInstance(initData.offscreenCanvas).setViewport(initData.width, initData.height).doClear();

        camera = new Camera(gl, initData.width, initData.height);
        camera.transform.position.set(0, 2000, 0);
        camera.addEventListener(function (transformable) {
            self.postMessage({
                messageType: MessageType.COORDINATION_UPDATE,
                pos: transformable.position,
                unit: Terrain.oneUnit,
                biome: Terrain.findDistance(transformable.position.x,
                    -transformable.position.z,
                    terrain.biomesNoise).biome.name
            });
        });

        cameraCtrl = new CameraController(gl, delegatedTarget, initData.boundingBox, camera);

        shader = new TestShader(gl, camera.projectionMatrix);
        terrain = new Terrain(gl, camera);
        self.postMessage({messageType: MessageType.INIT});
        for (const i of terrain.initTerrainGenerator())
            self.postMessage({messageType: MessageType.TERRAIN_INIT, i})

        // terrain.addPhysicsComponent(new PhysicsComponent(new Vector3(0, 0, 0), new Vector3(0, 0, 0)));
        terrain.setRotation(-90, 0, 0);

        rLoop = new RenderLoop(onRender, 24).start();
        self.postMessage({messageType: MessageType.INIT_END});
        camera.fireEvent(camera.transform);
    }

    function onRender(dt) {
        gl.doClear();
        camera.updateViewMatrix();

        shader.activate()
            .setCameraMatrix(camera.viewMatrix)
            .renderModal(terrain.preRender(dt));
    }

    class TestShader extends Shader {

        static vs = `#version 300 es
            precision mediump float;
            
            uniform mat4 uPMatrix;
            uniform mat4 uMVMatrix;
            uniform mat4 uCameraMatrix;
            uniform mat3 uNormalMatrix;
            
            in vec3 a_position;
            in vec3 a_color;
            // in vec3 a_norm;
            
            // out vec3 normalLerp;
            // out vec3 vertexPos;
            // out vec3 aColor;
            
            out highp vec3 worldPos;
            out vec3 vertexPos;
            out vec3 aColor;
            
            void main(void) {
                
                vec4 vertexPos4 = uMVMatrix * vec4(a_position, 1.0);
                vertexPos = vec3(vertexPos4) / vertexPos4.w;
                // normalLerp = uNormalMatrix * a_norm;
                // aColor = a_color;
                
                worldPos = (uMVMatrix *  vec4(a_position, 1.0)).xyz;
                aColor = a_color;
                
                gl_Position = uPMatrix * uCameraMatrix * uMVMatrix * vec4(a_position, 1);
            }`;

        static fs = `#version 300 es
            #extension GL_OES_standard_derivatives : enable
            
            precision mediump float;

            // in vec3 normalLerp;
            // in vec3 vertexPos;
            // in vec3 aColor;
            
            in highp vec3 worldPos;
            in vec3 vertexPos;
            in vec3 aColor;
            
            out vec4 finalColor;
                        
            // light coefficients
            const float Ka = 0.85;
            const float Kd = 0.35;
            const float Ks = 0.05;
            const float shininessVal = 100.0;
            
            // material color
            const vec3 specularColor = vec3(0.99, 0.98, 0.82);
            
            const vec3 lightPos = vec3(100000.0, 100000.0, 100000.0);
            // const vec3 lightColor = 0.75 * vec3(0.99, 0.98, 0.82);
            
            void main(void) {
                vec3 n = normalize(cross(dFdx(worldPos), dFdy(worldPos)));
                // vec3 n = normalize(normalLerp);
                vec3 l = normalize(lightPos - vertexPos);
                // Lambert's cosine law
                float lambertian = max(dot(n, l), 0.0);
                float specular = 0.0;
                if (lambertian > 0.0) {
                    specular = pow(max(dot(reflect(-l, n), normalize(-vertexPos)), 0.0), shininessVal);
                }
                finalColor = vec4(Ka * aColor + Kd * lambertian * aColor + Ks * specular * specularColor, 1.0);
                
                // vec3 n = normalize(cross(dFdx(worldPos), dFdy(worldPos)));
                // float diffAngle = max(dot(n, normalize(lightPos - worldPos)), 0.0);
                // finalColor = vec4(0.5 * aColor + lightColor * diffAngle, 1.0);
            }`;

        constructor(gl, pMatrix) {
            super(gl, TestShader.vs, TestShader.fs);

            super.setPerspective(pMatrix);
            gl.useProgram(null);
        }

        preRender() {
            return this;
        }
    }
}

const MessageType = {
    "INIT": 0,
    "COMMAND": 1,
    "COMMAND_ECHO": 2,
    "TERRAIN_INIT": 3,
    "SETTINGS_UPDATE": 4,
    "COORDINATION_UPDATE": 5,
    "INIT_END": 6
}