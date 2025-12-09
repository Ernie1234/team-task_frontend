import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TypingUser } from "@/lib/socket";

interface TypingIndicatorProps {
  users: TypingUser[];
}

const TypingIndicator: React.FC<TypingIndicatorProps> = ({ users }) => {
  if (users.length === 0) return null;

  const getUserInitials = (name: string) => {
    return name
      .split(" ")
      .map(word => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getTypingText = () => {
    if (users.length === 1) {
      return `${users[0].userName} is typing...`;
    } else if (users.length === 2) {
      return `${users[0].userName} and ${users[1].userName} are typing...`;
    } else if (users.length === 3) {
      return `${users[0].userName}, ${users[1].userName}, and ${users[2].userName} are typing...`;
    } else {
      return `${users[0].userName}, ${users[1].userName}, and ${users.length - 2} others are typing...`;
    }
  };

  return (
    <div className="flex items-start space-x-3">
      {/* Show avatars for up to 3 users */}
      <div className="flex -space-x-1">
        {users.slice(0, 3).map((user) => (
          <Avatar key={user.userId} className="w-6 h-6 border-2 border-background">
            <AvatarImage 
              src={user.profilePicture} 
              alt={user.userName} 
            />
            <AvatarFallback className="text-xs">
              {getUserInitials(user.userName)}
            </AvatarFallback>
          </Avatar>
        ))}
      </div>

      {/* Typing text with animation */}
      <div className="flex-1">
        <div className="bg-muted rounded-lg px-3 py-2 max-w-fit">
          <div className="flex items-center space-x-1">
            <span className="text-sm text-muted-foreground">
              {getTypingText()}
            </span>
            
            {/* Animated dots */}
            <div className="flex space-x-1">
              <div className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce"></div>
              <div className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TypingIndicator;