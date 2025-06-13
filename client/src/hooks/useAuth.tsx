import { useQuery } from "@tanstack/react-query";

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  apiProvider?: "gemini" | "searchapi" | "serpapi";
}

interface AuthResult {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: Error | null;
}

export function useAuth(): AuthResult {
  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/auth/me"],
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const user = data?.user as User | undefined;

  return {
    user: user || null,
    isAuthenticated: !!user,
    isLoading,
    error: error as Error | null,
  };
}