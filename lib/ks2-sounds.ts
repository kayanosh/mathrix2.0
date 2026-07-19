/**
 * Tiny sound-effect player for KS2 rewards. Sounds are a bonus, never a
 * requirement: playback failures (autoplay policy, missing file, no audio
 * device) are swallowed so a quiet browser never breaks a lesson.
 */

const SOUND_PATHS = {
  correct: "/sounds/correct.mp3",
  fanfare: "/sounds/star-fanfare.mp3",
} as const;

export type KS2Sound = keyof typeof SOUND_PATHS;

const players = new Map<KS2Sound, HTMLAudioElement>();

export function playKS2Sound(sound: KS2Sound): void {
  if (typeof window === "undefined") return;
  try {
    let audio = players.get(sound);
    if (!audio) {
      audio = new Audio(SOUND_PATHS[sound]);
      audio.preload = "auto";
      players.set(sound, audio);
    }
    audio.currentTime = 0;
    void audio.play().catch(() => {
      /* autoplay blocked or device unavailable — stay silent */
    });
  } catch {
    /* Audio unsupported — stay silent */
  }
}
