import { getCurrentUserQueryFn } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

const useAuth = () => {
  const query = useQuery({
    queryKey: ["authUser"],
    queryFn: getCurrentUserQueryFn,
    staleTime: 0,
    // A 401 just means "not signed in"; retrying only spams the server
    retry: (failureCount, error) =>
      (error as { response?: { status?: number } })?.response?.status !== 401 &&
      failureCount < 2,
  });
  return query;
};

export default useAuth;
