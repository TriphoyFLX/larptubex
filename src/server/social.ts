/** Valid channel subscriptions exclude self-subscribes. */
export function validChannelSubscriptionsWhere(channelId: number) {
  return {
    channelId,
    NOT: { subscriberId: channelId },
  };
}

export function canSubscribeToChannel(subscriberId: number, channelId: number): string | null {
  if (!Number.isFinite(channelId) || channelId <= 0) {
    return 'Канал не найден';
  }
  if (subscriberId === channelId) {
    return 'Вы не можете подписаться на собственный канал';
  }
  return null;
}
