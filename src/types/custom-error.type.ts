export interface CustomError extends Error {
  errorCode?: string;
  /** X-Request-Id of the failed request, to find it in the server logs */
  requestId?: string;
}
