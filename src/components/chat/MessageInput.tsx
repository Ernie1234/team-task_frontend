import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { 
  Send, 
  Smile, 
  Paperclip
} from "lucide-react";
import { ChatRoom } from "@/hooks/use-chat-store";
import socketService from "@/lib/socket";
import useAuth from "@/hooks/api/use-auth";
import useChatStore from "@/hooks/use-chat-store";
import { 
  sendWorkspaceMessageMutationFn, 
  sendProjectMessageMutationFn, 
  sendDirectMessageMutationFn 
} from "@/lib/api";

interface MessageInputProps {
  room: ChatRoom;
  disabled?: boolean;
}

// Common emojis for quick access
const QUICK_EMOJIS = [
  "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣",
  "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰",
  "😘", "😗", "😙", "😚", "😋", "😛", "😝", "😜",
  "🤪", "🤨", "🧐", "🤓", "😎", "🤩", "🥳", "😏",
  "😒", "😞", "😔", "😟", "😕", "🙁", "☹️", "😣",
  "😖", "😫", "😩", "🥺", "😢", "😭", "😤", "😠",
  "👍", "👎", "👌", "✌️", "🤞", "🤟", "🤘", "🤙",
  "👏", "🙌", "👐", "🤝", "🙏", "💪", "🎉", "🎊"
];

const MessageInput: React.FC<MessageInputProps> = ({ room, disabled = false }) => {
  const { data: user } = useAuth();
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const { sendingMessage, setSendingMessage, addMessage } = useChatStore();

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  // Handle typing indicators
  useEffect(() => {
    const handleTypingStart = () => {
      if (!isTyping && message.trim()) {
        setIsTyping(true);
        socketService.startTyping(room.type, {
          workspace: room.workspace,
          project: room.project,
          otherUserId: room.otherUser?._id,
        });
      }

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set new timeout to stop typing
      typingTimeoutRef.current = setTimeout(() => {
        if (isTyping) {
          setIsTyping(false);
          socketService.stopTyping(room.type, {
            workspace: room.workspace,
            project: room.project,
            otherUserId: room.otherUser?._id,
          });
        }
      }, 2000); // Stop typing after 2 seconds of inactivity
    };

    if (message.trim()) {
      handleTypingStart();
    }

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [message, isTyping, room.type, room.workspace, room.project, room.otherUser?._id]);

  // Stop typing when component unmounts or message is sent
  useEffect(() => {
    return () => {
      if (isTyping) {
        socketService.stopTyping(room.type, {
          workspace: room.workspace,
          project: room.project,
          otherUserId: room.otherUser?._id,
        });
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [isTyping, room]);

  const handleSendMessage = async () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || sendingMessage || disabled) return;

    setSendingMessage(true);
    setMessage("");
    
    // Stop typing indicator
    if (isTyping) {
      setIsTyping(false);
      socketService.stopTyping(room.type, {
        workspace: room.workspace,
        project: room.project,
        otherUserId: room.otherUser?._id,
      });
    }

    try {
      // Try socket first if connected
      if (socketService.isConnected()) {
        try {
          await socketService.sendMessage(room.type, {
            content: trimmedMessage,
            workspace: room.workspace,
            project: room.project,
            otherUserId: room.otherUser?._id,
          });
          return; // Success via socket
        } catch (socketError) {
          console.warn("Socket send failed, falling back to REST API:", socketError);
        }
      }

      // Fallback to REST API
      console.log('Sending message via REST API');
      let response;
      switch (room.type) {
        case "workspace":
          if (room.workspace) {
            response = await sendWorkspaceMessageMutationFn({
              workspaceId: room.workspace,
              content: trimmedMessage,
            });
          }
          break;
          
        case "project":
          if (room.project) {
            response = await sendProjectMessageMutationFn({
              projectId: room.project,
              content: trimmedMessage,
            });
          }
          break;
          
        case "direct":
          if (room.otherUser?._id) {
            response = await sendDirectMessageMutationFn({
              otherUserId: room.otherUser._id,
              content: trimmedMessage,
            });
          }
          break;
      }
      
      // Manually add message to store since REST API won't trigger socket event
      if (response?.data) {
        addMessage(room.id, response.data);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      // Restore message on error
      setMessage(trimmedMessage);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newMessage = message.substring(0, start) + emoji + message.substring(end);
      setMessage(newMessage);
      
      // Set cursor position after emoji
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + emoji.length;
        textarea.focus();
      }, 0);
    } else {
      setMessage(prev => prev + emoji);
    }
    setShowEmojiPicker(false);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      // TODO: Implement file upload functionality
      console.log("Files selected:", files);
      // For now, just show the file name
      const fileNames = Array.from(files).map(file => file.name).join(", ");
      setMessage(prev => prev + `📎 ${fileNames} `);
    }
  };

  if (!user) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-muted-foreground">Please log in to send messages</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-end space-x-2">
        {/* Message input */}
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={`Message ${room.name}...`}
            disabled={disabled || sendingMessage}
            className="min-h-[40px] max-h-32 resize-none pr-20"
            rows={1}
          />
          
          {/* Input actions */}
          <div className="absolute right-2 bottom-2 flex items-center space-x-1">
            {/* File upload */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => document.getElementById('file-upload')?.click()}
                  >
                    <Paperclip className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Attach file</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Emoji picker */}
            <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
              <PopoverTrigger asChild>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                      >
                        <Smile className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Add emoji</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                <div className="grid grid-cols-8 gap-2 p-2">
                  {QUICK_EMOJIS.map((emoji, index) => (
                    <Button
                      key={index}
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-lg hover:bg-muted"
                      onClick={() => handleEmojiSelect(emoji)}
                    >
                      {emoji}
                    </Button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Hidden file input */}
          <input
            id="file-upload"
            type="file"
            multiple
            accept="image/*,video/*,.pdf,.doc,.docx,.txt"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>

        {/* Send button */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={handleSendMessage}
                disabled={!message.trim() || sendingMessage || disabled}
                size="sm"
                className="h-10 w-10 p-0 flex-shrink-0"
              >
                {sendingMessage ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Send message (Enter)
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Helper text */}
      <p className="text-xs text-muted-foreground">
        Press Enter to send, Shift + Enter for new line
      </p>
    </div>
  );
};

export default MessageInput;