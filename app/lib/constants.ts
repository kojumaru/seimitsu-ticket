/**
 * Design system colors
 */
export const COLORS = {
  darkRed: "#6B1F3A",
  mediumRed: "#8E2D47",
  lightRed: "#B54560",
  cream: "#F2E7E0",
  bgRed: "#A64C60",
} as const;

/**
 * Configuration values
 */
export const CONFIG = {
  firebase: {
    ticketsCollection: "tickets",
  },
  line: {
    liffUrlBase: "https://liff.line.me/2009242984-XYO590kr",
  },
  pattern: {
    notchSize: 6,
    notchSpacing: 12,
    checkerSize: 32,
  },
} as const;

/**
 * Default values
 */
export const DEFAULTS = {
  timePerPerson: 5, // minutes
  distributionEnabled: true,
} as const;

/**
 * UI text messages
 */
export const MESSAGES = {
  loading: "取得中",
  servingLabel: "現在案内中:",
  noTicketRequired: "現在整理券不要で案内中です",
  serving: "案内中",
  scanQR: "カメラで読み取ってね！",
  ticketDeadlineInfo: "※終了時刻30分前に整理券呼び出しは終了します",
  waitTimeLabel: "待ち時間目安:",
  minutes: "分",
  ticketDistributionTitle: "整理券配布中",
  ticketDistributionSubtitle: "カメラでQRコードをスキャンしてゲットしよう！",
} as const;
