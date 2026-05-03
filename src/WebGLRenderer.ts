type Color = [number, number, number, number];

type WebGLContext = WebGLRenderingContext | WebGL2RenderingContext;

type WebGLCamera = {
    width: number;
    height: number;
    panX: number;
    panY: number;
    zoom: number;
};

type InstancingApi = {
    vertexAttribDivisor(index: number, divisor: number): void;
    drawArraysInstanced(mode: number, first: number, count: number, instanceCount: number): void;
};

type CircleProgram = {
    program: WebGLProgram;
    unitPositionAttribute: number;
    centerRadiusAttribute: number;
    colorAttribute: number;
    resolutionUniform: WebGLUniformLocation;
    panUniform: WebGLUniformLocation;
    zoomUniform: WebGLUniformLocation;
};

type CircleBatch = {
    unitPositionBuffer: WebGLBuffer;
    instanceBuffer: WebGLBuffer;
    vertexCount: number;
    drawMode: number;
    instances: Float32Array;
    count: number;
};

type TextureProgram = {
    program: WebGLProgram;
    unitPositionAttribute: number;
    textureCoordAttribute: number;
    centerSizeAttribute: number;
    resolutionUniform: WebGLUniformLocation;
    panUniform: WebGLUniformLocation;
    zoomUniform: WebGLUniformLocation;
    textureUniform: WebGLUniformLocation;
};

type TextureBatch = {
    texture: WebGLTexture;
    instanceBuffer: WebGLBuffer;
    instances: Float32Array;
    count: number;
};

type GlowProgram = {
    program: WebGLProgram;
    unitPositionAttribute: number;
    centerInnerOuterAttribute: number;
    colorAttribute: number;
    resolutionUniform: WebGLUniformLocation;
    panUniform: WebGLUniformLocation;
    zoomUniform: WebGLUniformLocation;
};

type GlowBatch = {
    instanceBuffer: WebGLBuffer;
    instances: Float32Array;
    count: number;
};

const FLOATS_PER_CIRCLE_INSTANCE = 7;
const FLOATS_PER_TEXTURE_VERTEX = 4;
const FLOATS_PER_TEXTURE_INSTANCE = 4;
const FLOATS_PER_GLOW_INSTANCE = 8;
const CIRCLE_SEGMENTS = 96;
const INITIAL_CIRCLE_BATCH_CAPACITY = 1024;
const INITIAL_TEXTURE_BATCH_CAPACITY = 256;
const INITIAL_GLOW_BATCH_CAPACITY = 64;

const NAMED_COLORS: Record<string, Color> = {
    black: [0, 0, 0, 1],
    transparent: [0, 0, 0, 0],
    white: [1, 1, 1, 1],
};

const CIRCLE_VERTEX_SHADER_SOURCE = `
precision highp float;

attribute vec2 a_unitPosition;
attribute vec3 a_centerRadius;
attribute vec4 a_color;

uniform vec2 u_resolution;
uniform vec2 u_pan;
uniform float u_zoom;

varying vec4 v_color;

void main() {
    vec2 worldPosition = a_centerRadius.xy + a_unitPosition * a_centerRadius.z;
    vec2 clipPosition = ((worldPosition - u_pan) * u_zoom) / (u_resolution * 0.5);

    gl_Position = vec4(clipPosition, 0.0, 1.0);
    v_color = a_color;
}
`;

const CIRCLE_FRAGMENT_SHADER_SOURCE = `
precision mediump float;

varying vec4 v_color;

void main() {
    gl_FragColor = v_color;
}
`;

const TEXTURE_VERTEX_SHADER_SOURCE = `
precision highp float;

attribute vec2 a_unitPosition;
attribute vec2 a_textureCoord;
attribute vec4 a_centerSize;

uniform vec2 u_resolution;
uniform vec2 u_pan;
uniform float u_zoom;

varying vec2 v_textureCoord;

void main() {
    vec2 worldPosition = a_centerSize.xy + a_unitPosition * a_centerSize.zw;
    vec2 clipPosition = ((worldPosition - u_pan) * u_zoom) / (u_resolution * 0.5);

    gl_Position = vec4(clipPosition, 0.0, 1.0);
    v_textureCoord = a_textureCoord;
}
`;

const TEXTURE_FRAGMENT_SHADER_SOURCE = `
precision mediump float;

uniform sampler2D u_texture;

varying vec2 v_textureCoord;

void main() {
    gl_FragColor = texture2D(u_texture, v_textureCoord);
}
`;

const GLOW_VERTEX_SHADER_SOURCE = `
precision highp float;

attribute vec2 a_unitPosition;
attribute vec4 a_centerInnerOuter;
attribute vec4 a_color;

uniform vec2 u_resolution;
uniform vec2 u_pan;
uniform float u_zoom;

varying vec2 v_unitPosition;
varying vec2 v_innerOuterRadius;
varying vec4 v_color;

void main() {
    vec2 worldPosition = a_centerInnerOuter.xy + a_unitPosition * a_centerInnerOuter.w;
    vec2 clipPosition = ((worldPosition - u_pan) * u_zoom) / (u_resolution * 0.5);

    gl_Position = vec4(clipPosition, 0.0, 1.0);
    v_unitPosition = a_unitPosition;
    v_innerOuterRadius = a_centerInnerOuter.zw;
    v_color = a_color;
}
`;

const GLOW_FRAGMENT_SHADER_SOURCE = `
precision mediump float;

varying vec2 v_unitPosition;
varying vec2 v_innerOuterRadius;
varying vec4 v_color;

void main() {
    float distanceFromCenter = length(v_unitPosition);

    if (distanceFromCenter > 1.0) {
        discard;
    }

    float innerRatio = clamp(v_innerOuterRadius.x / v_innerOuterRadius.y, 0.0, 1.0);
    float fadeStart = innerRatio + (1.0 - innerRatio) * 0.15;
    float fadeRange = max(0.0001, 1.0 - fadeStart);
    float alpha = 1.0 - clamp((distanceFromCenter - fadeStart) / fadeRange, 0.0, 1.0);

    gl_FragColor = vec4(v_color.rgb, v_color.a * alpha);
}
`;

export default class WebGLRenderer {
    private readonly gl: WebGLContext;
    private readonly instancing: InstancingApi;
    private readonly circleProgram: CircleProgram;
    private readonly textureProgram: TextureProgram;
    private readonly glowProgram: GlowProgram;
    private readonly emptyCircleBatch: CircleBatch;
    private readonly filledCircleBatch: CircleBatch;
    private readonly glowBatch: GlowBatch;
    private readonly textureQuadBuffer: WebGLBuffer;
    private readonly textureBatches = new Map<ImageBitmap, TextureBatch>();
    private readonly colorCache = new Map<string, Color>();

    private camera: WebGLCamera = {
        width: 1,
        height: 1,
        panX: 0,
        panY: 0,
        zoom: 1,
    };

    static create(canvas: HTMLCanvasElement): WebGLRenderer | null {
        const webgl2 = canvas.getContext('webgl2', {
            alpha: false,
            antialias: true,
        }) as WebGL2RenderingContext | null;

        if (webgl2) {
            return new WebGLRenderer(webgl2, {
                vertexAttribDivisor: webgl2.vertexAttribDivisor.bind(webgl2),
                drawArraysInstanced: webgl2.drawArraysInstanced.bind(webgl2),
            });
        }

        const webgl = (canvas.getContext('webgl', {
            alpha: false,
            antialias: true,
        }) ||
            canvas.getContext('experimental-webgl', {
                alpha: false,
                antialias: true,
            })) as WebGLRenderingContext | null;

        if (!webgl) {
            return null;
        }

        const instancingExtension = webgl.getExtension('ANGLE_instanced_arrays');
        if (!instancingExtension) {
            return null;
        }

        return new WebGLRenderer(webgl, {
            vertexAttribDivisor: instancingExtension.vertexAttribDivisorANGLE.bind(instancingExtension),
            drawArraysInstanced: instancingExtension.drawArraysInstancedANGLE.bind(instancingExtension),
        });
    }

    private constructor(gl: WebGLContext, instancing: InstancingApi) {
        this.gl = gl;
        this.instancing = instancing;
        this.circleProgram = this.createCircleProgram();
        this.textureProgram = this.createTextureProgram();
        this.glowProgram = this.createGlowProgram();
        this.emptyCircleBatch = this.createCircleBatch(this.createEmptyCircleUnitPositions(), gl.LINES);
        this.filledCircleBatch = this.createCircleBatch(this.createFilledCircleUnitPositions(), gl.TRIANGLES);
        this.glowBatch = this.createGlowBatch();
        this.textureQuadBuffer = this.createTextureQuadBuffer();

        gl.disable(gl.DEPTH_TEST);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.clearColor(0, 0, 0, 1);
    }

    resize(width: number, height: number): void {
        this.gl.viewport(0, 0, width, height);
    }

    beginFrame(camera: WebGLCamera): void {
        this.camera = camera;
        this.emptyCircleBatch.count = 0;
        this.filledCircleBatch.count = 0;
        this.glowBatch.count = 0;
        this.textureBatches.forEach(batch => {
            batch.count = 0;
        });

        this.gl.viewport(0, 0, camera.width, camera.height);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    }

    drawCircle(x: number, y: number, radius: number, color = 'white'): void {
        this.queueCircle(this.emptyCircleBatch, x, y, radius, color);
    }

    drawFilledCircle(x: number, y: number, radius: number, color = 'white'): void {
        this.queueCircle(this.filledCircleBatch, x, y, radius, color);
    }

    drawTexture(
        x: number,
        y: number,
        width: number,
        height: number,
        textureSource: ImageBitmap,
        textureScale = 1,
    ): void {
        if (width <= 0 || height <= 0 || textureScale <= 0) {
            return;
        }

        const batch = this.getTextureBatch(textureSource);
        this.ensureTextureCapacity(batch, batch.count + 1);

        let offset = batch.count * FLOATS_PER_TEXTURE_INSTANCE;

        batch.instances[offset++] = x;
        batch.instances[offset++] = y;
        batch.instances[offset++] = (width * textureScale) / 2;
        batch.instances[offset] = (height * textureScale) / 2;

        batch.count += 1;
    }

    drawGlow(x: number, y: number, innerRadius: number, outerRadius: number, color = 'white', alpha = 1): void {
        if (innerRadius < 0 || outerRadius <= 0 || outerRadius < innerRadius || alpha <= 0) {
            return;
        }

        this.ensureGlowCapacity(this.glowBatch.count + 1);

        const parsedColor = this.parseColor(color);
        let offset = this.glowBatch.count * FLOATS_PER_GLOW_INSTANCE;

        this.glowBatch.instances[offset++] = x;
        this.glowBatch.instances[offset++] = y;
        this.glowBatch.instances[offset++] = innerRadius;
        this.glowBatch.instances[offset++] = outerRadius;
        this.glowBatch.instances[offset++] = parsedColor[0];
        this.glowBatch.instances[offset++] = parsedColor[1];
        this.glowBatch.instances[offset++] = parsedColor[2];
        this.glowBatch.instances[offset] = parsedColor[3] * alpha;

        this.glowBatch.count += 1;
    }

    flush(): void {
        this.flushGlowBatch();
        this.flushCircleBatch(this.filledCircleBatch);
        this.flushTextureBatches();
        this.flushCircleBatch(this.emptyCircleBatch);
    }

    private queueCircle(batch: CircleBatch, x: number, y: number, radius: number, color: string): void {
        if (radius <= 0) {
            return;
        }

        this.ensureCircleCapacity(batch, batch.count + 1);

        const parsedColor = this.parseColor(color);
        let offset = batch.count * FLOATS_PER_CIRCLE_INSTANCE;

        batch.instances[offset++] = x;
        batch.instances[offset++] = y;
        batch.instances[offset++] = radius;
        batch.instances[offset++] = parsedColor[0];
        batch.instances[offset++] = parsedColor[1];
        batch.instances[offset++] = parsedColor[2];
        batch.instances[offset] = parsedColor[3];

        batch.count += 1;
    }

    private flushCircleBatch(batch: CircleBatch): void {
        if (batch.count === 0) {
            return;
        }

        const gl = this.gl;
        const instanceData = batch.instances.subarray(0, batch.count * FLOATS_PER_CIRCLE_INSTANCE);
        const stride = FLOATS_PER_CIRCLE_INSTANCE * Float32Array.BYTES_PER_ELEMENT;

        gl.useProgram(this.circleProgram.program);
        gl.uniform2f(this.circleProgram.resolutionUniform, this.camera.width, this.camera.height);
        gl.uniform2f(this.circleProgram.panUniform, this.camera.panX, this.camera.panY);
        gl.uniform1f(this.circleProgram.zoomUniform, this.camera.zoom);

        gl.bindBuffer(gl.ARRAY_BUFFER, batch.unitPositionBuffer);
        gl.enableVertexAttribArray(this.circleProgram.unitPositionAttribute);
        gl.vertexAttribPointer(this.circleProgram.unitPositionAttribute, 2, gl.FLOAT, false, 0, 0);
        this.instancing.vertexAttribDivisor(this.circleProgram.unitPositionAttribute, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, batch.instanceBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, instanceData, gl.DYNAMIC_DRAW);

        gl.enableVertexAttribArray(this.circleProgram.centerRadiusAttribute);
        gl.vertexAttribPointer(this.circleProgram.centerRadiusAttribute, 3, gl.FLOAT, false, stride, 0);
        this.instancing.vertexAttribDivisor(this.circleProgram.centerRadiusAttribute, 1);

        gl.enableVertexAttribArray(this.circleProgram.colorAttribute);
        gl.vertexAttribPointer(
            this.circleProgram.colorAttribute,
            4,
            gl.FLOAT,
            false,
            stride,
            3 * Float32Array.BYTES_PER_ELEMENT,
        );
        this.instancing.vertexAttribDivisor(this.circleProgram.colorAttribute, 1);

        gl.lineWidth(1);
        this.instancing.drawArraysInstanced(batch.drawMode, 0, batch.vertexCount, batch.count);
    }

    private flushGlowBatch(): void {
        if (this.glowBatch.count === 0) {
            return;
        }

        const gl = this.gl;
        const instanceData = this.glowBatch.instances.subarray(0, this.glowBatch.count * FLOATS_PER_GLOW_INSTANCE);
        const instanceStride = FLOATS_PER_GLOW_INSTANCE * Float32Array.BYTES_PER_ELEMENT;

        gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
        gl.useProgram(this.glowProgram.program);
        gl.uniform2f(this.glowProgram.resolutionUniform, this.camera.width, this.camera.height);
        gl.uniform2f(this.glowProgram.panUniform, this.camera.panX, this.camera.panY);
        gl.uniform1f(this.glowProgram.zoomUniform, this.camera.zoom);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.textureQuadBuffer);
        gl.enableVertexAttribArray(this.glowProgram.unitPositionAttribute);
        gl.vertexAttribPointer(
            this.glowProgram.unitPositionAttribute,
            2,
            gl.FLOAT,
            false,
            FLOATS_PER_TEXTURE_VERTEX * Float32Array.BYTES_PER_ELEMENT,
            0,
        );
        this.instancing.vertexAttribDivisor(this.glowProgram.unitPositionAttribute, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.glowBatch.instanceBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, instanceData, gl.DYNAMIC_DRAW);

        gl.enableVertexAttribArray(this.glowProgram.centerInnerOuterAttribute);
        gl.vertexAttribPointer(this.glowProgram.centerInnerOuterAttribute, 4, gl.FLOAT, false, instanceStride, 0);
        this.instancing.vertexAttribDivisor(this.glowProgram.centerInnerOuterAttribute, 1);

        gl.enableVertexAttribArray(this.glowProgram.colorAttribute);
        gl.vertexAttribPointer(
            this.glowProgram.colorAttribute,
            4,
            gl.FLOAT,
            false,
            instanceStride,
            4 * Float32Array.BYTES_PER_ELEMENT,
        );
        this.instancing.vertexAttribDivisor(this.glowProgram.colorAttribute, 1);

        this.instancing.drawArraysInstanced(gl.TRIANGLES, 0, 6, this.glowBatch.count);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    }

    private flushTextureBatches(): void {
        const gl = this.gl;
        const stride = FLOATS_PER_TEXTURE_INSTANCE * Float32Array.BYTES_PER_ELEMENT;

        gl.useProgram(this.textureProgram.program);
        gl.uniform2f(this.textureProgram.resolutionUniform, this.camera.width, this.camera.height);
        gl.uniform2f(this.textureProgram.panUniform, this.camera.panX, this.camera.panY);
        gl.uniform1f(this.textureProgram.zoomUniform, this.camera.zoom);
        gl.uniform1i(this.textureProgram.textureUniform, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.textureQuadBuffer);

        gl.enableVertexAttribArray(this.textureProgram.unitPositionAttribute);
        gl.vertexAttribPointer(
            this.textureProgram.unitPositionAttribute,
            2,
            gl.FLOAT,
            false,
            FLOATS_PER_TEXTURE_VERTEX * Float32Array.BYTES_PER_ELEMENT,
            0,
        );
        this.instancing.vertexAttribDivisor(this.textureProgram.unitPositionAttribute, 0);

        gl.enableVertexAttribArray(this.textureProgram.textureCoordAttribute);
        gl.vertexAttribPointer(
            this.textureProgram.textureCoordAttribute,
            2,
            gl.FLOAT,
            false,
            FLOATS_PER_TEXTURE_VERTEX * Float32Array.BYTES_PER_ELEMENT,
            2 * Float32Array.BYTES_PER_ELEMENT,
        );
        this.instancing.vertexAttribDivisor(this.textureProgram.textureCoordAttribute, 0);

        gl.activeTexture(gl.TEXTURE0);

        this.textureBatches.forEach(batch => {
            if (batch.count === 0) {
                return;
            }

            const instanceData = batch.instances.subarray(0, batch.count * FLOATS_PER_TEXTURE_INSTANCE);

            gl.bindTexture(gl.TEXTURE_2D, batch.texture);
            gl.bindBuffer(gl.ARRAY_BUFFER, batch.instanceBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, instanceData, gl.DYNAMIC_DRAW);

            gl.enableVertexAttribArray(this.textureProgram.centerSizeAttribute);
            gl.vertexAttribPointer(this.textureProgram.centerSizeAttribute, 4, gl.FLOAT, false, stride, 0);
            this.instancing.vertexAttribDivisor(this.textureProgram.centerSizeAttribute, 1);

            this.instancing.drawArraysInstanced(gl.TRIANGLES, 0, 6, batch.count);
        });
    }

    private createCircleProgram(): CircleProgram {
        const program = this.createProgram(CIRCLE_VERTEX_SHADER_SOURCE, CIRCLE_FRAGMENT_SHADER_SOURCE);
        const unitPositionAttribute = this.getAttributeLocation(program, 'a_unitPosition');
        const centerRadiusAttribute = this.getAttributeLocation(program, 'a_centerRadius');
        const colorAttribute = this.getAttributeLocation(program, 'a_color');
        const resolutionUniform = this.getUniformLocation(program, 'u_resolution');
        const panUniform = this.getUniformLocation(program, 'u_pan');
        const zoomUniform = this.getUniformLocation(program, 'u_zoom');

        return {
            program,
            unitPositionAttribute,
            centerRadiusAttribute,
            colorAttribute,
            resolutionUniform,
            panUniform,
            zoomUniform,
        };
    }

    private createTextureProgram(): TextureProgram {
        const program = this.createProgram(TEXTURE_VERTEX_SHADER_SOURCE, TEXTURE_FRAGMENT_SHADER_SOURCE);
        const unitPositionAttribute = this.getAttributeLocation(program, 'a_unitPosition');
        const textureCoordAttribute = this.getAttributeLocation(program, 'a_textureCoord');
        const centerSizeAttribute = this.getAttributeLocation(program, 'a_centerSize');
        const resolutionUniform = this.getUniformLocation(program, 'u_resolution');
        const panUniform = this.getUniformLocation(program, 'u_pan');
        const zoomUniform = this.getUniformLocation(program, 'u_zoom');
        const textureUniform = this.getUniformLocation(program, 'u_texture');

        return {
            program,
            unitPositionAttribute,
            textureCoordAttribute,
            centerSizeAttribute,
            resolutionUniform,
            panUniform,
            zoomUniform,
            textureUniform,
        };
    }

    private createGlowProgram(): GlowProgram {
        const program = this.createProgram(GLOW_VERTEX_SHADER_SOURCE, GLOW_FRAGMENT_SHADER_SOURCE);
        const unitPositionAttribute = this.getAttributeLocation(program, 'a_unitPosition');
        const centerInnerOuterAttribute = this.getAttributeLocation(program, 'a_centerInnerOuter');
        const colorAttribute = this.getAttributeLocation(program, 'a_color');
        const resolutionUniform = this.getUniformLocation(program, 'u_resolution');
        const panUniform = this.getUniformLocation(program, 'u_pan');
        const zoomUniform = this.getUniformLocation(program, 'u_zoom');

        return {
            program,
            unitPositionAttribute,
            centerInnerOuterAttribute,
            colorAttribute,
            resolutionUniform,
            panUniform,
            zoomUniform,
        };
    }

    private createCircleBatch(unitPositions: Float32Array, drawMode: number): CircleBatch {
        const unitPositionBuffer = this.createBuffer();
        const instanceBuffer = this.createBuffer();

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, unitPositionBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, unitPositions, this.gl.STATIC_DRAW);

        return {
            unitPositionBuffer,
            instanceBuffer,
            vertexCount: unitPositions.length / 2,
            drawMode,
            instances: new Float32Array(INITIAL_CIRCLE_BATCH_CAPACITY * FLOATS_PER_CIRCLE_INSTANCE),
            count: 0,
        };
    }

    private createGlowBatch(): GlowBatch {
        return {
            instanceBuffer: this.createBuffer(),
            instances: new Float32Array(INITIAL_GLOW_BATCH_CAPACITY * FLOATS_PER_GLOW_INSTANCE),
            count: 0,
        };
    }

    private createEmptyCircleUnitPositions(): Float32Array {
        const vertices = new Float32Array(CIRCLE_SEGMENTS * 2 * 2);
        let offset = 0;

        for (let i = 0; i < CIRCLE_SEGMENTS; i++) {
            const startAngle = (i / CIRCLE_SEGMENTS) * Math.PI * 2;
            const endAngle = ((i + 1) / CIRCLE_SEGMENTS) * Math.PI * 2;

            vertices[offset++] = Math.cos(startAngle);
            vertices[offset++] = Math.sin(startAngle);
            vertices[offset++] = Math.cos(endAngle);
            vertices[offset++] = Math.sin(endAngle);
        }

        return vertices;
    }

    private createFilledCircleUnitPositions(): Float32Array {
        const vertices = new Float32Array(CIRCLE_SEGMENTS * 3 * 2);
        let offset = 0;

        for (let i = 0; i < CIRCLE_SEGMENTS; i++) {
            const startAngle = (i / CIRCLE_SEGMENTS) * Math.PI * 2;
            const endAngle = ((i + 1) / CIRCLE_SEGMENTS) * Math.PI * 2;

            vertices[offset++] = 0;
            vertices[offset++] = 0;
            vertices[offset++] = Math.cos(startAngle);
            vertices[offset++] = Math.sin(startAngle);
            vertices[offset++] = Math.cos(endAngle);
            vertices[offset++] = Math.sin(endAngle);
        }

        return vertices;
    }

    private createTextureQuadBuffer(): WebGLBuffer {
        const buffer = this.createBuffer();
        const vertices = new Float32Array([
            -1, -1, 0, 1, 1, -1, 1, 1, 1, 1, 1, 0, -1, -1, 0, 1, 1, 1, 1, 0, -1, 1, 0, 0,
        ]);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);

        return buffer;
    }

    private ensureCircleCapacity(batch: CircleBatch, circleCapacity: number): void {
        const floatCapacity = circleCapacity * FLOATS_PER_CIRCLE_INSTANCE;

        if (floatCapacity <= batch.instances.length) {
            return;
        }

        let nextCapacity = batch.instances.length;
        while (nextCapacity < floatCapacity) {
            nextCapacity *= 2;
        }

        const nextInstances = new Float32Array(nextCapacity);
        nextInstances.set(batch.instances);
        batch.instances = nextInstances;
    }

    private ensureTextureCapacity(batch: TextureBatch, textureCapacity: number): void {
        const floatCapacity = textureCapacity * FLOATS_PER_TEXTURE_INSTANCE;

        if (floatCapacity <= batch.instances.length) {
            return;
        }

        let nextCapacity = batch.instances.length;
        while (nextCapacity < floatCapacity) {
            nextCapacity *= 2;
        }

        const nextInstances = new Float32Array(nextCapacity);
        nextInstances.set(batch.instances);
        batch.instances = nextInstances;
    }

    private ensureGlowCapacity(glowCapacity: number): void {
        const floatCapacity = glowCapacity * FLOATS_PER_GLOW_INSTANCE;

        if (floatCapacity <= this.glowBatch.instances.length) {
            return;
        }

        let nextCapacity = this.glowBatch.instances.length;
        while (nextCapacity < floatCapacity) {
            nextCapacity *= 2;
        }

        const nextInstances = new Float32Array(nextCapacity);
        nextInstances.set(this.glowBatch.instances);
        this.glowBatch.instances = nextInstances;
    }

    private getTextureBatch(textureSource: ImageBitmap): TextureBatch {
        const existingBatch = this.textureBatches.get(textureSource);

        if (existingBatch) {
            return existingBatch;
        }

        const batch: TextureBatch = {
            texture: this.createTexture(textureSource),
            instanceBuffer: this.createBuffer(),
            instances: new Float32Array(INITIAL_TEXTURE_BATCH_CAPACITY * FLOATS_PER_TEXTURE_INSTANCE),
            count: 0,
        };

        this.textureBatches.set(textureSource, batch);
        return batch;
    }

    private createTexture(textureSource: ImageBitmap): WebGLTexture {
        const texture = this.gl.createTexture();

        if (!texture) {
            throw new Error('Failed to create WebGL texture.');
        }

        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
        this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, false);
        this.gl.pixelStorei(this.gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, textureSource);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

        return texture;
    }

    private createBuffer(): WebGLBuffer {
        const buffer = this.gl.createBuffer();

        if (!buffer) {
            throw new Error('Failed to create WebGL buffer.');
        }

        return buffer;
    }

    private createProgram(vertexShaderSource: string, fragmentShaderSource: string): WebGLProgram {
        const vertexShader = this.createShader(this.gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, fragmentShaderSource);
        const program = this.gl.createProgram();

        if (!program) {
            throw new Error('Failed to create WebGL program.');
        }

        this.gl.attachShader(program, vertexShader);
        this.gl.attachShader(program, fragmentShader);
        this.gl.linkProgram(program);

        if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
            const log = this.gl.getProgramInfoLog(program);
            this.gl.deleteProgram(program);
            throw new Error(`Failed to link WebGL program: ${log}`);
        }

        return program;
    }

    private createShader(type: number, source: string): WebGLShader {
        const shader = this.gl.createShader(type);

        if (!shader) {
            throw new Error('Failed to create WebGL shader.');
        }

        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);

        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            const log = this.gl.getShaderInfoLog(shader);
            this.gl.deleteShader(shader);
            throw new Error(`Failed to compile WebGL shader: ${log}`);
        }

        return shader;
    }

    private getAttributeLocation(program: WebGLProgram, name: string): number {
        const location = this.gl.getAttribLocation(program, name);

        if (location < 0) {
            throw new Error(`Failed to find WebGL attribute "${name}".`);
        }

        return location;
    }

    private getUniformLocation(program: WebGLProgram, name: string): WebGLUniformLocation {
        const location = this.gl.getUniformLocation(program, name);

        if (!location) {
            throw new Error(`Failed to find WebGL uniform "${name}".`);
        }

        return location;
    }

    private parseColor(color: string): Color {
        const cachedColor = this.colorCache.get(color);

        if (cachedColor) {
            return cachedColor;
        }

        const normalizedColor = color.trim().toLowerCase();
        const parsedColor =
            NAMED_COLORS[normalizedColor] ??
            this.parseHexColor(normalizedColor) ??
            this.parseRgbColor(normalizedColor) ??
            NAMED_COLORS.white;

        this.colorCache.set(color, parsedColor);
        return parsedColor;
    }

    private parseHexColor(color: string): Color | null {
        if (!color.startsWith('#')) {
            return null;
        }

        const hex = color.slice(1);

        if (hex.length === 3 || hex.length === 4) {
            const red = parseInt(hex[0] + hex[0], 16);
            const green = parseInt(hex[1] + hex[1], 16);
            const blue = parseInt(hex[2] + hex[2], 16);
            const alpha = hex.length === 4 ? parseInt(hex[3] + hex[3], 16) : 255;

            return [red / 255, green / 255, blue / 255, alpha / 255];
        }

        if (hex.length === 6 || hex.length === 8) {
            const red = parseInt(hex.slice(0, 2), 16);
            const green = parseInt(hex.slice(2, 4), 16);
            const blue = parseInt(hex.slice(4, 6), 16);
            const alpha = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) : 255;

            return [red / 255, green / 255, blue / 255, alpha / 255];
        }

        return null;
    }

    private parseRgbColor(color: string): Color | null {
        const match = color.match(/^rgba?\((.+)\)$/);

        if (!match) {
            return null;
        }

        const parts = match[1].split(',').map(part => part.trim());

        if (parts.length < 3) {
            return null;
        }

        const red = Number(parts[0]);
        const green = Number(parts[1]);
        const blue = Number(parts[2]);
        const alpha = parts[3] === undefined ? 1 : Number(parts[3]);

        if ([red, green, blue, alpha].some(value => Number.isNaN(value))) {
            return null;
        }

        return [red / 255, green / 255, blue / 255, alpha];
    }
}
