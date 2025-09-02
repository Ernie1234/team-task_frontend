// SettingsPage.tsx

import { useNavigate } from "react-router-dom";
import { useTheme } from "@/hooks/ThemeContext";
import { Label } from "../ui/label";
import { Button } from "../ui/button";

const SettingsPage = () => {
  const navigate = useNavigate();
  const { theme, setTheme, togglePosition, setTogglePosition } = useTheme();

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <h1 className="text-3xl font-bold text-center">Settings</h1>
        <div className="grid gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="theme">Choose Theme</Label>
            <select
              id="theme"
              className="p-2 border rounded"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="orange">Orange</option>
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="toggle-position">Toggle Button Position</Label>

            <select
              id="toggle-position"
              className="p-2 border rounded"
              value={togglePosition}
              onChange={(e) => setTogglePosition(e.target.value)}
            >
              <option value="top-right">Top Right</option>
              <option value="top-left">Top Left</option>
              <option value="bottom-right">Bottom Right</option>
              <option value="bottom-left">Bottom Left</option>
            </select>
          </div>

          <Button onClick={() => navigate("/")}>Go Back to Sign In</Button>
        </div>
      </div>{" "}
    </div>
  );
};

export default SettingsPage;
