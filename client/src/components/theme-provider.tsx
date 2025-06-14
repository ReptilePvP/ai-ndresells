import { useTheme } from "@/hooks/use-theme";

export { ThemeProvider } from "@/hooks/use-theme";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <button
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
    >
      <i className={`fas ${theme === "light" ? "fa-moon" : "fa-sun"} text-gray-600 dark:text-gray-300`}></i>
    </button>
  );
}