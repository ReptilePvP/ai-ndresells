// Theme provider disabled - using fixed dark mode
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export const useTheme = () => {
  return {
    theme: "dark" as const,
    setTheme: () => {},
  };
};