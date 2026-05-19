export class Camera3D {
    x = 0;
    y = 0;
    z = -1000;

    yaw = 0;
    pitch = 0;

    focalLength = 800;

    screenWidth: number;
    screenHeight: number;

    near = 1;

    private forwardX = 0;
    private forwardY = 0;
    private forwardZ = 1;
    private rightX = 1;
    private rightY = 0;
    private rightZ = 0;
    private upX = 0;
    private upY = 1;
    private upZ = 0;

    constructor(screenWidth: number, screenHeight: number) {
        this.screenWidth = screenWidth;
        this.screenHeight = screenHeight;
    }

    resize(screenWidth: number, screenHeight: number): void {
        this.screenWidth = screenWidth;
        this.screenHeight = screenHeight;
    }

    rotate(deltaYaw: number, deltaPitch: number): void {
        let nextPitch = this.pitch + deltaPitch;

        if (deltaYaw !== 0 && Math.abs(nextPitch) < 0.001) {
            nextPitch = 0.35;
        }

        this.setRotation(this.yaw + deltaYaw, nextPitch);
    }

    setRotation(yaw: number, pitch: number): void {
        const maxPitch = Math.PI * 0.5 - 0.08;

        this.yaw = yaw;
        this.pitch = Math.max(-maxPitch, Math.min(maxPitch, pitch));
    }

    lookAt(targetX: number, targetY: number, targetZ: number, distance: number): void {
        const sinYaw = Math.sin(this.yaw);
        const cosYaw = Math.cos(this.yaw);
        const sinPitch = Math.sin(this.pitch);
        const cosPitch = Math.cos(this.pitch);

        this.x = targetX + sinYaw * sinPitch * distance;
        this.y = targetY - cosYaw * sinPitch * distance;
        this.z = targetZ - cosPitch * distance;

        this.updateBasisFromTarget(targetX, targetY, targetZ);
    }

    project(x: number, y: number, z: number): ProjectedPoint | null {
        const offsetX = x - this.x;
        const offsetY = y - this.y;
        const offsetZ = z - this.z;
        const cameraX = offsetX * this.rightX + offsetY * this.rightY + offsetZ * this.rightZ;
        const cameraY = offsetX * this.upX + offsetY * this.upY + offsetZ * this.upZ;
        const cameraZ = offsetX * this.forwardX + offsetY * this.forwardY + offsetZ * this.forwardZ;

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

    screenToWorldAtZ(screenX: number, screenY: number, worldZ: number): WorldPoint3D | null {
        const cameraX = screenX - this.screenWidth * 0.5;
        const cameraY = this.screenHeight * 0.5 - screenY;
        const rayX = this.rightX * cameraX + this.upX * cameraY + this.forwardX * this.focalLength;
        const rayY = this.rightY * cameraX + this.upY * cameraY + this.forwardY * this.focalLength;
        const rayZ = this.rightZ * cameraX + this.upZ * cameraY + this.forwardZ * this.focalLength;

        if (Math.abs(rayZ) < 1e-9) {
            return null;
        }

        const t = (worldZ - this.z) / rayZ;

        if (t < 0) {
            return null;
        }

        return {
            x: this.x + rayX * t,
            y: this.y + rayY * t,
            z: worldZ,
        };
    }

    private updateBasisFromTarget(targetX: number, targetY: number, targetZ: number): void {
        const forwardX = targetX - this.x;
        const forwardY = targetY - this.y;
        const forwardZ = targetZ - this.z;
        const forwardLength = Math.sqrt(forwardX * forwardX + forwardY * forwardY + forwardZ * forwardZ);

        if (forwardLength === 0) {
            return;
        }

        this.forwardX = forwardX / forwardLength;
        this.forwardY = forwardY / forwardLength;
        this.forwardZ = forwardZ / forwardLength;

        const upHintX = 0;
        let upHintY = 1;
        let upHintZ = 0;

        if (Math.abs(this.forwardY) > 0.98) {
            upHintY = 0;
            upHintZ = this.forwardY > 0 ? -1 : 1;
        }

        let rightX = upHintY * this.forwardZ - upHintZ * this.forwardY;
        let rightY = upHintZ * this.forwardX - upHintX * this.forwardZ;
        let rightZ = upHintX * this.forwardY - upHintY * this.forwardX;
        const rightLength = Math.sqrt(rightX * rightX + rightY * rightY + rightZ * rightZ);

        if (rightLength === 0) {
            rightX = 1;
            rightY = 0;
            rightZ = 0;
        } else {
            rightX /= rightLength;
            rightY /= rightLength;
            rightZ /= rightLength;
        }

        this.rightX = rightX;
        this.rightY = rightY;
        this.rightZ = rightZ;
        this.upX = this.forwardY * rightZ - this.forwardZ * rightY;
        this.upY = this.forwardZ * rightX - this.forwardX * rightZ;
        this.upZ = this.forwardX * rightY - this.forwardY * rightX;
    }
}

export type ProjectedPoint = {
    x: number;
    y: number;
    scale: number;
    depth: number;
};

export type WorldPoint3D = {
    x: number;
    y: number;
    z: number;
};
