import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

export type Lang = "English" | "French" | "Arabic";

type AppContextType = {
  language: Lang;
  setLanguage: (lang: Lang) => void;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, setLanguageState] = useState<Lang>("English");

  // 🔄 load language when app starts
  useEffect(() => {
    const load = async () => {
      const saved = await AsyncStorage.getItem("language");
      if (saved) setLanguageState(saved as Lang);
    };
    load();
  }, []);

  // 💾 save language + update globally
  const setLanguage = async (lang: Lang) => {
    setLanguageState(lang);
    await AsyncStorage.setItem("language", lang);
  };

  return (
    <AppContext.Provider value={{ language, setLanguage }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("AppProvider is missing");
  return ctx;
};