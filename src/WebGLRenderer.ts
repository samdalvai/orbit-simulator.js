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

const FLOATS_PER_CIRCLE_INSTANCE = 7;
const CIRCLE_SEGMENTS = 96;
const INITIAL_CIRCLE_BATCH_CAPACITY = 1024;

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

export default class WebGLRenderer {
    private readonly gl: WebGLContext;
    private readonly instancing: InstancingApi;
    private readonly circleProgram: CircleProgram;
    private readonly emptyCircleBatch: CircleBatch;
    private readonly filledCircleBatch: CircleBatch;
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
        this.emptyCircleBatch = this.createCircleBatch(this.createEmptyCircleUnitPositions(), gl.LINES);
        this.filledCircleBatch = this.createCircleBatch(this.createFilledCircleUnitPositions(), gl.TRIANGLES);

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

        this.gl.viewport(0, 0, camera.width, camera.height);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    }

    drawCircle(x: number, y: number, radius: number, color = 'white'): void {
        this.queueCircle(this.emptyCircleBatch, x, y, radius, color);
    }

    drawFilledCircle(x: number, y: number, radius: number, color = 'white'): void {
        this.queueCircle(this.filledCircleBatch, x, y, radius, color);
    }

    flush(): void {
        this.flushCircleBatch(this.filledCircleBatch);
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
