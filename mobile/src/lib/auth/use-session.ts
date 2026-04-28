import { useQuery, useQueryClient } from "@tanstack/react-query";
import { authClient } from "./auth-client";

export const SESSION_QUERY_KEY = ['auth-session'] as const;

const SESSION_TIMEOUT_MS = 10000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Session check timeout')), ms)
    ),
  ]);
}

export const useSession = () => {
  return useQuery({
    queryKey: SESSION_QUERY_KEY,
    queryFn: async () => {
      const result = await withTimeout(authClient.getSession(), SESSION_TIMEOUT_MS);
      return result.data ?? null;
    },
    staleTime: 1000 * 60 * 5,
    retry: 0,
  });
};

export const useInvalidateSession = () => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY });
};
