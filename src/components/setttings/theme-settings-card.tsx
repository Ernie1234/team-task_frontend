import { useTheme } from "@/hooks/ThemeContext";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const ThemeSettingsCard = () => {
  const { theme, setTheme } = useTheme();

  const themeOptions = [
    {
      value: "light",
      label: "Light",
      bgColor: "bg-[#f8f9fa]",
      borderColor: "border-gray-300",
      textColor: "text-gray-800",
    },
    {
      value: "dark",
      label: "Dark",
      bgColor: "bg-[#1a1d21]",
      borderColor: "border-gray-700",
      textColor: "text-gray-100",
    },
    {
      value: "orange",
      label: "Orange",
      bgColor: "bg-orange-100",
      borderColor: "border-orange-300",
      textColor: "text-orange-800",
    },
    {
      value: "blue",
      label: "Blue",
      bgColor: "bg-blue-100",
      borderColor: "border-blue-300",
      textColor: "text-blue-800",
    },
    {
      value: "green",
      label: "Green",
      bgColor: "bg-green-100",
      borderColor: "border-green-300",
      textColor: "text-green-800",
    },
    {
      value: "red",
      label: "Red",
      bgColor: "bg-red-100",
      borderColor: "border-red-300",
      textColor: "text-red-800",
    },
    {
      value: "purple",
      label: "Purple",
      bgColor: "bg-purple-100",
      borderColor: "border-purple-300",
      textColor: "text-purple-800",
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
                className={`flex cursor-pointer flex-col items-center justify-between rounded-md border-2 p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary ${themeOption.bgColor} ${themeOption.borderColor} ${themeOption.textColor} font-medium`}
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
