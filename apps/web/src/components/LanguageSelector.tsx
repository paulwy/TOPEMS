import React from "react";
import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { SUPPORTED_LANGUAGES, type LanguageCode } from "../i18n";

const LanguageSelector: React.FC = () => {
  const { i18n } = useTranslation();
  const currentLang = i18n.language as LanguageCode;

  const handleChangeLanguage = (code: LanguageCode) => {
    i18n.changeLanguage(code);
    localStorage.setItem("language", code);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Globe className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {SUPPORTED_LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => handleChangeLanguage(lang.code)}
            className={`${
              currentLang === lang.code ? "bg-blue-50 text-blue-700" : ""
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 flex items-center justify-center text-xs font-bold bg-slate-100 rounded">
                {lang.flag}
              </span>
              <span>{lang.name}</span>
              {currentLang === lang.code && (
                <span className="ml-auto text-xs text-slate-400">✓</span>
              )}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSelector;
