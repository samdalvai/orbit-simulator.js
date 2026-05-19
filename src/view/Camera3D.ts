export class Camera3D {
    x = 0;
    y = 0;
    z = -1000;

    focalLength = 800;

    screenWidth: number;
    screenHeight: number;

    near = 1;

    constructor(screenWidth: number, screenHeight: number) {
        this.screenWidth = screenWidth;
        this.screenHeight = screenHeight;
    }

    resize(screenWidth: number, screenHeight: number): void {
        this.screenWidth = screenWidth;
        this.screenHeight = screenHeight;
    }

    project(x: number, y: number, z: number): ProjectedPoint | null {
        const cameraX = x - this.x;
        const cameraY = y - this.y;
        const cameraZ = z - this.z;

        if (cameraZ <= this.near) {
            return null;
        }

        const scale = this.focalLength / cameraZ;

        return {
            x: this.screenWidth * 0.5 + cameraX * scale,
            y: this.screenHeight * 0.5 - cameraY * scale,
            scale,
            depth: cameraZ,
        };
    }
}

export type ProjectedPoint = {
    x: number;
    y: number;
    scale: number;
    depth: number;
};
