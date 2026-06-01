/**
 * 세탁 기호 결과창 조합 로직
 * laundry_guide.py 프로토타입 기반 TypeScript 포팅
 */

import {
  SYMBOLS,
  CATEGORY_ORDER,
  STATUS_PRIORITY,
  WASH_COURSE,
  SymbolStatus,
} from './laundrySymbolData';

// ─── 타입 ────────────────────────────────────────────────

export interface StatusCounts {
  금지: number;
  주의: number;
  안전: number;
  전문케어: number;
}

export interface MainSubBody {
  main: string;
  sub: string;
  body: string;
}

export interface StepInfo {
  title: string;
  body: string;
}

export interface WarningInfo {
  code: string;
  title: string;
  severity: string;
  body: string;
}

export interface ProBanner {
  title: string;
  subTitle: string;
  body: string;
  cards: string[];
}

export type CaseType = 'case_0' | 'case_1' | 'case_2' | 'case_3';

export interface Case1SubtypeResult {
  code: string;
  main: string;
  sub: string;
}

export interface StoreDialogueItem {
  label: string;
  dialogue: string;
  badge: string;
}

// ─── labels 카테고리 순 정렬 ─────────────────────────────

export function sortLabelsByCategory(labels: string[]): string[] {
  return [...labels].sort((a, b) => {
    const sa = SYMBOLS[a];
    const sb = SYMBOLS[b];
    const ia = sa ? CATEGORY_ORDER.indexOf(sa.category) : 999;
    const ib = sb ? CATEGORY_ORDER.indexOf(sb.category) : 999;
    return ia - ib;
  });
}

// ─── 분류 / 정렬 ────────────────────────────────────────

export function categorize(detected: string[]) {
  const grouped: Record<string, string[]> = {};
  for (const c of CATEGORY_ORDER) {
    grouped[c] = [];
  }
  const proItems: string[] = [];
  const unknown: string[] = [];

  for (const label of detected) {
    const sym = SYMBOLS[label];
    if (!sym) {
      unknown.push(label);
      continue;
    }
    if (sym.isPro) {
      proItems.push(label);
    }
    grouped[sym.category].push(label);
  }
  return {grouped, proItems, unknown};
}

export function sortedForDisplay(detected: string[]): string[] {
  const catIdx: Record<string, number> = {};
  CATEGORY_ORDER.forEach((c, i) => {
    catIdx[c] = i;
  });

  const nonPro = detected.filter(l => SYMBOLS[l] && !SYMBOLS[l].isPro);
  return nonPro.sort((a, b) => {
    const sa = SYMBOLS[a];
    const sb = SYMBOLS[b];
    const pa = STATUS_PRIORITY[sa.status];
    const pb = STATUS_PRIORITY[sb.status];
    if (pa !== pb) return pa - pb;
    return catIdx[sa.category] - catIdx[sb.category];
  });
}

export function countByStatus(detected: string[]): StatusCounts {
  const counts: StatusCounts = {금지: 0, 주의: 0, 안전: 0, 전문케어: 0};
  for (const label of detected) {
    const sym = SYMBOLS[label];
    if (!sym) continue;
    if (sym.isPro) {
      counts['전문케어']++;
    } else {
      counts[sym.status]++;
    }
  }
  return counts;
}

// ─── 메인/서브 멘트 결정 트리 (8가지) ──────────────────────

export function mainSubBody(detected: string[]): MainSubBody {
  const s = new Set(detected);

  const hasDryOk = ['dry_clean_perc_normal', 'dry_clean_perc_mild', 'dry_clean_hc_normal', 'dry_clean_hc_mild']
    .some(l => s.has(l));
  const hasWetOk = ['wet_clean_normal', 'wet_clean_mild', 'wet_clean_very_mild']
    .some(l => s.has(l));
  const veryMild = [...s].some(l => l.startsWith('washing_very_mild'));
  const mild = [...s].some(l => l.startsWith('washing_mild_'));
  const normalWash = [...s].some(l => l.startsWith('washing_normal_'));
  const shade = [...s].some(l => l.endsWith('_shade'));

  // 1) 모든 세탁 금지
  if (s.has('do_not_wash') && s.has('do_not_dry_clean') && s.has('do_not_wet_clean')) {
    return {
      main: '이 옷은 빨 수 없어요',
      sub: '겉면을 살살 닦아만 주세요',
      body: '어떤 방법으로도 세탁이 불가능합니다. 표면의 먼지나 얼룩만 부드러운 천으로 가볍게 닦아내세요.',
    };
  }
  // 2) do_not_wash + dryclean 가능
  if (s.has('do_not_wash') && hasDryOk) {
    return {
      main: '드라이클리닝만 가능해요',
      sub: '세탁소에 맡겨주세요',
      body: '물세탁이 불가능한 의류입니다. 가까운 세탁소에 라벨을 보여주세요.',
    };
  }
  // 3) do_not_wash + wetclean 가능
  if (s.has('do_not_wash') && hasWetOk) {
    return {
      main: '전문 습식 세탁이 필요해요',
      sub: '웨트클리닝 세탁소에 맡겨주세요',
      body: '물세탁이 불가능한 의류입니다. 웨트클리닝 가능한 세탁소를 찾아 맡겨주세요.',
    };
  }
  // 4) 손세탁
  if (s.has('wash_by_hand')) {
    return {
      main: '손빨래해 주세요',
      sub: '세탁기에 넣지 마세요',
      body: '이 옷은 손으로 살살 빨아야 해요. 세탁기에 넣으면 옷이 망가져요.',
    };
  }
  // 5) very_mild + 건조기 금지
  if (veryMild && s.has('do_not_tumble_dry')) {
    return {
      main: '조심해서 빨아야 해요',
      sub: '손빨래나 울 코스를 추천해요',
      body: '섬세한 소재라 약한 코스로만 빨아야 해요. 건조기도 사용할 수 없어요.',
    };
  }
  // 6) very_mild + 그늘
  if (veryMild && shade) {
    return {
      main: '조심스럽게 다뤄야 해요',
      sub: '그늘에서 말리는 거 잊지 마세요',
      body: '섬세한 소재예요. 햇빛도 피해서 그늘에서 말려야 해요.',
    };
  }
  // 7) mild
  if (mild) {
    return {
      main: '약하게 빨아주세요',
      sub: '표시된 방법으로 말려주세요',
      body: '약한 코스로 빨고, 라벨에 표시된 건조 방법을 그대로 따라주세요.',
    };
  }
  // 8) normal
  if (normalWash) {
    return {
      main: '평소처럼 빨면 돼요',
      sub: '세탁기를 편하게 사용하세요',
      body: '특별한 주의사항 없이 평범하게 세탁해도 괜찮은 옷이에요.',
    };
  }

  return {
    main: '세탁 안내',
    sub: '라벨을 확인해 주세요',
    body: '인식된 기호로는 안내를 만들 수 없어요.',
  };
}

// ─── 추천 세탁 방법 5단계 ─────────────────────────────────

function spinToText(spin: string): string {
  const map: Record<string, string> = {
    '강하게': '탈수도 강하게 해도 괜찮아요',
    '약하게': '탈수는 약하게 설정하세요',
    '가장 약하게': '탈수는 가장 약하게 맞춥니다',
    '생략 권장': '탈수는 생략하는 걸 추천해요',
    '수건 감싸 누르기': '수건으로 감싸 눌러서 물기를 빼주세요',
  };
  return map[spin] || '';
}

const NATURAL_DRY_PHRASES: Record<string, string> = {
  line_dry:             '옷걸이에 걸어 자연 건조해 주세요',
  drip_line_dry:        '탈수 없이 옷걸이에 걸어 말려주세요',
  flat_dry:             '평평하게 눕혀 자연 건조해 주세요',
  drip_flat_dry:        '탈수 없이 평평하게 눕혀 말려주세요',
  line_dry_shade:       '그늘에서 옷걸이에 걸어 말려주세요',
  drip_line_dry_shade:  '탈수 없이 그늘에서 옷걸이에 걸어 말려주세요',
  flat_dry_shade:       '그늘에서 평평하게 눕혀 말려주세요',
  drip_flat_dry_shade:  '탈수 없이 그늘에서 평평하게 눕혀 말려주세요',
};

const NATURAL_DRY_PRIORITY = [
  'drip_flat_dry_shade', 'flat_dry_shade', 'drip_line_dry_shade',
  'line_dry_shade', 'drip_flat_dry', 'flat_dry',
  'drip_line_dry', 'line_dry',
];

export function buildSteps(detected: string[]): StepInfo[] {
  const s = new Set(detected);
  const steps: StepInfo[] = [];

  // 1. 세탁기 돌리기
  const washLabel = detected.find(
    l => l.startsWith('washing_') || l === 'wash_by_hand' || l === 'do_not_wash',
  );

  if (washLabel === 'do_not_wash') {
    steps.push({
      title: '세탁기 돌리기',
      body: '물세탁이 금지된 옷이에요. 가정 세탁은 진행하지 마시고 전문 세탁소에 맡겨주세요.',
    });
  } else if (washLabel === 'wash_by_hand') {
    steps.push({
      title: '세탁기 돌리기',
      body: '세면대나 큰 통에 미지근한 물(30°C 이하)과 중성세제를 풀고, 손으로 부드럽게 주물러 빨아주세요. 다 빤 후엔 수건으로 감싸 눌러 물기를 빼주세요.',
    });
  } else if (washLabel && WASH_COURSE[washLabel]) {
    const [course, temp, spin] = WASH_COURSE[washLabel];
    const spinText = spinToText(spin);
    let body = `${course}로, 물 온도는 ${temp}로 맞춰 주세요.`;
    if (spinText) {
      body += ` ${spinText}.`;
    }
    steps.push({title: '세탁기 돌리기', body});
  }

  // 2. 세제와 표백제
  if (s.has('bleach_any')) {
    steps.push({
      title: '세제와 표백제',
      body: '표백제 함께 넣어도 괜찮아요. 살균/위생 코스가 있다면 활용해도 좋아요.',
    });
  } else if (s.has('bleach_oxygen_only')) {
    steps.push({
      title: '세제와 표백제',
      body: '산소계 표백제(예: 옥시클린)만 사용해 주세요. 락스(염소계)는 절대 안 돼요.',
    });
  } else if (s.has('do_not_bleach')) {
    steps.push({
      title: '세제와 표백제',
      body: '일반 세제만 사용해 주세요. 표백제는 절대 안 돼요.',
    });
  }

  // 3. 말리기
  let dryMsg = '';
  if (s.has('tumble_dry_normal')) {
    dryMsg = '건조기 표준 코스로 돌리면 돼요.';
  } else if (s.has('tumble_dry_mild')) {
    dryMsg = "건조기 '섬세' 코스를 쓰거나, 표준 코스+'약'으로 짧게 돌려주세요.";
  } else if (s.has('do_not_tumble_dry')) {
    const natural = NATURAL_DRY_PRIORITY.find(nat => s.has(nat));
    const naturalPhrase = natural ? NATURAL_DRY_PHRASES[natural] : null;
    if (naturalPhrase) {
      dryMsg = `건조기는 사용하지 마시고, ${naturalPhrase}.`;
    } else {
      dryMsg = '건조기는 사용하지 마세요. 자연 건조 표시를 라벨에서 확인해 주세요.';
    }
  } else {
    // 건조기 기호 없이 자연건조만 있는 경우
    const natural = NATURAL_DRY_PRIORITY.find(nat => s.has(nat));
    if (natural) {
      dryMsg = NATURAL_DRY_PHRASES[natural] + '.';
    }
  }
  if (dryMsg) {
    steps.push({title: '말리기', body: dryMsg});
  }

  // 4. 다림질
  if (s.has('iron_200c')) {
    steps.push({
      title: '다림질',
      body: '다리미 점 3개(●●●), 면/고온으로 다려주세요. 분무기로 살짝 물 뿌리면 효과 좋아져요.',
    });
  } else if (s.has('iron_150c')) {
    steps.push({
      title: '다림질',
      body: '다리미 점 2개(●●), 합성/중온 설정으로 다려주세요. 얇은 천을 옷 위에 덧대고 다리면 안전해요.',
    });
  } else if (s.has('iron_110c')) {
    steps.push({
      title: '다림질',
      body: '다리미 점 1개(●), 울/저온 설정으로, 꼭 얇은 천을 덧대고 간접 다림질해 주세요.',
    });
  }

  return steps;
}

// ─── 전문 케어 별도 섹션 ──────────────────────────────────

export function proCareBanners(detected: string[]): ProBanner[] {
  const s = new Set(detected);
  const banners: ProBanner[] = [];

  const dryLabels = detected.filter(l =>
    ['dry_clean_perc_normal', 'dry_clean_perc_mild', 'dry_clean_hc_normal', 'dry_clean_hc_mild'].includes(l),
  );
  if (dryLabels.length > 0) {
    banners.push({
      title: '세탁소에 맡기세요',
      subTitle: '드라이클리닝',
      body: '이 옷은 드라이클리닝이 필요해요. 동네 세탁소에 가서 라벨을 보여주시면 돼요.',
      cards: dryLabels.map(l => SYMBOLS[l].card),
    });
  }

  const wetLabels = detected.filter(l =>
    ['wet_clean_normal', 'wet_clean_mild', 'wet_clean_very_mild'].includes(l),
  );
  if (wetLabels.length > 0) {
    banners.push({
      title: '세탁소에 맡기세요',
      subTitle: '웨트클리닝',
      body: '이 옷은 웨트클리닝(전문 물세탁)이 필요해요. 모든 세탁소에서 처리하지는 않으니, 가기 전에 전화로 확인해 주세요.',
      cards: wetLabels.map(l => SYMBOLS[l].card),
    });
  }

  return banners;
}

// ─── 주의 조합 경고 (v4: 6개, A·G는 케이스로 승격) ──────

export function detectWarnings(detected: string[]): WarningInfo[] {
  const s = new Set(detected);
  const out: WarningInfo[] = [];

  const veryMild = [...s].some(l => l.startsWith('washing_very_mild'));
  const shadeAny = [...s].some(l => l.endsWith('_shade'));
  const naturalDry = [
    'line_dry', 'drip_line_dry', 'flat_dry', 'drip_flat_dry',
    'line_dry_shade', 'drip_line_dry_shade', 'flat_dry_shade', 'drip_flat_dry_shade',
  ].some(l => s.has(l));

  // B. very_mild + iron_200c/150c
  if (veryMild && (s.has('iron_200c') || s.has('iron_150c'))) {
    out.push({
      code: 'B', title: '섬세한데 다림질 온도가 높음', severity: '심각도 중간',
      body: '이 옷은 섬세하게 빨아야 하는데, 다림질 온도는 의외로 높아요. 다리기 전에 라벨을 다시 한번 확인하시고, 혼방 소재라면 가장 약한 섬유 기준으로 온도를 한 단계 낮춰 다리는 게 안전해요.',
    });
  }
  // C. bleach_any + very_mild
  if (s.has('bleach_any') && veryMild) {
    out.push({
      code: 'C', title: '표백 가능한데 섬세한 옷', severity: '심각도 중간',
      body: '표백제는 써도 되지만, 옷 자체가 예민해요. 표백제를 쓸 때는 적은 양을 물에 미리 풀어서 사용하세요. 옷에 직접 붓지는 마시고, 세제 투입구에 넣어주는 게 좋아요.',
    });
  }
  // D. tumble + very_mild
  if (veryMild && (s.has('tumble_dry_normal') || s.has('tumble_dry_mild'))) {
    out.push({
      code: 'D', title: '건조기 OK인데 섬세한 옷', severity: '심각도 중간',
      body: "섬세한 옷이지만 건조기는 사용해도 돼요. 단, 꼭 '섬세' 코스로 짧게 돌리고, 건조 중간에 한 번 꺼내 모양을 확인해 주세요. 너무 오래 돌리면 옷이 줄어들어요.",
    });
  }
  // E. 자연 건조 + do_not_iron
  if (naturalDry && s.has('do_not_iron')) {
    out.push({
      code: 'E', title: '자연 건조인데 다림질도 안 됨', severity: '심각도 낮음',
      body: '다 마른 다음에 다림질로 주름을 펼 수가 없어요. 빨래 후 옷 모양을 손으로 가지런히 정돈한 다음 펴서 말려주세요. 주름 없이 마르게 하는 게 최선이에요.',
    });
  }
  // F. 그늘 계열
  if (shadeAny) {
    out.push({
      code: 'F', title: '그늘에서 말려야 함 (햇빛 주의)', severity: '심각도 낮음',
      body: '햇빛 아래 두면 색이 바랠 수 있어요. 실내나 그늘진 곳에서 말려주세요. 형광등 아래는 괜찮아요.',
    });
  }
  // H. do_not_bleach + 60°C 이상 일반 세탁
  if (s.has('do_not_bleach') && (s.has('washing_normal_95') || s.has('washing_normal_60'))) {
    out.push({
      code: 'H', title: '표백 안 되는데 고온 세탁', severity: '심각도 낮음',
      body: '뜨거운 물로 빨아도 되지만, 표백제는 안 돼요. 평소 쓰는 세제에 표백 성분이 들어있지는 않은지 라벨을 한 번 확인해 주세요.',
    });
  }

  return out;
}

// ─── 상태별 색상/텍스트 ──────────────────────────────────

export type StateType = 'safe' | 'caution' | 'forbidden' | 'pro';

export function statusToState(status: SymbolStatus, isPro: boolean): StateType {
  if (isPro) return 'pro';
  switch (status) {
    case '안전': return 'safe';
    case '주의': return 'caution';
    case '금지': return 'forbidden';
  }
}

export const STATE_COLORS: Record<StateType, {border: string; bg: string; tag: string}> = {
  safe:      {border: '#2d8d6f', bg: '#e8f3ee', tag: '안전'},
  caution:   {border: '#d97a2a', bg: '#fdf3e7', tag: '주의'},
  forbidden: {border: '#c8472b', bg: '#fbe8e3', tag: '금지'},
  pro:       {border: '#2e4a73', bg: '#eef2f7', tag: '전문케어'},
};

export function getOverallState(counts: StatusCounts, detected?: string[]): StateType {
  // v4 3케이스 분기: 물세탁 금지인 경우만 forbidden
  // 표백/건조기/다림질 금지는 집에서 빨 수 있으므로 caution
  if (detected) {
    const s = new Set(detected);
    if (s.has('do_not_wash')) return 'forbidden';
  } else {
    // detected 없이 호출된 경우 기존 로직
    if (counts['금지'] > 0) return 'forbidden';
  }
  if (counts['금지'] > 0 || counts['주의'] > 0) return 'caution';
  return 'safe';
}

// ─── v4 3-Case 분기 모델 ────────────────────────────────

const PRO_OK_LABELS = [
  'dry_clean_perc_normal', 'dry_clean_perc_mild',
  'dry_clean_hc_normal', 'dry_clean_hc_mild',
  'wet_clean_normal', 'wet_clean_mild', 'wet_clean_very_mild',
];

const DRY_OK_LABELS = [
  'dry_clean_perc_normal', 'dry_clean_perc_mild',
  'dry_clean_hc_normal', 'dry_clean_hc_mild',
];

const WET_OK_LABELS = [
  'wet_clean_normal', 'wet_clean_mild', 'wet_clean_very_mild',
];

/**
 * 케이스 판정 (우선순위: 0 → 2 → 3 → 1)
 * case_0: 모두 금지 (못 빨아요)
 * case_1: 집에서 빨기
 * case_2: 세탁소만
 * case_3: 선택 가능 (집에서 + 세탁소)
 */
export function classifyCase(detected: string[]): CaseType {
  const s = new Set(detected);

  const waterOk = (
    [...s].some(l => l.startsWith('washing_')) || s.has('wash_by_hand')
  ) && !s.has('do_not_wash');
  const waterNo = s.has('do_not_wash');
  const dryNo = s.has('do_not_dry_clean');
  const wetNo = s.has('do_not_wet_clean');
  const proOk = PRO_OK_LABELS.some(l => s.has(l));

  // 1) 모두 금지
  if (waterNo && dryNo && wetNo) return 'case_0';
  // 2) 물세탁 금지 + 전문케어 가능
  if (waterNo && proOk) return 'case_2';
  // 3) 물세탁 가능 + 전문케어 가능
  if (waterOk && proOk) return 'case_3';
  // 4) 그 외
  return 'case_1';
}

/**
 * 케이스 1 하위 분기 (1a~1e)
 */
export function case1Subtype(detected: string[]): Case1SubtypeResult {
  const s = new Set(detected);
  const veryMild = [...s].some(l => l.startsWith('washing_very_mild'));
  const mild = [...s].some(l => l.startsWith('washing_mild_'));
  const shade = [...s].some(l => l.endsWith('_shade'));

  // 1a — 손세탁
  if (s.has('wash_by_hand')) {
    return {code: '1a', main: '손빨래 해주세요', sub: '세탁기에 넣지 마세요'};
  }
  // 1b — 아주 약한 세탁 + 건조기 금지
  if (veryMild && s.has('do_not_tumble_dry')) {
    return {code: '1b', main: '조심해서 빨아야 해요', sub: '울/란제리 코스를 추천해요'};
  }
  // 1c — 아주 약한 세탁 + 그늘 건조
  if (veryMild && shade) {
    return {code: '1c', main: '조심스럽게 다뤄야 해요', sub: '그늘에서 말리는 거 잊지 마세요'};
  }
  // 1d — 약한 세탁
  if (mild || veryMild) {
    return {code: '1d', main: '약하게 빨아주세요', sub: '표시된 방법으로 말려주세요'};
  }
  // 1e — 일반 세탁
  return {code: '1e', main: '집에서 빨아도 되는 옷이에요', sub: '표시된 조건만 맞춰서 평소처럼 빨면 돼요'};
}

// ─── 세탁소 대사 매핑 ───────────────────────────────────

export const STORE_DIALOGUE: Record<string, string> = {
  dry_clean_perc_normal: '드라이클리닝 해주세요',
  dry_clean_perc_mild: '섬세 드라이클리닝으로 약하게 해주세요',
  dry_clean_hc_normal: 'F 표시예요. 탄화수소계 용제로 드라이클리닝 해주세요',
  dry_clean_hc_mild: 'F 표시예요. 약하게 처리해 주세요 (명품 전문점 권장)',
  wet_clean_normal: '웨트클리닝 가능한가요? 가능하다면 웨트클리닝 해주세요',
  wet_clean_mild: '웨트클리닝으로 약하게 처리해 주세요',
  wet_clean_very_mild: '웨트클리닝으로 매우 약하게 해주세요 (명품 전문점)',
};

export const STORE_BADGE: Record<string, string> = {
  dry_clean_perc_normal: 'ⓟ 동그라미 표시',
  dry_clean_perc_mild: 'ⓟ 동그라미 + 밑줄',
  dry_clean_hc_normal: 'Ⓕ 동그라미 표시',
  dry_clean_hc_mild: 'Ⓕ 동그라미 + 밑줄',
  wet_clean_normal: 'Ⓦ 동그라미 표시',
  wet_clean_mild: 'Ⓦ 동그라미 + 밑줄',
  wet_clean_very_mild: 'Ⓦ 동그라미 + 밑줄 두 개',
};

export function getStoreDialogues(detected: string[]): StoreDialogueItem[] {
  const out: StoreDialogueItem[] = [];
  for (const label of detected) {
    if (STORE_DIALOGUE[label]) {
      out.push({
        label,
        dialogue: STORE_DIALOGUE[label],
        badge: STORE_BADGE[label] || '',
      });
    }
  }
  return out;
}

/**
 * 케이스 1/3에서 드라이클리닝/웨트클리닝 가능 여부 확인
 */
export function hasProOption(detected: string[]): {hasDry: boolean; hasWet: boolean} {
  const s = new Set(detected);
  return {
    hasDry: DRY_OK_LABELS.some(l => s.has(l)),
    hasWet: WET_OK_LABELS.some(l => s.has(l)),
  };
}
