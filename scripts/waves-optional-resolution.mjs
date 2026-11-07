let adapter = {
  isProne: () => false,
  isHidden: () => false
};

export function registerOptionalResolutionAdapter(overrides={}) {
  adapter = { ...adapter, ...overrides };
}

export function resolveIsProne(subject) {
  return adapter.isProne(subject);
}

export function resolveIsHidden(subject) {
  return Boolean((subject?.document ?? subject)?.hidden || adapter.isHidden(subject));
}
