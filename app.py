import streamlit as st
import pandas as pd
import matplotlib.pyplot as plt
import plotly.graph_objects as go
import math
import io
import datetime
import pytz
import streamlit.components.v1 as components
import copy

# --- VR 버전 ---
VR_VERSION = "3.2.1"

# --- VR 파라미터 상수 ---
BASE_BAND_LOWER = 0.85  # 기본 LBand 비율
BASE_BAND_UPPER = 1.15  # 기본 HBand 비율
MIN_BAND_LOWER = 0.92  # 최소(압축 시) LBand 비율
MAX_BAND_UPPER = 1.08  # 최대(압축 시) HBand 비율
VE_DIVERGENCE_THRESHOLD = 0.05  # V/E 괴리율 임계값 (5% 초과 시 압축 시작)
VE_MAX_DIVERGENCE = 0.50  # 최대 괴리율 (50%에서 최대 압축)
MAX_V_E_RATIO = 1.15  # 레거시 안전 안내 호환용 상수 (공식 VR 계산에는 적용하지 않음)

# --- 페이지 설정 ---
st.set_page_config(page_title=f"VR 시뮬레이터 V{VR_VERSION}", layout="wide", page_icon="📊")

# --- 커스텀 CSS 테마 주입 ---
def inject_custom_css():
    """Bloomberg/트레이딩 플랫폼 스타일의 다크 테마 CSS 주입"""
    st.markdown("""
    <style>
    /* === GOOGLE FONTS === */
    @import url('https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@400;500;600;700&family=Noto+Sans+KR:wght@300;400;500;600;700;900&display=swap');

    /* === CSS VARIABLES === */
    :root {
        --primary-bg: #05060A;
        --secondary-bg: #0A0E18;
        --card-bg: rgba(14, 17, 28, 0.86);
        --accent-bg: rgba(24, 32, 52, 0.92);
        --text-primary: #EAF2F8;
        --text-secondary: #9AA8BA;
        --text-muted: #637085;
        --accent-blue: #39E7FF;
        --accent-green: #5DFFB3;
        --accent-red: #FF476F;
        --accent-yellow: #FFD166;
        --accent-purple: #FF4FD8;
        --border-color: rgba(57, 231, 255, 0.16);
        --border-highlight: #39E7FF;
        --shadow-md: 0 18px 54px rgba(0,0,0,0.38);
        --shadow-lg: 0 28px 90px rgba(0,0,0,0.54);
        --radius-md: 14px;
        --radius-lg: 24px;
    }

    /* === GLOBAL STYLES === */
    .stApp {
        background:
            radial-gradient(circle at 80% 0%, rgba(57, 231, 255, 0.16), transparent 32%),
            radial-gradient(circle at 10% 82%, rgba(255, 79, 216, 0.10), transparent 34%),
            linear-gradient(135deg, var(--primary-bg) 0%, var(--secondary-bg) 100%);
    }

    .stApp::before {
        content: "";
        position: fixed;
        inset: 0;
        pointer-events: none;
        z-index: 0;
        background-image:
            linear-gradient(rgba(57, 231, 255, 0.052) 1px, transparent 1px),
            linear-gradient(90deg, rgba(57, 231, 255, 0.044) 1px, transparent 1px);
        background-size: 76px 76px;
        mask-image: radial-gradient(circle at 50% 18%, black 0%, transparent 72%);
    }

    .block-container {
        max-width: 1320px;
        padding-top: 2.4rem;
    }

    [data-testid="stHeader"] {
        background: rgba(5, 6, 10, 0.72);
        backdrop-filter: blur(18px) saturate(150%);
        border-bottom: 1px solid var(--border-color);
    }

    [data-testid="stSidebar"] {
        background: linear-gradient(180deg, rgba(14, 17, 28, 0.96) 0%, rgba(5, 6, 10, 0.96) 100%);
        border-right: 1px solid var(--border-color);
    }

    /* === TYPOGRAPHY === */
    h1, h2, h3, h4, h5, h6, .stMarkdown h1, .stMarkdown h2, .stMarkdown h3 {
        font-family: 'Noto Sans KR', sans-serif !important;
        font-weight: 700 !important;
        color: var(--text-primary) !important;
    }

    h1, .stMarkdown h1 {
        font-size: 2.2rem !important;
        background: linear-gradient(135deg, var(--accent-blue) 0%, var(--accent-purple) 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
    }

    p, span, label, .stMarkdown, div {
        font-family: 'Noto Sans KR', sans-serif;
    }

    /* === METRIC CARDS === */
    [data-testid="stMetric"] {
        background: linear-gradient(145deg, rgba(16, 22, 38, 0.92) 0%, rgba(7, 10, 18, 0.82) 100%);
        border: 1px solid var(--border-color);
        border-radius: var(--radius-lg);
        padding: 1.2rem 1rem;
        box-shadow: var(--shadow-md);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    [data-testid="stMetric"]:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-lg), 0 0 20px rgba(88, 166, 255, 0.1);
        border-color: var(--border-highlight);
    }

    [data-testid="stMetric"] label {
        color: var(--text-secondary) !important;
        font-size: 0.85rem !important;
        font-weight: 600 !important;
    }

    [data-testid="stMetric"] [data-testid="stMetricValue"] {
        color: var(--text-primary) !important;
        font-size: 1.6rem !important;
        font-weight: 700 !important;
    }

    /* === BUTTONS === */
    .stButton > button {
        background: rgba(57, 231, 255, 0.10);
        color: var(--accent-blue) !important;
        border: 1px solid rgba(57, 231, 255, 0.34);
        border-radius: 999px;
        padding: 0.6rem 1.5rem;
        font-weight: 600;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 0 28px rgba(57, 231, 255, 0.12);
    }

    .stButton > button:hover {
        background: rgba(57, 231, 255, 0.18);
        transform: translateY(-2px);
    }

    .stDownloadButton > button {
        background: rgba(93, 255, 179, 0.12);
        color: var(--accent-green) !important;
        border: 1px solid rgba(93, 255, 179, 0.34);
    }

    /* === FORM INPUTS === */
    [data-baseweb="input"], [data-baseweb="base-input"] {
        background-color: rgba(5, 6, 10, 0.68) !important;
        border: 1px solid var(--border-color) !important;
        border-radius: var(--radius-md) !important;
    }

    /* === DATAFRAMES === */
    [data-testid="stDataFrame"] {
        background: var(--card-bg);
        border-radius: var(--radius-lg);
        border: 1px solid var(--border-color);
    }

    /* === EXPANDERS === */
    [data-testid="stExpander"] {
        background: var(--card-bg);
        border: 1px solid var(--border-color);
        border-radius: var(--radius-lg);
    }

    /* === TABS === */
    [data-baseweb="tab-list"] {
        background: var(--card-bg);
        border-radius: var(--radius-lg);
        padding: 4px;
    }

    [data-baseweb="tab"][aria-selected="true"] {
        background: linear-gradient(135deg, var(--accent-blue) 0%, #1F6FEB 100%) !important;
        color: white !important;
    }

    /* === DIVIDERS === */
    hr {
        border: none;
        height: 1px;
        background: linear-gradient(90deg, transparent 0%, var(--border-color) 50%, transparent 100%);
    }

    /* === FORM CONTAINER === */
    [data-testid="stForm"] {
        background: var(--card-bg);
        border: 1px solid var(--border-color);
        border-radius: var(--radius-lg);
        padding: 1.5rem;
    }

    /* === RETROFUTURE COCKPIT COMPONENTS === */
    .vr-hero {
        position: relative;
        overflow: hidden;
        border: 1px solid rgba(57, 231, 255, 0.18);
        border-radius: 32px;
        padding: 2rem;
        margin: 0.6rem 0 1.4rem;
        background:
            linear-gradient(145deg, rgba(16, 22, 38, 0.92), rgba(7, 10, 18, 0.82)),
            radial-gradient(circle at 4% 0%, rgba(57, 231, 255, 0.18), transparent 36%);
        box-shadow: 0 30px 100px rgba(0,0,0,0.42), inset 0 1px 0 rgba(255,255,255,0.06);
    }
    .vr-hero::after {
        content: "";
        position: absolute;
        inset: 0;
        pointer-events: none;
        background: linear-gradient(115deg, transparent 0%, rgba(255,255,255,0.05) 45%, transparent 58%);
        animation: vr-sweep 7s ease-in-out infinite;
    }
    .vr-eyebrow {
        display: inline-flex;
        border: 1px solid rgba(57, 231, 255, 0.24);
        border-radius: 999px;
        padding: 0.28rem 0.72rem;
        color: var(--accent-blue);
        background: rgba(57, 231, 255, 0.09);
        font-family: 'Chakra Petch', monospace;
        font-size: 0.72rem;
        letter-spacing: 0.22em;
        text-transform: uppercase;
    }
    .vr-hero-title {
        margin-top: 0.7rem;
        font-family: 'Chakra Petch', 'Noto Sans KR', sans-serif;
        font-size: clamp(2.3rem, 5vw, 5.6rem);
        line-height: 0.92;
        letter-spacing: -0.055em;
        font-weight: 700;
        color: var(--text-primary);
    }
    .vr-hero-copy {
        max-width: 720px;
        margin-top: 0.9rem;
        color: var(--text-secondary);
        line-height: 1.8;
    }
    .vr-orbit {
        width: 156px;
        height: 156px;
        border-radius: 999px;
        border: 1px solid rgba(57,231,255,0.24);
        display: grid;
        place-items: center;
        margin-left: auto;
        background: rgba(5, 6, 10, 0.68);
        box-shadow: inset 0 0 48px rgba(57,231,255,0.08), 0 0 42px rgba(57,231,255,0.08);
    }
    .vr-status-card {
        border-radius: 24px !important;
        box-shadow: 0 20px 70px rgba(0,0,0,0.34);
    }
    @keyframes vr-sweep {
        0%, 100% { transform: translateX(-24%); opacity: 0.35; }
        50% { transform: translateX(20%); opacity: 0.78; }
    }
    @media (max-width: 760px) {
        .vr-hero { padding: 1.35rem; border-radius: 24px; }
        .vr-hero > div { grid-template-columns: 1fr !important; }
        .vr-orbit { display: none; }
    }
    @media (prefers-reduced-motion: reduce) {
        *, *::before, *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
            scroll-behavior: auto !important;
        }
    }
    </style>
    """, unsafe_allow_html=True)

inject_custom_css()

# --- 세션 상태 초기화 ---
if 'history' not in st.session_state:
    st.session_state.history = []
if 'current_G' not in st.session_state:
    st.session_state.current_G = 10.0
if 'default_deposit' not in st.session_state:
    st.session_state.default_deposit = 250.0
if 'simulation_started' not in st.session_state:
    st.session_state.simulation_started = False
if 'view_cycle_index' not in st.session_state:
    st.session_state.view_cycle_index = 0
if 'ticker_name' not in st.session_state:
    st.session_state.ticker_name = "TQQQ"
if 'adaptive_band_enabled' not in st.session_state:
    st.session_state.adaptive_band_enabled = False

# =============================================================================
# 핵심 계산 함수
# =============================================================================

def calculate_v_next(V_i, pool_before_deposit, E_calc, G, deposit_next):
    """다음 목표 가치(V_f) 계산 - 공식 VR 실력공식
    
    V_f = V_i + pool_prev/G + (E - V_i)/(2*sqrt(G)) + deposit_next
    """
    if G <= 0:
        return V_i
    try:
        term1 = V_i
        term2 = pool_before_deposit / G
        term3 = (E_calc - V_i) / (2 * math.sqrt(G))
        term4 = deposit_next
        V_f = term1 + term2 + term3 + term4
        return max(V_f, 0.01)
    except Exception as e:
        st.error(f"V 계산 오류: {e}")
        return V_i


def calculate_band_compression_factor(V_target, E_calc):
    """V/E 괴리율에 따른 밴드 압축 계수 계산"""
    if E_calc <= 0 or V_target <= 0:
        return 1.0, 0.0, 'neutral'
    
    ve_ratio = V_target / E_calc
    divergence_ratio = abs(ve_ratio - 1.0)
    
    if ve_ratio > 1.0 + VE_DIVERGENCE_THRESHOLD:
        divergence_direction = 'over'
    elif ve_ratio < 1.0 - VE_DIVERGENCE_THRESHOLD:
        divergence_direction = 'under'
    else:
        divergence_direction = 'neutral'
    
    if divergence_ratio <= VE_DIVERGENCE_THRESHOLD:
        compression_factor = 1.0
    else:
        excess = divergence_ratio - VE_DIVERGENCE_THRESHOLD
        max_excess = VE_MAX_DIVERGENCE - VE_DIVERGENCE_THRESHOLD
        normalized = min(excess / max_excess, 1.0) if max_excess > 0 else 1.0
        compression_factor = 1.0 - normalized
    
    return compression_factor, divergence_ratio, divergence_direction


def calculate_bands(V_target, E_calc=None, use_adaptive=None):
    """LBand, HBand 계산 (적응형 밴드 지원)"""
    if use_adaptive is None:
        use_adaptive = st.session_state.get('adaptive_band_enabled', False)

    if not use_adaptive or E_calc is None or E_calc <= 0:
        return BASE_BAND_LOWER * V_target, BASE_BAND_UPPER * V_target
    
    compression_factor, _, _ = calculate_band_compression_factor(V_target, E_calc)
    compressed_lower = BASE_BAND_LOWER + (MIN_BAND_LOWER - BASE_BAND_LOWER) * (1 - compression_factor)
    compressed_upper = BASE_BAND_UPPER + (MAX_BAND_UPPER - BASE_BAND_UPPER) * (1 - compression_factor)
    
    anchor_sell = min(V_target, E_calc) if E_calc is not None and E_calc > 0 else V_target
    LBand = compressed_lower * V_target
    HBand = compressed_upper * anchor_sell
    if HBand <= LBand:
        HBand = compressed_upper * V_target
    return LBand, HBand


def calculate_adaptive_bands(V_target, E_calc):
    """V/E 괴리율에 따라 압축된 적응형 밴드 계산"""
    compression_factor, divergence_ratio, divergence_direction = calculate_band_compression_factor(V_target, E_calc)
    
    compressed_lower = BASE_BAND_LOWER + (MIN_BAND_LOWER - BASE_BAND_LOWER) * (1 - compression_factor)
    compressed_upper = BASE_BAND_UPPER + (MAX_BAND_UPPER - BASE_BAND_UPPER) * (1 - compression_factor)
    
    # V3.1.1: 비대칭 앵커링
    # 매수(LBand): V 기준 유지 (매수 목표가 보존)
    # 매도(HBand): min(V, E) 기준 (매도 목표가 현실화)
    anchor_sell = min(V_target, E_calc) if E_calc > 0 else V_target
    LBand = compressed_lower * V_target
    HBand = compressed_upper * anchor_sell
    # 안전장치: 역전 방지 (V/E 극단적 괴리 시 대칭 폴백)
    if HBand <= LBand:
        LBand = compressed_lower * V_target
        HBand = compressed_upper * V_target
    
    return {
        'LBand': LBand,
        'HBand': HBand,
        'compression_factor': compression_factor,
        'divergence_ratio': divergence_ratio,
        'divergence_direction': divergence_direction,
        'band_lower_ratio': compressed_lower,
        'band_upper_ratio': compressed_upper
    }


def calculate_simple_targets(shares_start, LBand, HBand):
    """공식 VR의 체결 전 보유수 기준 단순 매수/매도 임계가 계산"""
    s = max(0, int(math.floor(shares_start)))
    buy_denominator = s if s > 0 else 1
    buy_target_price = LBand / buy_denominator if buy_denominator > 0 else 0
    sell_target_price = HBand / s if s > 0 else 0
    
    return round(buy_target_price, 2), round(sell_target_price, 2)


def calculate_buy_table(LBand, current_shares, pool, current_price, max_levels=50):
    """기본 매수 테이블 생성"""
    buy_table = []
    s = max(0, int(math.floor(current_shares)))
    remaining_cash = pool
    
    if current_price <= 0:
        return buy_table
    
    for _ in range(max_levels):
        denominator = s if s > 0 else 1
        next_shares = s + 1
        limit_price = LBand / denominator if denominator > 0 else 0
        if limit_price <= 0 or remaining_cash < limit_price:
            break
        remaining_cash -= limit_price
        s = next_shares
        buy_table.append({
            '목표 주식수': s,
            '지정가 ($)': round(limit_price, 2),
            '남은 예수금 ($)': round(remaining_cash, 2)
        })
    
    return buy_table


def calculate_sell_table(HBand, current_shares, current_price, pool, max_levels=50):
    """기본 매도 테이블 생성 (예상 수익금 포함)"""
    sell_table = []
    s = max(0, int(math.floor(current_shares)))
    cumulative_proceeds = pool  # 현재 예수금에서 시작
    
    if s == 0:
        return sell_table
    
    for _ in range(min(s, max_levels)):
        target_after_sell = s - 1
        threshold = HBand / s
        sell_proceeds = threshold
        cumulative_proceeds += sell_proceeds
        sell_table.append({
            '목표 주식수': target_after_sell,
            '지정가 ($)': round(threshold, 2),
            '예상 예수금 ($)': round(cumulative_proceeds, 2)
        })
        s = target_after_sell
        if s <= 0:
            break
    
    return sell_table


def normalize_history_entry(entry):
    """신규/기존 기록에 필요한 메타데이터 필드를 채운다"""
    entry = copy.deepcopy(entry)
    E_val = float(entry.get('E_calc', 0.0))
    V_target = float(entry.get('V_target', entry.get('V_i', 0.0)))
    
    entry.setdefault('adaptive_band_enabled', False)
    
    if 've_divergence_ratio' not in entry:
        if E_val > 0 and V_target > 0:
            compression_factor, divergence_ratio, divergence_direction = calculate_band_compression_factor(V_target, E_val)
            adaptive_result = calculate_adaptive_bands(V_target, E_val)
            entry['ve_divergence_ratio'] = divergence_ratio
            entry['ve_divergence_direction'] = divergence_direction
            entry['band_compression_factor'] = compression_factor
            entry['band_lower_ratio'] = adaptive_result['band_lower_ratio']
            entry['band_upper_ratio'] = adaptive_result['band_upper_ratio']
        else:
            entry['ve_divergence_ratio'] = 0.0
            entry['ve_divergence_direction'] = 'neutral'
            entry['band_compression_factor'] = 1.0
            entry['band_lower_ratio'] = BASE_BAND_LOWER
            entry['band_upper_ratio'] = BASE_BAND_UPPER
    
    entry.setdefault('ve_divergence_direction', 'neutral')
    entry.setdefault('band_compression_factor', 1.0)
    entry.setdefault('band_lower_ratio', BASE_BAND_LOWER)
    entry.setdefault('band_upper_ratio', BASE_BAND_UPPER)
    
    return entry


# --- 마켓 상태 함수 ---
def get_market_status():
    korea_tz = pytz.timezone('Asia/Seoul')
    now = datetime.datetime.now(korea_tz)
    
    us_eastern = pytz.timezone('US/Eastern')
    us_time = now.astimezone(us_eastern)
    us_weekday = us_time.weekday()
    
    is_market_open = (us_weekday < 5) and (datetime.time(9, 30) <= us_time.time() < datetime.time(16, 0))
    status = "정규장 운영 중" if is_market_open else "정규장 종료"
    if us_weekday >= 5:
        status = "주말 휴장"
    
    dst_text = "적용 중" if us_time.dst() != datetime.timedelta(0) else "미적용"
    
    try:
        market_open_time_in_et = datetime.time(9, 30)
        market_open_dt_naive = datetime.datetime.combine(us_time.date(), market_open_time_in_et)
        market_open_dt_et = us_eastern.localize(market_open_dt_naive)
        
        if us_time.time() >= market_open_time_in_et:
            if us_weekday == 4:
                market_open_dt_et += datetime.timedelta(days=3)
            elif us_weekday < 4:
                market_open_dt_et += datetime.timedelta(days=1)
            elif us_weekday == 5:
                market_open_dt_et += datetime.timedelta(days=2)
            elif us_weekday == 6:
                market_open_dt_et += datetime.timedelta(days=1)
        elif us_weekday == 5:
            market_open_dt_et += datetime.timedelta(days=2)
        elif us_weekday == 6:
            market_open_dt_et += datetime.timedelta(days=1)
        
        market_open_time_kst = market_open_dt_et.astimezone(korea_tz)
        reservation_start_kst = now.replace(hour=9, minute=0, second=0, microsecond=0)
        reservation_end_kst = market_open_time_kst - datetime.timedelta(minutes=30)
        
        if reservation_start_kst.date() == reservation_end_kst.date():
            is_reservation_possible = reservation_start_kst.time() <= now.time() < reservation_end_kst.time()
        else:
            is_reservation_possible = (now >= reservation_start_kst and now.date() == reservation_start_kst.date()) or \
                                     (now < reservation_end_kst and now.date() == reservation_end_kst.date())
    except Exception:
        is_reservation_possible = False
    
    return now.strftime("%Y-%m-%d %H:%M:%S"), status, dst_text, is_market_open, is_reservation_possible


# --- 네비게이션 콜백 함수 ---
def go_previous():
    if st.session_state.view_cycle_index > 0:
        st.session_state.view_cycle_index -= 1

def go_next():
    if st.session_state.view_cycle_index < len(st.session_state.history) - 1:
        st.session_state.view_cycle_index += 1


# --- Matplotlib 그래프 생성 함수 (PNG 다운로드용) ---
def plot_results_matplotlib(history_df):
    if history_df.empty or len(history_df) < 1:
        return None
    
    plt.style.use('dark_background')
    fig, axs = plt.subplots(2, 2, figsize=(14, 10), facecolor='#0D1117')
    fig.patch.set_facecolor('#0D1117')
    
    colors = {
        'v_target': '#39E7FF',
        'e_calc': '#FF4FD8',
        'lband': '#5DFFB3',
        'hband': '#FF476F',
        'pool': '#39D353',
        'shares': '#FFD166'
    }
    
    x_axis = history_df.index if history_df.index.name == 'cycle_num_display' else history_df['cycle_num']
    
    for ax in axs.flat:
        ax.set_facecolor('#161B22')
        ax.spines['top'].set_visible(False)
        ax.spines['right'].set_visible(False)
        ax.spines['left'].set_color('#30363D')
        ax.spines['bottom'].set_color('#30363D')
        ax.tick_params(colors='#8B949E', labelsize=9)
        ax.grid(True, alpha=0.2, color='#30363D', linestyle='--')
    
    # Chart 1: Value Band Tracking
    axs[0, 0].plot(x_axis, history_df['V_target'], marker='o', linewidth=2.5, color=colors['v_target'], label='Target (V)')
    axs[0, 0].plot(x_axis, history_df['LBand'], marker='^', linestyle='--', linewidth=2, color=colors['lband'], label='LBand')
    axs[0, 0].plot(x_axis, history_df['HBand'], marker='v', linestyle='--', linewidth=2, color=colors['hband'], label='HBand')
    axs[0, 0].fill_between(x_axis, history_df['LBand'], history_df['HBand'], color=colors['v_target'], alpha=0.08)
    axs[0, 0].set_title('Value Band Tracking', fontsize=14, fontweight='bold', color='#E6EDF3')
    axs[0, 0].set_xlabel('Cycle', color='#8B949E')
    axs[0, 0].set_ylabel('Value ($)', color='#8B949E')
    axs[0, 0].legend(loc='upper left', facecolor='#21262D', edgecolor='#30363D')
    
    # Chart 2: Portfolio vs Target
    axs[0, 1].plot(x_axis, history_df['E_calc'], marker='s', linewidth=2.5, color=colors['e_calc'], label='Portfolio (E)')
    axs[0, 1].plot(x_axis, history_df['V_target'], marker='o', linestyle=':', linewidth=2, color=colors['v_target'], label='Target (V)')
    axs[0, 1].fill_between(x_axis, history_df['E_calc'], history_df['V_target'], alpha=0.15, color=colors['e_calc'])
    axs[0, 1].set_title('Portfolio (E) vs Target (V)', fontsize=14, fontweight='bold', color='#E6EDF3')
    axs[0, 1].set_xlabel('Cycle', color='#8B949E')
    axs[0, 1].set_ylabel('Value ($)', color='#8B949E')
    axs[0, 1].legend(loc='upper left', facecolor='#21262D', edgecolor='#30363D')
    
    # Chart 3: Pool Balance
    pool_data = history_df['pool_end_before_deposit'] + history_df['deposit_next']
    axs[1, 0].bar(x_axis, pool_data, color=colors['pool'], alpha=0.8, label='Pool Balance')
    axs[1, 0].set_title('Pool Balance Trend', fontsize=14, fontweight='bold', color='#E6EDF3')
    axs[1, 0].set_xlabel('Cycle', color='#8B949E')
    axs[1, 0].set_ylabel('Pool ($)', color='#8B949E')
    
    # Chart 4: Shares Held
    axs[1, 1].plot(x_axis, history_df['shares_end'], marker='D', linewidth=2.5, color=colors['shares'], label='Shares Held')
    axs[1, 1].fill_between(x_axis, 0, history_df['shares_end'], alpha=0.2, color=colors['shares'])
    axs[1, 1].set_title('Shares Held Trend', fontsize=14, fontweight='bold', color='#E6EDF3')
    axs[1, 1].set_xlabel('Cycle', color='#8B949E')
    axs[1, 1].set_ylabel('Shares', color='#8B949E')
    
    fig.tight_layout(pad=3)
    return fig


# --- Plotly 인터랙티브 차트 생성 함수 ---
def create_plotly_charts(history_df):
    if history_df.empty or len(history_df) < 2:
        return None, None, None, None
    
    colors = {
        'v_target': '#39E7FF', 'e_calc': '#FF4FD8', 'lband': '#5DFFB3',
        'hband': '#FF476F', 'pool': '#5DFFB3', 'shares': '#FFD166',
        'bg': '#0D1117', 'paper': '#161B22', 'grid': '#30363D', 'text': '#E6EDF3'
    }
    
    x_axis = history_df.index.tolist()
    
    layout_common = dict(
        paper_bgcolor=colors['paper'],
        plot_bgcolor=colors['bg'],
        font=dict(family='Noto Sans KR, Chakra Petch, sans-serif', color=colors['text']),
        xaxis=dict(gridcolor=colors['grid'], linecolor=colors['grid']),
        yaxis=dict(gridcolor=colors['grid'], linecolor=colors['grid']),
        legend=dict(bgcolor='rgba(33, 38, 45, 0.9)', bordercolor=colors['grid']),
        margin=dict(l=50, r=30, t=50, b=50),
        hovermode='x unified'
    )
    
    # Chart 1: Value Band Tracking
    fig1 = go.Figure()
    fig1.add_trace(go.Scatter(x=x_axis, y=history_df['HBand'], mode='lines', name='HBand', line=dict(color=colors['hband'], width=2, dash='dash')))
    fig1.add_trace(go.Scatter(x=x_axis, y=history_df['LBand'], mode='lines', name='LBand', line=dict(color=colors['lband'], width=2, dash='dash'), fill='tonexty', fillcolor='rgba(88, 166, 255, 0.1)'))
    fig1.add_trace(go.Scatter(x=x_axis, y=history_df['V_target'], mode='lines+markers', name='Target (V)', line=dict(color=colors['v_target'], width=3), marker=dict(size=8)))
    fig1.update_layout(**layout_common, title=dict(text='📈 Value Band Tracking'), xaxis_title='Cycle', yaxis_title='Value ($)')
    
    # Chart 2: Portfolio vs Target
    fig2 = go.Figure()
    fig2.add_trace(go.Scatter(x=x_axis, y=history_df['V_target'], mode='lines+markers', name='Target (V)', line=dict(color=colors['v_target'], width=2, dash='dot')))
    fig2.add_trace(go.Scatter(x=x_axis, y=history_df['E_calc'], mode='lines+markers', name='Portfolio (E)', line=dict(color=colors['e_calc'], width=3), fill='tonexty', fillcolor='rgba(163, 113, 247, 0.15)'))
    fig2.update_layout(**layout_common, title=dict(text='💰 Portfolio (E) vs Target (V)'), xaxis_title='Cycle', yaxis_title='Value ($)')
    
    # Chart 3: Pool Balance
    pool_data = history_df['pool_end_before_deposit'] + history_df['deposit_next']
    fig3 = go.Figure()
    fig3.add_trace(go.Bar(x=x_axis, y=pool_data, name='Pool Balance', marker=dict(color=colors['pool'])))
    fig3.update_layout(**layout_common, title=dict(text='💵 Pool Balance Trend'), xaxis_title='Cycle', yaxis_title='Pool ($)', showlegend=False)
    
    # Chart 4: Shares Held
    fig4 = go.Figure()
    fig4.add_trace(go.Scatter(x=x_axis, y=history_df['shares_end'], mode='lines+markers', name='Shares', line=dict(color=colors['shares'], width=3), fill='tozeroy', fillcolor='rgba(210, 153, 34, 0.2)'))
    fig4.update_layout(**layout_common, title=dict(text='📊 Shares Held'), xaxis_title='Cycle', yaxis_title='Shares', showlegend=False)
    
    return fig1, fig2, fig3, fig4


# --- 커스텀 UI 컴포넌트 ---
def create_highlight_card(title, content, icon="📊", variant="info"):
    border_colors = {"success": "#5DFFB3", "warning": "#FFD166", "danger": "#FF476F", "info": "#39E7FF"}
    border = border_colors.get(variant, "#39E7FF")
    return f"""
    <div style="background: linear-gradient(145deg, {border}16 0%, rgba(14,17,28,0.92) 100%); border: 1px solid {border}44; border-left: 4px solid {border}; border-radius: 22px; padding: 1.2rem 1.5rem; margin: 0.8rem 0; box-shadow: 0 18px 54px rgba(0,0,0,0.28);">
        <div style="font-size: 1.05rem; font-weight: 800; color: #EAF2F8; margin-bottom: 0.5rem;">{icon} {title}</div>
        <div style="color: #9AA8BA; line-height: 1.7;">{content}</div>
    </div>
    """


def calculate_portfolio_summary(history):
    if not history or len(history) < 1:
        return None
    
    df = pd.DataFrame(history)
    
    initial_e = df.iloc[0].get('E_calc', 0)
    current_e = df.iloc[-1].get('E_calc', 0)
    initial_pool_before_deposit = df.iloc[0].get('pool_end_before_deposit', 0)
    initial_pool = initial_pool_before_deposit + df.iloc[0].get('deposit_next', 0)
    current_pool = df.iloc[-1].get('pool_end_before_deposit', 0) + df.iloc[-1].get('deposit_next', 0)
    initial_account_value = initial_e + initial_pool
    current_account_value = current_e + current_pool
    initial_v = df.iloc[0].get('V_target', 0)
    current_v = df.iloc[-1].get('V_target', 0)
    total_deposits = df['deposit_next'].sum() if 'deposit_next' in df.columns else 0
    
    total_invested = initial_e + initial_pool_before_deposit + total_deposits
    roi = ((current_account_value - total_invested) / total_invested * 100) if total_invested > 0 else 0
    v_growth = ((current_v - initial_v) / initial_v * 100) if initial_v > 0 else 0
    
    avg_divergence = 0
    if 've_divergence_ratio' in df.columns:
        avg_divergence = df['ve_divergence_ratio'].mean() * 100
    
    initial_shares = df.iloc[0].get('shares_end', 0)
    current_shares = df.iloc[-1].get('shares_end', 0)
    
    return {
        'total_cycles': len(df),
        'initial_e': initial_e,
        'current_e': current_e,
        'initial_pool': initial_pool,
        'initial_pool_before_deposit': initial_pool_before_deposit,
        'current_pool': current_pool,
        'initial_account_value': initial_account_value,
        'current_account_value': current_account_value,
        'total_deposits': total_deposits,
        'total_invested': total_invested,
        'roi': roi,
        'v_growth': v_growth,
        'avg_divergence': avg_divergence,
        'initial_shares': initial_shares,
        'current_shares': current_shares,
        'shares_change': current_shares - initial_shares
    }


# =============================================================================
# Streamlit UI 구성
# =============================================================================
st.markdown(f"""
<div class="vr-hero">
  <div style="display:grid; grid-template-columns:minmax(0,1fr) 180px; gap:1.4rem; align-items:center; position:relative; z-index:1;">
    <div>
      <div class="vr-eyebrow">OFFICIAL VALUE REBALANCING · V{VR_VERSION}</div>
      <div class="vr-hero-title">VR Trading Cockpit</div>
      <div class="vr-hero-copy">
        공식 ±15% 밴드, 체결 전 보유수 기준 주문가, 그리고 대기 사이클의 이유를 한 화면에서 읽는 레버리지 ETF 밸류 리밸런싱 HUD입니다.
      </div>
      <div style="margin-top:0.9rem; color:#637085; font-size:0.82rem;">Written by <a href="https://woojingo.notion.site/" target="_blank" style="color:#39E7FF; text-decoration:none;">Woojin Go</a></div>
    </div>
    <div class="vr-orbit">
      <div style="text-align:center;">
        <div style="font-family:'Chakra Petch', monospace; color:#39E7FF; font-size:2.4rem; font-weight:700; line-height:1;">VR</div>
        <div style="font-family:'Chakra Petch', monospace; color:#637085; font-size:0.66rem; letter-spacing:0.28em;">±15 BAND</div>
      </div>
    </div>
  </div>
</div>
""", unsafe_allow_html=True)

# --- 오늘 날짜 가져오기 ---
today_date = datetime.datetime.now().strftime("%Y%m%d")

# --- 사이드바 ---
with st.sidebar:
    st.header("⚙️ 시뮬레이션 설정")
    if not st.session_state.simulation_started:
        st.session_state.ticker_name = st.text_input("분석 종목명/티커", value=st.session_state.ticker_name)
        st.session_state.current_G = st.number_input("초기 G 값 (Gradient)", min_value=1.0, value=st.session_state.current_G, step=0.1, help="VR 공식의 안정성 계수 (10~20 추천)")
        st.session_state.default_deposit = st.number_input("기본 적립/인출금 ($)", value=st.session_state.default_deposit, step=1.0, help="매 사이클 종료 후 추가될 기본 예수금입니다. 인출식 VR은 음수로 입력할 수 있습니다.")
    else:
        st.write(f"**분석 종목:** {st.session_state.ticker_name}")
        st.write(f"**현재 기준 G 값:** {st.session_state.current_G}")
        st.write(f"**현재 기준 적립/인출금:** ${st.session_state.default_deposit:,.2f}")

    st.divider()
    st.header("📐 계산 모드")
    adaptive_enabled_ui = st.toggle(
        "확장 밴드 활성화 (Advanced)",
        value=st.session_state.adaptive_band_enabled,
        key="adaptive_toggle",
        help="공식 VR 기본값은 OFF입니다. 켜면 목표 가치(V)와 평가금(E)의 차이가 클 때 거래 가능 범위를 자동으로 좁히는 앱 확장 기능을 적용합니다."
    )
    st.session_state.adaptive_band_enabled = adaptive_enabled_ui

    if adaptive_enabled_ui:
        st.caption(f"Advanced: 목표-실제 차이 {VE_DIVERGENCE_THRESHOLD*100:.0f}% 초과 시 거래 조건 완화 | 최대 완화: ±{(MAX_BAND_UPPER-1.0)*100:.0f}% 범위")
    else:
        st.caption("Official: 기본 거래 범위 ±15% 적용, V/E 상한 없음")

    st.divider()
    st.header("📈 미국 마켓 정보")
    current_time_str, market_status_str, dst_status_str, is_trading_now, is_reservation_now = get_market_status()
    st.write(f"**현재 한국 시간:** {current_time_str}")
    st.write(f"**미국 마켓 상태:** {market_status_str}")
    st.write(f"**써머타임:** {dst_status_str}")
    st.caption("* 미국 공휴일은 반영되지 않습니다. 실제 거래 가능 여부는 증권사에서 확인하세요.")

    if is_trading_now:
        st.markdown("**<span style='color:blue;'>✔️ 정규장 거래 가능</span>**", unsafe_allow_html=True)
    else:
        st.markdown("**<span style='color:red;'>❌ 정규장 거래 불가능</span>**", unsafe_allow_html=True)

    if is_reservation_now:
        st.markdown("**<span style='color:blue;'>✔️ 예약 주문 가능</span>**", unsafe_allow_html=True)
    else:
        st.markdown("**<span style='color:red;'>❌ 예약 주문 불가능</span>**", unsafe_allow_html=True)

    with st.expander("ℹ️ 도움말 및 VR 공식"):
        st.info("""
**📖 핵심 용어 설명**
- **V (목표 가치)**: 시스템이 목표로 하는 포지션 크기
- **E (평가금)**: 현재 보유 주식 × 현재 주가 = 실제 자산 가치
- **밴드**: 매수/매도를 할 수 있는 가격 범위 (LBand~HBand)
- **괴리율**: V와 E의 차이 비율 (0%가 이상적)
        """)

        st.markdown(r"""
#### Value Rebalancing (VR) 공식:
$$
V_f = V_i + \frac{pool_{prev}}{G} + \frac{(E - V_i)}{2\sqrt{G}} + deposit_{next}
$$
- $V_f$: **다음** 사이클 목표 가치
- $V_i$: **이전** 사이클 목표 가치
- $pool_{prev}$: 이전 사이클 종료 시점의 예수금 (**적립금 추가 전**)
- $G$: 그라데이션 값 (설정값)
- $E$: 이전 사이클 종료 시점의 평가금 (최종 주식 수 × 최종 가격)
- $deposit_{next}$: 다음 사이클 시작 시 추가될 적립/인출금

#### 매수/매도표 해석:
- **매수표**: 이 가격 **이하**에서 매수 가능
- **매도표**: 이 가격 **이상**에서 매도 가능
        """)

    components.html("""
        <a href="https://www.buymeacoffee.com/woojingo" target="_blank">
            <img src="https://cdn.buymeacoffee.com/buttons/v2/default-red.png" alt="Buy Me A Coffee" style="height: 40px !important;width: 145px !important;">
        </a>
        """, height=50)

# --- 메인 화면 ---

# --- 1. 초기 설정 ---
if not st.session_state.simulation_started:
    st.header("1. 🌱 초기 설정")
    use_csv = st.checkbox("📁 이전 기록 CSV 파일 사용하기", key="use_csv_checkbox")

    if use_csv:
        uploaded_file = st.file_uploader("사이클 기록 CSV 파일 업로드", type=["csv"], key="csv_uploader")
        if uploaded_file:
            try:
                df_history = pd.read_csv(uploaded_file)
                required_cols = ['cycle_num', 'V_target', 'LBand', 'HBand', 'shares_end', 'pool_end_before_deposit', 'deposit_next', 'price_end', 'G', 'E_calc', 'V_i']
                if all(col in df_history.columns for col in required_cols):
                    numeric_cols = ['V_target', 'LBand', 'HBand', 'shares_end', 'pool_end_before_deposit',
                                    'deposit_next', 'price_end', 'G', 'E_calc', 'V_i']
                    for col in numeric_cols:
                        df_history[col] = pd.to_numeric(df_history[col], errors='coerce')
                    if df_history[numeric_cols].isna().any().any():
                        bad_col = df_history[numeric_cols].isna().any()
                        bad_col_name = bad_col[bad_col].index[0]
                        st.error(f"CSV 오류: '{bad_col_name}' 컬럼에 유효하지 않은 값이 있습니다.")
                        st.session_state.history = []
                        st.stop()
                    if (df_history['price_end'] <= 0).any():
                        st.error("CSV 오류: 'price_end'에 0 이하의 값이 있습니다.")
                        st.session_state.history = []
                        st.stop()
                    if (df_history['G'] < 1).any():
                        st.error("CSV 오류: 'G' 값은 1 이상이어야 합니다.")
                        st.session_state.history = []
                        st.stop()
                    if (df_history['deposit_next'] < -df_history['pool_end_before_deposit']).any():
                        st.error("CSV 오류: 'deposit_next' 인출금은 'pool_end_before_deposit' 예수금을 초과할 수 없습니다.")
                        st.session_state.history = []
                        st.stop()
                    records = df_history.to_dict('records')
                    normalized_records = [normalize_history_entry(rec) for rec in records]
                    st.session_state.history = normalized_records
                    st.session_state.view_cycle_index = len(st.session_state.history) - 1
                    st.success(f"{len(st.session_state.history)}개 사이클 기록 로드 완료.")
                    st.info(f"분석 종목: **{st.session_state.ticker_name}**. 필요한 경우 사이드바에서 변경하세요.")
                else:
                    st.error(f"CSV 파일에 필요한 컬럼({', '.join(required_cols)})이 모두 존재하지 않습니다.")
                    st.session_state.history = []
            except Exception as e:
                st.error(f"CSV 파일 처리 오류: {e}")
                st.session_state.history = []
        else:
            st.info("⚠️ 이전 기록 CSV가 없다면, 아래 설정 후 '시뮬레이션 시작' 시 자동으로 생성/다운로드됩니다.")
    else:
        st.markdown(f"**`{st.session_state.ticker_name}` 초기값 직접 입력:**")
        col1, col2, col3 = st.columns(3)
        with col1:
            init_shares = st.number_input("초기 보유 주식 수", min_value=0, value=1, step=1, key="init_shares")
        with col2:
            init_price = st.number_input("현재 가격 ($)", min_value=0.01, value=60.0, step=0.01, key="init_price")
        with col3:
            init_pool = st.number_input("초기 예수금 ($)", min_value=0.0, value=1000.0, step=0.01, key="init_pool")

    if st.button("🚀 시뮬레이션 시작 / 재설정", key="start_button"):
        if use_csv and uploaded_file and st.session_state.history:
            last_entry = st.session_state.history[-1]
            st.session_state.current_G = last_entry.get('G', st.session_state.current_G)
            st.session_state.default_deposit = last_entry.get('deposit_next', st.session_state.default_deposit)
            st.session_state.simulation_started = True
            st.rerun()
        elif not use_csv:
            if init_shares == 0 and init_pool > 0:
                V0 = init_pool
            elif init_shares == 0 and init_pool == 0:
                st.warning("보유 주식 0주 + 예수금 $0은 시뮬레이션을 시작할 수 없습니다. 예수금을 입력해 주세요.")
                V0 = -1
            elif init_price > 0:
                V0 = init_shares * init_price
            else:
                st.warning("현재 가격은 0보다 커야 합니다.")
                V0 = -1

            if V0 >= 0:
                E0 = init_shares * init_price
                use_adaptive = st.session_state.get('adaptive_band_enabled', False)
                if use_adaptive and E0 > 0:
                    adaptive_result = calculate_adaptive_bands(V0, E0)
                    L0, H0 = adaptive_result['LBand'], adaptive_result['HBand']
                else:
                    L0, H0 = calculate_bands(V0, use_adaptive=False)
                    adaptive_result = {'divergence_ratio': 0.0, 'divergence_direction': 'neutral', 'compression_factor': 1.0, 'band_lower_ratio': BASE_BAND_LOWER, 'band_upper_ratio': BASE_BAND_UPPER}

                initial_state = {
                    'cycle_num': 0, 'V_target': V0, 'LBand': L0, 'HBand': H0,
                    'shares_end': int(init_shares), 'pool_end_before_deposit': init_pool,
                    'deposit_next': st.session_state.default_deposit, 'price_end': init_price,
                    'G': st.session_state.current_G, 'E_calc': E0, 'V_i': V0,
                    'adaptive_band_enabled': use_adaptive,
                    've_divergence_ratio': adaptive_result['divergence_ratio'],
                    've_divergence_direction': adaptive_result['divergence_direction'],
                    'band_compression_factor': adaptive_result['compression_factor'],
                    'band_lower_ratio': adaptive_result['band_lower_ratio'],
                    'band_upper_ratio': adaptive_result['band_upper_ratio']
                }
                initial_state = normalize_history_entry(initial_state)
                st.session_state.history = [initial_state]
                st.session_state.view_cycle_index = 0
                st.session_state.simulation_started = True
                st.rerun()
        elif use_csv and not uploaded_file:
            st.warning("CSV 파일을 업로드하거나, 체크박스를 해제하고 초기값을 입력해주세요.")

# --- 2. 시뮬레이션 진행 및 조회 ---
if st.session_state.simulation_started and st.session_state.history:

    nav_cols = st.columns([1, 1, 5, 1, 1])
    with nav_cols[0]:
        st.button("⏮️ 이전 사이클", on_click=go_previous, disabled=(st.session_state.view_cycle_index <= 0), use_container_width=True, key="prev_cycle")
    with nav_cols[1]:
        st.button("다음 사이클 ⏭️", on_click=go_next, disabled=(st.session_state.view_cycle_index >= len(st.session_state.history) - 1), use_container_width=True, key="next_cycle")

    try:
        active_state = copy.deepcopy(st.session_state.history[st.session_state.view_cycle_index])
        active_state = normalize_history_entry(active_state)
        display_cycle_num = active_state['cycle_num'] + 1
        st.header(f"2. `{st.session_state.ticker_name}` CYCLE {display_cycle_num} 조회")
        st.info(f"현재 **Cycle {active_state['cycle_num']}** 의 종료 시점 기록을 보고 있습니다. (다음 사이클인 Cycle {display_cycle_num}의 시작 정보)")

        V_i_display = active_state['V_target']
        shares_start_display = int(round(active_state['shares_end']))
        pool_start_display = active_state['pool_end_before_deposit'] + active_state['deposit_next']
        LBand_display = active_state['LBand']
        HBand_display = active_state['HBand']
        G_display = active_state['G']
        last_price_display = active_state['price_end']

        st.subheader(f"📊 Cycle {display_cycle_num} 시작 상태 및 목표 (예상)")
        col1, col2, col3, col4 = st.columns(4)
        col1.metric("시작 주식 수", f"{shares_start_display} 주")
        col2.metric("시작 예수금 ($)", f"${pool_start_display:,.2f}")
        col3.metric("목표 V ($)", f"${V_i_display:,.2f}")
        col4.metric("적용 G 값", f"{G_display:.1f}")

        # MOD-05: 목표 V 안전 조정 안내
        if active_state.get('ve_cap_active', False):
            uncapped_v = active_state.get('ve_cap_uncapped_v')
            if uncapped_v is not None:
                st.info(
                    f"ℹ️ **목표를 안전하게 낮췄어요**\n\n"
                    f"현재 평가금보다 목표가 너무 높아지지 않도록 조정했어요.\n\n"
                    f"- 처음 계산된 목표: ${uncapped_v:,.0f}\n"
                    f"- 이번에 적용할 목표: ${V_i_display:,.0f}\n\n"
                    f"다음 사이클에 무리한 매수 주문이 나오지 않아요. 따로 조치할 필요는 없어요."
                )

        st.markdown("**매수/매도 임계 참고:**")
        buy_target_simple, sell_target_simple = calculate_simple_targets(shares_start_display, LBand_display, HBand_display)
        buy_gap = ((last_price_display - buy_target_simple) / last_price_display * 100) if last_price_display > 0 else 0
        can_buy_now = last_price_display <= buy_target_simple
        sell_gap = ((sell_target_simple - last_price_display) / last_price_display * 100) if (last_price_display > 0 and sell_target_simple > 0) else 0
        can_sell_now = sell_target_simple > 0 and last_price_display >= sell_target_simple
        no_immediate_trade = not can_buy_now and not can_sell_now
        cycle_status = "매수 구간 진입" if can_buy_now else ("매도 구간 진입" if can_sell_now else "밴드 안쪽 대기")
        status_color = "#5DFFB3" if can_buy_now else ("#FF476F" if can_sell_now else "#39E7FF")
        mode_badge = "OFFICIAL ±15%" if not active_state.get('adaptive_band_enabled', False) else "ADVANCED BAND"
        buy_distance = "매수 조건 충족" if can_buy_now else f"{max(buy_gap, 0):.1f}% 하락 시 첫 매수"
        sell_distance = "매도 조건 충족" if can_sell_now else (f"{max(sell_gap, 0):.1f}% 상승 시 첫 매도" if sell_target_simple > 0 else "보유량 부족")
        wait_message = "현재가는 첫 매수·첫 매도 지정가 사이에 있어 이번 사이클은 대기 상태입니다." if sell_target_simple > 0 else "현재가는 첫 매수 지정가보다 위에 있고, 매도 기준은 보유 주식이 생긴 뒤 표시됩니다."

        col_t1, col_t2 = st.columns(2)
        col_t1.metric("📉 LBand ($)", f"${LBand_display:,.2f}", help="Lower Band - 평가금이 이 값 이하로 떨어지면 매수 권장")
        col_t2.metric("📈 HBand ($)", f"${HBand_display:,.2f}", help="Higher Band - 평가금이 이 값 이상으로 오르면 매도 권장")

        st.markdown(f"""
        <div class="vr-status-card" style="background: linear-gradient(145deg, {status_color}14 0%, rgba(14,17,28,0.94) 100%); border: 1px solid {status_color}55; border-left: 4px solid {status_color}; padding: 1.25rem 1.45rem; margin: 1rem 0;">
            <div style="display:flex; justify-content:space-between; gap:12px; align-items:flex-start; flex-wrap:wrap;">
                <div>
                    <div style="color:#8B949E; font-size:0.72rem; letter-spacing:0.14em; text-transform:uppercase; font-weight:700;">이번 사이클 상태</div>
                    <div style="font-family:'Chakra Petch','Noto Sans KR',sans-serif; color:{status_color}; font-size:clamp(1.8rem, 3vw, 3.4rem); font-weight:800; margin-top:0.2rem; letter-spacing:-0.04em;">{cycle_status}</div>
                    <div style="color:#8B949E; font-size:0.86rem; margin-top:0.25rem; line-height:1.55;">
                        {wait_message if no_immediate_trade else '현재가가 공식 VR 지정가 조건에 닿았습니다. 실제 주문 가능 여부는 증권사에서 확인하세요.'}
                    </div>
                </div>
                <div style="display:flex; gap:0.4rem; flex-wrap:wrap; justify-content:flex-end;">
                    <span style="font-family:'Chakra Petch',monospace; font-size:0.72rem; color:#39E7FF; border:1px solid #39E7FF55; background:#39E7FF12; border-radius:999px; padding:0.32rem 0.62rem;">{mode_badge}</span>
                    <span style="font-family:'Chakra Petch',monospace; font-size:0.72rem; color:#9AA8BA; border:1px solid #39E7FF22; background:#05060A99; border-radius:999px; padding:0.32rem 0.62rem;">PRE-TRADE SHARE BASIS</span>
                </div>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.55rem; margin-top:0.9rem;">
                <div style="border:1px solid #5DFFB344; background:#5DFFB30D; border-radius:16px; padding:0.65rem 0.8rem; color:#9AA8BA; font-size:0.82rem;"><b style="color:#5DFFB3;">매수 거리</b> · {buy_distance}</div>
                <div style="border:1px solid #FF476F44; background:#FF476F0D; border-radius:16px; padding:0.65rem 0.8rem; color:#9AA8BA; font-size:0.82rem; text-align:right;"><b style="color:#FF476F;">매도 거리</b> · {sell_distance}</div>
            </div>
            <div style="font-family:'Chakra Petch',monospace; color:#9AA8BA; font-size:0.76rem; border:1px solid #39E7FF22; background:#05060ACC; border-radius:16px; padding:0.6rem 0.78rem; margin-top:0.75rem;">
                V₂ = V₁ + Pool/G + (E−V₁)/(2√G) + 적립/인출금 · L/H = 0.85V / 1.15V · 첫 주문가 = Band ÷ 현재 보유주식
            </div>
        </div>
        """, unsafe_allow_html=True)

        # 매수/매도 신호 카드
        st.markdown("#### 🎯 거래 신호")
        signal_col1, signal_col2 = st.columns(2)

        with signal_col1:
            if can_buy_now:
                buy_status, buy_icon, buy_msg = "success", "✅", "지금 매수 가능"
            elif buy_gap <= 5:
                buy_status, buy_icon, buy_msg = "warning", "⏳", "매수에 가까워졌어요"
            else:
                buy_status, buy_icon, buy_msg = "info", "📊", f"가격이 더 내려오면 매수 ({buy_gap:.1f}%)"

            st.markdown(f"""
            <div style="background: linear-gradient(145deg, {'#5DFFB320' if buy_status == 'success' else '#FFD16620' if buy_status == 'warning' else '#39E7FF20'} 0%, rgba(14,17,28,0.94) 100%); border: 1px solid {'#5DFFB3' if buy_status == 'success' else '#FFD166' if buy_status == 'warning' else '#39E7FF'}; border-radius: 22px; padding: 1.2rem; box-shadow:0 18px 54px rgba(0,0,0,0.30);">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                    <span style="font-size: 1.5rem;">{buy_icon}</span>
                    <span style="color: {'#5DFFB3' if buy_status == 'success' else '#FFD166' if buy_status == 'warning' else '#39E7FF'}; font-weight: 700;">매수 (+1주) {buy_msg}</span>
                </div>
                <div style="font-family:'Chakra Petch',monospace; color: #EAF2F8; font-size: 1.55rem; font-weight: 700; margin: 8px 0;">${buy_target_simple:,.2f}</div>
                <div style="color: #9AA8BA; font-size: 0.85rem;">현재가 ${last_price_display:,.2f} | 괴리 {buy_gap:.1f}%</div>
            </div>
            """, unsafe_allow_html=True)

        with signal_col2:
            if sell_target_simple > 0:
                if can_sell_now:
                    sell_status, sell_icon, sell_msg = "danger", "✅", "지금 매도 가능"
                elif sell_gap <= 5:
                    sell_status, sell_icon, sell_msg = "warning", "⏳", "매도에 가까워졌어요"
                else:
                    sell_status, sell_icon, sell_msg = "info", "📊", f"가격이 더 오르면 매도 ({sell_gap:.1f}%)"

                st.markdown(f"""
                <div style="background: linear-gradient(145deg, {'#FF476F20' if sell_status == 'danger' else '#FFD16620' if sell_status == 'warning' else '#39E7FF20'} 0%, rgba(14,17,28,0.94) 100%); border: 1px solid {'#FF476F' if sell_status == 'danger' else '#FFD166' if sell_status == 'warning' else '#39E7FF'}; border-radius: 22px; padding: 1.2rem; box-shadow:0 18px 54px rgba(0,0,0,0.30);">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                        <span style="font-size: 1.5rem;">{sell_icon}</span>
                        <span style="color: {'#FF476F' if sell_status == 'danger' else '#FFD166' if sell_status == 'warning' else '#39E7FF'}; font-weight: 700;">매도 (-1주) {sell_msg}</span>
                    </div>
                    <div style="font-family:'Chakra Petch',monospace; color: #EAF2F8; font-size: 1.55rem; font-weight: 700; margin: 8px 0;">${sell_target_simple:,.2f}</div>
                    <div style="color: #9AA8BA; font-size: 0.85rem;">현재가 ${last_price_display:,.2f} | 괴리 {sell_gap:.1f}%</div>
                </div>
                """, unsafe_allow_html=True)
                # V3.1.1: 매도 목표가 괴리 경고
                if sell_gap > 20:
                    st.warning(
                        f"⚠️ 매도까지 아직 거리가 있어요. "
                        f"매도 목표가는 현재가보다 {sell_gap:.1f}% 높고, 목표와 평가금 차이가 커진 상태예요."
                    )
            else:
                st.markdown("""
                <div style="background: linear-gradient(145deg, #39E7FF10 0%, rgba(14,17,28,0.94) 100%); border: 1px solid #39E7FF22; border-radius: 22px; padding: 1.2rem;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 1.5rem;">⚠️</span>
                        <span style="color: #8B949E; font-weight: 700;">매도 불가</span>
                    </div>
                    <div style="color: #6E7681; font-size: 0.9rem;">보유량 부족 (1주 이하)</div>
                </div>
                """, unsafe_allow_html=True)

        # 적응형 밴드 정보 표시
        if active_state.get('adaptive_band_enabled', False):
            st.markdown("---")
            st.markdown("**📐 적응형 밴드 상태:**")
            compression_factor = active_state.get('band_compression_factor', 1.0)
            divergence_ratio = active_state.get('ve_divergence_ratio', 0.0)
            divergence_direction = active_state.get('ve_divergence_direction', 'neutral')
            lower_ratio = active_state.get('band_lower_ratio', BASE_BAND_LOWER)
            upper_ratio = active_state.get('band_upper_ratio', BASE_BAND_UPPER)

            direction_text = {'over': '목표 > 평가금', 'under': '평가금 > 목표', 'neutral': '균형'}.get(divergence_direction, '균형')

            adaptive_cols = st.columns(4)
            adaptive_cols[0].metric("목표-평가금 차이", f"{divergence_ratio * 100:.1f}%", delta=direction_text)
            adaptive_cols[1].metric("조건 조정", f"{(1 - compression_factor) * 100:.1f}%")
            adaptive_cols[2].metric("매수 범위", f"-{(1.0 - lower_ratio) * 100:.1f}%")
            adaptive_cols[3].metric("매도 범위", f"+{(upper_ratio - 1.0) * 100:.1f}%")

        # 상세 매수/매도 테이블
        with st.expander("상세 매수/매도 테이블 보기"):
            buy_table = calculate_buy_table(LBand_display, shares_start_display, pool_start_display, last_price_display)
            sell_table = calculate_sell_table(HBand_display, shares_start_display, last_price_display, pool_start_display)

            tcol1, tcol2 = st.columns(2)
            with tcol1:
                st.write("**매수표 (하향 지정가)**")
                if buy_table:
                    df_buy = pd.DataFrame(buy_table).set_index('목표 주식수')
                    st.dataframe(df_buy)
                    st.download_button("📥 매수표 다운로드 (.csv)", df_buy.to_csv().encode('utf-8-sig'), f"{today_date}_buy_table.csv", 'text/csv')
                else:
                    st.info("매수 가능한 래더 없음")

            with tcol2:
                st.write("**매도표 (상향 지정가)**")
                if sell_table:
                    df_sell = pd.DataFrame(sell_table).set_index('목표 주식수')
                    st.dataframe(df_sell)
                    st.download_button("📤 매도표 다운로드 (.csv)", df_sell.to_csv().encode('utf-8-sig'), f"{today_date}_sell_table.csv", 'text/csv')
                else:
                    st.info("매도 가능한 래더 없음")

    except IndexError:
        st.error("기록 인덱스 오류 발생. 시뮬레이션을 재설정해주세요.")
        st.session_state.simulation_started = False
        st.session_state.history = []
        st.session_state.view_cycle_index = 0
    except Exception as e:
        st.error(f"데이터 표시 중 오류 발생: {e}")

    # --- 다음 사이클 입력/계산 ---
    if st.session_state.view_cycle_index == len(st.session_state.history) - 1:
        st.divider()
        input_cycle_num = active_state['cycle_num'] + 1
        st.subheader(f"✍️ Cycle {input_cycle_num} 결과 입력")

        default_price = active_state['price_end']
        default_shares = int(round(active_state['shares_end']))
        default_pool = active_state['pool_end_before_deposit']
        default_deposit = st.session_state.default_deposit
        default_g = st.session_state.current_G

        st.markdown(create_highlight_card(f"Cycle {input_cycle_num} 결과 입력", "이번 사이클 종료 시점의 투자 결과를 입력하세요.", "📝", "info"), unsafe_allow_html=True)

        with st.form(key=f"cycle_{input_cycle_num}_form"):
            st.markdown("**📊 시장 데이터**")
            market_cols = st.columns(2)
            price_end_input = market_cols[0].number_input("종료 시점 가격 ($)", min_value=0.01, value=float(default_price), step=0.01, key=f"price_{input_cycle_num}")
            shares_end_input = market_cols[1].number_input("종료 시점 보유 주식 수", min_value=0, value=int(default_shares), step=1, key=f"shares_{input_cycle_num}")

            st.markdown("**💰 자금 현황**")
            fund_cols = st.columns(2)
            pool_end_input = fund_cols[0].number_input("종료 시점 예수금 ($)", min_value=0.0, value=float(default_pool), step=0.01, key=f"pool_{input_cycle_num}")
            min_deposit_next = -float(pool_end_input)
            deposit_default = max(float(default_deposit), min_deposit_next)
            deposit_next_input = fund_cols[1].number_input("다음 사이클 적립/인출금 ($)", min_value=min_deposit_next, value=deposit_default, step=1.0, key=f"deposit_{input_cycle_num}")

            st.markdown("**⚙️ 전략 설정**")
            g_input = st.number_input("적용 G 값", min_value=1.0, value=float(default_g), step=0.1, key=f"g_{input_cycle_num}")

            preview_e = shares_end_input * price_end_input
            st.caption(f"💡 예상 평가금(E): ${preview_e:,.2f} | 예상 총 자산: ${preview_e + pool_end_input:,.2f}")

            submitted = st.form_submit_button(f"🚀 Cycle {input_cycle_num + 1} 계산하기", use_container_width=True)

            if submitted:
                shares_end_int = int(round(shares_end_input))
                E_calc = shares_end_int * price_end_input
                V_i_calc = active_state['V_target']

                if deposit_next_input < -pool_end_input:
                    st.error("인출금은 종료 시점 예수금을 초과할 수 없습니다.")
                    st.stop()

                V_next = calculate_v_next(V_i_calc, pool_end_input, E_calc, g_input, deposit_next_input)

                # v3.2+: 공식 VR 모드에서는 V/E 상한을 적용하지 않는다.
                ve_cap_active = False
                ve_cap_uncapped = None

                use_adaptive = st.session_state.get('adaptive_band_enabled', False)
                if use_adaptive:
                    adaptive_result = calculate_adaptive_bands(V_next, E_calc)
                    L_next = adaptive_result['LBand']
                    H_next = adaptive_result['HBand']
                else:
                    L_next, H_next = calculate_bands(V_next, use_adaptive=False)
                    adaptive_result = {'compression_factor': 1.0, 'divergence_ratio': abs(V_next / E_calc - 1.0) if E_calc > 0 else 0.0, 'divergence_direction': 'neutral', 'band_lower_ratio': BASE_BAND_LOWER, 'band_upper_ratio': BASE_BAND_UPPER}

                new_state = {
                    'cycle_num': input_cycle_num, 'V_target': V_next, 'LBand': L_next, 'HBand': H_next,
                    'shares_end': shares_end_int, 'pool_end_before_deposit': pool_end_input,
                    'deposit_next': deposit_next_input, 'price_end': price_end_input,
                    'G': g_input, 'E_calc': E_calc, 'V_i': V_i_calc,
                    'adaptive_band_enabled': use_adaptive,
                    've_divergence_ratio': adaptive_result.get('divergence_ratio', 0.0),
                    've_divergence_direction': adaptive_result.get('divergence_direction', 'neutral'),
                    'band_compression_factor': adaptive_result.get('compression_factor', 1.0),
                    'band_lower_ratio': adaptive_result.get('band_lower_ratio', BASE_BAND_LOWER),
                    'band_upper_ratio': adaptive_result.get('band_upper_ratio', BASE_BAND_UPPER),
                    've_cap_active': ve_cap_active,
                    've_cap_uncapped_v': ve_cap_uncapped
                }

                new_state = normalize_history_entry(new_state)
                st.session_state.history.append(new_state)
                st.session_state.current_G = g_input
                st.session_state.default_deposit = deposit_next_input
                st.session_state.view_cycle_index = len(st.session_state.history) - 1
                st.success(f"Cycle {input_cycle_num + 1} 계산 완료!")
                st.rerun()

# --- 3. 결과 요약 및 다운로드 ---
if st.session_state.simulation_started and st.session_state.history:
    st.divider()
    st.header(f"3. 📜 `{st.session_state.ticker_name}` 시뮬레이션 결과 요약")

    if len(st.session_state.history) > 0:
        summary = calculate_portfolio_summary(st.session_state.history)

        if summary:
            st.markdown("### 📈 포트폴리오 성과 대시보드")

            kpi_col1, kpi_col2, kpi_col3, kpi_col4 = st.columns(4)

            with kpi_col1:
                roi_delta = f"{summary['roi']:+.1f}%" if summary['roi'] != 0 else None
                st.metric("💰 총 수익률 (ROI)", f"${summary['current_account_value']:,.0f}", delta=roi_delta, delta_color="normal" if summary['roi'] >= 0 else "inverse")

            with kpi_col2:
                v_delta = f"{summary['v_growth']:+.1f}%" if summary['v_growth'] != 0 else None
                st.metric("🎯 V 성장률", f"{summary['v_growth']:.1f}%", delta=v_delta, delta_color="normal" if summary['v_growth'] >= 0 else "inverse")

            with kpi_col3:
                st.metric("📊 완료 사이클", f"{summary['total_cycles']}회")

            with kpi_col4:
                shares_delta = f"{summary['shares_change']:+.0f}주" if summary['shares_change'] != 0 else None
                st.metric("📈 보유 주식", f"{summary['current_shares']}주", delta=shares_delta, delta_color="normal" if summary['shares_change'] >= 0 else "inverse")

            sub_col1, sub_col2, sub_col3, sub_col4 = st.columns(4)
            with sub_col1:
                st.metric("💵 총 투자금", f"${summary['total_invested']:,.0f}")
            with sub_col2:
                st.metric("🏦 현재 총자산", f"${summary['current_account_value']:,.0f}")
            with sub_col3:
                divergence_status = "정상" if summary['avg_divergence'] < 5 else ("주의" if summary['avg_divergence'] < 10 else "위험")
                st.metric("⚖️ 평균 V/E 괴리율", f"{summary['avg_divergence']:.1f}%", delta=divergence_status, delta_color="off")
            with sub_col4:
                profit_loss = summary['current_account_value'] - summary['total_invested']
                pl_delta = f"{'+'if profit_loss>=0 else ''}{profit_loss:,.0f}$"
                st.metric("💹 순이익", f"${profit_loss:,.0f}", delta=pl_delta, delta_color="normal" if profit_loss >= 0 else "inverse")

            st.markdown("---")

        # === 탭 기반 상세 정보 ===
        result_tabs = st.tabs(["📋 상세 기록", "📊 차트", "💾 다운로드"])

        with result_tabs[0]:
            df_full_history_display = pd.DataFrame(st.session_state.history)
            df_full_history_display['display_cycle'] = df_full_history_display['cycle_num'] + 1

            base_cols = ['display_cycle', 'V_i', 'price_end', 'shares_end', 'pool_end_before_deposit', 'E_calc', 'deposit_next', 'G', 'V_target', 'LBand', 'HBand']
            adaptive_cols = ['ve_divergence_ratio', 'band_compression_factor', 'band_lower_ratio', 'band_upper_ratio']
            available_cols = [c for c in base_cols + adaptive_cols if c in df_full_history_display.columns]
            df_display = df_full_history_display[available_cols].copy()

            rename_map = {
                'display_cycle': '사이클', 'V_i': '시작 V', 'price_end': '종료 가격', 'shares_end': '종료 주식수',
                'pool_end_before_deposit': '종료 예수금', 'E_calc': '평가금(E)', 'deposit_next': '다음 적립/인출금',
                'G': '적용 G', 'V_target': '다음 V', 'LBand': '다음 LBand', 'HBand': '다음 HBand',
                've_divergence_ratio': 'V/E 괴리율', 'band_compression_factor': '밴드 압축률',
                'band_lower_ratio': 'LBand 비율', 'band_upper_ratio': 'HBand 비율'
            }
            df_display = df_display.rename(columns=rename_map).set_index('사이클')

            format_dict = {
                '시작 V': '{:,.2f}', '종료 가격': '{:,.2f}', '종료 주식수': '{:.0f}', '종료 예수금': '{:,.2f}',
                '평가금(E)': '{:,.2f}', '다음 적립/인출금': '{:,.2f}', '적용 G': '{:.1f}',
                '다음 V': '{:,.2f}', '다음 LBand': '{:,.2f}', '다음 HBand': '{:,.2f}',
                'V/E 괴리율': '{:.1%}', '밴드 압축률': '{:.1%}', 'LBand 비율': '{:.1%}', 'HBand 비율': '{:.1%}'
            }
            format_dict_filtered = {k: v for k, v in format_dict.items() if k in df_display.columns}
            st.dataframe(df_display.style.format(format_dict_filtered, na_rep="-"), use_container_width=True)

        with result_tabs[1]:
            graph_df = pd.DataFrame(st.session_state.history)

            if len(graph_df) > 1:
                plot_data = graph_df.copy()
                plot_data['cycle_num_display'] = plot_data['cycle_num'] + 1
                plot_data = plot_data.set_index('cycle_num_display')

                fig1, fig2, fig3, fig4 = create_plotly_charts(plot_data)

                if fig1 and fig2 and fig3 and fig4:
                    chart_col1, chart_col2 = st.columns(2)
                    with chart_col1:
                        st.plotly_chart(fig1, use_container_width=True, key="chart_band")
                        st.plotly_chart(fig3, use_container_width=True, key="chart_pool")
                    with chart_col2:
                        st.plotly_chart(fig2, use_container_width=True, key="chart_portfolio")
                        st.plotly_chart(fig4, use_container_width=True, key="chart_shares")
                    st.caption("💡 차트를 마우스로 호버하면 상세 값을 확인할 수 있습니다.")
                else:
                    st.warning("차트 데이터가 부족합니다.")
            else:
                st.info("사이클이 최소 1회 진행되어야 차트를 표시할 수 있습니다. (데이터 2개 이상 필요)")

        with result_tabs[2]:
            st.markdown("### 📥 데이터 다운로드")

            download_col1, download_col2 = st.columns(2)

            with download_col1:
                st.markdown(create_highlight_card("CSV 데이터", "전체 사이클 기록을 CSV 파일로 다운로드합니다.", "📄", "info"), unsafe_allow_html=True)

                df_download = pd.DataFrame(st.session_state.history)
                csv_buffer = io.StringIO()
                df_download.to_csv(csv_buffer, index=False, encoding='utf-8-sig')

                csv_filename = f"{today_date}_vr_simulation_history.csv"
                st.download_button(
                    label="💾 전체 기록 CSV 다운로드",
                    data=csv_buffer.getvalue(),
                    file_name=csv_filename,
                    mime="text/csv",
                    key="download_csv",
                    use_container_width=True
                )

            with download_col2:
                st.markdown(create_highlight_card("차트 이미지 (PNG)", "시뮬레이션 차트를 고해상도 PNG 이미지로 다운로드합니다.", "🖼️", "success"), unsafe_allow_html=True)

                graph_df_mpl = pd.DataFrame(st.session_state.history)
                if len(graph_df_mpl) > 1:
                    graph_df_mpl['cycle_num_display'] = graph_df_mpl['cycle_num'] + 1
                    graph_df_mpl_indexed = graph_df_mpl.set_index('cycle_num_display')

                    fig_mpl = plot_results_matplotlib(graph_df_mpl_indexed)

                    if fig_mpl:
                        png_buffer = io.BytesIO()
                        try:
                            fig_mpl.savefig(png_buffer, format="png", dpi=300, bbox_inches="tight")
                            plt.close(fig_mpl)

                            png_filename = f"{today_date}_vr_simulation_charts.png"
                            st.download_button(
                                label="📊 전체 차트 PNG 다운로드",
                                data=png_buffer.getvalue(),
                                file_name=png_filename,
                                mime="image/png",
                                key="download_mpl_png",
                                use_container_width=True
                            )
                        except Exception as e:
                            st.error(f"차트 이미지 생성 중 오류 발생: {e}")
                            if 'fig_mpl' in locals() and plt.fignum_exists(fig_mpl.number):
                                plt.close(fig_mpl)
                    else:
                        st.info("차트 이미지를 생성하기 위한 데이터가 부족합니다.")
                else:
                    st.info("사이클이 최소 1회 진행되어야 차트 이미지를 다운로드할 수 있습니다.")

    else:
        st.info("시뮬레이션을 시작하면 결과 요약이 여기에 표시됩니다.")
