import type { Asset, AssetCategory } from "./types";

const categorySeeds: Omit<AssetCategory, "assets">[] = [
  {
    id: "real-estate",
    name: "Недвижимость",
    icon: "category-real-estate",
    image: "real-estate",
    unlockAt: 0,
  },
  {
    id: "transport",
    name: "Транспорт",
    icon: "category-transport",
    image: "transport",
    unlockAt: 4_100,
  },
  {
    id: "luxury",
    name: "Роскошь",
    icon: "category-luxury",
    image: "luxury",
    unlockAt: 55_000,
  },
  {
    id: "business",
    name: "Бизнес",
    icon: "category-business",
    image: "business",
    unlockAt: 740_000,
  },
  {
    id: "nature",
    name: "Земля и природа",
    icon: "category-nature",
    image: "nature",
    unlockAt: 10_000_000,
  },
  {
    id: "entertainment",
    name: "Развлечения",
    icon: "category-entertainment",
    image: "entertainment",
    unlockAt: 133_000_000,
  },
  {
    id: "cities",
    name: "Города",
    icon: "category-cities",
    image: "cities",
    unlockAt: 1_800_000_000,
  },
  {
    id: "states",
    name: "Государства",
    icon: "category-states",
    image: "states",
    unlockAt: 24_000_000_000,
  },
  {
    id: "space",
    name: "Космос",
    icon: "category-space",
    image: "space",
    unlockAt: 320_000_000_000,
  },
  {
    id: "planets",
    name: "Планеты",
    icon: "category-planets",
    image: "planets",
    unlockAt: 4_300_000_000_000,
  },
  {
    id: "cosmic-objects",
    name: "Космические объекты",
    icon: "category-cosmic-objects",
    image: "cosmic-objects",
    unlockAt: 58_000_000_000_000,
  },
  {
    id: "universe",
    name: "Вселенная",
    icon: "category-universe",
    image: "universe",
    unlockAt: 780_000_000_000_000,
  },
];

const assetSeeds: Array<{
  categoryId: string;
  firstPrice: number;
  names: string[];
}> = [
  {
    categoryId: "real-estate",
    firstPrice: 300,
    names: [
      "Комната в коммуналке",
      "Студия у метро",
      "Квартира с видом",
      "Таунхаус с садом",
      "Загородный дом",
      "Пентхаус «Облака»",
      "Особняк с фонтаном",
      "Доходный квартал",
      "Небоскрёб «Вертикаль»",
      "Личный островной отель",
    ],
  },
  {
    categoryId: "transport",
    firstPrice: 4_100,
    names: [
      "Городской велосипед",
      "Складной электросамокат",
      "Мотоцикл выходного дня",
      "Кабриолет цвета шампанского",
      "Электрокар с автопилотом",
      "Винтажный спорткар",
      "Частный вертолёт",
      "Бизнес-джет",
      "Суперъяхта «Тихая роскошь»",
      "Орбитальный шаттл",
    ],
  },
  {
    categoryId: "luxury",
    firstPrice: 55_000,
    names: [
      "Механические часы",
      "Кольцо с сапфиром",
      "Картина неизвестного гения",
      "Золотой слиток",
      "Скульптура из мрамора",
      "Редкий гоночный автомобиль",
      "Алмаз «Сияние»",
      "Коллекция императорского фарфора",
      "Бриллиантовая тиара",
      "Золотой туалет",
    ],
  },
  {
    categoryId: "business",
    firstPrice: 740_000,
    names: [
      "Кофейня у дома",
      "Магазин винила",
      "Пекарня с очередью",
      "Городской ресторан",
      "Бутик-отель",
      "Сеть супермаркетов",
      "Автоматизированный завод",
      "Частный банк",
      "Технологический холдинг",
      "Компания по продаже воздуха",
    ],
  },
  {
    categoryId: "nature",
    firstPrice: 10_000_000,
    names: [
      "Участок под дачу",
      "Берёзовая роща",
      "Тихое озеро",
      "Солнечный виноградник",
      "Горный склон",
      "Золотой пляж",
      "Заповедный архипелаг",
      "Лесной массив",
      "Полуостров с маяком",
      "Экваториальный остров",
    ],
  },
  {
    categoryId: "entertainment",
    firstPrice: 133_000_000,
    names: [
      "Камерный кинотеатр",
      "Концертная площадка",
      "Городской музей",
      "Аквапарк «Большая волна»",
      "Стадион на 30 тысяч мест",
      "Парк аттракционов",
      "Фестиваль круглый год",
      "Киностудия мирового уровня",
      "Игровая студия",
      "Тематический парк-планета",
    ],
  },
  {
    categoryId: "cities",
    firstPrice: 1_800_000_000,
    names: [
      "Посёлок у реки",
      "Старинная деревня",
      "Курортный городок",
      "Портовый город",
      "Горный курорт",
      "Город технологий",
      "Столица искусств",
      "Северный мегаполис",
      "Город-государство",
      "Плавучий мегаполис",
    ],
  },
  {
    categoryId: "states",
    firstPrice: 24_000_000_000,
    names: [
      "Концессия на острове",
      "Доля в приморском регионе",
      "Управление долиной",
      "Торговый протекторат",
      "Автономная территория",
      "Федеральный округ",
      "Архипелаговая держава",
      "Континентальный союз",
      "Полярная республика",
      "Собственная страна (почти)",
    ],
  },
  {
    categoryId: "space",
    firstPrice: 320_000_000_000,
    names: [
      "Научный спутник",
      "Метеорологическая сеть",
      "Многоразовая ракета",
      "Лунный ретранслятор",
      "Орбитальная гостиница",
      "Космическая станция",
      "Марсианская база",
      "Астероидная шахта",
      "Межпланетная верфь",
      "Туристический космопорт",
    ],
  },
  {
    categoryId: "planets",
    firstPrice: 4_300_000_000_000,
    names: [
      "Лунный кратер",
      "Марсианская долина",
      "Венерианская облачная станция",
      "Планета-океан",
      "Планета для отдыха",
      "Газовый гигант (доля)",
      "Ледяной мир",
      "Планета с двумя солнцами",
      "Новая Земля",
      "Личная планета с именным небом",
    ],
  },
  {
    categoryId: "cosmic-objects",
    firstPrice: 58_000_000_000_000,
    names: [
      "Кометный маршрут",
      "Кольцо астероидов",
      "Карликовая звезда",
      "Двойная звёздная система",
      "Пульсар с видом",
      "Туманность в форме кота",
      "Скопление молодых звёзд",
      "Чёрная дыра (с безопасным радиусом)",
      "Мегаструктура «Сфера»",
      "Галактический рукав",
    ],
  },
  {
    categoryId: "universe",
    firstPrice: 780_000_000_000_000,
    names: [
      "Карманная галактика",
      "Спиральная галактика",
      "Скопление галактик",
      "Сверхскопление «Домашнее»",
      "Наблюдаемая вселенная",
      "Соседняя вселенная",
      "Вселенная с удобным климатом",
      "Мультивселенная: базовый пакет",
      "Мультивселенная без рекламы",
      "Весь мир. Вообще весь.",
    ],
  },
];

const rarityByRank: Asset["rarity"][] = [
  "Обычный",
  "Редкий",
  "Эпический",
  "Легендарный",
];

export const categories: AssetCategory[] = categorySeeds.map((category) => ({
  ...category,
  assets: assetSeeds
    .find((seed) => seed.categoryId === category.id)!
    .names.map((_, index) => `${category.id}-${index + 1}`),
}));

export const assets: Asset[] = assetSeeds.flatMap(
  ({ categoryId, firstPrice, names }, categoryIndex) =>
    names.map((name, index) => {
      const price = Math.round(firstPrice * 1.3 ** index);
      const category = categorySeeds.find((entry) => entry.id === categoryId)!;
      const assetRank = categoryIndex * 10 + index;
      const dailyIncomeRate = Math.max(0.012, 0.3 / (1 + assetRank * 0.18));
      return {
        id: `${categoryId}-${index + 1}`,
        categoryId,
        name,
        description: `${category.name} · объект ${String(index + 1).padStart(2, "0")}`,
        price,
        dailyIncome: Math.round(price * dailyIncomeRate),
        dailyExpense: Math.round(price * dailyIncomeRate * 0.15),
        rarity: rarityByRank[Math.min(3, Math.floor(index / 3))],
      };
    }),
);

export function findAsset(assetId: string): Asset | undefined {
  return assets.find((asset) => asset.id === assetId);
}

export function findCategory(categoryId: string): AssetCategory | undefined {
  return categories.find((category) => category.id === categoryId);
}
