import { Smartphone, Laptop, Tablet, Gamepad2, Tv, Monitor } from "lucide-react";

interface DeviceOption {
  id: string;
  name: string;
  category: string;
  icon: any;
}

const DEVICES: DeviceOption[] = [
  { id: "iphone", name: "iPhone", category: "Phone", icon: Smartphone },
  { id: "samsung", name: "Samsung", category: "Phone", icon: Smartphone },
  { id: "pixel", name: "Google Pixel", category: "Phone", icon: Smartphone },
  { id: "ipad", name: "iPad & Tablet", category: "Tablet", icon: Tablet },
  { id: "macbook", name: "MacBook", category: "Laptop", icon: Laptop },
  { id: "laptop", name: "Windows Laptop", category: "Laptop", icon: Monitor },
  { id: "ps5", name: "PlayStation", category: "Console", icon: Gamepad2 },
  { id: "xbox", name: "Xbox", category: "Console", icon: Tv },
  { id: "switch", name: "Nintendo", category: "Console", icon: Gamepad2 },
];

export function DeviceSelector({ onSelect }: { onSelect?: (deviceId: string) => void }) {
  const handleDeviceClick = (id: string) => {
    if (onSelect) {
      onSelect(id);
    }
    const elem = document.getElementById("price-checker");
    if (elem) {
      elem.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="py-6 bg-slate-50 border-y border-slate-200 overflow-x-auto no-scrollbar">
      <div className="container-page flex items-center justify-between md:justify-center gap-3 min-w-max">
        {DEVICES.map((d) => {
          const Icon = d.icon;
          return (
            <button
              key={d.id}
              onClick={() => handleDeviceClick(d.id)}
              className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-white border border-slate-200 text-slate-800 font-extrabold text-xs hover:border-[#D92D20] hover:text-[#D92D20] hover:shadow-sm transition-all shrink-0 cursor-pointer"
            >
              <Icon className="w-4 h-4 text-[#D92D20]" />
              <span>{d.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
