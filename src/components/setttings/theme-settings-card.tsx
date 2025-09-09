import { useTheme } from "@/hooks/ThemeContext";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const ThemeSettingsCard = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div className="w-full">
      {/* Title Section (matches EditWorkspaceForm and DeleteWorkspaceCard) */}
      <div className="mb-5 border-b">
        <h1
          className="text-[17px] tracking-[-0.16px] dark:text-[#fcfdffef] font-semibold mb-1.5
           text-center sm:text-left"
        >
          Theme
        </h1>
      </div>

      {/* Content Section */}
      <div className="flex flex-col items-start justify-between py-0">
        <div className="flex-1 mb-4">
          <p>
            Select a theme for your workspace interface. Your choice will be
            saved for your next visit.
          </p>
        </div>

        <RadioGroup
          value={theme}
          onValueChange={setTheme}
          className="w-full grid grid-cols-1 sm:grid-cols-3 gap-4"
        >
          {/* Light Theme Option */}
          <div>
            <RadioGroupItem value="light" id="light" className="peer sr-only" />
            <Label
              htmlFor="light"
              className="flex cursor-pointer flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
            >
              Light
            </Label>
          </div>
          {/* Dark Theme Option */}
          <div>
            <RadioGroupItem value="dark" id="dark" className="peer sr-only" />
            <Label
              htmlFor="dark"
              className="flex cursor-pointer flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
            >
              Dark
            </Label>
          </div>
          {/* Orange Theme Option */}
          <div>
            <RadioGroupItem
              value="orange"
              id="orange"
              className="peer sr-only"
            />
            <Label
              htmlFor="orange"
              className="flex cursor-pointer flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
            >
              Orange
            </Label>
          </div>
        </RadioGroup>
      </div>
    </div>
  );
};

export default ThemeSettingsCard;
