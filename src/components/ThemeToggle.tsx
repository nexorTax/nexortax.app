import React, { useContext } from "react";
import { ThemeContext } from "../contexts/ThemeContext";
import { Sun, Moon } from "lucide-react";

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useContext(ThemeContext);
  return (
    <button className="btn small ghost" onClick={toggleTheme} title="Alternar tema">
      {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
};
