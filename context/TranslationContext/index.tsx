import React, { createContext, useEffect, useState } from "react";
import i18next from "i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTranslation } from "react-i18next";

export const TranslationContext = createContext({
  currentLanguage: "pt",
  changeLanguage: (lng: string) => {},
});

export const TranslationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [currentLanguage, setCurrentLanguage] = useState(
    i18next.language ?? "pt",
  );

  const changeLanguage = async (lng: string) => {
    setCurrentLanguage(lng);
    i18next.changeLanguage(lng);
    await AsyncStorage.setItem("language", lng);
  };

  useEffect(() => {
    const getUserLanguage = async () => {
      const userLanguage = await AsyncStorage.getItem("language");
      if (userLanguage) {
        setCurrentLanguage(userLanguage);
        i18next.changeLanguage(userLanguage);
      }
    };
    getUserLanguage();
  }, []);

  return (
    <TranslationContext.Provider
      value={{
        currentLanguage,
        changeLanguage,
      }}
    >
      {children}
    </TranslationContext.Provider>
  );
};

export const useLocale = () => {
  const { currentLanguage, changeLanguage } =
    React.useContext(TranslationContext);
  const { t } = useTranslation();
  return {
    t,
    currentLanguage,
    changeLanguage,
  };
};
