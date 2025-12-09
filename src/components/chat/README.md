# Real-Time Chat System

## Overview

This directory contains a comprehensive real-time chat system built with Socket.IO, React, and Zustand. The chat system supports workspace-wide communication, project-specific discussions, and direct messages with proper workspace isolation.

## Features

### ✅ Implemented Features

- **Real-time messaging** with Socket.IO
- **Workspace isolation** - users can only access chats within their workspaces
- **Multiple chat types**:
  - Workspace channels (team-wide communication)
  - Project channels (project-specific discussions)
  - Direct messages (1-on-1 conversations)
- **Message features**:
  - Send, edit, delete messages
  - Message reactions with emojis
  - Typing indicators
  - Read receipts
  - Message timestamps
- **User presence** - online/offline status tracking
- **Responsive UI** with sidebar and resizable panels
- **Emoji picker** for quick reactions
- **File attachment support** (UI ready, backend integration needed)
- **Message pagination** for chat history
- **Unread message counters**

## Architecture

### Frontend Components

- **ChatLayout**: Main layout combining sidebar and chat interface
- **ChatSidebar**: Navigation between different chat rooms
- **ChatInterface**: Main chat view with messages and input
- **MessageBubble**: Individual message component with actions
- **MessageInput**: Text input with emoji picker and attachments
- **TypingIndicator**: Shows when users are typing
- **OnlineUsers**: Displays online workspace members
- **ChatWidget**: Dashboard widget showing recent activity

### State Management

- **useChatStore** (Zustand): Global chat state management
- Real-time updates via Socket.IO event listeners
- Persistent connection management
- Room-based message organization

### Backend Integration

- **Socket.IO Client** (`src/lib/socket.ts`): Connection and event handling
- **API Functions** (`src/lib/api.ts`): REST endpoints for chat history
- **Authentication**: Integrated with workspace authentication system

## Usage

### Basic Navigation

1. **Access Chat**: Click "Chat" in the sidebar or visit `/workspace/:workspaceId/chat`
2. **Project Chat**: From project details, click "Project Chat" button
3. **Direct Messages**: Use the "+" button in the sidebar's DM section

### Chat Types

#### Workspace Chat
```typescript
// Automatically created for each workspace
const workspaceRoom = {
  id: `workspace:${workspaceId}`,
  name: "General",
  type: "workspace",
  workspace: workspaceId
};
```

#### Project Chat
```typescript
// Created when accessing project chat
const projectRoom = {
  id: `project:${projectId}`,
  name: "Project Discussion", 
  type: "project",
  project: projectId
};
```

#### Direct Messages
```typescript
// Created when starting DM with another user
const directRoom = {
  id: `direct:${otherUserId}`,
  name: otherUser.name,
  type: "direct",
  otherUser: { _id, name, profilePicture }
};
```

## Testing Workspace Isolation

### Test Scenarios

1. **User A in Workspace 1**:
   - Should only see messages from Workspace 1 members
   - Cannot access Workspace 2 chat rooms
   - Can only start DMs with Workspace 1 members

2. **User B in Workspace 2**:
   - Should only see messages from Workspace 2 members
   - Cannot see any messages from Workspace 1
   - Online status only shows Workspace 2 members

3. **Cross-workspace Testing**:
   - User A sends message in Workspace 1 → User B (Workspace 2) should NOT receive
   - User B goes online → User A should NOT see them in online list
   - Direct message attempts between different workspaces should be blocked

### Manual Testing Steps

1. **Setup**:
   ```bash
   # Start backend server
   cd team-task_backend
   npm run dev
   
   # Start frontend
   cd team-task_frontend
   npm run dev
   ```

2. **Create Test Users**:
   - Create 2 workspaces
   - Add User A to Workspace 1
   - Add User B to Workspace 2
   - Add User C to both workspaces (for cross-workspace testing)

3. **Test Workspace Isolation**:
   - Login as User A → Access Workspace 1 chat
   - Login as User B in different browser → Access Workspace 2 chat
   - Send messages and verify they don't cross workspaces
   - Check online user lists are workspace-specific
   - Test direct message restrictions

4. **Test Real-time Features**:
   - Send messages → Should appear immediately
   - Start typing → Should show typing indicator
   - Add reactions → Should update in real-time
   - Go online/offline → Should update presence status

## Integration Points

### Dashboard Integration
- **ChatWidget**: Shows recent chat activity
- **Navigation**: "Chat" item in workspace sidebar
- **Project Header**: "Project Chat" button

### Routes Added
```typescript
CHAT: "/workspace/:workspaceId/chat"
PROJECT_CHAT: "/workspace/:workspaceId/project/:projectId/chat"
```

### Dependencies
- `socket.io-client`: Real-time communication
- `zustand`: State management  
- `date-fns`: Date formatting
- `lucide-react`: Icons
- `@radix-ui/react-*`: UI components

## Security Considerations

### Implemented Security
- **Authentication**: Socket connections require valid JWT
- **Workspace Validation**: Server validates user membership before room access
- **Message Permissions**: Users can only edit/delete their own messages
- **Room Isolation**: Server enforces workspace-based room restrictions

### Backend Security (Already Implemented)
- JWT authentication for socket connections
- Workspace membership validation
- Message sender verification
- Rate limiting on message sending
- Input sanitization and validation

## Performance Optimizations

- **Message Pagination**: Loads messages in chunks
- **Connection Management**: Automatic reconnection on disconnect
- **State Efficiency**: Only stores active room messages in memory
- **Event Debouncing**: Typing indicators use debounced events
- **Lazy Loading**: Chat components load only when accessed

## Future Enhancements

1. **File Uploads**: Complete file attachment functionality
2. **Voice Messages**: Add voice note support
3. **Message Search**: Enhanced search across chat history
4. **Notification System**: Desktop/push notifications
5. **Message Threads**: Reply-to-message threading
6. **Video Calls**: Integration with video calling service
7. **Message Encryption**: End-to-end encryption for sensitive workspaces
8. **Bot Integration**: Chatbot support for automated responses

## Troubleshooting

### Common Issues

1. **Chat not loading**: Check socket connection and authentication
2. **Messages not real-time**: Verify WebSocket connection
3. **Wrong workspace messages**: Check workspace ID in URL
4. **Typing indicators stuck**: Reload page to reset state
5. **Connection drops**: Implemented auto-reconnection logic

### Debug Commands

```javascript
// Check socket connection
socketService.socket?.connected

// View current chat state  
useChatStore.getState()

// Force reconnection
socketService.disconnect()
socketService.connect()
```

## Support

For issues or questions about the chat system:
1. Check this README for common solutions
2. Verify backend socket handlers are running
3. Check browser console for WebSocket errors
4. Test with multiple users in different workspaces