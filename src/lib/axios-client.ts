import { CustomError } from "@/types/custom-error.type";
import axios from "axios";

const baseURL = import.meta.env.VITE_API_BASE_URL;

const options = {
  baseURL,
  withCredentials: true,
  timeout: 10000,
};

const API = axios.create(options);

API.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    // No response means the server is down or unreachable
    const { data, status } = error.response ?? {};

    if (data === "Unauthorized" && status === 401) {
      window.location.href = "/";
    }

    const customError: CustomError = {
      ...error,
      // Our API sends errorCode; Better Auth (/auth/*) sends code
      errorCode: data?.errorCode || data?.code || "UNKNOWN_ERROR",
      message: data?.message || error.message,
      // Server errors carry a reference that matches the server's log line
      requestId: error.response?.headers?.["x-request-id"],
    };
    if (status >= 500 && customError.requestId) {
      customError.message = `${customError.message} (ref ${String(customError.requestId).slice(0, 8)})`;
    }

    return Promise.reject(customError);
  }
);

export default API;
