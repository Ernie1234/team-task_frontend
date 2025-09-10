// types/notification.type.ts
export interface Notification {
  _id: string;
  recipient: {
    _id: string;
    name: string;
    email: string;
    profilePicture?: string;
  };
  sender: {
    _id: string;
    name: string;
    email: string;
    profilePicture?: string;
  };
  message: string;
  link: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
  __v?: number;
}

export type NotificationStatus = "all" | "read" | "unread";
