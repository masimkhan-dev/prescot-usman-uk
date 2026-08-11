import React, { useState, useEffect, useRef, useMemo } from "react";
import { ChevronDown, X, Check, Search, Smartphone, Wrench, Layers } from "lucide-react";
import { CATEGORIZED_DEVICE_PRESETS } from "@/constants/repairPresets";

interface SearchableComboboxInputProps {
  value: string;
  onChange: (val: string) => void;
  options?: string[];
  isDeviceField?: boolean;
  placeholder?: string;
  className?: string;
  required?: boolean;
  onSelectOption?: (val: string) => void;
}

export function SearchableComboboxInput({
  value,
  onChange,
  options,
  isDeviceField = false,
  placeholder = "Type or select...",
  className = "",
  required = false,
  onSelectOption,
}: SearchableComboboxInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedBrandFilter, setSelectedBrandFilterState] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("prescot_pos_last_selected_brand") || "All";
    }
    return "All";
  });

  const setSelectedBrandFilter = (brand: string) => {
    setSelectedBrandFilterState(brand);
    if (typeof window !== "undefined") {
      localStorage.setItem("prescot_pos_last_selected_brand", brand);
    }
  };

  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Compute brand badge map if device field
  const deviceBrandMap = useMemo(() => {
    const map = new Map<string, { brand: string; badgeColor?: string }>();
    CATEGORIZED_DEVICE_PRESETS.forEach((cat) => {
      cat.models.forEach((m) => {
        map.set(m.toLowerCase(), { brand: cat.brand, badgeColor: cat.badgeColor });
      });
    });
    return map;
  }, []);

  // Filter items
  const filteredItems = useMemo<{ model: string; brand: string; badgeColor?: string }[]>(() => {
    const trimmed = value.trim().toLowerCase();

    if (isDeviceField) {
      let result: { model: string; brand: string; badgeColor?: string }[] = [];

      CATEGORIZED_DEVICE_PRESETS.forEach((cat) => {
        // Apply Brand filter tab if not "All"
        if (selectedBrandFilter !== "All" && !cat.brand.toLowerCase().includes(selectedBrandFilter.toLowerCase())) {
          return;
        }

        cat.models.forEach((model) => {
          if (!trimmed || model.toLowerCase().includes(trimmed)) {
            result.push({ model, brand: cat.brand, badgeColor: cat.badgeColor });
          }
        });
      });

      return result.slice(0, 30);
    } else {
      // General options (e.g. Reported Faults)
      const list = options || [];
      if (!trimmed) {
        return list.slice(0, 25).map((opt) => ({ model: opt, brand: "", badgeColor: undefined }));
      }
      return list
        .filter((opt) => opt.toLowerCase().includes(trimmed))
        .slice(0, 30)
        .map((opt) => ({ model: opt, brand: "", badgeColor: undefined }));
    }
  }, [value, options, isDeviceField, selectedBrandFilter]);

  // Reset highlight index when filtered list changes
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredItems.length, value, selectedBrandFilter]);

  // Keyboard navigation handler
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
    } else if (e.key === "Enter") {
      if (filteredItems.length > 0 && highlightedIndex >= 0 && highlightedIndex < filteredItems.length) {
        e.preventDefault();
        handleSelect(filteredItems[highlightedIndex].model);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (isOpen && listRef.current) {
      const activeEl = listRef.current.children[highlightedIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleSelect = (selectedModel: string) => {
    onChange(selectedModel);
    if (onSelectOption) {
      onSelectOption(selectedModel);
    }
    setIsOpen(false);
  };

  // Render text with matched query highlighted
  const renderHighlightedText = (text: string, query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return text;
    const index = text.toLowerCase().indexOf(trimmed.toLowerCase());
    if (index === -1) return text;

    const before = text.substring(0, index);
    const match = text.substring(index, index + trimmed.length);
    const after = text.substring(index + trimmed.length);

    return (
      <>
        {before}
        <span className="bg-brand/20 text-brand font-bold underline underline-offset-2">{match}</span>
        {after}
      </>
    );
  };

  const brandTabs = ["All", "Apple", "Samsung", "Google", "Xiaomi", "OnePlus", "Motorola", "Laptops", "Consoles"];

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="relative flex items-center">
        <input
          type="text"
          required={required}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`${className} pr-14`}
        />

        <div className="absolute right-2 flex items-center gap-1 text-muted-foreground">
          {value ? (
            <button
              type="button"
              onClick={() => {
                onChange("");
                setIsOpen(true);
              }}
              className="p-1 hover:text-foreground rounded-full transition-colors"
              title="Clear input"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className="p-1 hover:text-foreground transition-colors"
            tabIndex={-1}
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${
                isOpen ? "rotate-180 text-brand" : ""
              }`}
            />
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-64 sm:max-h-72">
          {/* Brand Filter Tabs for Device fields */}
          {isDeviceField && (
            <div className="flex items-center gap-1.5 p-2 bg-muted/50 border-b border-border overflow-x-auto scrollbar-none touch-pan-x scroll-smooth shrink-0">
              <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground shrink-0 px-1">
                Brand:
              </span>
              {brandTabs.map((brand) => (
                <button
                  key={brand}
                  type="button"
                  onClick={() => setSelectedBrandFilter(brand)}
                  className={`text-[11px] sm:text-[10px] px-2.5 py-1 sm:py-0.5 rounded-full font-medium transition-all shrink-0 border select-none ${
                    selectedBrandFilter === brand
                      ? "bg-brand text-brand-foreground border-brand shadow-sm font-bold scale-[1.02]"
                      : "bg-background/90 hover:bg-muted text-muted-foreground border-border/80"
                  }`}
                >
                  {brand}
                </button>
              ))}
            </div>
          )}

          {/* Options List */}
          <div ref={listRef} className="overflow-y-auto overscroll-contain touch-pan-y divide-y divide-border/30 p-1 flex-1">
            {filteredItems.length > 0 ? (
              filteredItems.map((item, index) => {
                const isSelected = value.trim().toLowerCase() === item.model.toLowerCase();
                const isHighlighted = index === highlightedIndex;

                return (
                  <div
                    key={`${item.model}-${index}`}
                    onClick={() => handleSelect(item.model)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`px-3 py-2.5 sm:py-2 text-xs sm:text-xs cursor-pointer flex items-center justify-between rounded-lg transition-all ${
                      isHighlighted
                        ? "bg-brand/15 text-foreground font-medium"
                        : isSelected
                        ? "bg-brand/10 text-brand font-semibold"
                        : "hover:bg-muted/70 text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate pr-2">
                      {isDeviceField ? (
                        <Smartphone className="w-3.5 h-3.5 text-brand shrink-0" />
                      ) : (
                        <Wrench className="w-3.5 h-3.5 text-brand shrink-0" />
                      )}
                      <span className="truncate">{renderHighlightedText(item.model, value)}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {item.brand && (
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded border font-mono font-medium max-w-[90px] truncate ${
                            item.badgeColor || "bg-muted text-muted-foreground border-border"
                          }`}
                        >
                          {item.brand.replace("Apple ", "").replace("Samsung ", "").replace("Google ", "")}
                        </span>
                      )}
                      {isSelected && <Check className="w-3.5 h-3.5 text-brand shrink-0" />}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="px-3 py-3 text-xs text-muted-foreground italic flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5 text-muted-foreground/70" />
                  <span>No exact match found for "{value}"</span>
                </div>
                <span className="text-[10px] bg-muted px-2 py-0.5 rounded text-foreground font-sans font-medium">
                  Press Enter to use custom entry
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
