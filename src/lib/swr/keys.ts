export function homeActivityKey(userId: string, start: string, end: string) {
  return ["home-activity", userId, start, end] as const;
}
