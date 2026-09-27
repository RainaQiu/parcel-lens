export type ChatScrollState = {
  distanceFromBottom: number
  userScrolled: boolean
  thresholdPx?: number
}

export function shouldFollowLatest({ distanceFromBottom, userScrolled, thresholdPx = 48 }: ChatScrollState): boolean {
  return !userScrolled || distanceFromBottom <= thresholdPx
}
