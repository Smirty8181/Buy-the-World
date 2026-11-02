<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import AssetArtwork from "./components/AssetArtwork.vue";
import { assetCollections } from "./domain/collections";
import { formatCurrency } from "./domain/currency";
import { getMarketPrice } from "./domain/investments";
import type { GamePreferences, Transaction } from "./domain/types";
import { useGameStore } from "./stores/game";

type SectionId =
  | "overview"
  | "store"
  | "empire"
  | "stats"
  | "news"
  | "collections"
  | "investments"
  | "settings"
  | "achievements";
type CatalogFilter = "all" | "favorites" | "wishlist";

const game = useGameStore();
const baseUrl = import.meta.env.BASE_URL;
const section = ref<SectionId>("overview");
const selectedCategory = ref("real-estate");
const catalogFilter = ref<CatalogFilter>("all");
const searchQuery = ref("");
const sortBy = ref<"recommended" | "price" | "income" | "payback">(
  "recommended",
);
const purchaseQuantity = ref<"1" | "10" | "100" | "max">("1");
const comparisonIds = ref<string[]>([]);
const showOfflineReport = ref(Boolean(game.offlineReport));
const showMoreNavigation = ref(false);
const now = ref(Date.now());
const displayedCapital = ref(game.netWorth);
const searchInput = ref<HTMLInputElement | null>(null);
let incomeTimer: number | undefined;
let clockTimer: number | undefined;
let capitalAnimationFrame: number | undefined;
let noticeTimer: number | undefined;

const navItems: Array<{ id: SectionId; label: string; icon: string }> = [
  { id: "overview", label: "Обзор", icon: "overview" },
  { id: "store", label: "Магазин", icon: "store" },
  { id: "empire", label: "Моя империя", icon: "empire" },
  { id: "stats", label: "Статистика", icon: "stats" },
  { id: "news", label: "События", icon: "news" },
  { id: "collections", label: "Коллекции", icon: "collections" },
  { id: "investments", label: "Инвестиции", icon: "investments" },
  { id: "settings", label: "Настройки", icon: "settings" },
  { id: "achievements", label: "Достижения", icon: "achievements" },
];
const mobilePrimarySections: SectionId[] = [
  "overview",
  "store",
  "empire",
  "stats",
];
const mobileMoreItems = computed(() =>
  navItems.filter((item) => !mobilePrimarySections.includes(item.id)),
);

const achievements = [
  {
    id: "first-purchase",
    name: "Первая покупка",
    description: "Приобрести первый актив.",
    icon: "↗",
  },
  {
    id: "millionaire",
    name: "Местный богач",
    description: "Накопить капитал в 1 млн ₽.",
    icon: "₽",
  },
  {
    id: "billionaire",
    name: "Миллиардер",
    description: "Накопить капитал в 1 млрд ₽.",
    icon: "✦",
  },
  {
    id: "landlord",
    name: "Первый арендатор",
    description: "Получить доход от недвижимости.",
    icon: "⌂",
  },
  {
    id: "collector",
    name: "Собиратель",
    description: "Владеть активами из трёх категорий.",
    icon: "◇",
  },
  {
    id: "space-tourist",
    name: "Космический турист",
    description: "Приобрести первый космический актив.",
    icon: "✧",
  },
];
const themes: Array<{ id: GamePreferences["theme"]; name: string }> = [
  { id: "gold", name: "Золото" },
  { id: "emerald", name: "Изумруд" },
  { id: "violet", name: "Аметист" },
];

const pageTitle = computed(
  () => navItems.find((item) => item.id === section.value)?.label ?? "Обзор",
);
const ownedAssets = computed(() =>
  game.assets.filter((asset) => game.save.holdings[asset.id]?.quantity),
);
const comparisonAssets = computed(() =>
  comparisonIds.value
    .map((assetId) => game.assets.find((asset) => asset.id === assetId))
    .filter((asset) => asset !== undefined),
);
const filteredAssets = computed(() => {
  const query = searchQuery.value.trim().toLocaleLowerCase("ru");
  const selectedAssets = game.assets.filter((asset) => {
    const categoryMatches = asset.categoryId === selectedCategory.value;
    const filterMatches =
      catalogFilter.value === "all" ||
      (catalogFilter.value === "favorites" &&
        game.save.favorites.includes(asset.id)) ||
      (catalogFilter.value === "wishlist" &&
        game.save.wishlist.includes(asset.id));
    const matchesQuery =
      !query ||
      asset.name.toLocaleLowerCase("ru").includes(query) ||
      asset.description.toLocaleLowerCase("ru").includes(query);
    return categoryMatches && filterMatches && matchesQuery;
  });
  return selectedAssets.sort((first, second) => {
    if (sortBy.value === "price") return first.price - second.price;
    if (sortBy.value === "income")
      return (
        second.dailyIncome -
        second.dailyExpense -
        (first.dailyIncome - first.dailyExpense)
      );
    if (sortBy.value === "payback") {
      const firstPayback =
        first.price / (first.dailyIncome - first.dailyExpense);
      const secondPayback =
        second.price / (second.dailyIncome - second.dailyExpense);
      return firstPayback - secondPayback;
    }
    const firstIsAffordable = first.price <= game.save.balance;
    const secondIsAffordable = second.price <= game.save.balance;
    if (firstIsAffordable !== secondIsAffordable)
      return firstIsAffordable ? -1 : 1;
    return first.price - second.price;
  });
});
const nextGoal = computed(
  () =>
    game.assets.find((asset) => !game.save.holdings[asset.id]) ??
    game.assets.at(-1)!,
);
const nextGoalStage = computed(
  () =>
    game.categories.findIndex(
      (category) => category.id === nextGoal.value.categoryId,
    ) + 1,
);
const todayLabel = computed(
  () =>
    `ДЕНЬ ${String(game.gameDay).padStart(2, "0")} · ${game.gameWeekday.toLocaleUpperCase("ru-RU")}`,
);
const dayCountdown = computed(() => {
  const remainingMs = 60_000 - (game.save.gameTimeMs % 60_000);
  const remainingSeconds = Math.ceil(remainingMs / 1_000);
  return `${String(Math.floor(remainingSeconds / 60)).padStart(2, "0")}:${String(
    remainingSeconds % 60,
  ).padStart(2, "0")}`;
});
const selectedCategoryDetails = computed(() =>
  game.categories.find((category) => category.id === selectedCategory.value),
);
const unlockedCategoryCount = computed(
  () =>
    game.categories.filter((category) => game.netWorth >= category.unlockAt)
      .length,
);
const achievementProgress = computed(() =>
  Math.round((game.unlockedAchievements.length / achievements.length) * 100),
);
const categoryHoldings = computed(() =>
  game.categories
    .map((category) => ({
      ...category,
      quantity: category.assets.reduce(
        (total, assetId) =>
          total + (game.save.holdings[assetId]?.quantity ?? 0),
        0,
      ),
    }))
    .filter((category) => category.quantity > 0),
);
const ownedAssetLabel = computed(() => {
  const lastTwoDigits = game.ownedCount % 100;
  const lastDigit = game.ownedCount % 10;
  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return "объектов";
  if (lastDigit === 1) return "объект";
  if (lastDigit >= 2 && lastDigit <= 4) return "объекта";
  return "объектов";
});
const visibleCategoryHoldings = computed(() =>
  categoryHoldings.value.slice(0, 3),
);
const isNextGoalUnlocked = computed(
  () =>
    game.netWorth >=
    (game.categories.find(
      (category) => category.id === nextGoal.value.categoryId,
    )?.unlockAt ?? 0),
);
const nextGoalCategoryUnlockAt = computed(
  () =>
    game.categories.find(
      (category) => category.id === nextGoal.value.categoryId,
    )?.unlockAt ?? 0,
);
const nextGoalProgress = computed(() => {
  const progressValue = isNextGoalUnlocked.value
    ? game.save.balance / nextGoal.value.price
    : game.netWorth / nextGoalCategoryUnlockAt.value;
  return Math.min(100, Math.floor(progressValue * 100));
});
const nextGoalRequirement = computed(() =>
  isNextGoalUnlocked.value
    ? nextGoal.value.price
    : nextGoalCategoryUnlockAt.value,
);
const incomeSamples = computed(() => game.save.incomeHistory);
const incomeChartPath = computed(() => {
  const samples = incomeSamples.value;
  if (samples.length < 2) return "0,21 100,21";
  const highestIncome = Math.max(1, ...samples);
  const lowestIncome = Math.min(0, ...samples);
  const incomeRange = highestIncome - lowestIncome || 1;
  return samples
    .map((income, index) => {
      const x = (index / (samples.length - 1)) * 100;
      const y = 34 - ((income - lowestIncome) / incomeRange) * 26;
      return `${x},${y}`;
    })
    .join(" ");
});
const dailyExpenses = computed(() =>
  ownedAssets.value.reduce(
    (expenses, asset) =>
      expenses +
      asset.dailyExpense * (game.save.holdings[asset.id]?.quantity ?? 0),
    0,
  ),
);
const transactionTotals = computed(() => ({
  purchases: game.save.transactions
    .filter((transaction) =>
      ["purchase", "investment-purchase"].includes(transaction.type),
    )
    .reduce((total, transaction) => total + transaction.amount, 0),
  sales: game.save.transactions
    .filter((transaction) =>
      ["sale", "investment-sale"].includes(transaction.type),
    )
    .reduce((total, transaction) => total + transaction.amount, 0),
  upgrades: game.save.transactions
    .filter((transaction) => transaction.type === "upgrade")
    .reduce((total, transaction) => total + transaction.amount, 0),
}));

function getTransactionLabel(type: Transaction["type"]): string {
  switch (type) {
    case "purchase":
      return "Покупка";
    case "sale":
      return "Продажа";
    case "upgrade":
      return "Улучшение";
    case "investment-purchase":
      return "Покупка долей";
    case "investment-sale":
      return "Продажа долей";
  }
}

function isIncomeTransaction(type: Transaction["type"]): boolean {
  return type === "sale" || type === "investment-sale";
}

function getDailyMarketChange(instrumentId: string): number {
  const instrument = game.marketInstruments.find(
    (entry) => entry.id === instrumentId,
  );
  if (!instrument) return 0;
  const previousPrice = getMarketPrice(instrument, Math.max(0, game.gameDay - 1));
  const currentPrice = getMarketPrice(instrument, game.gameDay);
  return ((currentPrice - previousPrice) / previousPrice) * 100;
}
const categoryBreakdown = computed(() =>
  game.categories
    .map((category) => ({
      ...category,
      value: category.assets.reduce(
        (total, assetId) =>
          total +
          (game.assets.find((asset) => asset.id === assetId)?.price ?? 0) *
            (game.save.holdings[assetId]?.quantity ?? 0),
        0,
      ),
    }))
    .filter((category) => category.value > 0)
    .sort((first, second) => second.value - first.value)
    .slice(0, 5),
);
const largestCategoryValue = computed(
  () => categoryBreakdown.value[0]?.value ?? 1,
);
const capitalCurrency = computed(() => formatCurrency(displayedCapital.value));
const capitalChart = computed(() => {
  const snapshots = [...game.save.capitalHistory];
  const latestSnapshot = snapshots.at(-1);
  if (!latestSnapshot || latestSnapshot.value !== game.netWorth) {
    snapshots.push({ createdAt: now.value, value: game.netWorth });
  }
  const recentSnapshots = snapshots.slice(-7);
  if (recentSnapshots.length < 2) return null;

  const lowestCapital = Math.min(
    ...recentSnapshots.map((snapshot) => snapshot.value),
  );
  const highestCapital = Math.max(
    ...recentSnapshots.map((snapshot) => snapshot.value),
  );
  const capitalRange = highestCapital - lowestCapital || highestCapital || 1;
  const points = recentSnapshots
    .map((snapshot, index) => {
      const x = (index / (recentSnapshots.length - 1)) * 100;
      const y = 84 - ((snapshot.value - lowestCapital) / capitalRange) * 64;
      return `${x},${y}`;
    })
    .join(" ");

  return {
    points,
    firstAt: recentSnapshots[0]!.createdAt,
    lastAt: recentSnapshots.at(-1)!.createdAt,
    lowestCapital,
    highestCapital,
  };
});

function formatNumber(amount: number): string {
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(
    amount,
  );
}

function formatTime(timestamp: number): string {
  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(timestamp);
}

function toggleAssetComparison(assetId: string): void {
  if (comparisonIds.value.includes(assetId)) {
    comparisonIds.value = comparisonIds.value.filter((id) => id !== assetId);
    return;
  }
  if (comparisonIds.value.length === 2) {
    game.notice = "Сравнить можно только два актива за раз.";
    return;
  }
  comparisonIds.value = [...comparisonIds.value, assetId];
}

function getAssetPaybackDays(asset: (typeof game.assets)[number]): number {
  const netIncome = asset.dailyIncome - asset.dailyExpense;
  return netIncome > 0 ? Math.ceil(asset.price / netIncome) : Infinity;
}

function getCategoryIcon(categoryId: string): string {
  return (
    game.categories.find((category) => category.id === categoryId)?.icon ??
    "category-real-estate"
  );
}

function getCategoryScene(categoryId: string): string {
  return (
    game.categories.find((category) => category.id === categoryId)?.image ??
    "real-estate"
  );
}

function getAssetArtworkVariation(assetId: string): number {
  const serial = Number(assetId.match(/\d+$/)?.[0] ?? 1);
  return (serial - 1) % 6;
}

function isCategoryUnlocked(categoryId: string): boolean {
  const category = game.categories.find((entry) => entry.id === categoryId);
  return Boolean(category && game.netWorth >= category.unlockAt);
}

function getPurchaseAmount(assetId: string): number {
  if (purchaseQuantity.value === "max") {
    const asset = game.assets.find((entry) => entry.id === assetId);
    return asset ? Math.floor(game.save.balance / asset.price) : 0;
  }
  return Number(purchaseQuantity.value);
}

function buyAsset(assetId: string): void {
  const quantity = getPurchaseAmount(assetId);
  game.buy(assetId, quantity);
}

function openStore(categoryId?: string): void {
  if (categoryId && isCategoryUnlocked(categoryId))
    selectedCategory.value = categoryId;
  section.value = "store";
}

function dismissOfflineReport(): void {
  showOfflineReport.value = false;
  game.offlineReport = null;
}

function focusStoreSearch(event: KeyboardEvent): void {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    section.value = "store";
    nextTick(() => searchInput.value?.focus());
  }
}

onMounted(() => {
  game.tick(now.value);
  incomeTimer = window.setInterval(() => game.tick(Date.now()), 1_000);
  clockTimer = window.setInterval(() => {
    now.value = Date.now();
  }, 1_000);
  window.addEventListener("keydown", focusStoreSearch);
});

watch(
  () => game.notice,
  (notice) => {
    if (noticeTimer) window.clearTimeout(noticeTimer);
    if (notice) {
      noticeTimer = window.setTimeout(() => {
        game.notice = "";
      }, 5_000);
    }
  },
);

watch(
  () => game.netWorth,
  (targetCapital) => {
    if (capitalAnimationFrame !== undefined) {
      window.cancelAnimationFrame(capitalAnimationFrame);
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      displayedCapital.value = targetCapital;
      return;
    }

    const startingCapital = displayedCapital.value;
    const startedAt = performance.now();
    const animateCapital = (timestamp: number) => {
      const progress = Math.min(1, (timestamp - startedAt) / 450);
      const easedProgress = 1 - (1 - progress) ** 3;
      displayedCapital.value =
        startingCapital + (targetCapital - startingCapital) * easedProgress;
      if (progress < 1) {
        capitalAnimationFrame = window.requestAnimationFrame(animateCapital);
      }
    };
    capitalAnimationFrame = window.requestAnimationFrame(animateCapital);
  },
);

onUnmounted(() => {
  if (incomeTimer) window.clearInterval(incomeTimer);
  if (clockTimer) window.clearInterval(clockTimer);
  if (noticeTimer) window.clearTimeout(noticeTimer);
  if (capitalAnimationFrame !== undefined)
    window.cancelAnimationFrame(capitalAnimationFrame);
  window.removeEventListener("keydown", focusStoreSearch);
});
</script>

<template>
  <div
    class="game-shell"
    :class="{ 'is-compact': game.save.preferences.compactCards }"
    :data-theme="game.save.preferences.theme"
  >
    <aside class="sidebar">
      <a
        class="brand"
        href="#"
        aria-label="Купи весь мир — на главную"
        @click.prevent="section = 'overview'"
      >
        <img
          class="brand-logo"
          :src="`${baseUrl}images/brand.svg`"
          alt="Купи весь мир"
          width="180"
          height="42"
        />
      </a>

      <div class="sidebar-label">ТВОЯ ИМПЕРИЯ</div>
      <nav class="main-nav" aria-label="Главная навигация">
        <button
          v-for="item in navItems"
          :key="item.id"
          class="nav-link"
          :class="{
            'is-active': section === item.id,
            'is-mobile-extra': !mobilePrimarySections.includes(item.id),
          }"
          :aria-current="section === item.id ? 'page' : undefined"
          :aria-label="item.label"
          @click="
            section = item.id;
            showMoreNavigation = false;
          "
        >
          <svg class="nav-icon" aria-hidden="true">
            <use :href="`${baseUrl}images/category-icons.svg#${item.icon}`" />
          </svg>
          <span>{{ item.label }}</span>
          <span
            v-if="item.id === 'empire' && game.ownedCount"
            class="nav-count"
            >{{ game.ownedCount }}</span
          >
        </button>
        <button
          class="nav-link nav-more-button"
          :aria-expanded="showMoreNavigation"
          aria-controls="mobile-more-menu"
          @click="showMoreNavigation = !showMoreNavigation"
        >
          <svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="5" cy="12" r="1" />
            <circle cx="12" cy="12" r="1" />
            <circle cx="19" cy="12" r="1" />
          </svg>
          <span>Ещё</span>
        </button>
        <div
          v-if="showMoreNavigation"
          id="mobile-more-menu"
          class="mobile-more-menu"
        >
          <button
            v-for="item in mobileMoreItems"
            :key="item.id"
            class="mobile-more-link"
            :class="{ 'is-active': section === item.id }"
            @click="
              section = item.id;
              showMoreNavigation = false;
            "
          >
            <svg class="nav-icon" aria-hidden="true">
              <use :href="`${baseUrl}images/category-icons.svg#${item.icon}`" />
            </svg>
            <span>{{ item.label }}</span>
          </button>
        </div>
      </nav>

      <div class="sidebar-spacer"></div>
      <div class="progress-card">
        <div class="progress-card-top">
          <span class="eyebrow">ПРОГРЕСС МИРА</span>
          <span class="progress-count">{{ unlockedCategoryCount }} / 12</span>
        </div>
        <div class="progress-track">
          <span
            :style="{ width: `${(unlockedCategoryCount / 12) * 100}%` }"
          ></span>
        </div>
        <p>Категорий открыто</p>
        <button class="text-button" @click="openStore()">
          Открыть магазин <span aria-hidden="true">↗</span>
        </button>
      </div>
      <div class="sidebar-footer">
        <span class="online-dot"></span>
        Локальное сохранение
        <span
          class="save-indicator"
          :title="`Последнее сохранение ${formatTime(game.save.savedAt)}`"
          >●</span
        >
      </div>
    </aside>

    <main class="main-content">
      <header class="topbar">
        <div class="breadcrumbs">
          <span>ИМПЕРИЯ</span><span class="breadcrumb-divider">/</span
          ><strong>{{ pageTitle }}</strong>
        </div>
        <div class="topbar-right">
          <div class="clock-display">
            <span class="clock-dot"></span>
            <div class="game-clock-copy">
              <span class="game-clock-day"
                >ДЕНЬ {{ String(game.gameDay).padStart(2, "0") }} ·
                {{ game.gameWeekday }}</span
              >
              <strong class="clock-time">{{ game.gameClock }}</strong>
            </div>
            <div class="game-clock-status">
              <span
                class="game-clock-track"
                role="progressbar"
                :aria-valuenow="Math.floor(game.dayProgress * 100)"
                aria-valuemin="0"
                aria-valuemax="100"
                :aria-label="`Прошло ${Math.floor(game.dayProgress * 100)}% игрового дня`"
              >
                <span :style="{ width: `${game.dayProgress * 100}%` }"></span>
              </span>
              <span class="game-clock-remaining"
                >до дня {{ dayCountdown }}</span
              >
            </div>
          </div>
          <span class="avatar-button" aria-hidden="true">М</span>
        </div>
      </header>

      <div v-if="game.saveError" class="error-banner" role="alert">
        <span>{{ game.saveError }}</span>
      </div>

      <div v-if="game.notice" class="notice-banner" role="status">
        <span>{{ game.notice }}</span>
        <button aria-label="Закрыть уведомление" @click="game.notice = ''">
          ×
        </button>
      </div>

      <section v-if="section === 'overview'" class="page-section">
        <div class="page-heading">
          <div>
            <p class="eyebrow">{{ todayLabel }}</p>
            <h1>Империя начинается <span>здесь.</span></h1>
            <p class="page-intro">
              Сначала ключи от комнаты. Потом — ключи от всего мира.
            </p>
          </div>
          <button class="primary-button" @click="openStore()">
            + Найти следующий актив
          </button>
        </div>

        <div class="metrics-grid">
          <article class="metric-card metric-primary">
            <div class="metric-heading">
              <span class="eyebrow">ОБЩИЙ КАПИТАЛ</span
              ><span class="metric-icon">↗</span>
            </div>
            <div class="metric-value">
              <span class="capital-amount">{{ capitalCurrency }}</span>
            </div>
            <div class="metric-caption">
              <span class="metric-live"></span> Деньги и стоимость активов
            </div>
            <div class="metric-decoration">₽</div>
          </article>
          <article class="metric-card">
            <div class="metric-heading">
              <span class="eyebrow">ЧИСТЫЙ ДОХОД / МИНУТУ</span
              ><span class="metric-icon">⌁</span>
            </div>
            <div
              class="metric-value"
              :class="{ 'is-negative': game.dailyProfit < 0 }"
            >
              {{ formatCurrency(game.dailyProfit) }}
            </div>
            <div class="income-chart-wrap">
              <svg
                class="income-chart"
                viewBox="0 0 100 40"
                preserveAspectRatio="none"
                role="img"
                aria-label="История дохода за последние игровые сутки"
              >
                <polyline :points="incomeChartPath" />
              </svg>
              <span>{{
                incomeSamples.length < 2
                  ? "собираем историю дохода"
                  : "последние игровые сутки"
              }}</span>
            </div>
          </article>
          <article class="metric-card">
            <div class="metric-heading">
              <span class="eyebrow">АКТИВЫ ПО КАТЕГОРИЯМ</span
              ><span class="metric-icon">◈</span>
            </div>
            <div class="metric-value asset-total">
              {{ formatNumber(game.ownedCount) }}
              <span>{{ ownedAssetLabel }}</span>
            </div>
            <div v-if="categoryHoldings.length" class="asset-category-list">
              <span
                v-for="category in visibleCategoryHoldings"
                :key="category.id"
              >
                {{ category.name }} <strong>{{ category.quantity }}</strong>
              </span>
              <span
                v-if="categoryHoldings.length > 3"
                class="category-overflow"
              >
                +{{ categoryHoldings.length - 3 }} катег.
              </span>
            </div>
            <div v-else class="metric-caption">Купи первый актив</div>
          </article>
        </div>

        <div class="overview-grid">
          <article class="goal-card">
            <div class="goal-topline">
              <span class="eyebrow">СЛЕДУЮЩАЯ БОЛЬШАЯ ЦЕЛЬ</span
              ><span class="goal-step"
                >ЭТАП {{ String(nextGoalStage).padStart(2, "0") }}
                <span>—</span> 12</span
              >
            </div>
            <div class="goal-content">
              <div>
                <h2>{{ nextGoal.name }}</h2>
                <p>
                  {{ nextGoal.description }}
                </p>
                <div class="goal-price-row">
                  <span>{{
                    isNextGoalUnlocked
                      ? "Цена · свободные деньги"
                      : "Капитал для открытия категории"
                  }}</span
                  ><strong>{{ formatCurrency(nextGoalRequirement) }}</strong>
                </div>
                <div class="goal-track">
                  <span
                    :style="{
                      width: `${nextGoalProgress}%`,
                    }"
                  ></span>
                </div>
                <div class="goal-progress-copy">
                  <span>{{
                    isNextGoalUnlocked
                      ? `${formatCurrency(game.save.balance)} свободно`
                      : `${formatCurrency(game.netWorth)} капитал`
                  }}</span>
                  <span>{{ nextGoalProgress }}%</span>
                </div>
                <div class="goal-actions">
                  <button
                    v-if="
                      isNextGoalUnlocked && game.save.balance >= nextGoal.price
                    "
                    class="primary-button goal-buy-button"
                    @click="game.buy(nextGoal.id)"
                  >
                    Купить за {{ formatCurrency(nextGoal.price) }}
                  </button>
                  <button
                    class="outline-button"
                    @click="
                      openStore(
                        isNextGoalUnlocked ? nextGoal.categoryId : undefined,
                      )
                    "
                  >
                    {{
                      isNextGoalUnlocked ? "Другие активы" : "Доступные активы"
                    }}
                    <span aria-hidden="true">↗</span>
                  </button>
                </div>
              </div>
              <AssetArtwork
                class="goal-art"
                presentation="goal"
                :scene-id="getCategoryScene(nextGoal.categoryId)"
                :category-id="nextGoal.categoryId"
                :category-icon="getCategoryIcon(nextGoal.categoryId)"
                :title="nextGoal.name"
                :label="`ЭТАП ${String(nextGoalStage).padStart(2, '0')}`"
                :variant="getAssetArtworkVariation(nextGoal.id)"
              />
            </div>
          </article>

          <article class="event-card">
            <div class="section-title-row">
              <div>
                <p class="eyebrow">ЧТО ПРОИСХОДИТ</p>
                <h2>Пульс рынка</h2>
              </div>
              <button
                class="icon-button"
                aria-label="Перейти ко всем событиям"
                @click="section = 'news'"
              >
                ↗
              </button>
            </div>
            <div v-if="game.activeEvent" class="market-event">
              <span class="event-spark">✦</span>
              <div>
                <span class="event-tag"
                  >СОБЫТИЕ · ЕЩЁ
                  {{
                    Math.max(
                      1,
                      Math.ceil(
                        ((game.activeEvent.expiresAt ?? now) - now) / 60_000,
                      ),
                    )
                  }}
                  МИН.</span
                >
                <h3>{{ game.activeEvent.title }}</h3>
                <p>{{ game.activeEvent.description }}</p>
              </div>
              <strong
                :class="{
                  'event-negative':
                    (game.activeEvent.incomeMultiplier ?? 1) < 1,
                }"
                >{{ (game.activeEvent.incomeMultiplier ?? 1) > 1 ? "+" : ""
                }}{{
                  Math.round(
                    ((game.activeEvent.incomeMultiplier ?? 1) - 1) * 100,
                  )
                }}%</strong
              >
            </div>
            <div v-else class="market-event market-event-muted">
              <span class="event-spark">◷</span>
              <div>
                <span class="event-tag">СЛЕДИМ ЗА РЫНКОМ</span>
                <h3>Тишина перед сделкой</h3>
                <p>Новые события появятся здесь и повлияют на доход.</p>
              </div>
            </div>
            <div class="event-divider"></div>
            <div class="recent-activity-heading">
              <span class="eyebrow">ПОСЛЕДНИЕ ДЕЙСТВИЯ</span
              ><button class="text-button" @click="section = 'empire'">
                Все <span aria-hidden="true">→</span>
              </button>
            </div>
            <div v-if="game.save.transactions.length" class="activity-list">
              <div
                v-for="transaction in game.save.transactions.slice(0, 3)"
                :key="transaction.id"
                class="activity-row"
              >
                <span
                  class="activity-symbol"
                  :class="`activity-${transaction.type}`"
                  >{{
                    isIncomeTransaction(transaction.type)
                      ? "↙"
                      : transaction.type === "upgrade"
                        ? "↑"
                        : "↗"
                  }}</span
                >
                <div class="activity-copy">
                  <strong>{{ transaction.name }}</strong
                  ><span
                    >{{
                      getTransactionLabel(transaction.type)
                    }}
                    · {{ formatTime(transaction.createdAt) }}</span
                  >
                </div>
                <span
                  class="activity-amount"
                  :class="[
                    `activity-${transaction.type}`,
                    { 'is-income': isIncomeTransaction(transaction.type) },
                  ]"
                  >{{ isIncomeTransaction(transaction.type) ? "+" : "−"
                  }}{{ formatCurrency(transaction.amount) }}</span
                >
              </div>
            </div>
            <div v-else class="empty-activity">
              <span>✳</span>
              <p>Твоя история больших сделок начнётся с первой покупки.</p>
              <button class="text-button" @click="openStore()">
                Выбрать актив <span aria-hidden="true">→</span>
              </button>
            </div>
          </article>
        </div>

        <div class="section-title-row category-heading">
          <div>
            <p class="eyebrow">ОТ КОМНАТЫ ДО ГАЛАКТИКИ</p>
            <h2>Мир возможностей</h2>
          </div>
          <button class="text-button" @click="openStore()">
            Все категории <span aria-hidden="true">↗</span>
          </button>
        </div>
        <div class="category-grid">
          <button
            v-for="category in game.categories.slice(0, 6)"
            :key="category.id"
            class="category-card"
            :class="{ 'is-locked': !isCategoryUnlocked(category.id) }"
            :disabled="!isCategoryUnlocked(category.id)"
            @click="openStore(category.id)"
          >
            <AssetArtwork
              class="category-art"
              presentation="category"
              :scene-id="category.image"
              :category-id="category.id"
              :category-icon="category.icon"
              :title="category.name"
            />
            <svg class="category-icon" aria-hidden="true">
              <use :href="`${baseUrl}images/category-icons.svg#${category.icon}`" />
            </svg>
            <span class="category-name">{{ category.name }}</span>
            <span class="category-state">{{
              isCategoryUnlocked(category.id)
                ? "ОТКРЫТО"
                : `ОТ ${formatCurrency(category.unlockAt)}`
            }}</span>
            <span class="category-arrow">{{
              isCategoryUnlocked(category.id) ? "↗" : "⌑"
            }}</span>
          </button>
        </div>
      </section>

      <section v-else-if="section === 'store'" class="page-section">
        <div class="page-heading compact-heading">
          <div>
            <p class="eyebrow">ИНВЕСТИРУЙ С УМОМ</p>
            <h1>Магазин <span>активов.</span></h1>
            <p class="page-intro">
              Каждая покупка работает на тебя. Даже золотой унитаз — почти.
            </p>
          </div>
          <div class="store-balance">
            <span class="eyebrow">ДОСТУПНО</span
            ><strong>{{ formatCurrency(game.save.balance) }}</strong>
          </div>
        </div>
        <div class="store-controls">
          <label class="search-field"
            ><span aria-hidden="true">⌕</span
            ><input
              ref="searchInput"
              v-model="searchQuery"
              type="search"
              placeholder="Найти в категории..."
              aria-label="Поиск активов"
            />
            <kbd>Ctrl / ⌘ K</kbd></label
          >
          <div class="select-group">
            <label for="sort-assets">Сортировка</label
            ><select id="sort-assets" v-model="sortBy">
              <option value="recommended">Сначала доступные</option>
              <option value="price">По цене</option>
              <option value="income">По доходу</option>
              <option value="payback">По окупаемости</option>
            </select>
          </div>
        </div>
        <div class="catalog-filters" role="group" aria-label="Фильтр активов">
          <button
            v-for="filter in [
              { id: 'all', label: 'Все активы' },
              { id: 'favorites', label: 'Избранное' },
              { id: 'wishlist', label: 'Список желаний' },
            ] as const"
            :key="filter.id"
            class="filter-chip"
            :class="{ 'is-selected': catalogFilter === filter.id }"
            @click="catalogFilter = filter.id"
          >
            {{ filter.label
            }}<span
              v-if="filter.id === 'favorites' && game.save.favorites.length"
              >{{ game.save.favorites.length }}</span
            ><span
              v-if="filter.id === 'wishlist' && game.save.wishlist.length"
              >{{ game.save.wishlist.length }}</span
            >
          </button>
          <div class="quantity-picker" aria-label="Количество для покупки">
            <span>КУПИТЬ</span
            ><button
              v-for="quantity in ['1', '10', '100', 'max'] as const"
              :key="quantity"
              :class="{ 'is-selected': purchaseQuantity === quantity }"
              @click="purchaseQuantity = quantity"
            >
              {{ quantity === "max" ? "MAX" : quantity }}
            </button>
          </div>
        </div>
        <div
          class="category-tabs"
          role="tablist"
          aria-label="Категории магазина"
        >
          <button
            v-for="category in game.categories"
            :key="category.id"
            class="category-tab"
            :class="{
              'is-active': selectedCategory === category.id,
              'is-locked': !isCategoryUnlocked(category.id),
            }"
            :disabled="!isCategoryUnlocked(category.id)"
            :aria-selected="selectedCategory === category.id"
            role="tab"
            @click="selectedCategory = category.id"
          >
            <svg class="category-tab-icon" aria-hidden="true">
              <use :href="`${baseUrl}images/category-icons.svg#${category.icon}`" />
            </svg>
            {{ category.name
            }}<span v-if="!isCategoryUnlocked(category.id)" class="lock-mark"
              >⌑</span
            >
          </button>
        </div>
        <div class="catalog-summary">
          <div>
            <h2>{{ selectedCategoryDetails?.name }}</h2>
            <p>
              {{ filteredAssets.length }} активов · доход с каждой минуты игры
            </p>
          </div>
          <span>КАПИТАЛ {{ formatCurrency(game.netWorth) }}</span>
        </div>
        <section
          v-if="comparisonAssets.length"
          class="asset-comparison"
          aria-label="Сравнение активов"
        >
          <div class="comparison-heading">
            <div>
              <p class="eyebrow">ВЫБРАННЫЕ АКТИВЫ</p>
              <h2>Сравнение</h2>
            </div>
            <button class="text-button" @click="comparisonIds = []">
              Очистить
            </button>
          </div>
          <div class="comparison-grid">
            <div class="comparison-labels" aria-hidden="true">
              <span>Стоимость</span>
              <span>Доход за игровые сутки</span>
              <span>Окупаемость</span>
            </div>
            <article
              v-for="asset in comparisonAssets"
              :key="asset.id"
              class="comparison-asset"
            >
              <div class="comparison-asset-heading">
                <strong>{{ asset.name }}</strong>
                <button
                  class="comparison-remove"
                  :aria-label="`Убрать ${asset.name} из сравнения`"
                  @click="toggleAssetComparison(asset.id)"
                >
                  ×
                </button>
              </div>
              <span>{{ formatCurrency(asset.price) }}</span>
              <span class="income-value">{{
                formatCurrency(asset.dailyIncome - asset.dailyExpense)
              }}</span>
              <span>{{ getAssetPaybackDays(asset) }} игровых дн.</span>
            </article>
            <button
              v-if="comparisonAssets.length === 1"
              class="comparison-empty"
              @click="game.notice = 'Выбери второй актив в каталоге.'"
            >
              + Добавь второй актив
            </button>
          </div>
        </section>
        <div v-if="filteredAssets.length" class="asset-grid">
          <article
            v-for="(asset, index) in filteredAssets"
            :key="asset.id"
            class="asset-card"
            :style="{ '--card-index': index }"
          >
            <div class="asset-art" :data-category="asset.categoryId">
              <AssetArtwork
                presentation="asset"
                :scene-id="getCategoryScene(asset.categoryId)"
                :category-id="asset.categoryId"
                :category-icon="getCategoryIcon(asset.categoryId)"
                :title="asset.name"
                :label="`ОБЪЕКТ ${String(index + 1).padStart(2, '0')}`"
                :variant="getAssetArtworkVariation(asset.id)"
              />
              <button
                class="favorite-button"
                :aria-label="
                  game.save.favorites.includes(asset.id)
                    ? `Убрать ${asset.name} из избранного`
                    : `Добавить ${asset.name} в избранное`
                "
                @click="game.toggleFavorite(asset.id)"
              >
                {{ game.save.favorites.includes(asset.id) ? "♥" : "♡" }}</button
              ><span class="asset-rarity">{{ asset.rarity }}</span>
            </div>
            <div class="asset-card-content">
              <div class="asset-title-row">
                <h3>{{ asset.name }}</h3>
                <div class="asset-card-actions">
                  <button
                    class="compare-button"
                    :class="{ 'is-selected': comparisonIds.includes(asset.id) }"
                    :aria-label="
                      comparisonIds.includes(asset.id)
                        ? `Убрать ${asset.name} из сравнения`
                        : `Сравнить ${asset.name}`
                    "
                    :aria-pressed="comparisonIds.includes(asset.id)"
                    @click="toggleAssetComparison(asset.id)"
                  >
                    ⇄
                  </button>
                  <button
                    class="wishlist-button"
                    :aria-label="
                      game.save.wishlist.includes(asset.id)
                        ? `Убрать ${asset.name} из списка желаний`
                        : `Добавить ${asset.name} в список желаний`
                    "
                    @click="game.toggleWishlist(asset.id)"
                  >
                    {{ game.save.wishlist.includes(asset.id) ? "▣" : "□" }}
                  </button>
                </div>
              </div>
              <p class="asset-description">{{ asset.description }}</p>
              <div class="asset-ownership">
                Уже в империи:
                <strong>{{
                  game.save.holdings[asset.id]?.quantity ?? 0
                }}</strong>
              </div>
              <div class="asset-economy">
                <div>
                  <span>ПОКУПКА</span
                  ><strong>{{ formatCurrency(asset.price) }}</strong>
                </div>
                <div>
                  <span>ДОХОД / ИГРОВУЮ МИНУТУ</span
                  ><strong class="income-value"
                    >+{{
                      formatCurrency(asset.dailyIncome - asset.dailyExpense)
                    }}</strong
                  >
                </div>
                <div>
                  <span>ОКУПАЕМОСТЬ</span>
                  <strong
                    >{{
                      formatNumber(
                        Math.ceil(
                          asset.price /
                            (asset.dailyIncome - asset.dailyExpense),
                        ),
                      )
                    }}
                    мин.</strong
                  >
                </div>
              </div>
              <button
                class="buy-button"
                :disabled="
                  asset.price * getPurchaseAmount(asset.id) >
                    game.save.balance || getPurchaseAmount(asset.id) < 1
                "
                @click="buyAsset(asset.id)"
              >
                <span>{{
                  purchaseQuantity === "max"
                    ? `Купить максимум · ${getPurchaseAmount(asset.id)}`
                    : `Купить${purchaseQuantity === "1" ? "" : ` × ${purchaseQuantity}`}`
                }}</span
                ><strong>{{
                  formatCurrency(asset.price * getPurchaseAmount(asset.id))
                }}</strong>
              </button>
            </div>
          </article>
        </div>
        <div v-else class="empty-state">
          <span>⌕</span>
          <h2>Пока ничего не нашлось</h2>
          <p>Смени поиск или этот фильтр — нужная покупка где-то рядом.</p>
          <button
            class="outline-button"
            @click="
              catalogFilter = 'all';
              searchQuery = '';
            "
          >
            Показать все активы
          </button>
        </div>
      </section>

      <section v-else-if="section === 'empire'" class="page-section">
        <div class="page-heading compact-heading">
          <div>
            <p class="eyebrow">ВСЁ, ЧТО ТЫ ПОСТРОИЛ</p>
            <h1>Моя <span>империя.</span></h1>
            <p class="page-intro">
              Покупай, улучшай и следи, как имущество работает на тебя.
            </p>
          </div>
          <div class="store-balance">
            <span class="eyebrow">ЧИСТАЯ ПРИБЫЛЬ / ИГРОВЫЕ СУТКИ</span
            ><strong class="income-value">{{
              formatCurrency(game.dailyProfit)
            }}</strong>
          </div>
        </div>
        <div class="empire-summary">
          <div>
            <span class="eyebrow">ОБЩАЯ СТОИМОСТЬ</span
            ><strong>{{ formatCurrency(game.portfolioValue) }}</strong>
          </div>
          <div>
            <span class="eyebrow">АКТИВЫ</span
            ><strong>{{ game.ownedCount }}</strong>
          </div>
          <div>
            <span class="eyebrow">СВОБОДНЫЕ СРЕДСТВА</span
            ><strong>{{ formatCurrency(game.save.balance) }}</strong>
          </div>
        </div>
        <div v-if="ownedAssets.length" class="empire-list">
          <article
            v-for="asset in ownedAssets"
            :key="asset.id"
            class="empire-row"
          >
            <div class="empire-asset-icon" :data-category="asset.categoryId">
              <svg aria-hidden="true">
                <use
                  :href="`${baseUrl}images/category-icons.svg#${getCategoryIcon(asset.categoryId)}`"
                />
              </svg>
            </div>
            <div class="empire-asset-copy">
              <span class="eyebrow">{{
                game.categories.find(
                  (category) => category.id === asset.categoryId,
                )?.name
              }}</span>
              <h3>{{ asset.name }}</h3>
              <p>
                {{ game.save.holdings[asset.id]?.quantity }} шт.
                <span v-if="game.save.holdings[asset.id]?.level"
                  >· Улучшение {{ game.save.holdings[asset.id]?.level }}/5</span
                >
              </p>
            </div>
            <div class="empire-stat">
              <span>СТОИМОСТЬ</span
              ><strong>{{
                formatCurrency(
                  asset.price * (game.save.holdings[asset.id]?.quantity ?? 0),
                )
              }}</strong>
            </div>
            <div class="empire-stat">
              <span>ЧИСТЫЙ ДОХОД / ИГРОВЫЕ СУТКИ</span
              ><strong class="income-value"
                >+{{
                  formatCurrency(
                    (asset.dailyIncome *
                      (1 + (game.save.holdings[asset.id]?.level ?? 0) * 0.25) -
                      asset.dailyExpense) *
                      (game.save.holdings[asset.id]?.quantity ?? 0),
                  )
                }}</strong
              >
            </div>
            <div class="empire-actions">
              <button
                class="outline-button small-button"
                :disabled="
                  (game.save.holdings[asset.id]?.level ?? 0) >= 5 ||
                  game.save.balance <
                    asset.price *
                      (1.2 + (game.save.holdings[asset.id]?.level ?? 0) * 0.8)
                "
                @click="game.upgrade(asset.id)"
              >
                Улучшить</button
              ><button
                class="sell-button"
                :aria-label="`Продать ${asset.name}`"
                @click="game.sell(asset.id)"
              >
                Продать
              </button>
            </div>
          </article>
        </div>
        <div v-else class="empty-state">
          <span>◈</span>
          <h2>Твоя империя ждёт первого актива</h2>
          <p>Начни с чего-то небольшого. До первой недвижимости — один клик.</p>
          <button class="primary-button" @click="openStore()">
            Заглянуть в магазин <span aria-hidden="true">↗</span>
          </button>
        </div>
        <div v-if="game.save.transactions.length" class="history-section">
          <div class="section-title-row">
            <div>
              <p class="eyebrow">ИСТОРИЯ СДЕЛОК</p>
              <h2>След денег</h2>
            </div>
          </div>
          <div class="history-list">
            <div
              v-for="transaction in game.save.transactions.slice(0, 12)"
              :key="transaction.id"
              class="history-row"
            >
              <span
                class="history-type"
                :class="`activity-${transaction.type}`"
                >{{ getTransactionLabel(transaction.type) }}</span
              ><strong>{{ transaction.name }}</strong
              ><time>{{ formatTime(transaction.createdAt) }}</time
              ><span
                :class="{ 'is-income': isIncomeTransaction(transaction.type) }"
                >{{ isIncomeTransaction(transaction.type) ? "+" : "−"
                }}{{ formatCurrency(transaction.amount) }}</span
              >
            </div>
          </div>
        </div>
      </section>

      <section v-else-if="section === 'stats'" class="page-section">
        <div class="page-heading compact-heading">
          <div>
            <p class="eyebrow">КАПИТАЛ В ЦИФРАХ</p>
            <h1>Статистика <span>империи.</span></h1>
            <p class="page-intro">
              Только настоящие сделки, доходы и стоимость твоих активов.
            </p>
          </div>
        </div>
        <div class="statistics-grid">
          <article class="statistics-card">
            <span class="eyebrow">ЧИСТЫЙ ДОХОД / ИГРОВЫЕ СУТКИ</span>
            <strong class="income-value">{{
              formatCurrency(game.dailyProfit)
            }}</strong>
            <span>После расходов на содержание</span>
          </article>
          <article class="statistics-card">
            <span class="eyebrow">ВАЛОВЫЙ ДОХОД / ИГРОВЫЕ СУТКИ</span>
            <strong>{{
              formatCurrency(game.dailyProfit + dailyExpenses)
            }}</strong>
            <span>До расходов на содержание</span>
          </article>
          <article class="statistics-card">
            <span class="eyebrow">РАСХОДЫ / ИГРОВЫЕ СУТКИ</span>
            <strong>{{ formatCurrency(dailyExpenses) }}</strong>
            <span>Обслуживание активов</span>
          </article>
          <article class="statistics-card">
            <span class="eyebrow">ПОКУПКИ ЗА ВСЁ ВРЕМЯ</span>
            <strong>{{ formatCurrency(transactionTotals.purchases) }}</strong>
            <span>{{ game.save.transactions.length }} записей в журнале</span>
          </article>
        </div>

        <div class="statistics-panels">
          <article class="statistics-panel capital-panel">
            <div class="section-title-row">
              <div>
                <p class="eyebrow">ПОСЛЕДНИЕ ИГРОВЫЕ ДНИ</p>
                <h2>Капитал во времени</h2>
              </div>
              <span class="chart-current">{{
                formatCurrency(game.netWorth)
              }}</span>
            </div>
            <div v-if="capitalChart" class="capital-chart-wrap">
              <svg
                class="capital-chart"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                role="img"
                aria-label="График реальных изменений капитала"
              >
                <defs>
                  <linearGradient id="capital-fill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stop-color="#c4ee76" stop-opacity=".24" />
                    <stop offset="100%" stop-color="#c4ee76" stop-opacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M 0 84 H 100 M 0 52 H 100 M 0 20 H 100"
                  class="chart-grid-line"
                />
                <polygon
                  :points="`${capitalChart.points} 100,100 0,100`"
                  fill="url(#capital-fill)"
                />
                <polyline :points="capitalChart.points" class="chart-line" />
              </svg>
              <div class="chart-labels">
                <span>{{ formatTime(capitalChart.firstAt) }}</span>
                <span>{{ formatTime(capitalChart.lastAt) }}</span>
              </div>
            </div>
            <div v-else class="chart-empty">
              <span class="chart-empty-mark">⌁</span>
              <p>График появится после первого игрового дня.</p>
              <span>Данные обновляются по мере игры, без расчётных линий.</span>
            </div>
          </article>

          <article class="statistics-panel">
            <div class="section-title-row">
              <div>
                <p class="eyebrow">ЧТО У ТЕБЯ ЕСТЬ</p>
                <h2>Состав империи</h2>
              </div>
            </div>
            <div v-if="categoryBreakdown.length" class="category-breakdown">
              <div
                v-for="category in categoryBreakdown"
                :key="category.id"
                class="breakdown-row"
              >
                <div class="breakdown-label">
                  <span class="breakdown-category">
                    <svg aria-hidden="true">
                      <use
                        :href="`${baseUrl}images/category-icons.svg#${category.icon}`"
                      />
                    </svg>
                    {{ category.name }}
                  </span>
                  <strong>{{ formatCurrency(category.value) }}</strong>
                </div>
                <div class="breakdown-track">
                  <span
                    :style="{
                      width: `${(category.value / largestCategoryValue) * 100}%`,
                    }"
                  ></span>
                </div>
              </div>
            </div>
            <div v-else class="chart-empty breakdown-empty">
              <span class="chart-empty-mark">◈</span>
              <p>Пока нечего сравнивать.</p>
              <span>Первая покупка появится в составе империи.</span>
              <button class="text-button" @click="openStore()">
                Найти актив <span aria-hidden="true">→</span>
              </button>
            </div>
            <div class="transaction-totals">
              <div>
                <span>Продажи</span
                ><strong>{{ formatCurrency(transactionTotals.sales) }}</strong>
              </div>
              <div>
                <span>Улучшения</span
                ><strong>{{
                  formatCurrency(transactionTotals.upgrades)
                }}</strong>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section v-else-if="section === 'collections'" class="page-section">
        <div class="page-heading compact-heading">
          <div>
            <p class="eyebrow">СОБИРАЙ И ПОЛУЧАЙ НАГРАДЫ</p>
            <h1>Твои <span>коллекции.</span></h1>
            <p class="page-intro">
              Наборы собираются сами — награда приходит один раз за каждый
              полный комплект.
            </p>
          </div>
        </div>
        <div class="collection-grid">
          <article
            v-for="collection in assetCollections"
            :key="collection.id"
            class="collection-card"
            :class="{
              'is-complete': game.save.collections.includes(collection.id),
            }"
          >
            <div class="collection-icon" aria-hidden="true">
              {{ collection.icon }}
            </div>
            <div class="collection-copy">
              <span class="eyebrow">{{
                game.save.collections.includes(collection.id)
                  ? "НАГРАДА ПОЛУЧЕНА"
                  : "СОБЕРИ НАБОР"
              }}</span>
              <h2>{{ collection.name }}</h2>
              <p>{{ collection.description }}</p>
            </div>
            <strong class="collection-reward"
              >+{{ formatCurrency(collection.reward) }}</strong
            >
            <div class="collection-assets">
              <span
                v-for="assetId in collection.assetIds"
                :key="assetId"
                :class="{
                  'is-owned': (game.save.holdings[assetId]?.quantity ?? 0) > 0,
                }"
              >
                {{
                  game.assets.find((asset) => asset.id === assetId)?.name ??
                  assetId
                }}
                <span aria-hidden="true">{{
                  (game.save.holdings[assetId]?.quantity ?? 0) > 0 ? "✓" : "○"
                }}</span>
              </span>
            </div>
            <button
              class="outline-button"
              @click="
                openStore(
                  game.assets.find(
                    (asset) =>
                      !game.save.holdings[asset.id] &&
                      collection.assetIds.includes(asset.id),
                  )?.categoryId,
                )
              "
            >
              {{ game.save.collections.includes(collection.id) ? "В магазин" : "Продолжить набор" }}
              <span aria-hidden="true">↗</span>
            </button>
          </article>
        </div>
      </section>

      <section v-else-if="section === 'investments'" class="page-section">
        <div class="page-heading compact-heading">
          <div>
            <p class="eyebrow">ЦЕНЫ МЕНЯЮТСЯ С ИГРОВЫМИ СУТКАМИ</p>
            <h1>Капитал <span>в движении.</span></h1>
            <p class="page-intro">
              Покупай доли вымышленных фондов и следи за их стоимостью. Рынок
              может как вырасти, так и просесть.
            </p>
          </div>
          <div class="store-balance">
            <span class="eyebrow">СВОБОДНО</span>
            <strong>{{ formatCurrency(game.save.balance) }}</strong>
          </div>
        </div>
        <div class="investment-grid">
          <article
            v-for="instrument in game.marketInstruments"
            :key="instrument.id"
            class="investment-card"
            :class="{
              'has-position': game.save.investments[instrument.id],
            }"
          >
            <div class="investment-top">
              <span class="investment-icon" aria-hidden="true">{{
                instrument.icon
              }}</span>
              <span class="eyebrow">{{ instrument.sector }}</span>
            </div>
            <h2>{{ instrument.name }}</h2>
            <p>{{ instrument.description }}</p>
            <div class="investment-price">
              <strong>{{ formatCurrency(getMarketPrice(instrument, game.gameDay)) }}</strong>
              <span>за долю</span>
            </div>
            <span
              class="investment-change"
              :class="{
                'is-negative': getDailyMarketChange(instrument.id) < 0,
              }"
            >
              {{ getDailyMarketChange(instrument.id) >= 0 ? "+" : ""
              }}{{ getDailyMarketChange(instrument.id).toFixed(1) }}% за игровые сутки
            </span>
            <div
              v-if="game.save.investments[instrument.id]"
              class="investment-position"
            >
              <span
                >Твои доли
                <strong>{{
                  game.save.investments[instrument.id]?.quantity
                }}</strong></span
              >
              <span
                >Средняя цена
                <strong>{{
                  formatCurrency(
                    game.save.investments[instrument.id]?.averagePrice ?? 0,
                  )
                }}</strong></span
              >
            </div>
            <div class="investment-actions">
              <button
                class="primary-button"
                :disabled="
                  game.save.balance <
                  getMarketPrice(instrument, game.gameDay)
                "
                @click="game.buyInvestment(instrument.id)"
              >
                Купить долю
              </button>
              <button
                v-if="game.save.investments[instrument.id]"
                class="outline-button"
                @click="game.sellInvestment(instrument.id)"
              >
                Продать все
              </button>
            </div>
          </article>
        </div>
        <div v-if="game.investmentsValue" class="investment-total">
          <span>Текущая стоимость портфеля</span>
          <strong>{{ formatCurrency(game.investmentsValue) }}</strong>
        </div>
      </section>

      <section v-else-if="section === 'settings'" class="page-section">
        <div class="page-heading compact-heading">
          <div>
            <p class="eyebrow">ПОДСТРОЙ ИГРУ ПОД СЕБЯ</p>
            <h1>Твои <span>настройки.</span></h1>
            <p class="page-intro">
              Оформление и звук сохраняются на этом устройстве.
            </p>
          </div>
        </div>
        <div class="settings-grid">
          <section class="settings-panel" aria-labelledby="theme-title">
            <span class="eyebrow">ОФОРМЛЕНИЕ</span>
            <h2 id="theme-title">Цветовая тема</h2>
            <div class="theme-options">
              <button
                v-for="theme in themes"
                :key="theme.id"
                class="theme-option"
                :class="{ 'is-selected': game.save.preferences.theme === theme.id }"
                :data-theme-choice="theme.id"
                :aria-pressed="game.save.preferences.theme === theme.id"
                @click="
                  game.updatePreferences({
                    ...game.save.preferences,
                    theme: theme.id,
                  })
                "
              >
                <span class="theme-swatch"></span>{{ theme.name }}
              </button>
            </div>
          </section>
          <section class="settings-panel" aria-labelledby="comfort-title">
            <span class="eyebrow">УДОБСТВО</span>
            <h2 id="comfort-title">Вид и звук</h2>
            <label class="setting-row">
              <span>
                <strong>Компактные карточки</strong>
                <small>Больше объектов помещается на экране</small>
              </span>
              <input
                type="checkbox"
                :checked="game.save.preferences.compactCards"
                @change="
                  game.updatePreferences({
                    ...game.save.preferences,
                    compactCards: !game.save.preferences.compactCards,
                  })
                "
              />
            </label>
            <label class="setting-row">
              <span>
                <strong>Звуки действий</strong>
                <small>Короткий сигнал при покупке и продаже</small>
              </span>
              <input
                type="checkbox"
                :checked="game.save.preferences.soundEnabled"
                @change="
                  game.updatePreferences({
                    ...game.save.preferences,
                    soundEnabled: !game.save.preferences.soundEnabled,
                  })
                "
              />
            </label>
          </section>
        </div>
      </section>

      <section v-else-if="section === 'news'" class="page-section">
        <div class="page-heading compact-heading">
          <div>
            <p class="eyebrow">МИР НЕ СТОИТ НА МЕСТЕ</p>
            <h1>Пульс <span>рынка.</span></h1>
            <p class="page-intro">
              Новости, которые влияют на твою империю, а не просто занимают
              место.
            </p>
          </div>
        </div>
        <div v-if="game.save.news.length" class="news-list">
          <article
            v-for="story in game.save.news"
            :key="story.id"
            class="news-card"
            :class="{ 'is-current': story.expiresAt && story.expiresAt > now }"
          >
            <div class="news-icon">
              <svg aria-hidden="true">
                <use
                  :href="`${baseUrl}images/category-icons.svg#${story.categoryId ? getCategoryIcon(story.categoryId) : 'news'}`"
                />
              </svg>
            </div>
            <div>
              <div class="news-meta">
                <span>{{
                  story.categoryId
                    ? game.categories.find(
                        (category) => category.id === story.categoryId,
                      )?.name
                    : "ИМПЕРСКАЯ ХРОНИКА"
                }}</span
                ><time>{{ formatTime(story.createdAt) }}</time>
              </div>
              <h2>{{ story.title }}</h2>
              <p>{{ story.description }}</p>
            </div>
            <span
              v-if="story.incomeMultiplier"
              class="news-bonus"
              :class="{
                'event-negative': story.incomeMultiplier < 1,
              }"
              >{{ story.incomeMultiplier > 1 ? "+" : ""
              }}{{ Math.round((story.incomeMultiplier - 1) * 100) }}%</span
            >
          </article>
        </div>
        <div v-else class="empty-state">
          <span>◷</span>
          <h2>Рынок пока спокоен</h2>
          <p>
            Первые события появятся здесь. Иногда новости стоят дороже активов.
          </p>
        </div>
      </section>

      <section v-else class="page-section">
        <div class="page-heading compact-heading">
          <div>
            <p class="eyebrow">ПРИЯТНЫЕ ПОБОЧНЫЕ ЭФФЕКТЫ БОГАТСТВА</p>
            <h1>Достижения <span>и поводы.</span></h1>
            <p class="page-intro">
              Здесь отмечаем важные вехи — от первой сделки до покорения
              космоса.
            </p>
          </div>
          <div class="store-balance">
            <span class="eyebrow">СОБРАНО</span
            ><strong
              >{{ game.unlockedAchievements.length }} /
              {{ achievements.length }}</strong
            >
          </div>
        </div>
        <div class="achievement-progress">
          <div>
            <span class="eyebrow">КОЛЛЕКЦИЯ</span
            ><strong>{{ achievementProgress }}%</strong>
          </div>
          <div class="progress-track">
            <span :style="{ width: `${achievementProgress}%` }"></span>
          </div>
        </div>
        <div class="achievement-grid">
          <article
            v-for="achievement in achievements"
            :key="achievement.id"
            class="achievement-card"
            :class="{
              'is-earned': game.save.achievements.includes(achievement.id),
            }"
          >
            <div class="achievement-icon">
              {{
                game.save.achievements.includes(achievement.id)
                  ? achievement.icon
                  : "· · ·"
              }}
            </div>
            <div>
              <span class="eyebrow">{{
                game.save.achievements.includes(achievement.id)
                  ? "ПОЛУЧЕНО"
                  : "ЕЩЁ ВПЕРЕДИ"
              }}</span>
              <h2>{{ achievement.name }}</h2>
              <p>{{ achievement.description }}</p>
            </div>
            <span class="achievement-check">{{
              game.save.achievements.includes(achievement.id) ? "✓" : "○"
            }}</span>
          </article>
        </div>
      </section>

      <footer class="page-footer">
        <span
          >КУПИ ВЕСЬ МИР <span class="footer-divider">·</span> ЛИЧНАЯ ИМПЕРИЯ,
          ЛОКАЛЬНЫЙ МИР</span
        ><span
          >Все суммы — в игровых рублях.
          <span class="footer-spark">✳</span></span
        >
      </footer>
    </main>

    <div
      v-if="showOfflineReport && game.offlineReport"
      class="modal-backdrop"
      @click.self="dismissOfflineReport"
    >
      <section
        class="offline-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="offline-title"
      >
        <button
          class="modal-close"
          aria-label="Закрыть отчёт"
          @click="dismissOfflineReport"
        >
          ×
        </button>
        <span class="offline-spark">✳</span>
        <p class="eyebrow">ПОКА ТЕБЯ НЕ БЫЛО</p>
        <h2 id="offline-title">Империя не спала.</h2>
        <p class="offline-copy">
          За {{ Math.floor(game.offlineReport.elapsedMs / 3_600_000) }} ч
          {{ Math.floor((game.offlineReport.elapsedMs % 3_600_000) / 60_000) }}
          мин активы успели поработать на тебя.
        </p>
        <div class="offline-lines">
          <div>
            <span>Валовый доход</span
            ><strong
              >+{{ formatCurrency(game.offlineReport.grossIncome) }}</strong
            >
          </div>
          <div>
            <span>Расходы</span
            ><strong>−{{ formatCurrency(game.offlineReport.expenses) }}</strong>
          </div>
          <div class="offline-total">
            <span>Чистая прибыль</span
            ><strong
              >{{ game.offlineReport.netIncome >= 0 ? "+" : "−"
              }}{{
                formatCurrency(Math.abs(game.offlineReport.netIncome))
              }}</strong
            >
          </div>
        </div>
        <button
          class="primary-button offline-continue"
          @click="dismissOfflineReport"
        >
          Продолжить покорение <span aria-hidden="true">↗</span>
        </button>
      </section>
    </div>
  </div>
</template>
