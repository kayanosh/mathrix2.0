"use client";

/**
 * Shared marker-ink filters.
 *
 * Hoisted out of TeacherMarkOverlay, which defined its own `feTurbulence` +
 * `feDisplacementMap` pair per mark. The hand-drawn look is this filter, not
 * roughjs (which is in package.json with zero imports).
 *
 * THE LEGIBILITY RULE — the reason there are two filters and not one:
 *
 * Decorative strokes get the full wobble. Glyphs a child must READ do not.
 * Displacing a digit enough to look hand-drawn can turn a 6 into a 0 or a 1
 * into a 7, and in a place-value method that is a teaching failure rather than
 * a cosmetic one. So digits and notation keep their letterforms and get only
 * enough displacement to break the vector-perfect edge; the "being written"
 * feel comes from the write-on stagger and the travelling pen instead.
 *
 * Mount once per board. The ids are global, so a second mount is harmless but
 * pointless.
 */

/** Full marker wobble: pen trail, circles, underlines, arrows, strike-throughs. */
export const INK_ROUGH_FILTER_ID = "wb-ink-rough";
/** Barely-there displacement for glyphs that must stay unambiguous. */
export const INK_SOFT_FILTER_ID = "wb-ink-soft";

export default function InkFilterDefs() {
  return (
    <svg
      aria-hidden
      focusable="false"
      width="0"
      height="0"
      style={{ position: "absolute", pointerEvents: "none" }}
    >
      <defs>
        <filter id={INK_ROUGH_FILTER_ID}>
          <feTurbulence
            type="turbulence"
            baseFrequency="0.04"
            numOctaves="2"
            result="noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="1.4"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>

        {/*
          Lower frequency AND a much smaller scale. High frequency at low
          amplitude is what makes thin strokes look frayed and a digit look
          malformed; a slow, shallow wave reads as "written by hand" while
          leaving every letterform intact.
        */}
        <filter id={INK_SOFT_FILTER_ID}>
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.012"
            numOctaves="1"
            result="noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="0.6"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  );
}
