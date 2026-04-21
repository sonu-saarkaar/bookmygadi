export type AppSoundEvent = "searching" | "confirmation" | "payment" | "cancel" | "alarm";

type SoundStep = {
  freq: number;
  durationMs: number;
  delayMs: number;
  gain?: number;
};

type NotifyOptions = {
  event: AppSoundEvent;
  title?: string;
  body?: string;
  tag?: string;
  playSound?: boolean;
};

let audioCtx: AudioContext | null = null;
let unlockHandlersBound = false;
let currentAlarmInterval: number | null = null;

const soundPatterns: Record<AppSoundEvent, SoundStep[]> = {
  searching: [
    { freq: 620, durationMs: 120, delayMs: 0, gain: 0.03 },
    { freq: 760, durationMs: 120, delayMs: 180, gain: 0.03 },
  ],
  confirmation: [
    { freq: 740, durationMs: 140, delayMs: 0, gain: 0.04 },
    { freq: 980, durationMs: 180, delayMs: 160, gain: 0.05 },
  ],
  payment: [
    { freq: 880, durationMs: 120, delayMs: 0, gain: 0.045 },
    { freq: 1175, durationMs: 120, delayMs: 150, gain: 0.045 },
    { freq: 1568, durationMs: 180, delayMs: 300, gain: 0.05 },
  ],
  cancel: [
    { freq: 360, durationMs: 150, delayMs: 0, gain: 0.04 },
    { freq: 270, durationMs: 220, delayMs: 180, gain: 0.04 },
  ],
  alarm: [
    { freq: 900, durationMs: 400, delayMs: 0, gain: 0.1 },
    { freq: 1200, durationMs: 400, delayMs: 450, gain: 0.1 },
  ],
};

const getAudioContext = () => {
  if (typeof window === "undefined") return null;
  if (audioCtx) return audioCtx;
  const Ctx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  audioCtx = new Ctx();
  return audioCtx;
};

const tryResumeAudio = () => {
  const ctx = getAudioContext();
  if (!ctx || ctx.state === "running") return;
  ctx.resume().catch(() => undefined);
};

const ensureAudioUnlocked = () => {
  if (unlockHandlersBound || typeof window === "undefined") return;
  unlockHandlersBound = true;
  const unlock = () => {
    tryResumeAudio();
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
    window.removeEventListener("touchstart", unlock);
  };
  window.addEventListener("pointerdown", unlock, { once: true });
  window.addEventListener("keydown", unlock, { once: true });
  window.addEventListener("touchstart", unlock, { once: true });
};

export const stopAlarm = () => {
  if (currentAlarmInterval) {
    clearInterval(currentAlarmInterval);
    currentAlarmInterval = null;
  }
};

export const playSound = (event: AppSoundEvent) => {
  ensureAudioUnlocked();
  if (event === "alarm") {
     // Play once, then interval
     if (!currentAlarmInterval) {
         const playOnce = () => {
             const ctx = getAudioContext();
             if (!ctx) return;
             if (ctx.state !== "running") ctx.resume().catch(() => undefined);
             const now = ctx.currentTime;
             soundPatterns.alarm.forEach((step) => {
                const startAt = now + step.delayMs / 1000;
                const stopAt = startAt + step.durationMs / 1000;
                const gainNode = ctx.createGain();
                const osc = ctx.createOscillator();
                osc.type = "square"; // harsher for alarm
                osc.frequency.value = step.freq;
                gainNode.gain.setValueAtTime(0.0001, startAt);
                gainNode.gain.linearRampToValueAtTime(step.gain ?? 0.1, startAt + 0.05);
                gainNode.gain.exponentialRampToValueAtTime(0.0001, stopAt);
                osc.connect(gainNode);
                gainNode.connect(ctx.destination);
                osc.start(startAt);
                osc.stop(stopAt);
             });
         };
         playOnce();
         currentAlarmInterval = window.setInterval(playOnce, 2000) as unknown as number;
     }
     return;
  }

  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state !== "running") {
    ctx.resume().catch(() => undefined);
  }
  const now = ctx.currentTime;
  const pattern = soundPatterns[event];

  pattern.forEach((step) => {
    const startAt = now + step.delayMs / 1000;
    const stopAt = startAt + step.durationMs / 1000;
    const gainNode = ctx.createGain();
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = step.freq;
    gainNode.gain.setValueAtTime(0.0001, startAt);
    gainNode.gain.linearRampToValueAtTime(step.gain ?? 0.04, startAt + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, stopAt);
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.start(startAt);
    osc.stop(stopAt);
  });
};

const maybeShowBrowserNotification = async (title: string, body?: string, tag?: string) => {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (!document.hidden) return;

  if (Notification.permission === "default") {
    try {
      await Notification.requestPermission();
    } catch {
      return;
    }
  }
  if (Notification.permission !== "granted") return;

  try {
    new Notification(title, { body, tag });
  } catch {
    // browser can still block system notifications
  }
};

export const notifyEvent = async ({ event, title, body, tag, playSound: shouldPlaySound = true }: NotifyOptions) => {
  if (shouldPlaySound) {
    playSound(event);
  }
  if (!title) return;
  await maybeShowBrowserNotification(title, body, tag);
};
