/** Converts a validated whole-day duration to milliseconds. */
export function parseDays(value: string) {
  const days = Number(value.slice(0, -1));
  const duration = days * 86_400_000;
  if (!/^[1-9]\d*d$/.test(value) || !Number.isSafeInteger(duration)) {
    throw new Error(
      'Use a duration string of positive whole days, such as "90d"; the minimum is "1d". The duration must be an integer.',
    );
  }
  return duration;
}
