import { Vec3 } from '../shared/Vec3';

const MIN_ZOOM = 0.0001;
const MAX_PITCH = Math.PI - 0.08;

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

    private zoomValue = 1;
    private targetXValue = 0;
    private targetYValue = 0;
    private targetZValue = 0;

    /**
     * The camera's local coordinate system, stored as three unit vectors.
     *
     * `forward` points in the direction the camera is looking.
     * `right` points toward the camera's local +X direction on screen.
     * `up` points toward the camera's local +Y direction on screen.
     *
     * Projection uses these vectors to convert a world-space offset into
     * camera-space coordinates:
     * - distance along `right` becomes screen X
     * - distance along `up` becomes screen Y
     * - distance along `forward` becomes depth
     *
     * `screenToWorldAtZ()` uses the same basis in reverse to build a world ray
     * from a screen coordinate. These values are rebuilt from yaw/pitch in
     * `updateBasisFromAngles()`.
     */
    private forwardX = 0;
    private forwardY = 0;
    private forwardZ = 1;
    private rightX = 1;
    private rightY = 0;
    private rightZ = 0;
    private upX = 0;
    private upY = 1;
    private upZ = 0;

    /**
     * Creates a camera for a viewport of the given pixel size.
     *
     * The camera starts focused on world origin, looking along positive world Z.
     * `screenWidth` and `screenHeight` are used as the center point for
     * perspective projection and can later be changed with `resize`.
     */
    constructor(screenWidth: number, screenHeight: number) {
        this.screenWidth = screenWidth;
        this.screenHeight = screenHeight;
        this.updatePositionFromTarget();
    }

    get zoom(): number {
        return this.zoomValue;
    }

    set zoom(zoom: number) {
        this.zoomValue = Math.max(MIN_ZOOM, zoom);
        this.updatePositionFromTarget();
    }

    get targetX(): number {
        return this.targetXValue;
    }

    get targetY(): number {
        return this.targetYValue;
    }

    get targetZ(): number {
        return this.targetZValue;
    }

    /**
     * Updates the viewport dimensions used by projection math.
     *
     * This does not move or rotate the camera. It only changes where projected
     * points land on the screen, because the screen center is calculated from
     * these dimensions.
     */
    resize(screenWidth: number, screenHeight: number): void {
        this.screenWidth = screenWidth;
        this.screenHeight = screenHeight;
    }

    /**
     * Sets the world-space point the camera orbits and looks toward.
     *
     * Changing the target immediately moves the camera position while keeping
     * the current yaw, pitch, and zoom. This replaces the old renderer-owned
     * `pan` state with camera-owned focus state.
     */
    setTarget(x: number, y: number, z: number): void {
        this.targetXValue = x;
        this.targetYValue = y;
        this.targetZValue = z;
        this.updatePositionFromTarget();
    }

    /**
     * Moves the current camera target by a world-space offset.
     *
     * This is used for drag panning and zoom-to-cursor correction. The camera
     * follows the target immediately, preserving the current orientation and
     * distance from the target.
     */
    moveTarget(deltaX: number, deltaY: number, deltaZ = 0): void {
        this.targetXValue += deltaX;
        this.targetYValue += deltaY;
        this.targetZValue += deltaZ;
        this.updatePositionFromTarget();
    }

    /**
     * Applies an incremental orbit-style rotation to the camera.
     *
     * `deltaYaw` changes the horizontal angle around the target, and
     * `deltaPitch` changes the vertical angle. After updating the angles, the
     * camera basis is rebuilt from yaw/pitch so it stays orthonormal without
     * incremental drift.
     *
     * Pitch is clamped just short of straight up/down so the derived basis
     * remains stable.
     */
    rotate(deltaYaw: number, deltaPitch: number): void {
        this.yaw += deltaYaw;
        this.pitch = this.clampPitch(this.pitch + deltaPitch);
        this.updateBasisFromAngles();
        this.updatePositionFromTarget();
    }

    /**
     * Replaces the camera orientation with an absolute yaw and pitch.
     *
     * This is useful for resetting the view or syncing the camera to saved
     * state. It uses the same clamp and basis rebuild path as `rotate`, which
     * keeps camera orientation behavior consistent.
     *
     * The pitch is clamped just short of straight up/down so the derived basis
     * remains stable.
     */
    setRotation(yaw: number, pitch: number): void {
        this.yaw = yaw;
        this.pitch = this.clampPitch(pitch);
        this.updateBasisFromAngles();
        this.updatePositionFromTarget();
    }

    /**
     * Projects a world-space point into 2D screen coordinates.
     *
     * The world point is first converted into camera space by measuring its
     * offset from the camera along the camera's right, up, and forward axes.
     * `cameraZ` is the depth in front of the camera. Points at or behind the
     * near plane return `false` because they should not be rendered.
     *
     * For visible points, perspective scaling is `focalLength / cameraZ`.
     * Larger depth means smaller scale. Screen Y is inverted because screen
     * coordinates usually increase downward while camera/world Y increases up.
     *
     * The result is written into `out` to avoid allocating a new object for
     * every body during rendering.
     */
    projectTo(out: ProjectedPoint, x: number, y: number, z: number): boolean {
        const offsetX = x - this.x;
        const offsetY = y - this.y;
        const offsetZ = z - this.z;
        const cameraX = offsetX * this.rightX + offsetY * this.rightY + offsetZ * this.rightZ;
        const cameraY = offsetX * this.upX + offsetY * this.upY + offsetZ * this.upZ;
        const cameraZ = offsetX * this.forwardX + offsetY * this.forwardY + offsetZ * this.forwardZ;

        if (cameraZ <= this.near) {
            return false;
        }

        const scale = this.focalLength / cameraZ;

        out.x = this.screenWidth * 0.5 + cameraX * scale;
        out.y = this.screenHeight * 0.5 - cameraY * scale;
        out.scale = scale;
        out.depth = cameraZ;
        return true;
    }

    /**
     * Converts a screen coordinate into a world-space point on a fixed Z plane.
     *
     * This is the inverse of projection for the common case where interaction
     * happens on a known world Z value. The screen position is turned into a
     * ray starting at the camera and passing through the virtual projection
     * plane. The ray is then intersected with the plane `z = worldZ`.
     *
     * Returns `null` when the ray is parallel to that Z plane, or when the
     * intersection would be behind the camera.
     */
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

    /**
     * Derives the camera's local axes from the current yaw and pitch.
     *
     * This keeps the camera as a no-roll orbit camera: yaw turns around the
     * vertical axis, pitch tilts up/down, and right/up are rebuilt to match.
     */
    private updateBasisFromAngles(): void {
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

    private clampPitch(pitch: number): number {
        return Math.max(-MAX_PITCH, Math.min(MAX_PITCH, pitch));
    }

    /**
     * Repositions the camera from target, orientation, and zoom.
     *
     * `zoom` controls orbit distance by converting to `focalLength / zoom`,
     * which preserves the projection scale behavior from the previous renderer
     * sync implementation.
     */
    private updatePositionFromTarget(): void {
        const distance = this.focalLength / this.zoomValue;

        this.x = this.targetXValue - this.forwardX * distance;
        this.y = this.targetYValue - this.forwardY * distance;
        this.z = this.targetZValue - this.forwardZ * distance;
    }
}

export type ProjectedPoint = {
    x: number;
    y: number;
    scale: number;
    depth: number;
};
