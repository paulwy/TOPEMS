import i18n from '@/i18n';

export type Period = 'MTD' | 'QTD' | 'YTD' | 'ROLLING_12M';

export interface CrmKpis {
  customers: number;
  openOpps: number;
  winRate: number;
  newSignedMtd: number;
  activeContacts: number;
  pendingReturns: number;
}

export interface FunnelStage {
  stage: string;
  count: number;
  amount: number;
  avgValue?: number;
  probability?: number;
}

export interface ForecastPoint {
  month: string;
  value: number;
}

export interface ForecastSeries {
  actual: ForecastPoint[];
  weightedPipeline: ForecastPoint[];
  target: ForecastPoint[];
}

export interface ScoreBuckets {
  A: number;
  B: number;
  C: number;
  D: number;
}

export interface RfmBuckets {
  recencyHigh: number;
  recencyMedium: number;
  recencyLow: number;
  frequencyHigh: number;
  frequencyMedium: number;
  frequencyLow: number;
  monetaryHigh: number;
  monetaryMedium: number;
  monetaryLow: number;
}

export interface SegmentPoint {
  id: string;
  name: string;
  value: number;
  activity: number;
  size: number;
}

export interface BillingTopItem {
  customerName: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue';
}

export interface BillingStatusSlice {
  status: string;
  count: number;
  amount: number;
}

export interface AgingBucket {
  bucket: string;
  count: number;
  amount: number;
}

interface RecommendationItem {
  id: string;
  customerName: string;
  type: 'cross-sell' | 'upsell' | 'followup';
  title: string;
  reason: string;
  confidence: number;
  expectedValue: number;
}

export interface DashboardData {
  kpis: CrmKpis;
  funnel: FunnelStage[];
  forecastSeries: ForecastSeries;
  buckets: ScoreBuckets;
}

export interface FunnelData {
  stages: FunnelStage[];
  metrics: {
    totalOpportunities: number;
    totalValue: number;
    avgValue: number;
    conversionRate: number;
    weightedValue: number;
  };
}

export interface ScoringData {
  distribution: ScoreBuckets;
  rfm: RfmBuckets;
  trend: { period: string; avgScore: number }[];
}

export interface ForecastData {
  series: ForecastSeries;
  summary: {
    totalPredicted: number;
    totalActual: number;
    averageConfidence: number;
    completedCount: number;
  };
}

export interface SegmentationData {
  quadrants: SegmentPoint[];
  summary: {
    totalSegments: number;
    coveredCustomers: number;
    avgCustomers: number;
  };
}

export interface BillingAnalyticsData {
  top10: BillingTopItem[];
  statusPie: BillingStatusSlice[];
  agingBuckets: AgingBucket[];
  summary: {
    totalAmount: number;
    paidAmount: number;
    pendingAmount: number;
    overdueAmount: number;
    totalCount: number;
    paidCount: number;
    pendingCount: number;
    overdueCount: number;
  };
}

export interface RecommendationData {
  crossSell: RecommendationItem[];
  upsell: RecommendationItem[];
  followup: RecommendationItem[];
}

export type CrmMockShape = {
  dashboard: DashboardData;
  funnel: FunnelData;
  scoring: ScoringData;
  forecast: ForecastData;
  segmentation: SegmentationData;
  billing: BillingAnalyticsData;
  recommendation: RecommendationData;
};

function mulberry32(seed: number) {
  let t = seed;
  return function () {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function periodMonths(period: Period): number {
  switch (period) {
    case 'MTD':
      return 1;
    case 'QTD':
      return 3;
    case 'YTD':
      return 12;
    case 'ROLLING_12M':
      return 12;
  }
}

function buildKpis(rnd: () => number, pm: number): CrmKpis {
  const scale = pm / 1;
  return {
    customers: Math.floor(120 * scale + rnd() * 10),
    openOpps: Math.floor(40 * scale + rnd() * 8),
    winRate: 0.35 + rnd() * 0.15,
    newSignedMtd: Math.floor(2_380_000 * scale + rnd() * 500_000),
    activeContacts: Math.floor(60 * scale + rnd() * 15),
    pendingReturns: Math.floor(18 * scale + rnd() * 5),
  };
}

function buildFunnel(rnd: () => number): FunnelStage[] {
  const stages = ['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost', 'closed'];
  const probs = [0.15, 0.3, 0.5, 0.7, 0.9, 0.8, 0.85];
  const baseCounts = [40, 32, 26, 18, 10, 8, 6];
  return stages.map((s, i) => {
    const count = Math.floor(baseCounts[i] + rnd() * 10);
    const amount = Math.floor((500_000 + rnd() * 1_500_000) * (count / 40));
    return {
      stage: s,
      count,
      amount,
      avgValue: count > 0 ? Math.floor(amount / count) : 0,
      probability: Math.floor(probs[i] * 100),
    };
  });
}

function buildForecastSeries(rnd: () => number, pm: number): ForecastSeries {
  const count = Math.max(pm, 3);
  const months: string[] = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return {
    actual: months.map((m, i) => ({
      month: m,
      value: Math.floor(200 + rnd() * 200 + i * 8),
    })),
    weightedPipeline: months.map((m, i) => ({
      month: m,
      value: Math.floor(280 + rnd() * 220 + i * 10),
    })),
    target: months.map((m, i) => ({
      month: m,
      value: 300 + i * 15,
    })),
  };
}

function buildScoreBuckets(rnd: () => number): ScoreBuckets {
  return {
    A: Math.floor(10 + rnd() * 10),
    B: Math.floor(30 + rnd() * 20),
    C: Math.floor(45 + rnd() * 25),
    D: Math.floor(8 + rnd() * 10),
  };
}

function buildRfmBuckets(rnd: () => number): RfmBuckets {
  return {
    recencyHigh: Math.floor(30 + rnd() * 20),
    recencyMedium: Math.floor(45 + rnd() * 25),
    recencyLow: Math.floor(25 + rnd() * 20),
    frequencyHigh: Math.floor(25 + rnd() * 20),
    frequencyMedium: Math.floor(50 + rnd() * 25),
    frequencyLow: Math.floor(25 + rnd() * 20),
    monetaryHigh: Math.floor(20 + rnd() * 15),
    monetaryMedium: Math.floor(55 + rnd() * 25),
    monetaryLow: Math.floor(25 + rnd() * 20),
  };
}

function buildSegmentationPoints(rnd: () => number): SegmentPoint[] {
  const names = [
    i18n.t('shared._mock.k0'),
    i18n.t('shared._mock.k1'),
    i18n.t('shared._mock.k2'),
    i18n.t('shared._mock.k3'),
    i18n.t('shared._mock.k4'),
    i18n.t('shared._mock.k5'),
    i18n.t('shared._mock.k6'),
    i18n.t('shared._mock.k7'),
  ];
  return names.map((name, i) => {
    const quadrant = i % 4;
    let value = 30 + rnd() * 30;
    let activity = 30 + rnd() * 30;
    if (quadrant === 0) {
      value = 70 + rnd() * 25;
      activity = 70 + rnd() * 25;
    } else if (quadrant === 1) {
      value = 70 + rnd() * 25;
      activity = 20 + rnd() * 25;
    } else if (quadrant === 2) {
      value = 20 + rnd() * 25;
      activity = 70 + rnd() * 25;
    } else {
      value = 20 + rnd() * 25;
      activity = 20 + rnd() * 25;
    }
    return {
      id: `seg-${i + 1}`,
      name,
      value: Math.round(value),
      activity: Math.round(activity),
      size: Math.floor(8 + rnd() * 32),
    };
  });
}

function buildBillingAnalytics(rnd: () => number): BillingAnalyticsData {
  const customerNames = [
    i18n.t('shared._mock.k8'),
    i18n.t('shared._mock.k9'),
    i18n.t('shared._mock.k10'),
    i18n.t('shared._mock.k11'),
    i18n.t('shared._mock.k12'),
    i18n.t('shared._mock.k13'),
    i18n.t('shared._mock.k14'),
    i18n.t('shared._mock.k15'),
    i18n.t('shared._mock.k16'),
    i18n.t('shared._mock.k17'),
  ];
  const statuses: Array<'paid' | 'pending' | 'overdue'> = ['paid', 'pending', 'overdue'];
  const top10: BillingTopItem[] = customerNames.map((cn, i) => ({
    customerName: cn,
    amount: Math.floor(200_000 + rnd() * 1_800_000),
    status: statuses[i % 3],
  }));
  top10.sort((a, b) => b.amount - a.amount);

  const statusPie: BillingStatusSlice[] = [
    {
      status: 'paid',
      count: Math.floor(55 + rnd() * 20),
      amount: Math.floor(5_500_000 + rnd() * 2_000_000),
    },
    {
      status: 'pending',
      count: Math.floor(25 + rnd() * 15),
      amount: Math.floor(2_200_000 + rnd() * 1_000_000),
    },
    {
      status: 'overdue',
      count: Math.floor(8 + rnd() * 10),
      amount: Math.floor(600_000 + rnd() * 500_000),
    },
  ];

  const agingBuckets: AgingBucket[] = [
    {
      bucket: i18n.t('shared._mock.030_0'),
      count: Math.floor(25 + rnd() * 15),
      amount: Math.floor(1_800_000 + rnd() * 800_000),
    },
    {
      bucket: i18n.t('shared._mock.3160_1'),
      count: Math.floor(12 + rnd() * 10),
      amount: Math.floor(900_000 + rnd() * 500_000),
    },
    {
      bucket: i18n.t('shared._mock.6190_2'),
      count: Math.floor(6 + rnd() * 8),
      amount: Math.floor(450_000 + rnd() * 350_000),
    },
    {
      bucket: i18n.t('shared._mock.90_3'),
      count: Math.floor(4 + rnd() * 6),
      amount: Math.floor(300_000 + rnd() * 300_000),
    },
  ];

  const totalAmount = statusPie.reduce((s, x) => s + x.amount, 0);
  const paidAmount = statusPie.find((x) => x.status === 'paid')?.amount ?? 0;
  const pendingAmount = statusPie.find((x) => x.status === 'pending')?.amount ?? 0;
  const overdueAmount = statusPie.find((x) => x.status === 'overdue')?.amount ?? 0;
  const totalCount = statusPie.reduce((s, x) => s + x.count, 0);
  const paidCount = statusPie.find((x) => x.status === 'paid')?.count ?? 0;
  const pendingCount = statusPie.find((x) => x.status === 'pending')?.count ?? 0;
  const overdueCount = statusPie.find((x) => x.status === 'overdue')?.count ?? 0;

  return {
    top10,
    statusPie,
    agingBuckets,
    summary: {
      totalAmount,
      paidAmount,
      pendingAmount,
      overdueAmount,
      totalCount,
      paidCount,
      pendingCount,
      overdueCount,
    },
  };
}

function buildRecommendations(rnd: () => number): RecommendationData {
  const customers = [
    i18n.t('shared._mock.k18'),
    i18n.t('shared._mock.k19'),
    i18n.t('shared._mock.k20'),
    i18n.t('shared._mock.k21'),
    i18n.t('shared._mock.k22'),
    i18n.t('shared._mock.k23'),
  ];
  const crossSellProducts = [
    i18n.t('shared._mock.k24'),
    i18n.t('shared._mock.k25'),
    i18n.t('shared._mock.k26'),
    i18n.t('shared._mock.k27'),
    i18n.t('shared._mock.k28'),
    i18n.t('shared._mock.k29'),
  ];
  const upsellProducts = [
    i18n.t('shared._mock.k30'),
    i18n.t('shared._mock.k31'),
    i18n.t('shared._mock.k32'),
    i18n.t('shared._mock.ai_33'),
    i18n.t('shared._mock.mes_4'),
    i18n.t('shared._mock.sap_5'),
  ];
  const followupTopics = [
    i18n.t('shared._mock.q3_6'),
    i18n.t('shared._mock.k34'),
    i18n.t('shared._mock.k35'),
    i18n.t('shared._mock.k36'),
    i18n.t('shared._mock.k37'),
    i18n.t('shared._mock.k38'),
  ];

  const makeItem = (
    i: number,
    type: 'cross-sell' | 'upsell' | 'followup',
    pool: string[]
  ): RecommendationItem => ({
    id: `rec-${type}-${i}`,
    customerName: customers[i % customers.length],
    type,
    title: pool[i % pool.length],
    reason:
      type === 'cross-sell'
        ? i18n.t('shared._mock.k39')
        : type === 'upsell'
          ? i18n.t('shared._mock.k40')
          : i18n.t('shared._mock.k41'),
    confidence: 0.55 + rnd() * 0.4,
    expectedValue: Math.floor(50_000 + rnd() * 450_000),
  });

  return {
    crossSell: Array.from({ length: 6 }, (_, i) => makeItem(i, 'cross-sell', crossSellProducts)),
    upsell: Array.from({ length: 6 }, (_, i) => makeItem(i, 'upsell', upsellProducts)),
    followup: Array.from({ length: 6 }, (_, i) => makeItem(i, 'followup', followupTopics)),
  };
}

export function useCrmMock<T = unknown>(
  config: {
    seed?: number;
    period?: Period;
    locale?: 'zh-CN' | 'en-US';
  } = {}
): { data: T; mockEnabled: boolean; refresh: () => void } {
  const seed = config.seed ?? 42;
  const period = config.period ?? 'MTD';
  const envEnable =
    typeof import.meta !== 'undefined' &&
    (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_ENABLE_CRM_MOCK ===
      'true';
  const demoEnable =
    typeof window !== 'undefined' &&
    (window as unknown as { topemsDemo?: boolean }).topemsDemo === true;
  const envDisable =
    typeof import.meta !== 'undefined' &&
    (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_CRM_DISABLE_MOCK ===
      'true';
  const mockEnabled = (envEnable || demoEnable) && !envDisable;

  const pm = periodMonths(period);
  const rnd = mulberry32(seed + pm * 7919 + period.length);

  const kpis = buildKpis(rnd, pm);
  const funnel = buildFunnel(rnd);
  const forecastSeries = buildForecastSeries(rnd, pm);
  const buckets = buildScoreBuckets(rnd);

  const funnelMetrics: FunnelData['metrics'] = {
    totalOpportunities: funnel.reduce((s, x) => s + x.count, 0),
    totalValue: funnel.reduce((s, x) => s + x.amount, 0),
    avgValue:
      funnel.reduce((s, x) => s + x.count, 0) > 0
        ? Math.floor(
            funnel.reduce((s, x) => s + x.amount, 0) / funnel.reduce((s, x) => s + x.count, 0)
          )
        : 0,
    conversionRate:
      funnel[0]?.count > 0
        ? Math.round(((funnel[4]?.count ?? 0) / funnel[0].count) * 1000) / 10
        : 0,
    weightedValue: funnel.reduce(
      (s, x) => s + Math.floor(x.amount * ((x.probability ?? 0) / 100)),
      0
    ),
  };

  const scoringTrend: ScoringData['trend'] = Array.from({ length: Math.min(pm, 6) }, (_, i) => ({
    period: `P${i + 1}`,
    avgScore: Math.floor(58 + rnd() * 18),
  }));

  const summary = {
    totalPredicted: forecastSeries.weightedPipeline.reduce((s, x) => s + x.value * 10_000, 0),
    totalActual: forecastSeries.actual.reduce((s, x) => s + x.value * 10_000, 0),
    averageConfidence: 72 + Math.floor(rnd() * 12),
    completedCount: Math.floor(forecastSeries.actual.length * (0.55 + rnd() * 0.2)),
  };

  const quadrants = buildSegmentationPoints(rnd);
  const segSummary = {
    totalSegments: quadrants.length,
    coveredCustomers: quadrants.reduce((s, x) => s + x.size, 0),
    avgCustomers: Math.round(quadrants.reduce((s, x) => s + x.size, 0) / quadrants.length),
  };

  const billing = buildBillingAnalytics(rnd);
  const recommendations = buildRecommendations(rnd);

  const allData: CrmMockShape = {
    dashboard: { kpis, funnel, forecastSeries, buckets },
    funnel: { stages: funnel, metrics: funnelMetrics },
    scoring: { distribution: buckets, rfm: buildRfmBuckets(rnd), trend: scoringTrend },
    forecast: { series: forecastSeries, summary },
    segmentation: { quadrants, summary: segSummary },
    billing,
    recommendation: recommendations,
  };

  return {
    data: allData as unknown as T,
    mockEnabled,
    refresh: () => {},
  };
}

export default useCrmMock;
