/**
 * v4 Final 디자인 토큰 — 정제 톤
 * Deep Forest · Deep Ocean · Sharp Black
 * Linear/토스 미니멀 무드, 그라데이션 X, hairline border
 */

export const Colors = {
  // ── 케이스별 진단 카드 (그라데이션 제거, 단색) ──
  case1: {
    bg:      '#DDE9DC',
    bgFrom:  '#DDE9DC',
    bgTo:    '#DDE9DC',
    text:    '#1F4029',
    textSub: '#1B5E3F',
  },
  case3: {
    bg:      '#ECE2D0',
    bgFrom:  '#ECE2D0',
    bgTo:    '#ECE2D0',
    text:    '#3D2F1E',
    textSub: '#8B6F45',
  },
  case2: {
    bg:      '#3D3A6B',
    text:    '#FFFFFF',
    textSub: 'rgba(255,255,255,0.78)',
  },
  case0: {
    bg:   '#E8E4DC',
    text: '#2C2520',
  },

  // ── CTA ──
  ctaGreen: '#1B5E3F',   // Deep Forest
  ctaBlue:  '#1E3A5F',   // Deep Ocean
  ctaBlack: '#0F0F0D',   // Sharp Black

  // ── 강조 ──
  warningBg:     '#FBE5E2',
  warningText:   '#7A1F1F',
  warningStrong: '#5C1414',
  warningBorder: '#F2C9C5',

  // ── 옷장 카드 칩 (상태) ──
  chipSafe:      { bg: '#E2EBDF', text: '#2C5F3D' },
  chipCaution:   { bg: '#F3E8D0', text: '#7E5418' },
  chipForbidden: { bg: '#F2DAD5', text: '#7E2A26' },
  chipPro:       { bg: '#DAE2EE', text: '#2C4D75' },

  // ── 옷장 케이스 알약 ──
  pillCase1: { bg: '#CDDFCB', text: '#1F4029' },
  pillCase3: { bg: '#E5D6B8', text: '#3D2F1E' },
  pillCase2: { bg: '#0F0F0D', text: '#FFFFFF' },
  pillCase0: { bg: '#D5D1C9', text: '#2C2520' },

  // ── 케이스 그룹 아이콘 배경 (옷장 헤더) ──
  caseIcon1: '#1B5E3F',
  caseIcon2: '#3D3A6B',
  caseIcon3: '#8B6F45',
  caseIcon0: '#9A968D',

  // ── 중립 ──
  bg:           '#F4F2EE',  // warm off-white
  surface:      '#FFFFFF',
  surfaceAlt:   '#FAF8F4',
  border:       '#E8E4DC',
  borderStrong: '#C9C5BB',
  textPrimary:  '#0F0F0D',
  textSecondary:'#5E5C55',
  textMuted:    '#9A968D',
  textDim:      '#C4C0B7',
  placeholder:  '#B5B1A9',

  // ── 카메라 ──
  cameraOverlay:'rgba(0,0,0,0.55)',
  cameraGuide:  'rgba(255,255,255,0.85)',

  // ── 분석 탭 bbox 팔레트 (시그니처 색 활용) ──
  bboxPalette: [
    '#7A1F1F',   // warning red
    '#1B5E3F',   // deep forest
    '#1E3A5F',   // deep ocean
    '#8B6F45',   // sand
    '#3D3A6B',   // indigo
    '#2C5F3D',   // sage
    '#7E5418',   // caramel
    '#5C1414',   // burgundy
  ],
} as const;

export const Radius = {
  sm: 8,
  md: 14,
  lg: 20,
  pill: 999,
} as const;

export const Spacing = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  xxl: 40,
} as const;

export const Typography = {
  titleXl: { fontSize: 32, fontWeight: '800' as const, letterSpacing: -0.7 },
  titleLg: { fontSize: 24, fontWeight: '800' as const, letterSpacing: -0.5 },
  titleMd: { fontSize: 18, fontWeight: '700' as const, letterSpacing: -0.3 },
  body:    { fontSize: 14, fontWeight: '400' as const, lineHeight: 22 },
  bodyBold:{ fontSize: 14, fontWeight: '700' as const, lineHeight: 22 },
  caption: { fontSize: 12, fontWeight: '400' as const, lineHeight: 17 },
  button:  { fontSize: 16, fontWeight: '700' as const },
} as const;

export const Shadow = {
  card: {
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },
  cta: {
    elevation: 3,
    shadowColor: '#1B5E3F',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
  },
} as const;
