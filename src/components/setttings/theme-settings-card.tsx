import { useTheme } from "@/hooks/ThemeContext";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const ThemeSettingsCard = () => {
  const { theme, setTheme } = useTheme();

  const themeOptions = [
    { value: "light", label: "Light", color: "bg-[#f8f9fa] border-gray-300" },
    { value: "dark", label: "Dark", color: "bg-[#1a1d21] border-gray-700" },
    {
      value: "orange",
      label: "Orange",
      color: "bg-orange-100 border-orange-300",
    },
    { value: "blue", label: "Blue", color: "bg-blue-100 border-blue-300" },
    { value: "green", label: "Green", color: "bg-green-100 border-green-300" },
    { value: "red", label: "Red", color: "bg-red-100 border-red-300" },
    {
      value: "purple",
      label: "Purple",
      color: "bg-purple-100 border-purple-300",
    },
  ];

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
          className="w-full grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
        >
          {themeOptions.map((themeOption) => (
            <div key={themeOption.value}>
              <RadioGroupItem
                value={themeOption.value}
                id={themeOption.value}
                className="peer sr-only"
              />
              <Label
                htmlFor={themeOption.value}
                className={`flex cursor-pointer flex-col items-center justify-between rounded-md border-2 p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary ${themeOption.color}`}
              >
                {themeOption.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>
    </div>
  );
};

export default ThemeSettingsCard;
