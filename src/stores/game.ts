import { computed, reactive, ref } from "vue";
import { defineStore } from "pinia";
import { assets, categories, findAsset } from "../domain/catalog";
import { assetCollections } from "../domain/collections";
import {
  GAME_DAY_MS,
  getDailyProfit,
  getIncomeForElapsed,
  getPortfolioValue,
} from "../domain/economy";
import { getMarketPrice, marketInstruments } from "../domain/investments";
import { createSave, loadSave, persistSave } from "../domain/save";
import type {
  GamePreferences,
  NewsStory,
  OfflineReport,
  SaveState,
  Transaction,
} from "../domain/types";

const marketEvents = [
  {
    title: "Квартиры снова в моде",
    description: "Арендный доход от недвижимости вырос на 25%.",
    categoryId: "real-estate",
    incomeMultiplier: 1.25,
  },
  {
    title: "Технологический бум",
    description: "Инвесторы охотятся за молодыми компаниями.",
    categoryId: "business",
    incomeMultiplier: 1.3,
  },
  {
    title: "Экономический кризис",
    description: "Покупатели стали осторожнее, доходы бизнеса просели.",
    categoryId: "business",
    incomeMultiplier: 0.8,
  },
  {
    title: "Туристический сезон",
    description: "Гости города чаще выбирают концерты, парки и отели.",
    categoryId: "entertainment",
    incomeMultiplier: 1.4,
  },
  {
    title: "Большой отпуск",
    description: "Люди тратят больше на впечатления и развлечения.",
    categoryId: "entertainment",
    incomeMultiplier: 1.25,
  },
  {
    title: "Пингвин стал мэром",
    description: "Городские доходы выросли. Он обещал каждому по рыбке.",
    categoryId: "cities",
    incomeMultiplier: 1.4,
  },
  {
    title: "Космос ближе, чем кажется",
    description: "Спрос на космическую инфраструктуру подскочил.",
    categoryId: "space",
    incomeMultiplier: 1.3,
  },
];

const weekdays = [
  "Понедельник",
  "Вторник",
  "Среда",
  "Четверг",
  "Пятница",
  "Суббота",
  "Воскресенье",
];

const achievementCatalog = [
  {
    id: "first-purchase",
    name: "Первая покупка",
    description: "Приобрести первый актив.",
    condition: (save: SaveState) =>
      save.transactions.some(({ type }) => type === "purchase"),
  },
  {
    id: "millionaire",
    name: "Местный богач",
    description: "Накопить капитал в 1 млн ₽.",
    condition: (_save: SaveState, netWorth: number) => netWorth >= 1_000_000,
  },
  {
    id: "billionaire",
    name: "Миллиардер",
    description: "Накопить капитал в 1 млрд ₽.",
    condition: (_save: SaveState, netWorth: number) =>
      netWorth >= 1_000_000_000,
  },
  {
    id: "landlord",
    name: "Первый арендатор",
    description: "Получить доход от недвижимости.",
    condition: (save: SaveState) =>
      Object.keys(save.holdings).some(
        (id) => findAsset(id)?.categoryId === "real-estate",
      ),
  },
  {
    id: "collector",
    name: "Собиратель",
    description: "Владеть активами из трёх категорий.",
    condition: (save: SaveState) =>
      new Set(Object.keys(save.holdings).map((id) => findAsset(id)?.categoryId))
        .size >= 3,
  },
  {
    id: "space-tourist",
    name: "Космический турист",
    description: "Приобрести первый космический актив.",
    condition: (save: SaveState) =>
      Object.keys(save.holdings).some(
        (id) => findAsset(id)?.categoryId === "space",
      ),
  },
];

export const useGameStore = defineStore("game", () => {
  let startingSave: SaveState;
  let startingOfflineReport: OfflineReport | null = null;
  let startingError = "";
  try {
    const loaded = loadSave(window.localStorage, assets);
    startingSave = loaded.save;
    startingOfflineReport = loaded.offlineReport;
  } catch (error) {
    console.error("Не удалось загрузить сохранение игры.", error);
    startingSave = createSave();
    startingError =
      "Не удалось прочитать сохранение. Началась новая игра, прежний файл не удалён.";
  }

  const save = reactive<SaveState>(startingSave);
  let lastPersistedAt = startingSave.savedAt;
  let lastIncomeSampleAt = startingSave.savedAt;
  const offlineReport = ref<OfflineReport | null>(startingOfflineReport);
  const saveError = ref(startingError);
  const notice = ref("");
  const gameDay = computed(() => Math.floor(save.gameTimeMs / GAME_DAY_MS) + 1);
  const gameClock = computed(() => {
    const minutes =
      8 * 60 + Math.floor((save.gameTimeMs / GAME_DAY_MS) * 24 * 60);
    const minuteOfDay = minutes % (24 * 60);
    return `${String(Math.floor(minuteOfDay / 60)).padStart(2, "0")}:${String(
      minuteOfDay % 60,
    ).padStart(2, "0")}`;
  });
  const dayProgress = computed(
    () => (save.gameTimeMs % GAME_DAY_MS) / GAME_DAY_MS,
  );
  const gameWeekday = computed(() => weekdays[(gameDay.value - 1) % 7]);
  const dailyProfit = computed(() => {
    const currentEvent = save.news.find(
      (story) => story.expiresAt && story.expiresAt > save.savedAt,
    );
    return getDailyProfit(
      save.holdings,
      assets,
      currentEvent?.categoryId,
      currentEvent?.incomeMultiplier,
    );
  });
  const portfolioValue = computed(() =>
    getPortfolioValue(save.holdings, assets),
  );
  const investmentsValue = computed(() =>
    marketInstruments.reduce(
      (total, instrument) =>
        total +
        getMarketPrice(instrument, gameDay.value) *
          (save.investments[instrument.id]?.quantity ?? 0),
      0,
    ),
  );
  const netWorth = computed(
    () => save.balance + portfolioValue.value + investmentsValue.value,
  );
  const investmentPositions = computed(() =>
    marketInstruments
      .map((instrument) => ({
        ...instrument,
        price: getMarketPrice(instrument, gameDay.value),
        holding: save.investments[instrument.id],
      }))
      .filter((instrument) => instrument.holding),
  );
  const ownedCount = computed(() =>
    Object.values(save.holdings).reduce(
      (total, holding) => total + holding.quantity,
      0,
    ),
  );
  const unlockedAchievements = computed(() =>
    achievementCatalog.filter((achievement) =>
      save.achievements.includes(achievement.id),
    ),
  );
  const activeEvent = computed(
    () =>
      save.news.find(
        (story) => story.expiresAt && story.expiresAt > save.savedAt,
      ) ?? null,
  );

  function storeSave(): void {
    save.savedAt = Date.now();
    try {
      persistSave(window.localStorage, save);
      lastPersistedAt = save.savedAt;
      saveError.value = "";
    } catch (error) {
      console.error("Не удалось сохранить игровой прогресс.", error);
      saveError.value =
        "Не удалось сохранить прогресс. Проверьте свободное место в браузере.";
    }
  }

  function playActionSound(isPositive: boolean): void {
    if (!save.preferences.soundEnabled || !window.AudioContext) return;
    const audio = new window.AudioContext();
    const oscillator = audio.createOscillator();
    const volume = audio.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = isPositive ? 660 : 330;
    volume.gain.setValueAtTime(0.035, audio.currentTime);
    volume.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.12);
    oscillator.connect(volume);
    volume.connect(audio.destination);
    oscillator.start();
    oscillator.stop(audio.currentTime + 0.12);
    oscillator.addEventListener("ended", () => void audio.close(), {
      once: true,
    });
  }

  function addNews(
    title: string,
    description: string,
    categoryId?: string,
    incomeMultiplier?: number,
  ): void {
    const createdAt = Date.now();
    const story: NewsStory = {
      id: `${createdAt}-${Math.random().toString(36).slice(2, 8)}`,
      title,
      description,
      createdAt,
      ...(categoryId
        ? {
            categoryId,
            incomeMultiplier,
            expiresAt: createdAt + 3 * GAME_DAY_MS,
          }
        : {}),
    };
    save.news.unshift(story);
    if (save.news.length > 12) {
      const activeMarketEvent = save.news.find(
        (entry) =>
          entry.categoryId &&
          entry.expiresAt !== undefined &&
          entry.expiresAt > createdAt,
      );
      let removalIndex = save.news.length - 1;
      while (save.news[removalIndex]?.id === activeMarketEvent?.id) {
        removalIndex -= 1;
      }
      save.news.splice(removalIndex, 1);
    }
  }

  function checkAchievements(): void {
    for (const achievement of achievementCatalog) {
      if (
        !save.achievements.includes(achievement.id) &&
        achievement.condition(save, netWorth.value)
      ) {
        save.achievements.push(achievement.id);
        notice.value = `Новое достижение: «${achievement.name}»`;
      }
    }
  }

  function checkCollections(): void {
    for (const collection of assetCollections) {
      const isComplete = collection.assetIds.every(
        (assetId) => (save.holdings[assetId]?.quantity ?? 0) > 0,
      );
      if (isComplete && !save.collections.includes(collection.id)) {
        save.collections.push(collection.id);
        save.balance += collection.reward;
        addNews(
          "Новая коллекция",
          `Собран набор «${collection.name}». Награда: ${collection.reward.toLocaleString("ru-RU")} ₽.`,
        );
        notice.value = `Коллекция «${collection.name}» собрана. +${collection.reward.toLocaleString("ru-RU")} ₽`;
      }
    }
  }

  function tick(now = Date.now()): void {
    const elapsedMs = Math.max(0, now - save.savedAt);
    if (elapsedMs > 0) {
      const income = getIncomeForElapsed(
        elapsedMs,
        save.holdings,
        assets,
        save.news,
        now,
      );
      save.balance = Math.max(0, save.balance + income.netIncome);
      save.gameTimeMs += elapsedMs;
      save.savedAt = now;
      checkAchievements();
    }
    if (now - lastIncomeSampleAt >= 1_000) {
      save.incomeHistory.push(dailyProfit.value);
      if (save.incomeHistory.length > 60) save.incomeHistory.shift();
      lastIncomeSampleAt = now;
    }
    const latestSnapshot = save.capitalHistory.at(-1);
    if (!latestSnapshot || now - latestSnapshot.createdAt >= GAME_DAY_MS) {
      save.capitalHistory.push({ createdAt: now, value: netWorth.value });
      save.capitalHistory.splice(30);
    }
    const latestMarketEvent = save.news.find(
      (story) => story.categoryId && story.incomeMultiplier !== undefined,
    );
    if (
      !latestMarketEvent ||
      now - latestMarketEvent.createdAt >= 3 * GAME_DAY_MS
    ) {
      const event =
        marketEvents[Math.floor(Math.random() * marketEvents.length)];
      addNews(
        event.title,
        event.description,
        event.categoryId,
        event.incomeMultiplier,
      );
    }
    if (now - lastPersistedAt >= 5_000) storeSave();
  }

  function buy(assetId: string, quantity = 1): boolean {
    const asset = findAsset(assetId);
    if (!asset) {
      notice.value = "Такого актива больше нет в каталоге.";
      return false;
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      notice.value = "Укажи количество хотя бы в один актив.";
      return false;
    }
    const category = categories.find((entry) => entry.id === asset.categoryId);
    if (!category || netWorth.value < category.unlockAt) {
      notice.value = `Категория «${category?.name ?? "актив"}» пока закрыта.`;
      return false;
    }
    const cost = asset.price * quantity;
    if (!Number.isFinite(cost) || cost > save.balance) {
      notice.value = "Пока не хватает средств на эту покупку.";
      return false;
    }
    save.balance -= cost;
    const holding = save.holdings[assetId] ?? { quantity: 0, level: 0 };
    holding.quantity += quantity;
    save.holdings[assetId] = holding;
    save.transactions.unshift({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      assetId,
      name: asset.name,
      type: "purchase",
      amount: cost,
      createdAt: Date.now(),
    });
    addNews("Новая покупка", `В империю добавлено: ${asset.name}.`);
    notice.value = `Куплено: ${asset.name}`;
    checkAchievements();
    checkCollections();
    playActionSound(true);
    storeSave();
    return true;
  }

  function sell(assetId: string): boolean {
    const holding = save.holdings[assetId];
    const asset = findAsset(assetId);
    if (!asset || !holding || holding.quantity < 1) return false;
    const salePrice = Math.round(asset.price * 0.8);
    holding.quantity -= 1;
    if (holding.quantity === 0) delete save.holdings[assetId];
    save.balance += salePrice;
    save.transactions.unshift({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      assetId,
      name: asset.name,
      type: "sale",
      amount: salePrice,
      createdAt: Date.now(),
    });
    notice.value = `${asset.name} продан за 80% рыночной цены.`;
    playActionSound(false);
    storeSave();
    return true;
  }

  function upgrade(assetId: string): boolean {
    const holding = save.holdings[assetId];
    const asset = findAsset(assetId);
    if (!asset || !holding || holding.level >= 5) {
      notice.value = "Для этого актива улучшения закончились.";
      return false;
    }
    const cost = Math.round(asset.price * (1.2 + holding.level * 0.8));
    if (cost > save.balance) {
      notice.value = "Недостаточно средств для улучшения.";
      return false;
    }
    save.balance -= cost;
    holding.level += 1;
    save.transactions.unshift({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      assetId,
      name: asset.name,
      type: "upgrade",
      amount: cost,
      createdAt: Date.now(),
    });
    notice.value = `Доход от актива «${asset.name}» увеличен на 25%.`;
    playActionSound(true);
    storeSave();
    return true;
  }

  function toggleFavorite(assetId: string): void {
    save.favorites = save.favorites.includes(assetId)
      ? save.favorites.filter((id) => id !== assetId)
      : [...save.favorites, assetId];
    storeSave();
  }

  function toggleWishlist(assetId: string): void {
    save.wishlist = save.wishlist.includes(assetId)
      ? save.wishlist.filter((id) => id !== assetId)
      : [...save.wishlist, assetId];
    storeSave();
  }

  function buyInvestment(instrumentId: string, quantity = 1): boolean {
    const instrument = marketInstruments.find(
      (entry) => entry.id === instrumentId,
    );
    if (!instrument || !Number.isSafeInteger(quantity) || quantity <= 0) {
      notice.value = "Проверь инструмент и количество долей.";
      return false;
    }
    const price = getMarketPrice(instrument, gameDay.value);
    const cost = price * quantity;
    if (!Number.isSafeInteger(cost) || cost > save.balance) {
      notice.value = "Не хватает свободных средств для этой инвестиции.";
      return false;
    }

    const previousHolding = save.investments[instrumentId];
    const previousQuantity = previousHolding?.quantity ?? 0;
    const totalQuantity = previousQuantity + quantity;
    if (!Number.isSafeInteger(totalQuantity)) {
      notice.value = "Слишком много долей для одной позиции.";
      return false;
    }
    save.investments[instrumentId] = {
      quantity: totalQuantity,
      averagePrice:
        ((previousHolding?.averagePrice ?? 0) * previousQuantity + cost) /
        totalQuantity,
    };
    save.balance -= cost;
    addTransaction(instrumentId, instrument.name, "investment-purchase", cost);
    notice.value = `Куплено долей «${instrument.name}»: ${quantity}.`;
    playActionSound(true);
    storeSave();
    return true;
  }

  function sellInvestment(instrumentId: string, quantity?: number): boolean {
    const instrument = marketInstruments.find(
      (entry) => entry.id === instrumentId,
    );
    const holding = save.investments[instrumentId];
    if (!instrument || !holding) {
      notice.value = "У тебя нет долей этого инструмента.";
      return false;
    }
    const sharesToSell = quantity ?? holding.quantity;
    if (
      !Number.isSafeInteger(sharesToSell) ||
      sharesToSell < 1 ||
      sharesToSell > holding.quantity
    ) {
      notice.value = "Нельзя продать больше долей, чем у тебя есть.";
      return false;
    }
    const proceeds = getMarketPrice(instrument, gameDay.value) * sharesToSell;
    holding.quantity -= sharesToSell;
    if (holding.quantity === 0) delete save.investments[instrumentId];
    save.balance += proceeds;
    addTransaction(instrumentId, instrument.name, "investment-sale", proceeds);
    notice.value = `Продано долей «${instrument.name}»: ${sharesToSell}.`;
    playActionSound(false);
    storeSave();
    return true;
  }

  function addTransaction(
    assetId: string,
    name: string,
    type: Transaction["type"],
    amount: number,
  ): void {
    save.transactions.unshift({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      assetId,
      name,
      type,
      amount,
      createdAt: Date.now(),
    });
  }

  function updatePreferences(preferences: GamePreferences): void {
    save.preferences = { ...preferences };
    storeSave();
  }

  if (startingError) {
    save.news.unshift({
      id: `save-error-${Date.now()}`,
      title: "Сохранение не прочитано",
      description: startingError,
      createdAt: Date.now(),
    });
  }

  const savedCollectionCount = save.collections.length;
  checkCollections();
  if (save.collections.length > savedCollectionCount) storeSave();

  return {
    save,
    assets,
    categories,
    offlineReport,
    saveError,
    notice,
    netWorth,
    gameDay,
    gameClock,
    dayProgress,
    gameWeekday,
    dailyProfit,
    portfolioValue,
    investmentsValue,
    ownedCount,
    investmentPositions,
    marketInstruments,
    unlockedAchievements,
    activeEvent,
    tick,
    buy,
    sell,
    upgrade,
    toggleFavorite,
    toggleWishlist,
    buyInvestment,
    sellInvestment,
    updatePreferences,
  };
});
