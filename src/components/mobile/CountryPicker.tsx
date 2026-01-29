import { useState, useMemo } from "react";
import { Search, X, Check, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

interface Country {
  code: string;
  name: string;
  flag: string;
}

const countries: Country[] = [
  { code: "US", name: "United States", flag: "🇺🇸" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
  { code: "CA", name: "Canada", flag: "🇨🇦" },
  { code: "AU", name: "Australia", flag: "🇦🇺" },
  { code: "DE", name: "Germany", flag: "🇩🇪" },
  { code: "FR", name: "France", flag: "🇫🇷" },
  { code: "ES", name: "Spain", flag: "🇪🇸" },
  { code: "IT", name: "Italy", flag: "🇮🇹" },
  { code: "BR", name: "Brazil", flag: "🇧🇷" },
  { code: "MX", name: "Mexico", flag: "🇲🇽" },
  { code: "IN", name: "India", flag: "🇮🇳" },
  { code: "JP", name: "Japan", flag: "🇯🇵" },
  { code: "KR", name: "South Korea", flag: "🇰🇷" },
  { code: "CN", name: "China", flag: "🇨🇳" },
  { code: "AE", name: "United Arab Emirates", flag: "🇦🇪" },
  { code: "SA", name: "Saudi Arabia", flag: "🇸🇦" },
  { code: "NL", name: "Netherlands", flag: "🇳🇱" },
  { code: "SE", name: "Sweden", flag: "🇸🇪" },
  { code: "CH", name: "Switzerland", flag: "🇨🇭" },
  { code: "PL", name: "Poland", flag: "🇵🇱" },
  { code: "RU", name: "Russia", flag: "🇷🇺" },
  { code: "TR", name: "Turkey", flag: "🇹🇷" },
  { code: "ZA", name: "South Africa", flag: "🇿🇦" },
  { code: "NG", name: "Nigeria", flag: "🇳🇬" },
  { code: "EG", name: "Egypt", flag: "🇪🇬" },
  { code: "AR", name: "Argentina", flag: "🇦🇷" },
  { code: "CL", name: "Chile", flag: "🇨🇱" },
  { code: "CO", name: "Colombia", flag: "🇨🇴" },
  { code: "PH", name: "Philippines", flag: "🇵🇭" },
  { code: "ID", name: "Indonesia", flag: "🇮🇩" },
  { code: "MY", name: "Malaysia", flag: "🇲🇾" },
  { code: "SG", name: "Singapore", flag: "🇸🇬" },
  { code: "TH", name: "Thailand", flag: "🇹🇭" },
  { code: "VN", name: "Vietnam", flag: "🇻🇳" },
  { code: "PK", name: "Pakistan", flag: "🇵🇰" },
  { code: "BD", name: "Bangladesh", flag: "🇧🇩" },
  { code: "IR", name: "Iran", flag: "🇮🇷" },
  { code: "IL", name: "Israel", flag: "🇮🇱" },
  { code: "NO", name: "Norway", flag: "🇳🇴" },
  { code: "DK", name: "Denmark", flag: "🇩🇰" },
  { code: "FI", name: "Finland", flag: "🇫🇮" },
  { code: "IE", name: "Ireland", flag: "🇮🇪" },
  { code: "PT", name: "Portugal", flag: "🇵🇹" },
  { code: "GR", name: "Greece", flag: "🇬🇷" },
  { code: "CZ", name: "Czech Republic", flag: "🇨🇿" },
  { code: "AT", name: "Austria", flag: "🇦🇹" },
  { code: "BE", name: "Belgium", flag: "🇧🇪" },
  { code: "HU", name: "Hungary", flag: "🇭🇺" },
  { code: "RO", name: "Romania", flag: "🇷🇴" },
  { code: "UA", name: "Ukraine", flag: "🇺🇦" },
  { code: "NZ", name: "New Zealand", flag: "🇳🇿" },
  { code: "OTHER", name: "Other", flag: "🌍" },
];

export function getCountryByCode(code: string | null): Country | null {
  if (!code) return null;
  return countries.find((c) => c.code === code) || null;
}

interface CountryPickerFieldProps {
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
}

export function CountryPickerField({ value, onChange, disabled }: CountryPickerFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedCountry = getCountryByCode(value);

  return (
    <>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(true)}
        disabled={disabled}
        className="w-full flex items-center gap-3 bg-card/80 border border-border/30 rounded-xl px-4 py-3 text-left disabled:opacity-50"
      >
        <Globe className="w-5 h-5 text-muted-foreground" />
        {selectedCountry ? (
          <div className="flex items-center gap-2 flex-1">
            <span className="text-xl">{selectedCountry.flag}</span>
            <span className="text-foreground truncate">{selectedCountry.name}</span>
          </div>
        ) : (
          <span className="text-muted-foreground flex-1">Select Country</span>
        )}
        <svg
          className="w-4 h-4 text-muted-foreground"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <CountryPickerSheet
          selectedCode={value}
          onSelect={(code) => {
            onChange(code);
            setIsOpen(false);
          }}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}

interface CountryPickerSheetProps {
  selectedCode: string;
  onSelect: (code: string) => void;
  onClose: () => void;
}

function CountryPickerSheet({ selectedCode, onSelect, onClose }: CountryPickerSheetProps) {
  const [search, setSearch] = useState("");

  const filteredCountries = useMemo(() => {
    if (!search) return countries;
    const query = search.toLowerCase();
    return countries.filter(
      (c) => c.name.toLowerCase().includes(query) || c.code.toLowerCase().includes(query)
    );
  }, [search]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Sheet */}
      <div className="relative w-full max-w-md bg-card rounded-t-2xl max-h-[70vh] flex flex-col animate-in slide-in-from-bottom duration-300">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3">
          <h2 className="text-lg font-semibold text-foreground">Select Country</h2>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search countries..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-background border border-border/30 rounded-xl pl-10 pr-4 py-2.5 text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        {/* Country list */}
        <div className="flex-1 overflow-y-auto px-2 pb-6">
          {filteredCountries.map((country) => {
            const isSelected = country.code === selectedCode;
            return (
              <button
                key={country.code}
                onClick={() => onSelect(country.code)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors",
                  isSelected ? "bg-primary/10" : "hover:bg-muted/50"
                )}
              >
                <span className="text-2xl">{country.flag}</span>
                <span
                  className={cn(
                    "flex-1 text-foreground",
                    isSelected && "font-medium"
                  )}
                >
                  {country.name}
                </span>
                {isSelected && <Check className="w-5 h-5 text-primary" />}
              </button>
            );
          })}
          {filteredCountries.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No countries found</p>
          )}
        </div>
      </div>
    </div>
  );
}
