/**
 * Every tunable value of the experience lives here.
 * Components must never hard-code magic numbers; import from this module instead.
 */

/* ------------------------------------------------------------------ *
 * Scene
 * ------------------------------------------------------------------ */

/** Pure white stage. Logos are drawn unlit, so this is exactly what the eye sees. */
export const SCENE_BACKGROUND = '#ffffff';

/* ------------------------------------------------------------------ *
 * Wheel geometry
 * ------------------------------------------------------------------ */

/**
 * Radius of the invisible cylinder the logos orbit around (world units).
 *
 * The cylinder stands upright and the logos travel horizontally, so neighbours sit side
 * by side. Adjacent centres are `RADIUS * sin(2π / 19)` apart: 11 gives 3.57, which
 * clears a full-size logo next to a defocused neighbour with room to spare.
 */
export const RADIUS = 11;

/**
 * Side of the square box every logo is fitted into (world units).
 *
 * There is no card behind the logo any more, so the mark itself carries the wheel.
 * Every supplied logo is a square canvas with its own internal padding; 3.4 is as large
 * as the spacing above allows before neighbouring marks start to crowd each other.
 */
export const LOGO_SIZE = 3.4;

/**
 * 1 = logo always squarely faces the camera (billboard on the Y axis).
 * 0 = logo keeps the raw cylinder normal and turns away at the left and right.
 */
export const BILLBOARD_BLEND = 1;

/* ------------------------------------------------------------------ *
 * Camera framing
 * ------------------------------------------------------------------ */

export const CAMERA_FOV = 40;
export const CAMERA_NEAR = 0.1;
export const CAMERA_FAR = 100;
/** Fallback distance from the front logo used before the first resize measurement. */
export const CAMERA_BASE_DISTANCE = 9;
export const CAMERA_MIN_DISTANCE = 4.6;
/** A portrait phone needs ~14 units of pull-back to fit the front logo plus a peek. */
export const CAMERA_MAX_DISTANCE = 16;
/*
 * Only one company is ever on screen, so the framing no longer has to leave room for
 * neighbours: both margins are as tight as the chrome allows. The logo lands at
 * `1 / MARGIN` of the panel — 95% of the width, or 62% of the height, whichever binds
 * first. The canvas itself stops above the buttons (see `SceneCanvas`), so this is 62%
 * of the free space rather than of the whole panel.
 *
 * WIDTH_MARGIN is kept close to 1 (barely any margin) rather than the more generous
 * value an earlier pass used. A single perspective distance cannot hit an independent
 * width target AND an independent height target at once unless the panel's own aspect
 * happens to match the logo's — on any panel narrower than that (a portrait phone, but
 * also an unmaximised desktop window close to square) width binds, and a wide margin
 * there was shrinking the logo well below its 62%-of-height target, leaving a visibly
 * empty band underneath it. This is as tight as the margin can go before the logo risks
 * touching the panel's side edges.
 */

/** Governs narrow (portrait) screens. */
export const CAMERA_WIDTH_MARGIN = 1.05;
/** Governs wide (landscape) screens. */
export const CAMERA_HEIGHT_MARGIN = 1.61;

/* ------------------------------------------------------------------ *
 * Rotation physics
 * ------------------------------------------------------------------ */

/** Velocity retained per 1/60 s. Applied frame-rate independently. */
export const FRICTION = 0.94;
/** Hard cap on angular velocity (rad/s) so a violent flick cannot spin forever. */
export const MAX_VELOCITY = 9;
/** Below this angular velocity the wheel commits to a snap. */
export const SNAP_VELOCITY_THRESHOLD = 0.08;
export const SNAP_DURATION = 0.6;
export const SNAP_EASE = 'power3.out';

/**
 * Fallback radians of rotation per pixel of drag, used only until `<CameraRig>` has
 * measured the viewport. After that the value is solved from the live framing so the
 * logo under the finger travels with the finger on any screen size.
 */
export const DRAG_SENSITIVITY = 0.0012;
/**
 * Multiplier over exact finger tracking. Slightly above 1 makes a swipe feel light
 * without the logo visibly outrunning the finger.
 */
export const DRAG_TRACKING_GAIN = 1.15;
/** Radians per second of velocity added per unit of `wheel` delta. */
export const WHEEL_SENSITIVITY = 0.02;
/** Pixel equivalent of one `deltaMode: DOM_DELTA_LINE` step. */
export const WHEEL_LINE_HEIGHT = 16;
/** Pixel equivalent of one `deltaMode: DOM_DELTA_PAGE` step. */
export const WHEEL_PAGE_HEIGHT = 600;
/** Exponential smoothing applied to the pointer velocity estimator (0..1, higher = snappier). */
export const VELOCITY_SMOOTHING = 0.35;
/** Movement under this many pixels on pointer-up is treated as a tap, not a drag. */
export const TAP_THRESHOLD_PX = 8;
/**
 * If the pointer was stationary for longer than this before release, the flick is
 * discarded. Without it, pausing mid-drag still launches the wheel on lift-off.
 */
export const POINTER_IDLE_RESET_MS = 90;
/** Rotation error (radians) under which the wheel is considered already snapped. */
export const SNAP_EPSILON = 1e-4;
/** Longest frame delta the physics integrator will accept (guards tab-switch jumps). */
export const MAX_FRAME_DELTA = 1 / 20;

/* ------------------------------------------------------------------ *
 * Per-logo focus falloff
 * ------------------------------------------------------------------ */

/**
 * ONE COMPANY AT A TIME.
 *
 * Neighbours sit `1 / 19` of a turn away, which is 0.105 in this normalised distance.
 * `FOCUS_OUTER` is set below that, so a logo is completely gone before its neighbour
 * could appear beside it: what the eye sees is a single company, and mid-swipe the two
 * simply cross-fade through each other.
 */
export const FOCUS_INNER = 0.012;
export const FOCUS_OUTER = 0.092;

export const FOCUS_SCALE_NEAR = 1.0;
/** Arrives slightly small and settles into place, rather than snapping in at full size. */
export const FOCUS_SCALE_FAR = 0.88;
export const FOCUS_OPACITY_NEAR = 1.0;
/** Fully transparent: this is the value that keeps the wheel down to one company. */
export const FOCUS_OPACITY_FAR = 0;

/** Multiplier applied to logos on the far side of the cylinder so depth reads clearly. */
export const BACKFACE_DIM = 0.2;
/** Smoothing window (in cosine space) across the silhouette edge of the cylinder. */
export const BACKFACE_EDGE = 0.25;

/** Exponential damping rate for the per-logo scale/opacity approach. */
export const FOCUS_DAMP_LAMBDA = 9;

/* ------------------------------------------------------------------ *
 * Confirmation pulse ("Ingresar a la web")
 * ------------------------------------------------------------------ */

/*
 * The company opens in a SEPARATE tab, and the browser usually focuses that tab at
 * once, so this is a short acknowledgement rather than a departure. The wheel restores
 * itself right after, and must never be left dimmed for when the user comes back.
 */

export const SELECT_ROTATION_SNAP_DURATION = 0.22;
export const SELECT_CONFIRM_FADE_DURATION = 0.18;
export const SELECT_CONFIRM_PULSE_DURATION = 0.34;

/** Dim applied to the other eighteen logos. Never zero — the user is coming back. */
export const SELECT_CONFIRM_FADE = 0.55;
/** Scale the other logos ease toward while dimmed. */
export const SELECT_OTHERS_SCALE = 0.4;
/** Outward travel of the chosen logo during the pulse. */
export const CONFIRM_Z_OFFSET = 0.45;
/** Peak scale of the pulse. A nod, not a zoom. */
export const CONFIRM_SCALE = 1.12;

/** Length of the tween that returns every selection scalar to its rest value. */
export const SELECT_RESTORE_DURATION = 0.38;

/**
 * Length of the confirm phase, derived from whichever tween finishes last rather than
 * hand-written, so retuning any single value above cannot silently drift it.
 */
export const SELECT_CONFIRM_DURATION = Math.max(
  SELECT_ROTATION_SNAP_DURATION,
  SELECT_CONFIRM_FADE_DURATION,
  SELECT_CONFIRM_PULSE_DURATION,
);

/* ------------------------------------------------------------------ *
 * Renderer / quality tiers
 * ------------------------------------------------------------------ */

export const DPR_HIGH: [number, number] = [1, 2];
export const DPR_LOW: [number, number] = [1, 1.5];

export const ANISOTROPY_HIGH = 4;
export const ANISOTROPY_LOW = 1;

/** Viewport width (px) below which a coarse pointer implies a phone-class device. */
export const LOW_TIER_VIEWPORT_WIDTH = 768;
export const LOW_TIER_MAX_CORES = 4;
export const LOW_TIER_MAX_MEMORY_GB = 4;

/** Lowest device pixel ratio `PerformanceMonitor` may step down to under load. */
export const PERF_DPR_FLOOR = 0.75;

/* ------------------------------------------------------------------ *
 * UI timing
 * ------------------------------------------------------------------ */

/** Showcase copy slides in from the side the wheel travels towards. */
export const SHOWCASE_SWAP_DURATION = 0.45;
export const SHOWCASE_SWAP_OFFSET_X = -28;
export const HINT_FADE_DURATION = 0.45;

/**
 * The HUD steps back during the pulse instead of disappearing.
 * Zero would be wrong: chrome that faded to nothing has no way of knowing it should
 * come back when the user returns to this tab.
 */
export const HUD_DIM_OPACITY = 0.35;
export const HUD_DIM_DURATION = 0.2;
export const HUD_RESTORE_DURATION = 0.3;
