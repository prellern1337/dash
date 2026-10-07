// UTC preserves the existing workflow contract, including across Oslo DST changes.
export const DATASETS = {
  news: { minutes: [425, 605, 785, 905], graceMinutes: 20 },
  swaps: { minutes: [450, 630, 780, 900], graceMinutes: 20 },
  indices: { minutes: [1350], graceMinutes: 30 },
  watchlist: { minutes: [1340], graceMinutes: 30 },
};

export function latestSlot(dataset, now = new Date()) {
  const policy = DATASETS[dataset];
  if (!policy) throw new Error('Unknown dataset');
  const time = new Date(now).getTime();
  if (!Number.isFinite(time)) throw new Error('Invalid clock');
  const midnight = new Date(time);
  midnight.setUTCHours(0, 0, 0, 0);
  for (let day = 0; day < 8; day++) {
    const date = new Date(midnight.getTime() - day * 86400000);
    if ([0, 6].includes(date.getUTCDay())) continue;
    for (const minute of [...policy.minutes].reverse()) {
      const slot = date.getTime() + minute * 60000;
      if (slot <= time) return new Date(slot).toISOString();
    }
  }
  throw new Error('No scheduled slot');
}

export function freshness(dataset, state, now = new Date()) {
  const dueSlot = latestSlot(dataset, now);
  const success = state?.success_slot ? new Date(state.success_slot).getTime() : NaN;
  const current = success >= Date.parse(dueSlot) && success <= new Date(now).getTime();
  const deadline = Date.parse(dueSlot) + DATASETS[dataset].graceMinutes * 60000;
  return {
    dataset, dueSlot, deadlineAt: new Date(deadline).toISOString(),
    successSlot: state?.success_slot || null,
    lastSuccessAt: state?.last_success_at || null,
    status: current ? 'fresh' : new Date(now).getTime() <= deadline ? 'pending' : 'stale',
  };
}
