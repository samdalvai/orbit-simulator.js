# Camera 3D Refactor Plan

Goal: simplify the 3D camera implementation while preserving the current user-facing features:
rotation, zoom-to-cursor, pan/drag, body selection/following, hover detection, labels, depth sorting,
and fixed-Z mouse world coordinates. Performance should improve or at least not regress.

Status legend:
- `[ ]` not started
- `[~]` in progress
- `[x]` done

## Constraints

- Keep the same controls:
  - right mouse drag rotates the 3D view
  - arrow keys rotate the 3D view
  - middle mouse / command drag pans the view
  - wheel zooms around the cursor
  - click selection and body following still work
- Keep projection behavior visually equivalent unless a deliberate behavior change is called out.
- Avoid adding new dependencies.
- Prefer numeric fields and reusable objects on hot paths.
- Do not mix broad rendering cleanup into this refactor unless it directly supports the camera/performance goal.

## Phase 1: Baseline And Behavior Checks

- [x] Run the existing build/test command available in the project and record the result.
  - 2026-05-20: `npm test` ran Jest, but exited with code 1 because there are no matching test files.
  - 2026-05-20: `npm run build` completed successfully.
- [ ] Manually verify the current camera behavior before refactoring:
  - [ ] reset view
  - [ ] rotate with mouse
  - [ ] rotate with arrow keys
  - [ ] pan while rotated
  - [ ] zoom to cursor while rotated
  - [ ] select/follow a body
  - [ ] hover popup still targets the visible body
  - Pending: this requires an interactive browser session, which was not available during this pass.
- [x] Note any existing bugs or odd behavior before changing code, so refactor regressions are easier to separate from pre-existing issues.
  - No runtime behavior bugs were manually confirmed in this pass.
  - Existing baseline issue: `npm test` fails because the project currently has no Jest test files.
  - Static wiring check: the current controls are wired through `Application.input()`, `Renderer.rotateCamera()`,
    `Renderer.panByScreenDelta()`, `Renderer.zoomAt()`, `Renderer.screenToWorldAtZ()`, and `Renderer.getRenderItems()`.

## Phase 2: Simplify `Camera3D`

- [x] Replace local-basis incremental rotation with yaw/pitch state updates.
- [x] Add a single private `updateBasisFromAngles()` method that derives `forward`, `right`, and `up` from yaw/pitch.
- [x] Make `rotate(deltaYaw, deltaPitch)` update yaw/pitch, clamp pitch, then call `updateBasisFromAngles()`.
- [x] Make `setRotation(yaw, pitch)` share the same clamp and basis update path as `rotate()`.
- [x] Remove the private arbitrary-axis helpers:
  - [x] `rotateBasisAroundAxis`
  - [x] `rotateVectorAroundAxis`
  - [x] `orthonormalizeBasis`
- [x] Keep `project()` and `screenToWorldAtZ()` behavior intact during this phase.
- [x] Remove or shorten comments that explain deleted complexity.
- [x] Verification for this phase:
  - 2026-05-20: `npm run build` completed successfully after the camera simplification.
  - Behavior note: rotation is now intentionally orbit-style yaw/pitch with a shared pitch clamp.

## Phase 3: Move View State Toward The Camera

- [x] Rename the conceptual renderer state from `pan` to a clearer camera target/focus name.
- [x] Decide whether to keep compatibility accessors temporarily:
  - [x] update all call sites immediately
  - [x] do not add short-lived `pan` aliases
- [x] Move `zoom` and target/focus ownership into `Camera3D` if it reduces call-site complexity.
- [x] Remove `Renderer.syncCameraFromView()` once the camera owns enough state to keep itself current.
- [x] Keep `Renderer` responsible for drawing and body render-position resolution, not camera math.
- [x] Verification for this phase:
  - 2026-05-20: `npm run build` completed successfully after moving camera target/zoom state.
  - Behavior note: `Renderer.pan` was removed; app code now uses `setCameraTarget()` and target getters.

## Phase 4: Reduce Per-Frame Allocation And Duplicate Projection

- [x] Change the projection path to avoid creating a temporary `ProjectedPoint` object per body.
- [x] Reuse the `RenderItem[]` array across frames.
- [x] Reuse or mutate `RenderItem` objects instead of creating new objects for every visible body each frame.
- [x] Compute render items once per frame in `Application.render()`.
- [x] Pass the current frame's render items into hover detection and popup drawing instead of calling `getRenderItems()` again.
- [x] Preserve depth sorting order from farthest to nearest.
- [x] Confirm the star glow and body draw loops still receive the same render item data.
- [x] Verification for this phase:
  - 2026-05-20: `npm run build` completed successfully after reducing render-item allocations.
  - Behavior note: click handling can still compute fresh render items because it runs outside `Application.render()`.

## Phase 5: Verification

- [ ] Run the build/test command again.
- [ ] Manually verify the same checklist from Phase 1.
- [ ] Compare performance-sensitive behavior:
  - [ ] random galaxy render remains responsive
  - [ ] hover popup does not trigger extra projection/sort work
  - [ ] rotating and zooming do not allocate obvious short-lived objects in the hot path
- [ ] Check `git diff` for accidental unrelated edits.
- [ ] Keep any behavior-changing decisions documented in this file before finalizing.

## Likely File Touches

- `src/view/Camera3D.ts`
- `src/view/Renderer.ts`
- `src/app/Application.ts`

## Notes

- The biggest simplification is deleting the general arbitrary-axis camera code and treating this as an orbit-style camera.
- The biggest performance win is avoiding duplicate `getRenderItems()` calls and reducing per-body allocations.
- The riskiest behavior is panning/zooming while the view is rotated, so that needs the most careful manual verification.
