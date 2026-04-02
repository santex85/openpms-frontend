export const ONBOARDING_STEPS = [
  {
    title: "Отель",
    description:
      "Создайте первый объект: название, часовой пояс, валюта, время заезда и выезда.",
    href: "/settings#properties-hotels",
    action: "Открыть настройки отеля",
  },
  {
    title: "Типы номеров",
    description:
      "Добавьте хотя бы один тип номера (вместимость, название категории).",
    href: "/settings#room-types-hint",
    action: "Типы номеров в настройках",
  },
  {
    title: "Комнаты",
    description: "Создайте физические номера и привяжите их к типам.",
    href: "/rooms",
    action: "Открыть номера",
  },
  {
    title: "Тарифы и цены",
    description:
      "Добавьте тарифный план и настройте цены для типов номеров на календаре тарифов.",
    href: "/rates",
    action: "Открыть тарифы",
  },
  {
    title: "Первая бронь",
    description:
      "На сетке занятости кликните по ячейке, укажите даты, тариф и номер — так создаётся бронь.",
    href: "/board",
    action: "Открыть сетку",
  },
] as const;

export const ONBOARDING_STEP_COUNT = ONBOARDING_STEPS.length;
