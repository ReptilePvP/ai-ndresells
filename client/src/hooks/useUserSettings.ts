
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "./useAuth";

interface UserSettings {
  apiProvider: "gemini" | "searchapi" | "serpapi";
}

interface UserSettingsContextType {
  settings: UserSettings;
  updateApiProvider: (provider: "gemini" | "searchapi" | "serpapi") => Promise<void>;
  isLoading: boolean;
}

const UserSettingsContext = createContext<UserSettingsContextType | undefined>(undefined);

interface UserSettingsProviderProps {
  children: ReactNode;
}

export function UserSettingsProvider({ children }: UserSettingsProviderProps) {
  const { user, isAuthenticated } = useAuth();
  const [settings, setSettings] = useState<UserSettings>({
    apiProvider: "gemini"
  });
  const [isLoading, setIsLoading] = useState(false);

  // Load user settings when authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      setSettings({
        apiProvider: user.apiProvider || "gemini"
      });
    }
  }, [isAuthenticated, user]);

  const updateApiProvider = async (provider: "gemini" | "searchapi" | "serpapi") => {
    if (!isAuthenticated) return;
    
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/update-api-provider", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiProvider: provider }),
        credentials: "include"
      });

      if (!response.ok) {
        throw new Error("Failed to update API provider");
      }

      setSettings(prev => ({ ...prev, apiProvider: provider }));
    } catch (error) {
      console.error("Failed to update API provider:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <UserSettingsContext.Provider value={{ settings, updateApiProvider, isLoading }}>
      {children}
    </UserSettingsContext.Provider>
  );
}

export function useUserSettings() {
  const context = useContext(UserSettingsContext);
  if (context === undefined) {
    throw new Error("useUserSettings must be used within a UserSettingsProvider");
  }
  return context;
}
