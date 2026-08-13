export function isTimestampActive(seconds, currentTime, windowSeconds = 2) {
  return Math.abs(currentTime - seconds) <= windowSeconds
}
