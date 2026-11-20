import type { MessageAttachment } from "@/lib/socket";

// Attachments are served by the API server, not the app's own origin
const API_ORIGIN = (import.meta.env.VITE_API_BASE_URL || "http://localhost:3000").replace(
  /\/api(\/v1)?\/?$/,
  ""
);

// Server paths get the API origin; local previews (blob:) and full URLs are used as-is
export const fileUrl = (url: string) =>
  /^(https?:|blob:|data:)/.test(url) ? url : `${API_ORIGIN}${url}`;

export const isImageAttachment = (attachment: Pick<MessageAttachment, "mimeType">) =>
  /^image\/(png|jpe?g|gif|webp)$/.test(attachment.mimeType);

export const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

// Mirrors the server's rules so people find out before uploading
export const MAX_FILE_SIZE = 10 * 1024 * 1024;
export const MAX_FILES = 5;
export const ACCEPTED_FILE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/zip",
  "application/x-zip-compressed",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];

export const fileProblem = (file: File): string | null => {
  if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
    return `${file.name}: this file type can't be sent. Use images, PDFs, Office files, text or zip.`;
  }
  if (file.size > MAX_FILE_SIZE) return `${file.name} is larger than 10 MB.`;
  return null;
};

// Short text for a message in a conversation preview
export const messagePreview = (message: {
  content?: string;
  isDeleted?: boolean;
  attachments?: MessageAttachment[];
}) => {
  if (message.isDeleted) return "Message deleted";
  if (message.content) return message.content;
  const files = message.attachments ?? [];
  if (files.length === 0) return "";
  if (files.every(isImageAttachment)) return files.length > 1 ? `📷 ${files.length} photos` : "📷 Photo";
  return files.length > 1 ? `📎 ${files.length} files` : `📎 ${files[0].name}`;
};
