/** Checklist links; labels come from i18n via `titleKey` / `descriptionKey` / `actionKey`. */
export const ONBOARDING_STEPS = [
  {
    titleKey: "onboarding.stepHotelTitle",
    descriptionKey: "onboarding.stepHotelDesc",
    href: "/settings#properties-hotels",
    actionKey: "onboarding.stepHotelAction",
  },
  {
    titleKey: "onboarding.stepCountryTaxesTitle",
    descriptionKey: "onboarding.stepCountryTaxesDesc",
    href: "/settings#country-pack",
    actionKey: "onboarding.stepCountryTaxesAction",
  },
  {
    titleKey: "onboarding.stepRoomTypesTitle",
    descriptionKey: "onboarding.stepRoomTypesDesc",
    href: "/settings#room-types-hint",
    actionKey: "onboarding.stepRoomTypesAction",
  },
  {
    titleKey: "onboarding.stepRoomsTitle",
    descriptionKey: "onboarding.stepRoomsDesc",
    href: "/rooms",
    actionKey: "onboarding.stepRoomsAction",
  },
  {
    titleKey: "onboarding.stepRatesTitle",
    descriptionKey: "onboarding.stepRatesDesc",
    href: "/rates",
    actionKey: "onboarding.stepRatesAction",
  },
  {
    titleKey: "onboarding.stepFirstBookingTitle",
    descriptionKey: "onboarding.stepFirstBookingDesc",
    href: "/board",
    actionKey: "onboarding.stepFirstBookingAction",
  },
] as const;

export const ONBOARDING_STEP_COUNT = ONBOARDING_STEPS.length;
