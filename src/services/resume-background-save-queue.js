function createSerialSaveQueue(save) {
  let tail = Promise.resolve(true);
  return {
    run() {
      const current = tail.then(() => save());
      tail = current.catch(() => false);
      return current;
    },
  };
}

if (typeof window !== 'undefined') window.WorkBuddyResumeBackgroundSaveQueue = { createSerialSaveQueue };

export { createSerialSaveQueue };
