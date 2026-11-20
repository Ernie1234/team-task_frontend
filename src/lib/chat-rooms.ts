// Room ids match the server: "workspace:<id>", "project:<id>", "direct:<a>:<b>" (ids sorted)
export const directRoomId = (a: string, b: string) => `direct:${[a, b].sort().join(":")}`;
