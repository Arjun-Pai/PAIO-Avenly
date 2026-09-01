// Language translation helper for Avenly Hub
// Supports 10 Indian Regional Languages + 5 International Languages

export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  category: "Indian Regional" | "International";
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  // International
  { code: "en", name: "English", nativeName: "English", category: "International" },
  { code: "es", name: "Spanish", nativeName: "Español", category: "International" },
  { code: "fr", name: "French", nativeName: "Français", category: "International" },
  { code: "de", name: "German", nativeName: "Deutsch", category: "International" },
  { code: "zh-CN", name: "Mandarin", nativeName: "中文 (简体)", category: "International" },

  // Indian Regional
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", category: "Indian Regional" },
  { code: "bn", name: "Bengali", nativeName: "বাংলা", category: "Indian Regional" },
  { code: "mr", name: "Marathi", nativeName: "मराठी", category: "Indian Regional" },
  { code: "te", name: "Telugu", nativeName: "తెలుగు", category: "Indian Regional" },
  { code: "ta", name: "Tamil", nativeName: "தமிழ்", category: "Indian Regional" },
  { code: "gu", name: "Gujarati", nativeName: "ગુજરાતી", category: "Indian Regional" },
  { code: "ur", name: "Urdu", nativeName: "اردو", category: "Indian Regional" },
  { code: "kn", name: "Kannada", nativeName: "ಕನ್ನಡ", category: "Indian Regional" },
  { code: "or", name: "Odia", nativeName: "ଓଡ଼ିଆ", category: "Indian Regional" },
  { code: "ml", name: "Malayalam", nativeName: "മലയാളം", category: "Indian Regional" }
];

export function setAppLanguage(langNameOrCode: string) {
  const langObj = SUPPORTED_LANGUAGES.find(
    l => l.name.toLowerCase() === langNameOrCode.toLowerCase() || l.code.toLowerCase() === langNameOrCode.toLowerCase()
  ) || SUPPORTED_LANGUAGES[0];

  localStorage.setItem("avenly_language", langObj.name);
  localStorage.setItem("avenly_language_code", langObj.code);

  // Set cookie for Google Translate element if present
  document.cookie = `googtrans=/en/${langObj.code}; path=/; domain=${window.location.hostname}`;
  document.cookie = `googtrans=/en/${langObj.code}; path=/`;

  // Trigger Google Translate widget if embedded
  if ((window as any).googleTranslateElementInit) {
    try {
      const selectEl = document.querySelector(".goog-te-combo") as HTMLSelectElement;
      if (selectEl) {
        selectEl.value = langObj.code;
        selectEl.dispatchEvent(new Event("change"));
      }
    } catch (e) {
      console.warn("Google Translate widget trigger error:", e);
    }
  }
}

export function initGoogleTranslateScript() {
  if (document.getElementById("google-translate-script")) return;

  const script = document.createElement("script");
  script.id = "google-translate-script";
  script.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
  script.async = true;

  (window as any).googleTranslateElementInit = function() {
    new (window as any).google.translate.TranslateElement(
      { pageLanguage: 'en', layout: (window as any).google.translate.TranslateElement.InlineLayout.SIMPLE },
      'google_translate_element'
    );
  };

  document.head.appendChild(script);
}
