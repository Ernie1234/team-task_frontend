import React, { useState, useRef, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  MoreHorizontal, 
  Edit3, 
  Trash2, 
  Copy,
  Smile,
  Check,
  X
} from "lucide-react";
import { Message } from "@/lib/socket";
import socketService from "@/lib/socket";
import useAuth from "@/hooks/api/use-auth";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface MessageBubbleProps {
  message: Message;
  showAvatar: boolean;
  isOwnMessage: boolean;
  roomId: string;
}

const REACTION_EMOJIS = [
  { emoji: "👍", name: "thumbs_up" },
  { emoji: "❤️", name: "heart" },
  { emoji: "😂", name: "laugh" },
  { emoji: "😮", name: "wow" },
  { emoji: "😢", name: "sad" },
  { emoji: "😡", name: "angry" },
];

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  showAvatar,
  isOwnMessage,
}) => {
  const { data: user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.content);
  const [isHovering, setIsHovering] = useState(false);
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [isEditing]);

  const handleEdit = async () => {
    if (!editText.trim() || editText === message.content) {
      setIsEditing(false);
      setEditText(message.content);
      return;
    }

    try {
      await socketService.editMessage(message._id, editText.trim());
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to edit message:", error);
      setEditText(message.content);
      setIsEditing(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete this message?")) {
      try {
        await socketService.deleteMessage(message._id);
      } catch (error) {
        console.error("Failed to delete message:", error);
      }
    }
  };

  const handleReaction = async (emoji: string) => {
    try {
      await socketService.reactToMessage(message._id, emoji);
    } catch (error) {
      console.error("Failed to add reaction:", error);
    }
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(message.content);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleEdit();
    } else if (e.key === "Escape") {
      setIsEditing(false);
      setEditText(message.content);
    }
  };

  const getUserInitials = (name: string) => {
    return name
      .split(" ")
      .map(word => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatMessageTime = (date: string) => {
    const messageDate = new Date(date);
    const now = new Date();
    const diffInHours = (now.getTime() - messageDate.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return messageDate.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else {
      return formatDistanceToNow(messageDate, { addSuffix: true });
    }
  };

  const renderReactions = () => {
    if (!message.reactions || Object.keys(message.reactions).length === 0) {
      return null;
    }

    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {Object.entries(message.reactions).map(([emoji, users]) => {
          const hasUserReacted = users.some(u => u._id === user?.user._id);
          const count = 2
          // const count = users.emoji;
          
          if (count === 0) return null;

          return (
            <TooltipProvider key={emoji}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-6 px-2 text-xs",
                      hasUserReacted && "bg-primary/10 border-primary/20"
                    )}
                    onClick={() => handleReaction(emoji)}
                  >
                    <span className="mr-1">{emoji}</span>
                    {count}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-sm">
                    {users.map(u => u.name).join(", ")}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>
    );
  };

  if (message.isDeleted) {
    return (
      <div className="flex items-start space-x-3 opacity-60">
        {showAvatar && (
          <div className="w-8 h-8" /> // Spacer for deleted messages
        )}
        <div className="flex-1">
          <p className="text-sm italic text-muted-foreground">
            This message was deleted
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-start space-x-3 group",
        isOwnMessage && "flex-row-reverse space-x-reverse"
      )}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Avatar */}
      {showAvatar && (
        <Avatar className="w-8 h-8 flex-shrink-0">
          <AvatarImage 
            src={message.sender.profilePicture} 
            alt={message.sender.name} 
          />
          <AvatarFallback>
            {getUserInitials(message.sender.name)}
          </AvatarFallback>
        </Avatar>
      )}
      
      {!showAvatar && <div className="w-8 h-8 flex-shrink-0" />}

      {/* Message Content */}
      <div className={cn("flex-1 min-w-0", isOwnMessage && "text-right")}>
        {/* Sender name and timestamp */}
        {showAvatar && (
          <div className={cn(
            "flex items-center space-x-2 mb-1",
            isOwnMessage && "justify-end"
          )}>
            <span className="text-sm font-medium">{message.sender.name}</span>
            <span className="text-xs text-muted-foreground">
              {formatMessageTime(message.createdAt)}
            </span>
            {message.updatedAt !== message.createdAt && (
              <span className="text-xs text-muted-foreground italic">
                (edited)
              </span>
            )}
          </div>
        )}

        {/* Message bubble */}
        <div className="relative overflow-visible">
          <div
            className={cn(
              "inline-block max-w-[70%] px-3 py-2 rounded-lg",
              isOwnMessage
                ? "bg-primary text-primary-foreground ml-auto"
                : "bg-muted",
              isEditing && "border-2 border-primary"
            )}
          >
            {isEditing ? (
              <div className="flex items-center space-x-2">
                <Input
                  ref={editInputRef}
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={handleKeyPress}
                  className="min-w-0 bg-transparent border-none p-0 h-auto text-sm"
                />
                <div className="flex space-x-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={handleEdit}
                  >
                    <Check className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={() => {
                      setIsEditing(false);
                      setEditText(message.content);
                    }}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm whitespace-pre-wrap break-words">
                {message.content}
              </p>
            )}
          </div>

          {/* Message Actions */}
          {isHovering && !isEditing && (
            <div className={cn(
              "absolute top-0 flex items-center space-x-1",
              isOwnMessage ? "left-20" : "right-20"
            )}>
              {/* Quick reactions */}
              <div className="flex items-center space-x-1 bg-background border rounded-lg p-1 shadow-lg">
                {REACTION_EMOJIS.slice(0, 3).map(({ emoji, name }) => (
                  <Button
                    key={name}
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 text-sm"
                    onClick={() => handleReaction(emoji)}
                  >
                    {emoji}
                  </Button>
                ))}
                
                {/* More actions dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                    >
                      <MoreHorizontal className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleCopyMessage}>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy message
                    </DropdownMenuItem>
                    
                    {/* More reaction options */}
                    <DropdownMenuItem>
                      <div className="flex items-center space-x-2 px-2 py-1">
                        <Smile className="w-4 h-4" />
                        <div className="flex space-x-1">
                          {REACTION_EMOJIS.slice(3).map(({ emoji, name }) => (
                            <Button
                              key={name}
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-sm"
                              onClick={() => handleReaction(emoji)}
                            >
                              {emoji}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </DropdownMenuItem>
                    
                    {isOwnMessage && (
                      <>
                        <DropdownMenuItem onClick={() => setIsEditing(true)}>
                          <Edit3 className="w-4 h-4 mr-2" />
                          Edit message
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={handleDelete}
                          className="text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete message
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          )}

          {/* Reactions */}
          {renderReactions()}
        </div>

        {/* Timestamp for messages without avatar */}
        {!showAvatar && isHovering && (
          <div className={cn(
            "text-xs text-muted-foreground mt-1",
            isOwnMessage && "text-right"
          )}>
            {formatMessageTime(message.createdAt)}
            {message.updatedAt !== message.createdAt && (
              <span className="italic ml-1">(edited)</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;