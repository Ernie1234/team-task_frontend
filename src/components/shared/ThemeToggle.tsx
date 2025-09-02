import { useTheme } from "@/hooks/ThemeContext";
import { Sun, Moon, Zap } from "lucide-react";
import { Button } from "../ui/button";

const ThemeToggle = () => {
  const { theme, setTheme, togglePosition } = useTheme();

  const getPositionClasses = (): string => {
    switch (togglePosition) {
      case "top-right":
        return "top-4 right-4";
      case "top-left":
        return "top-4 left-4";
      case "bottom-right":
        return "bottom-4 right-4";
      case "bottom-left":
        return "bottom-4 left-4";
      default:
        return "top-4 right-4";
    }
  };

  const toggleTheme = () => {
    setTheme((prev) => {
      if (prev === "light") return "dark";
      if (prev === "dark") return "orange";
      return "light";
    });
  };

  return (
    <Button
      onClick={toggleTheme}
      className={`fixed p-2 rounded-full shadow-lg z-50 transition-all duration-300 ${getPositionClasses()} bg-white dark:bg-gray-800 text-gray-800 dark:text-white`}
    >
      {theme === "light" && <Sun className="h-6 w-6" />}
      {theme === "dark" && <Moon className="h-6 w-6" />}
      {theme === "orange" && <Zap className="h-6 w-6" />}
    </Button>
  );
};

export default ThemeToggle;
