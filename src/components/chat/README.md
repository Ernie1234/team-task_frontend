# Chat

Messenger-style chat for a workspace: `#general`, one channel per project, and DMs with every member.

## How it fits together

- **`ChatLayout`** – page shell. The open conversation lives in the URL: `?room=<roomId>` or `?dm=<userId>` (used by the dashboard's Chat Activity avatars). Phones show the list first.
- **`ChatSidebar`** – conversation list with search, last-message previews, live "typing…", unread badges and presence dots.
- **`ChatInterface`** – one conversation: header (presence / members), thread with day dividers and grouped bubbles, typing bubble, drag-and-drop to attach.
- **`MessageBubble`** – a message: replies, images/files, reactions, edit/delete/copy actions.
- **`MessageInput`** – composer: emoji, attachments (button, paste, drop), reply/edit modes, typing events.
- **`ChatWidget`** – dashboard card: who's online (hover for details, click to DM) and recent conversations.

## Data

- Conversations come from `GET /chat/workspace/:id/conversations` (`useConversations`), kept live by `useChatSocket` (mounted in `AuthProvider`).
- Messages per room live in the zustand store (`use-chat-store`). Room ids match the server: `workspace:<id>`, `project:<id>`, `direct:<a>:<b>` (ids sorted).
- Every socket action (`message:send/edit/delete/react`, `room:join`, `room:read`) is acknowledged by the server, so sends never double up.
- Attachments: upload with `POST /chat/uploads` (max 5 files, 10 MB each), then send the returned attachments with the message. Files are stored in `backend/uploads/` and only served to signed-in users.
