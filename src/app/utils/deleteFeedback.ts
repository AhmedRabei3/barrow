"use client";

export const DELETE_ANIMATION_MS = 220;
export const INVENTORY_INVALIDATED_EVENT = "barrow:inventory-invalidated";

export const waitForDeleteAnimation = () =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, DELETE_ANIMATION_MS);
  });

export const playDeleteFeedback = () => {
  if (typeof window === "undefined") {
    return;
  }

  const AudioContextCtor =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;

  if (!AudioContextCtor) {
    return;
  }

  try {
    const audioContext = new AudioContextCtor();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    const startTime = audioContext.currentTime;

    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(420, startTime);
    oscillator.frequency.exponentialRampToValueAtTime(240, startTime + 0.12);

    gainNode.gain.setValueAtTime(0.0001, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.045, startTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.16);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.start(startTime);
    oscillator.stop(startTime + 0.17);

    oscillator.onended = () => {
      void audioContext.close().catch(() => undefined);
    };
  } catch {
    // Ignore audio failures and keep the visual feedback.
  }
};

export const dispatchInventoryInvalidated = () => {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(INVENTORY_INVALIDATED_EVENT));
};
