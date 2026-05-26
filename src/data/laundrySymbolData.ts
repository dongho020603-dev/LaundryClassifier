/**
 * 세탁 기호 결과창 데이터 — v3 사용자 친화 어투
 * laundry_guide.py 프로토타입 기반 TypeScript 포팅
 */

export type SymbolStatus = '안전' | '주의' | '금지';

export interface SymbolInfo {
  category: string;
  status: SymbolStatus;
  isPro: boolean;
  card: string;
  value: string;
  interp: string;
  recommend: string | null;
  warning: string | null;
}

export const SYMBOLS: Record<string, SymbolInfo> = {
  // --- 1. 물세탁 (11) ---
  washing_normal_95: {
    category: '세탁', status: '안전', isPro: false,
    card: '95°C 일반 세탁', value: '95°C 일반',
    interp: '아주 뜨거운 물(최고 95°C)로 빡빡하게 세탁할 수 있어요. 면이나 린넨처럼 열에 강한 소재라 가능합니다.',
    recommend: '세탁기 표준 코스로 돌리고, 물 온도는 60~95°C 사이로 맞추면 돼요. 탈수도 강하게 해도 괜찮아요.',
    warning: null,
  },
  washing_normal_60: {
    category: '세탁', status: '안전', isPro: false,
    card: '60°C 일반 세탁', value: '60°C 일반',
    interp: '따뜻한 물(최고 60°C)로 평범하게 세탁할 수 있어요. 속옷이나 수건처럼 위생 세탁이 필요한 옷에 좋습니다.',
    recommend: '세탁기 표준 코스에 물 온도 40~60°C로 맞춰 돌려주세요. 탈수는 강하게 해도 괜찮아요.',
    warning: null,
  },
  washing_mild_60: {
    category: '세탁', status: '주의', isPro: false,
    card: '60°C 약한 세탁', value: '60°C 약함',
    interp: '물 온도는 60°C까지 괜찮지만, 약하게 세탁해야 해요. 표준 코스보다 부드럽게 돌리는 게 중요합니다.',
    recommend: '세탁기의 섬세 코스나 울/란제리 코스를 선택해 주세요. 물 온도는 40~60°C, 탈수는 약하게 설정하세요.',
    warning: '표준 코스로 돌리면 옷이 상할 수 있어요. 꼭 섬세 또는 울/란제리 코스를 선택해 주세요.',
  },
  washing_normal_40: {
    category: '세탁', status: '안전', isPro: false,
    card: '40°C 일반 세탁', value: '40°C 일반',
    interp: '미지근한 물(최고 40°C)로 평범하게 세탁할 수 있어요. 일상에서 입는 옷 대부분이 여기 해당돼요.',
    recommend: '세탁기 표준 코스로 돌리고, 물 온도는 30~40°C로 맞춰 주세요. 탈수도 강하게 해도 됩니다.',
    warning: null,
  },
  washing_mild_40: {
    category: '세탁', status: '주의', isPro: false,
    card: '40°C 약한 세탁', value: '40°C 약함',
    interp: '미지근한 물(최고 40°C)에서 약하게 세탁해야 해요. 프린트나 자수가 있는 옷, 합성섬유 혼방 옷에 자주 보여요.',
    recommend: '섬세 코스 또는 울/란제리 코스를 선택해 주세요. 물 온도는 30~40°C, 탈수는 약하게 설정합니다.',
    warning: '뜨거운 물이나 표준 코스로 돌리면 프린트와 자수가 손상돼요.',
  },
  washing_very_mild_40: {
    category: '세탁', status: '주의', isPro: false,
    card: '40°C 아주 약한 세탁', value: '40°C 매우 약함',
    interp: '미지근한 물(최고 40°C)에서 아주 부드럽게 세탁해야 해요. 울이나 실크 혼방처럼 예민한 소재예요.',
    recommend: '세탁기의 울/란제리 코스나 손빨래 코스를 선택해 주세요. 물 온도는 30~40°C, 탈수는 가장 약하게 맞춥니다.',
    warning: '표준 코스는 절대 안 돼요. 탈수를 강하게 하면 옷 모양이 변형될 수 있으니 주의하세요.',
  },
  washing_normal_30: {
    category: '세탁', status: '주의', isPro: false,
    card: '30°C 일반 세탁', value: '30°C 일반',
    interp: '찬물(최고 30°C)에서 일반 세탁할 수 있어요. 색이 진하거나 빠질 우려가 있는 옷에 적합한 조건이에요.',
    recommend: '세탁기 표준 코스로 돌리되, 물 온도는 찬물 또는 30°C로 설정해 주세요. 탈수는 강하게 해도 괜찮아요.',
    warning: '30°C보다 뜨거운 물을 쓰면 색이 빠지거나 옷이 줄어들 수 있어요.',
  },
  washing_mild_30: {
    category: '세탁', status: '주의', isPro: false,
    card: '30°C 약한 세탁', value: '30°C 약함',
    interp: '찬물(최고 30°C)에서 약하게 세탁해야 해요. 색이 선명하거나 늘어나기 쉬운 소재가 보통 여기 해당돼요.',
    recommend: '섬세 또는 울/란제리 코스를 선택하고, 물 온도는 찬물~30°C로 맞춰 주세요. 탈수는 약하게 설정합니다.',
    warning: '따뜻한 물이나 강한 탈수는 색 빠짐과 모양 변형의 원인이 돼요.',
  },
  washing_very_mild_30: {
    category: '세탁', status: '주의', isPro: false,
    card: '30°C 아주 약한 세탁', value: '30°C 매우 약함',
    interp: '찬물(최고 30°C)에서 아주 부드럽게 세탁해야 해요. 캐시미어나 레이스, 망사처럼 손이 많이 가는 소재예요.',
    recommend: '울/란제리 또는 손빨래 코스를 선택하고, 물 온도는 찬물~30°C로 맞춰 주세요. 가능하다면 탈수는 생략하거나 손세탁을 권장해요.',
    warning: '세탁기 탈수는 옷을 망가뜨리는 가장 흔한 원인이에요. 비틀어 짜지 말고 수건으로 감싸 눌러서 물기를 빼주세요.',
  },
  wash_by_hand: {
    category: '세탁', status: '주의', isPro: false,
    card: '손세탁', value: '손빨래',
    interp: '세탁기에는 못 넣어요. 미지근한 물(30°C 이하)에서 손으로 살살 빨아야 해요.',
    recommend: '세면대나 큰 통에 미지근한 물과 중성세제를 풀고, 옷을 담가 손으로 부드럽게 주물러 주세요. 다 빤 후에는 수건으로 감싸 눌러서 물기를 빼고 자연 건조합니다.',
    warning: '세탁기를 쓰면 옷이 망가져요. 짤 때도 비틀지 말고, 수건에 감싸 누르듯 눌러서 물기만 빼주세요.',
  },
  do_not_wash: {
    category: '세탁', status: '금지', isPro: false,
    card: '물세탁 금지', value: '금지',
    interp: '물에 닿으면 안 돼요. 물세탁을 하면 옷이 망가지거나 모양이 변형됩니다.',
    recommend: null,
    warning: '세탁기와 손세탁 모두 안 돼요. 라벨에서 드라이클리닝 표시를 함께 확인해서 적합한 세탁 방법을 찾아주세요.',
  },

  // --- 2. 표백 (3) ---
  bleach_any: {
    category: '표백', status: '안전', isPro: false,
    card: '표백 가능', value: '가능',
    interp: '어떤 표백제든 자유롭게 써도 돼요. 흰옷이나 위생적으로 빨고 싶을 때 표백제를 함께 넣어도 안전해요.',
    recommend: '세탁할 때 표백제를 적당량 함께 넣어주세요. 세탁기에 살균 코스나 위생 코스가 있다면 그걸 활용해도 좋아요.',
    warning: null,
  },
  bleach_oxygen_only: {
    category: '표백', status: '주의', isPro: false,
    card: '산소계 표백제만 가능', value: '산소계만',
    interp: '산소계 표백제만 쓸 수 있어요. 락스 같은 염소계 표백제는 옷을 망가뜨리니까 절대 안 돼요.',
    recommend: '옥시클린 같은 산소계 표백제만 사용해 주세요. 마트에서 표백제 살 때 \'산소계\'라고 적혀 있는지 꼭 확인하세요.',
    warning: '락스(염소계 표백제)를 쓰면 색이 빠지거나 옷이 상해요. 표백 성분이 섞인 일부 세제도 주의하세요.',
  },
  do_not_bleach: {
    category: '표백', status: '금지', isPro: false,
    card: '표백 금지', value: '금지',
    interp: '표백제는 어떤 종류든 안 돼요. 표백제에 닿으면 옷 색이 변하거나 망가질 수 있어요.',
    recommend: null,
    warning: '얼룩이 생겼다면 표백 성분 없는 얼룩 제거제를 쓰거나, 세탁소에 맡겨주세요. 일부 세탁세제에 표백 성분이 들어있으니 라벨도 확인해 주세요.',
  },

  // --- 3. 건조 (11) ---
  tumble_dry_normal: {
    category: '건조', status: '안전', isPro: false,
    card: '건조기 사용 가능', value: '건조기 가능',
    interp: '건조기에 넣어도 괜찮아요. 높은 온도에서도 변형 없이 잘 마르는 튼튼한 옷이에요.',
    recommend: '건조기 표준 코스로 돌리면 돼요. 건조 정도는 \'표준\' 또는 \'강력\'으로 맞춰도 괜찮아요.',
    warning: null,
  },
  tumble_dry_mild: {
    category: '건조', status: '주의', isPro: false,
    card: '건조기 저온만 사용', value: '건조기 저온',
    interp: '건조기는 써도 되지만, 낮은 온도로만 돌려야 해요. 높은 온도에서는 옷이 줄어들거나 모양이 변할 수 있어요.',
    recommend: '건조기의 \'섬세\' 코스를 쓰거나, 표준 코스를 선택한 뒤 건조 정도를 \'약\'으로 설정해 주세요. 다 마르면 바로 꺼내 형태를 잡아주는 게 좋아요.',
    warning: '높은 온도로 돌리면 옷이 수축하거나 변형될 수 있으니 꼭 저온 또는 \'섬세\' 코스를 쓰세요.',
  },
  do_not_tumble_dry: {
    category: '건조', status: '금지', isPro: false,
    card: '건조기 사용 금지', value: '금지',
    interp: '건조기에 절대 넣으면 안 돼요. 기계 건조 시 옷이 망가지거나 줄어들 수 있어요.',
    recommend: null,
    warning: '한 번 건조기에 잘못 넣으면 줄어든 옷은 되돌릴 수 없어요. 자연 건조 표시를 함께 확인해서 어떻게 말려야 하는지 보세요.',
  },
  line_dry: {
    category: '건조', status: '안전', isPro: false,
    card: '걸어서 자연 건조', value: '걸어서',
    interp: '옷걸이나 빨랫줄에 걸어 말려주세요. 가장 일반적인 자연 건조 방법이에요.',
    recommend: '세탁 후 가볍게 물기를 털어내고, 옷걸이에 걸어 통풍 잘 되는 곳에서 말려주세요.',
    warning: null,
  },
  drip_line_dry: {
    category: '건조', status: '안전', isPro: false,
    card: '탈수 없이 걸어서 건조', value: '탈수X 걸어',
    interp: '탈수하지 말고, 그냥 걸어서 말려주세요. 탈수기에 돌리면 옷이 뒤틀릴 수 있는 섬세한 소재예요.',
    recommend: '세탁 후 탈수 없이 바로 꺼내, 물이 뚝뚝 떨어지는 상태로 옷걸이에 걸어주세요. 욕실같이 물 떨어져도 괜찮은 곳을 활용하면 좋아요.',
    warning: '세탁기 탈수를 돌리면 옷이 뒤틀려요. 손으로 가볍게 눌러 물만 살짝 빼고 그대로 걸어주세요.',
  },
  flat_dry: {
    category: '건조', status: '안전', isPro: false,
    card: '눕혀서 자연 건조', value: '눕혀서',
    interp: '평평하게 펴서 눕혀 말려주세요. 니트나 스웨터처럼 걸면 늘어나는 옷에 해당돼요.',
    recommend: '평평한 건조대나 바닥에 옷 모양을 잡아 펼쳐서 말려주세요. 모양을 정돈하고 말려야 원래 핏이 유지돼요.',
    warning: '옷걸이에 걸면 어깨 부분이 축 처지거나 늘어날 수 있으니 꼭 눕혀서 말리세요.',
  },
  drip_flat_dry: {
    category: '건조', status: '안전', isPro: false,
    card: '탈수 없이 눕혀서 건조', value: '탈수X 눕혀',
    interp: '탈수도 하지 말고, 눕혀서 말려주세요. 매우 섬세한 소재라 탈수와 걸어 말리기 둘 다 피해야 해요.',
    recommend: '세탁 후 바로 꺼내, 물이 흡수되는 큰 수건 위에 펼쳐 눕혀 말려주세요.',
    warning: '탈수하거나 걸어 말리면 옷이 변형돼요. 마르는 데 시간이 좀 걸리니까 통풍이 잘 되는 곳에 두세요.',
  },
  line_dry_shade: {
    category: '건조', status: '주의', isPro: false,
    card: '그늘에 걸어서 건조', value: '그늘 걸어',
    interp: '햇빛이 직접 닿지 않는 그늘에 걸어 말려주세요. 직사광선에 색이 바래거나 옷이 약해질 수 있어요.',
    recommend: '옷걸이에 걸어 실내나 야외 그늘에서 말려주세요. 통풍이 좋은 그늘이면 빨리 마릅니다.',
    warning: '직사광선 아래 두면 색이 바래고 옷감이 약해져요.',
  },
  drip_line_dry_shade: {
    category: '건조', status: '주의', isPro: false,
    card: '탈수 없이 그늘에 걸어서 건조', value: '탈수X 그늘 걸어',
    interp: '탈수하지 말고, 그늘에 걸어서 말려주세요. 탈수와 직사광선 둘 다 피해야 하는 예민한 옷이에요.',
    recommend: '세탁 후 바로 꺼내, 그늘진 실내 옷걸이에 걸어 말려주세요.',
    warning: '탈수기를 돌리거나 햇빛에 두면 색이 빠지거나 모양이 변형돼요.',
  },
  flat_dry_shade: {
    category: '건조', status: '주의', isPro: false,
    card: '그늘에 눕혀서 건조', value: '그늘 눕혀',
    interp: '그늘에서 평평하게 눕혀 말려주세요. 모양도 지키고 색도 보호해야 하는 옷이에요.',
    recommend: '직사광선이 들지 않는 실내나 그늘에서, 평평한 곳에 모양을 잡아 눕혀 말려주세요.',
    warning: '햇빛에 두거나 옷걸이에 걸면 색 바램과 모양 변형이 일어나요.',
  },
  drip_flat_dry_shade: {
    category: '건조', status: '주의', isPro: false,
    card: '탈수 없이 그늘에 눕혀서 건조', value: '탈수X 그늘 눕혀',
    interp: '탈수도 안 하고, 그늘에서 눕혀 말려주세요. 가장 까다로운 건조 조건으로, 탈수·걸어 말리기·직사광선 모두 피해야 해요.',
    recommend: '세탁 후 바로 꺼내, 그늘진 실내에서 큰 수건 위에 펼쳐 눕혀 말려주세요.',
    warning: '옷이 그만큼 예민하다는 뜻이에요. 환경을 꼼꼼히 지켜서 말려주세요.',
  },

  // --- 4. 다림질 (4) ---
  iron_200c: {
    category: '다림질', status: '주의', isPro: false,
    card: '고온 다림질 (200°C까지)', value: '200°C 고온',
    interp: '다리미 점 3개(●●●), 최고 200°C까지 다림질할 수 있어요. 면이나 린넨 같은 튼튼한 소재예요.',
    recommend: '다리미를 면이나 고온(점 3개) 설정에 두고 다려주세요. 분무기로 살짝 물을 뿌리면 주름이 더 잘 펴져요.',
    warning: '프린트나 자수가 있다면 옷을 뒤집어 다리거나, 얇은 천을 위에 덧대고 다리세요.',
  },
  iron_150c: {
    category: '다림질', status: '주의', isPro: false,
    card: '중온 다림질 (150°C까지)', value: '150°C 중온',
    interp: '다리미 점 2개(●●), 최고 150°C까지 다림질할 수 있어요. 폴리에스터나 혼방 소재가 보통 여기 해당돼요.',
    recommend: '다리미를 합성섬유나 중온(점 2개) 설정에 두고, 얇은 천(다림질용 면포)을 옷 위에 덧대고 다려주세요.',
    warning: '고온(점 3개)으로 다리면 옷이 눌어붙거나 광택이 생길 수 있어요.',
  },
  iron_110c: {
    category: '다림질', status: '주의', isPro: false,
    card: '저온 다림질 (110°C까지)', value: '110°C 저온',
    interp: '다리미 점 1개(●), 최고 110°C까지 낮은 온도로만 다림질할 수 있어요. 실크나 울, 나일론처럼 열에 민감한 소재예요.',
    recommend: '다리미를 울이나 저온(점 1개) 설정에 두고, 꼭 얇은 천을 옷 위에 덧대고 간접적으로 다려주세요. 스팀 기능은 소재에 따라 피하는 게 좋아요.',
    warning: '스팀을 쓰거나 천 없이 직접 다리면 옷이 상해요. 꼭 면포를 덧대고 다리세요.',
  },
  do_not_iron: {
    category: '다림질', status: '금지', isPro: false,
    card: '다림질 금지', value: '금지',
    interp: '다림질을 절대 하면 안 돼요. 열에 너무 민감하거나, 표면 장식이 다리미 열에 손상될 수 있어요.',
    recommend: null,
    warning: '스팀 다리미도 안 돼요. 주름이 신경 쓰이면 욕실에 옷을 걸어두고 샤워할 때 나오는 김으로 펴거나, 세탁소에 맡기세요.',
  },

  // --- 5. 전문 케어 (9) ---
  dry_clean_perc_normal: {
    category: '전문케어', status: '안전', isPro: true,
    card: '드라이클리닝 가능 (P)', value: '드라이(P)',
    interp: '드라이클리닝을 맡기면 돼요. 일반 세탁소 어디서든 처리할 수 있는 표준 드라이클리닝이에요.',
    recommend: '동네 세탁소에 가져가서 "드라이클리닝 해주세요"라고 하시면 돼요. 라벨에 있는 \'P\' 동그라미 표시를 보여주면 더 확실해요.',
    warning: null,
  },
  dry_clean_perc_mild: {
    category: '전문케어', status: '주의', isPro: true,
    card: '드라이클리닝 가능 (P), 약하게', value: '드라이(P) 약함',
    interp: '드라이클리닝은 가능하지만 약하게 처리해야 해요. 살짝 예민한 소재라 강한 처리는 피해야 합니다.',
    recommend: '세탁소에 가져가서 "섬세 드라이클리닝으로 약하게 해주세요"라고 꼭 말씀해 주세요.',
    warning: '요청 안 하면 세탁소에서 일반 강도로 처리할 수 있어요. 꼭 "약하게"라고 말해주세요.',
  },
  dry_clean_hc_normal: {
    category: '전문케어', status: '안전', isPro: true,
    card: '드라이클리닝 가능 (F, 탄화수소계)', value: '드라이(F)',
    interp: '특정 용제(탄화수소계)로만 드라이클리닝할 수 있어요. 일반 드라이클리닝 용제는 옷에 안 맞아요.',
    recommend: '세탁소에 \'F\' 동그라미 표시를 보여주며 "탄화수소계 용제로 드라이클리닝 해주세요"라고 요청하세요.',
    warning: '모든 세탁소가 탄화수소계 용제를 갖고 있지는 않아요. 가기 전에 전화로 "F 표시 옷 처리 가능한가요?"라고 확인하세요.',
  },
  dry_clean_hc_mild: {
    category: '전문케어', status: '주의', isPro: true,
    card: '드라이클리닝 가능 (F), 약하게', value: '드라이(F) 약함',
    interp: '특정 용제(탄화수소계)로 약하게만 드라이클리닝할 수 있어요. 가장 까다로운 드라이클리닝 조건이에요.',
    recommend: '세탁소에 라벨을 보여주면서 "F 표시 옷이고, 약하게 처리해 주세요"라고 명확히 전달해 주세요.',
    warning: '명품이나 고급 의류 전문 세탁소를 추천해요. 일반 동네 세탁소에서는 처리가 어려울 수 있어요.',
  },
  do_not_dry_clean: {
    category: '전문케어', status: '금지', isPro: true,
    card: '드라이클리닝 금지', value: '금지',
    interp: '드라이클리닝은 절대 맡기지 마세요. 드라이클리닝 용제가 옷을 망가뜨려요.',
    recommend: null,
    warning: '드라이클리닝은 안 돼요. 라벨에서 물세탁 표시를 함께 확인해서 어떻게 빨아야 하는지 보세요.',
  },
  wet_clean_normal: {
    category: '전문케어', status: '안전', isPro: true,
    card: '전문 습식 세탁 가능 (W)', value: '웨트(W)',
    interp: '\'웨트클리닝\'이라는 전문 물세탁이 필요해요. 일반 세탁기로는 흉내내기 어려운 특수 처리예요.',
    recommend: '"웨트클리닝"이 가능한 세탁소에 맡기세요. 라벨의 \'W\' 표시를 보여주면 됩니다. 모든 세탁소가 제공하지는 않으니 가기 전에 전화로 확인하세요.',
    warning: '집에서 일반 세탁기로 빨면 옷이 망가져요. 꼭 전문 웨트클리닝 업체에 맡기세요.',
  },
  wet_clean_mild: {
    category: '전문케어', status: '주의', isPro: true,
    card: '전문 습식 세탁 (W), 약하게', value: '웨트(W) 약함',
    interp: '웨트클리닝이 가능하지만 약하게 처리해야 해요. 살짝 예민한 소재예요.',
    recommend: '웨트클리닝 세탁소에 "약하게 처리해 주세요"라고 꼭 말씀해 주세요. 가능 여부도 미리 전화로 확인하시는 게 좋아요.',
    warning: '"약하게" 요청을 빼먹으면 일반 강도로 처리될 수 있어요.',
  },
  wet_clean_very_mild: {
    category: '전문케어', status: '주의', isPro: true,
    card: '전문 습식 세탁 (W), 매우 약하게', value: '웨트(W) 매우 약함',
    interp: '웨트클리닝 중에서도 가장 약하게 처리해야 하는 매우 예민한 소재예요.',
    recommend: '웨트클리닝 전문 업체에 "매우 약하게 처리해 주세요"라고 명확히 전달하세요. 명품 또는 특수 소재 전문 세탁소를 권장해요.',
    warning: '동네 일반 세탁소에서는 처리가 어려울 수 있어요. 명품 전문점을 이용하세요.',
  },
  do_not_wet_clean: {
    category: '전문케어', status: '금지', isPro: true,
    card: '전문 습식 세탁 금지', value: '금지',
    interp: '웨트클리닝도 안 돼요. 물 자체가 옷에 영향을 주는 소재예요.',
    recommend: null,
    warning: '물을 쓰는 어떤 세탁도 안 돼요. 라벨에서 드라이클리닝 표시를 함께 확인하세요.',
  },
};

export const CATEGORY_ORDER = ['세탁', '표백', '건조', '다림질', '전문케어'];

export const STATUS_PRIORITY: Record<SymbolStatus, number> = {
  '금지': 0,
  '주의': 1,
  '안전': 2,
};

export const WASH_COURSE: Record<string, [string, string, string]> = {
  washing_normal_95:    ['표준 코스', '60~95°C (뜨거운 물)', '강하게'],
  washing_normal_60:    ['표준 코스', '40~60°C (따뜻한 물)', '강하게'],
  washing_mild_60:      ['섬세 또는 울/란제리 코스', '40~60°C (따뜻한 물)', '약하게'],
  washing_normal_40:    ['표준 코스', '30~40°C (미지근한 물)', '강하게'],
  washing_mild_40:      ['섬세 또는 울/란제리 코스', '30~40°C (미지근한 물)', '약하게'],
  washing_very_mild_40: ['울/란제리 또는 손빨래 코스', '30~40°C (미지근한 물)', '가장 약하게'],
  washing_normal_30:    ['표준 코스', '찬물~30°C', '강하게'],
  washing_mild_30:      ['섬세 또는 울/란제리 코스', '찬물~30°C', '약하게'],
  washing_very_mild_30: ['울/란제리 또는 손빨래 코스', '찬물~30°C', '생략 권장'],
  wash_by_hand:         ['손빨래 (세탁기 사용 금지)', '30°C 이하 미지근한 물', '수건 감싸 누르기'],
  do_not_wash:          ['물세탁 자체 금지', '—', '—'],
};

export const CATEGORY_LABEL: Record<string, string> = {
  '세탁': '물세탁',
  '표백': '표백',
  '건조': '건조',
  '다림질': '다림질',
  '전문케어': '전문케어',
};
