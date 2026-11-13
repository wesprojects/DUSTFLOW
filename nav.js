// Dust Collection Explorer: navigation math (no graphics), shared by app.js and tools/test_sim.mjs.
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

// Wheel zoom: the orbit point moves to what is under the cursor, so zooming never crawls toward a far target and
// never stops in tight spots. dTarget = camera-to-orbit-point distance, dHit = distance to the surface under the cursor
// (null = nothing there). Returns the new orbit-point distance along the view axis.
export function wheelTargetDist(dTarget, dHit, zoomingIn) {
  if (dHit != null && dHit > 0.05 && dHit < dTarget) return Math.max(dHit, 0.25);
  if (zoomingIn && dTarget < 0.6) return dHit != null && dHit > 0.6 ? dHit : 2.0; // close up: push the point ahead, keep moving
  return dTarget;
}

// Double-click: glide toward the clicked point, keeping the viewing direction, stopping a sensible distance away.
export function glideGoal(cam, hit, dCur) {
  const d = clamp(dCur * 0.45, 1.2, 6);
  const v = [cam[0] - hit[0], cam[1] - hit[1], cam[2] - hit[2]];
  const l = Math.hypot(...v) || 1;
  return { position: [hit[0] + v[0] / l * d, hit[1] + v[1] / l * d, hit[2] + v[2] / l * d], target: hit.slice() };
}

// Keyboard flying in orbit mode: W/S forward and back on the ground plane, A/D sideways, Q/E down and up; Shift = 3x.
export function flyStep(keys, yaw, dt) {
  const f = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0), r = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0), u = (keys.KeyE ? 1 : 0) - (keys.KeyQ ? 1 : 0);
  if (!f && !r && !u) return null;
  const sp = (keys.ShiftLeft || keys.ShiftRight ? 9 : 3) * dt;
  const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
  return [(fx * f - fz * r) * sp, u * sp, (fz * f + fx * r) * sp];
}
