# Rendering Performance Improvement Plan

This document covers rendering improvements for the current Canvas 2D renderer in
`src/app/Application.ts` and `src/view/Renderer.ts`. WebGL is intentionally out of
scope for this pass.

## Current Render Path

The frame loop in `src/main.ts:29` always calls `app.render()` after fixed-step
updates while the app is running. `Application.render()` clears the canvas,
enters the world transform, optionally draws star glows, draws every body,
leaves the world transform, then draws debug and hover UI.

Important current costs:

- `Application.render()` scans all bodies once for star glows and once for body
  drawing when textures are enabled (`src/app/Application.ts:332` and
  `src/app/Application.ts:339`).
- `drawHoveredBodyPopup()` calls `getHoveredBody()`, which scans all bodies
  again every frame (`src/app/Application.ts:452` and
  `src/app/Application.ts:427`).
- `Renderer.getBodyRenderPosition()` allocates multiple `Vec2` objects per call,
  and moon positions recurse through the parent body (`src/view/Renderer.ts:234`).
- `Renderer.getBodyRenderRadius()` recomputes the same radius transform every
  time it is called (`src/view/Renderer.ts:260`).
- Each body draw does `ctx.save()`, `ctx.translate()`, primitive drawing, and
  `ctx.restore()` (`src/view/Renderer.ts:365`).
- Textured body drawing adds another nested save/restore in `drawTexture()`
  (`src/view/Renderer.ts:204`).
- Labels do another save/translate/scale/fillText/restore per visible label
  (`src/view/Renderer.ts:378`).
- Star glow creates a new radial gradient every frame for every visible star
  (`src/view/Renderer.ts:308`).
- The debug panel allocates a fresh stats array and formats strings every frame
  (`src/app/Application.ts:361`).

## Highest Priority Changes

### 1. Move camera-follow updates before `beginWorld()`

Current code calls `Renderer.beginWorld()` and then updates `Renderer.pan` when a
planet is selected (`src/app/Application.ts:321` and
`src/app/Application.ts:324`). That means the canvas transform uses the previous
pan, while viewport culling uses the new pan. This can cause a one-frame visual
mismatch and incorrect culling.

Change:

- Update selected-body camera follow before `Renderer.beginWorld()`.
- Mutate `Renderer.pan.x` and `Renderer.pan.y` instead of replacing
  `Renderer.pan` with a new `Vec2`.

Expected impact: correctness improvement, fewer wasted/missing draw calls during
camera follow, and less allocation.

### 2. Add a render-frame cache

The renderer should compute per-body render data once per frame and reuse it for
glows, body drawing, labels, and hover detection.

Add reusable arrays, sized to `MAX_BODIES`, such as:

- `renderX`, `renderY`: final render-space body center, already multiplied by
  `KILOMETERS_TO_PIXELS_RENDERING_SCALE`.
- `renderRadius`: final body radius in render pixels.
- `renderMinX`, `renderMinY`, `renderMaxX`, `renderMaxY`: render bounds.
- `isVisible`: body intersects viewport without label padding.
- `isLabelVisible`: label should be considered for drawing.
- `visibleBodyIndices`: compact list of visible body indices.
- `visibleStarIndices`: compact list of visible star indices.
- `visibleLabelIndices`: compact list of visible labelled body indices.

Then change `Application.render()` to:

1. Resolve camera state.
2. Compute viewport.
3. Call something like `Renderer.prepareFrame(bodyCount, viewport, options)`.
4. Draw glows using `visibleStarIndices`.
5. Draw bodies using `visibleBodyIndices`.
6. Draw labels using `visibleLabelIndices`.
7. Reuse the same cache for hover detection.

Expected impact: high. This removes repeated position/radius calculations,
repeated culling math, and most per-frame `Vec2` allocation.

### 3. Make render position/radius scalar and allocation-free

`Renderer.getBodyRenderPosition()` currently returns a new `Vec2` for every
request. For a moon it allocates a parent position, body position, parent
position, moon offset, scaled offset, and final sum.

Change:

- Replace hot render helpers with scalar helpers that write into arrays or return
  primitive pairs through an output object reused by the renderer.
- Compute moon render position using local numbers:
  `dx = positionX[i] - positionX[parentIndex]`,
  `dy = positionY[i] - positionY[parentIndex]`.
- Avoid `Math.sqrt()` unless the scaled moon offset is below the minimum orbit
  distance. Compare squared distances first.
- Cache `renderRadius[i]` because body radius and body type change rarely.

Expected impact: high, especially in labelled scenes and during hover scans.

### 4. Stop scanning every body for star glow

When textures are enabled, `Application.render()` checks every body for star
glow even though only stars can draw one. In the random galaxy, this turns the
glow pass into a full-body branch-heavy scan.

Change:

- Maintain a star list when bodies are created, or build `visibleStarIndices`
  during render-frame preparation.
- Draw glow only for visible stars.
- Keep the glow pass before body drawing if the visual layering should remain
  unchanged.

Expected impact: high in large scenes where stars are a minority of bodies.

### 5. Cache or sprite star glow

`drawStarGlow()` creates a radial gradient every frame for every visible star.
The visual parameters are mostly stable: fill color, radius, mass factor, light
radius, and alpha do not change during normal simulation.

Change:

- Build an `ImageBitmap` or offscreen canvas glow sprite per unique glow style,
  radius bucket, and alpha bucket.
- Draw the cached sprite with `drawImage()` at the current star position.
- Quantize size if needed, for example to 4 px or 8 px buckets, to avoid an
  unbounded cache.

Expected impact: high when many stars are visible. It trades a small amount of
memory for fewer gradient allocations and fewer expensive gradient fills.

## Body Drawing Changes

### 6. Collapse nested canvas state changes

Textured body rendering currently saves/restores once in `drawBody()` and again
inside `drawTexture()`. Since `drawTexture()` is only called from an already
translated body context, the second state stack operation can be removed.

Change:

- Inline texture drawing into the body draw path.
- Use one save/translate/scale/drawImage/restore for textured bodies.
- For untextured bodies, draw directly at `x, y` without translating where
  possible: `arc(x, y, radius, ...)`.

Expected impact: medium to high, depending on visible body count.

### 7. Batch simple circles by style

When textures are off, every body is stroked separately. For untextured bodies,
each body is filled separately. Canvas 2D performs better when many arcs with
the same paint state are combined into one path.

Change:

- For texture-off mode, build one path for all visible body circles and stroke
  once.
- For untextured filled bodies, group visible body indices by `fillColor`, build
  one path per color, and fill once per color.
- Keep textured bodies as individual draws.

Expected impact: medium. This helps asteroid-heavy scenes because asteroid
colors come from a small palette.

### 8. Add tiny-body level of detail

At low zoom, many bodies have a screen-space diameter of only a few pixels, but
the renderer still draws circles or scaled textures.

Change:

- Compute `screenRadius = renderRadius * Renderer.zoom`.
- If `screenRadius < 0.75`, draw a 1 px or 2 px rect in screen space.
- If `screenRadius < 2`, draw a simple filled circle and skip texture.
- Only draw full textures once the sprite is large enough to show detail.

Expected impact: high when zoomed out in random galaxy mode. It also improves
visual clarity because tiny scaled textures often add blur without useful detail.

### 9. Reduce texture scaling work

Each textured body uses `drawImage()` with a per-frame scale. This is acceptable
for small scenes but expensive when many textured bodies are visible.

Change:

- Create pre-scaled texture buckets for common screen diameters.
- Quantize screen diameter, for example 8, 12, 16, 24, 32, 48, 64, 96, 128.
- Use original `ImageBitmap` only for large bodies or unusual sizes.
- Consider disabling `imageSmoothingEnabled` for tiny sprites, but avoid
  toggling it per body.

Expected impact: medium. This is most useful after tiny-body LOD is in place.

### 10. Avoid per-body `Map` lookups in hot loops

`Application.render()` looks up style data by `bodyIds[i]` in both glow and body
passes. `Map` is convenient, but hot render loops benefit from indexed data.

Change:

- During render-frame preparation, resolve `styleByIndex[i]` once.
- Or store render style fields in arrays parallel to body arrays:
  `fillColorByIndex`, `textureByIndex`, `labelByIndex`, `labelColorByIndex`,
  `labelFontSizeByIndex`.
- If body arrays keep being swapped by physics, update style arrays through the
  same swap path, or keep body-id lists and resolve index once per frame.

Expected impact: medium. It also makes later batching easier.

## Label Changes

### 11. Draw labels in screen space after world drawing

Current labels are drawn inside world mode, then each label flips itself back to
screen orientation with `ctx.scale(1 / zoom, -1 / zoom)`. This costs a canvas
state save, transform, font assignment, text state changes, and restore per
label.

Change:

- During frame preparation, convert label anchor positions to screen
  coordinates:
  `screenX = (renderX - pan.x) * zoom + width / 2`,
  `screenY = height / 2 - (renderY - pan.y) * zoom`.
- End world drawing.
- Draw all labels in normal screen coordinates.
- Set font/color only when they change.

Expected impact: high when labels are enabled.

### 12. Add label LOD and collision reduction

Labels can dominate render time because `fillText()` is expensive and labels are
screen-space detail. The current culling uses a fixed `160 / zoom` margin, which
is safe but approximate.

Change:

- Draw all labels for small demos.
- In random galaxy mode or when visible label count is high, prioritize:
  selected body, hovered body, stars, planets, then moons.
- Skip moon labels below a zoom threshold even if `showMoonLabels` is enabled.
- Optionally limit labels per frame, for example to the nearest 200 visible
  labels or most important labels.
- Use approximate text width from cached label metadata instead of measuring text
  every frame.

Expected impact: high in dense scenes.

### 13. Cache label metadata

Labels and font sizes are stable after demo creation.

Change:

- Precompute `labelFont = "${fontSize}px Arial"`.
- Precompute approximate width once per label after assets load, or lazily the
  first time a label is visible.
- Store label priority by body type.

Expected impact: medium. It works well with screen-space label drawing.

## Hover and UI Changes

### 14. Reuse visible render data for hover detection

`getHoveredBody()` scans all bodies every frame and calls the same allocating
render helpers used by drawing. For hover, only visible bodies can be selected in
practice.

Change:

- Run hover picking against `visibleBodyIndices` from the render cache.
- Use cached `renderX`, `renderY`, and `renderRadius`.
- Recompute hovered body only when the mouse moves, the camera changes, zoom
  changes, or body positions update.
- If body count remains high, query a spatial structure instead of scanning.
  Existing broad-phase or Barnes-Hut structures may be reusable, but a simple
  visible-list scan is the best first step.

Expected impact: high. It removes a full body scan from every frame.

### 15. Throttle or cache debug panel text

The debug panel creates arrays and formatted strings every render. Most values
do not need to be formatted at display refresh rate.

Change:

- Keep a stable stats array.
- Update FPS, body count, formatted time, and formatted mouse values at 4-10 Hz.
- Draw the panel from cached strings every frame, or move it to a separate UI
  canvas that redraws only when values change.

Expected impact: medium in normal scenes, higher on slower devices.

### 16. Split world and overlay canvases

World rendering and UI rendering have different invalidation patterns. The world
changes every simulation frame, while debug and hover UI only change when stats,
mouse, or selection changes.

Change:

- Use one canvas for world rendering and one positioned overlay canvas for UI.
- Clear/redraw the overlay only when needed.
- Keep the shortcuts DOM UI separate as it is now.

Expected impact: medium. This is most valuable once debug/hover drawing becomes
noticeable or when paused rendering is optimized.

### 17. Skip paused redraws when nothing changed

When paused, the app still renders every animation frame while `running` is true.
If there is no camera movement, zoom, mouse movement, UI change, or selected
body movement, the frame can be skipped.

Change:

- Track a `renderDirty` flag.
- Mark dirty on input, resize, demo load, debug toggle, texture/label toggle,
  selection change, and simulation update.
- If paused and not dirty, skip `app.render()`.

Expected impact: high while paused, especially in heavy scenes.

## Canvas and Frame Loop Changes

### 18. Use direct transforms with `ctx.setTransform()`

`beginWorld()` currently saves state, translates, scales, translates, and later
restores. This is fine, but the renderer can avoid stack use and make transform
state explicit.

Change:

- Set world transform with one call:
  `ctx.setTransform(zoom, 0, 0, -zoom, width / 2 - pan.x * zoom, height / 2 + pan.y * zoom)`.
- Reset to identity for UI drawing:
  `ctx.setTransform(1, 0, 0, 1, 0, 0)`.

Expected impact: low to medium. It also makes screen-space labels and overlays
easier to reason about.

### 19. Cache frame constants

Several hot loops repeatedly read static values and call helpers.

Change:

- Store `const count = getBodyCount()` once per frame.
- Store `const zoom = Renderer.zoom`, `const panX = Renderer.pan.x`,
  `const panY = Renderer.pan.y`, `const scale = KILOMETERS_TO_PIXELS_RENDERING_SCALE`.
- Pass these constants into preparation/draw helpers instead of rereading static
  properties repeatedly.

Expected impact: low to medium. It is simple and compounds with other changes.

### 20. Add render resolution scaling

The current canvas backing store is exactly `window.innerWidth` by
`window.innerHeight`. On high-density displays this keeps work relatively low,
but the app has no explicit quality/performance control.

Change:

- Add a `renderScale` setting, defaulting to `1`.
- Set canvas backing size to `cssWidth * renderScale` and
  `cssHeight * renderScale`, while CSS size remains full window.
- Allow lowering `renderScale` automatically in heavy scenes or manually through
  settings.
- Be careful if adding `devicePixelRatio` support, because full DPR can multiply
  canvas fill cost dramatically.

Expected impact: medium to high as a user-facing performance control.

### 21. Throttle resize work

`Renderer.resize()` immediately resizes the canvas on every resize event. Canvas
resize reallocates the backing store and clears state.

Change:

- Only resize when width or height actually changed.
- Debounce resize events to the next animation frame.
- Reapply canvas context state after resize in one place.

Expected impact: low during normal play, medium while resizing the window.

## Optional Larger Changes

### 22. OffscreenCanvas for Canvas 2D

Without switching to WebGL, the app can still move Canvas 2D rendering to a
worker on browsers that support `OffscreenCanvas`.

Change:

- Transfer the world canvas to a worker.
- Send body typed-array snapshots or shared buffers to the worker.
- Keep input and UI overlay on the main thread.

Expected impact: situational. It can improve main-thread responsiveness, but it
adds complexity and data synchronization costs. Do this only after the simpler
main-thread render cache and batching changes.

### 23. Use a dedicated render model

The simulation data layout is already array-oriented, which is good. Rendering
would benefit from its own derived model.

Change:

- Introduce a `RenderModel` or `RenderFrame` module responsible for derived
  render-space arrays, style references, visibility lists, and label metadata.
- Keep `Renderer` focused on drawing primitives and batches.
- Keep `Application` focused on orchestration and feature toggles.

Expected impact: architectural. It makes the high-impact optimizations easier to
land safely.

## Suggested Implementation Order

1. Fix selected-body camera follow before `beginWorld()`.
2. Add render timing instrumentation and visible/drawn counters.
3. Add allocation-free render-frame cache for position, radius, bounds, and
   visibility.
4. Reuse the cache for hover detection.
5. Draw glows only for visible stars.
6. Move labels to screen-space drawing and add basic label LOD.
7. Collapse body draw save/restore calls.
8. Add tiny-body LOD.
9. Cache star glow sprites.
10. Batch untextured circle drawing.
11. Cache debug panel strings and consider an overlay canvas.
12. Add paused dirty-frame skipping.
13. Add render resolution scaling.
14. Consider OffscreenCanvas only after profiling the above.

## Measurement Plan

Add a small render profiler before and after each change:

- Total `Application.render()` time.
- Render preparation time.
- Star glow time.
- Body drawing time.
- Label drawing time.
- Overlay/debug time.
- Hover picking time.
- Body count, visible body count, visible star count, drawn label count.
- Optional approximate allocation pressure, measured through browser performance
  tooling.

Benchmark scenarios:

- Demo 1: normal solar system, labels and textures on.
- Demo 4: random galaxy at initial zoom.
- Demo 4: random galaxy zoomed into a dense local region.
- Paused state with no input.
- Camera-follow mode on a selected planet.

The first performance target should be reducing per-frame render work in random
galaxy mode without reducing visual quality at normal zoom levels. The strongest
early candidates are the render-frame cache, visible-list reuse, star-list glow
drawing, screen-space labels, hover cache reuse, and tiny-body LOD.
