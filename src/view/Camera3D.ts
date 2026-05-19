import { Vec3 } from '../shared/Vec3';

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
        const maxPitch = Math.PI - 0.08;
        const nextPitch = Math.max(-maxPitch, Math.min(maxPitch, this.pitch + deltaPitch));
        const appliedPitch = nextPitch - this.pitch;

        // Rotate around the camera basis so each control axis stays local to the current view.
        if (deltaYaw !== 0) {
            this.rotateBasisAroundAxis(this.upX, this.upY, this.upZ, -deltaYaw);
        }

        if (appliedPitch !== 0) {
            this.rotateBasisAroundAxis(this.rightX, this.rightY, this.rightZ, -appliedPitch);
        }

        this.yaw += deltaYaw;
        this.pitch = nextPitch;
        this.orthonormalizeBasis();
    }

    setRotation(yaw: number, pitch: number): void {
        const maxPitch = Math.PI * 0.5 - 0.08;
        this.yaw = yaw;
        this.pitch = Math.max(-maxPitch, Math.min(maxPitch, pitch));

        const sinYaw = Math.sin(this.yaw);
        const cosYaw = Math.cos(this.yaw);
        const sinPitch = Math.sin(this.pitch);
        const cosPitch = Math.cos(this.pitch);

        this.forwardX = -sinYaw * cosPitch;
        this.forwardY = sinPitch;
        this.forwardZ = cosYaw * cosPitch;
        this.rightX = cosYaw;
        this.rightY = 0;
        this.rightZ = sinYaw;
        this.upX = sinYaw * sinPitch;
        this.upY = cosPitch;
        this.upZ = -cosYaw * sinPitch;
    }

    lookAt(targetX: number, targetY: number, targetZ: number, distance: number): void {
        this.x = targetX - this.forwardX * distance;
        this.y = targetY - this.forwardY * distance;
        this.z = targetZ - this.forwardZ * distance;
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

    screenToWorldAtZ(screenX: number, screenY: number, worldZ: number): Vec3 | null {
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

        return new Vec3(this.x + rayX * t, this.y + rayY * t, worldZ);
    }

    private rotateBasisAroundAxis(axisX: number, axisY: number, axisZ: number, angle: number): void {
        const nextForward = this.rotateVectorAroundAxis(
            this.forwardX,
            this.forwardY,
            this.forwardZ,
            axisX,
            axisY,
            axisZ,
            angle,
        );
        const nextRight = this.rotateVectorAroundAxis(
            this.rightX,
            this.rightY,
            this.rightZ,
            axisX,
            axisY,
            axisZ,
            angle,
        );
        const nextUp = this.rotateVectorAroundAxis(this.upX, this.upY, this.upZ, axisX, axisY, axisZ, angle);

        this.forwardX = nextForward.x;
        this.forwardY = nextForward.y;
        this.forwardZ = nextForward.z;
        this.rightX = nextRight.x;
        this.rightY = nextRight.y;
        this.rightZ = nextRight.z;
        this.upX = nextUp.x;
        this.upY = nextUp.y;
        this.upZ = nextUp.z;
    }

    private rotateVectorAroundAxis(
        x: number,
        y: number,
        z: number,
        axisX: number,
        axisY: number,
        axisZ: number,
        angle: number,
    ): Vec3 {
        const sin = Math.sin(angle);
        const cos = Math.cos(angle);
        const dot = x * axisX + y * axisY + z * axisZ;

        return new Vec3(
            x * cos + (axisY * z - axisZ * y) * sin + axisX * dot * (1 - cos),
            y * cos + (axisZ * x - axisX * z) * sin + axisY * dot * (1 - cos),
            z * cos + (axisX * y - axisY * x) * sin + axisZ * dot * (1 - cos),
        );
    }

    private orthonormalizeBasis(): void {
        const forwardLength = Math.sqrt(
            this.forwardX * this.forwardX + this.forwardY * this.forwardY + this.forwardZ * this.forwardZ,
        );

        if (forwardLength === 0) {
            return;
        }

        this.forwardX /= forwardLength;
        this.forwardY /= forwardLength;
        this.forwardZ /= forwardLength;

        let rightX = this.upY * this.forwardZ - this.upZ * this.forwardY;
        let rightY = this.upZ * this.forwardX - this.upX * this.forwardZ;
        let rightZ = this.upX * this.forwardY - this.upY * this.forwardX;
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
