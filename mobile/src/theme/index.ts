export const colors = {
  bg: {
    base: '#000000',
    surface: '#0A0A0A',
    card: '#111111',
    elevated: '#1A1A1A',
    overlay: '#000000',
    blur: 'rgba(10, 10, 10, 0.75)',
  },
  border: {
    subtle: '#1F1F1F',
    default: '#2A2A2A',
    strong: '#333333',
    accent: '#5E5E5E',
  },
  brand: {
    primary: '#FFFFFF',
    primaryLight: '#FFFFFF',
    primaryDark: '#CCCCCC',
    secondary: '#888888',
    gold: '#F2C94C',
    gradient: ['#2C2C2C', '#1A1A1A'] as [string, string],
    hero: ['#1A1A1A', '#000000'] as [string, string],
  },
  success: {
    base: '#27AE60',
    muted: '#27AE6018',
    border: '#27AE6036',
  },
  warning: {
    base: '#F2C94C',
    muted: '#F2C94C18',
    border: '#F2C94C36',
  },
  danger: {
    base: '#EB5757',
    muted: '#EB575718',
    border: '#EB575734',
  },
  info: {
    base: '#2D9CDB',
    muted: '#2D9CDB18',
    border: '#2D9CDB36',
  },
  text: {
    primary: '#FFFFFF',
    secondary: '#A0A0A0',
    tertiary: '#666666',
    disabled: '#444444',
    inverse: '#000000',
  },
  roles: {
    owner: '#E7B15F',
    manager: '#8266FF',
    employee: '#33D7A3',
  },
  status: {
    SCHEDULED: '#8266FF',
    ACTIVE: '#33D7A3',
    COMPLETED: '#6F7A99',
    CANCELLED: '#FF6B73',
  },
} as const;

export const gradients = {
  page: ['#000000', '#050505', '#000000'] as [string, string, string],
  card: ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.01)'] as [string, string],
  glass: ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)'] as [string, string],
  success: ['rgba(39,174,96,0.15)', 'rgba(39,174,96,0.03)'] as [string, string],
  warning: ['rgba(242,201,76,0.15)', 'rgba(242,201,76,0.03)'] as [string, string],
  danger: ['rgba(235,87,87,0.15)', 'rgba(235,87,87,0.03)'] as [string, string],
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
  xxxl: 48,
  xxxxl: 56,
  section: 64,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  full: 999,
} as const;

export const typography = {
  display: { fontSize: 36, fontWeight: '800' as const, letterSpacing: -1.6 },
  h1: { fontSize: 30, fontWeight: '800' as const, letterSpacing: -1.1 },
  h2: { fontSize: 24, fontWeight: '700' as const, letterSpacing: -0.7 },
  h3: { fontSize: 18, fontWeight: '700' as const, letterSpacing: -0.3 },
  h4: { fontSize: 16, fontWeight: '600' as const, letterSpacing: -0.1 },
  body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 23 },
  bodySmall: { fontSize: 13, fontWeight: '400' as const, lineHeight: 19 },
  label: { fontSize: 11, fontWeight: '700' as const, letterSpacing: 0.9, textTransform: 'uppercase' as const },
  caption: { fontSize: 12, fontWeight: '500' as const, letterSpacing: 0.2 },
} as const;

export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.28,
    shadowRadius: 32,
    elevation: 14,
  },
  soft: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 8,
  },
  glow: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 10,
  }),
} as const;

export const roleAppearance = {
  owner: {
    color: colors.roles.owner,
    gradient: ['#E7B15F', '#B9813E'] as [string, string],
  },
  manager: {
    color: colors.roles.manager,
    gradient: ['#9B8BFF', '#6D5AF8'] as [string, string],
  },
  employee: {
    color: colors.roles.employee,
    gradient: ['#33D7A3', '#1CA677'] as [string, string],
  },
} as const;

export const statusAppearance = {
  SCHEDULED: { color: colors.status.SCHEDULED, tint: 'rgba(130,102,255,0.14)' },
  ACTIVE: { color: colors.status.ACTIVE, tint: 'rgba(51,215,163,0.14)' },
  COMPLETED: { color: colors.status.COMPLETED, tint: 'rgba(111,122,153,0.18)' },
  CANCELLED: { color: colors.status.CANCELLED, tint: 'rgba(255,107,115,0.14)' },
} as const;

export const anomalyAppearance = {
  HIGH: { color: colors.danger.base, tint: colors.danger.muted },
  MEDIUM: { color: colors.warning.base, tint: colors.warning.muted },
  LOW: { color: colors.info.base, tint: colors.info.muted },
} as const;

export const peoplePalette = ['#9B8BFF', '#33D7A3', '#E7B15F', '#7FC5FF', '#FF6B73'] as const;

export const layout = {
  screenPaddingH: 20,
  screenPaddingTop: 12,
  cardGap: 12,
  sectionGap: 24,
} as const;
