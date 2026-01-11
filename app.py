import streamlit as st
import pandas as pd
import matplotlib.pyplot as plt
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import math
import io
import datetime
import pytz
import streamlit.components.v1 as components
import copy

# --- VR V3.0 모듈 임포트 ---
try:
    from vr_v3_core import (
        VRv3Engine,
        create_vr_engine,
        render_vr_settings_sidebar,
        render_vr_status_metrics,
        VR_VERSION,
        ASSET_PRESETS
    )
    VR_V3_AVAILABLE = True
except ImportError:
    VR_V3_AVAILABLE = False
    VR_VERSION = "3.0"  # Default to 3.0 structure even if core missing, or fallback gracefully

# --- VR 파라미터 상수 ---
POOL_CAP_RATIO = 0.5  # 풀 한도: 평가금 대비 50%
BAND_RESET_LOWER_FACTOR = 0.8  # 다음 V 하단 밴드
BAND_RESET_UPPER_FACTOR = 1.2  # 다음 V 상단 밴드

# --- 적응형 밴드 파라미터 (V/E 괴리 시 밴드 압축) ---
ADAPTIVE_BAND_ENABLED = True  # 적응형 밴드 활성화 여부
BASE_BAND_LOWER = 0.85  # 기본 LBand 비율
BASE_BAND_UPPER = 1.15  # 기본 HBand 비율
MIN_BAND_LOWER = 0.92  # 최소(압축 시) LBand 비율
MAX_BAND_UPPER = 1.08  # 최대(압축 시) HBand 비율
VE_DIVERGENCE_THRESHOLD = 0.05  # V/E 괴리율 임계값 (5% 초과 시 압축 시작)
VE_MAX_DIVERGENCE = 0.50  # 최대 괴리율 (50%에서 최대 압축)
VE_CONVERGENCE_ALPHA = 0.08  # V-E 수렴 계수 (V가 E로 수렴하는 속도)

# --- 거래 친화적 밴드 파라미터 (밴드 발산 방지) ---
TRADE_FRIENDLY_BAND_ENABLED = True  # 거래 친화적 밴드 활성화
E_BASED_BAND_ANCHOR = True  # V 대신 E 기반으로 밴드 앵커링
MAX_TRADE_GAP_PERCENT = 0.05  # 매수/매도 임계가 최대 허용 괴리율 (현재가 대비 ±5%)
MIN_TRADABLE_SHARES = 2  # 최소 거래 가능 주식 수 보장 (±2주 범위 내 거래 가능하도록)
VE_ASYMMETRIC_CONVERGENCE = True  # V > E일 때 더 강한 수렴 적용
VE_CONVERGENCE_ALPHA_STRONG = 0.25  # V > E일 때 강화된 수렴 계수

# --- 페이지 설정 ---
_page_title = f"VR 시뮬레이터 V{VR_VERSION}" if VR_V3_AVAILABLE else "VR 시뮬레이터 V3.0 (Lite)"
st.set_page_config(page_title=_page_title, layout="wide", page_icon="🔄")

# --- 커스텀 CSS 테마 주입 ---
def inject_custom_css():
    """Bloomberg/트레이딩 플랫폼 스타일의 다크 테마 CSS 주입"""
    st.markdown("""
    <style>
    /* === GOOGLE FONTS === */
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;600;700;900&display=swap');
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

    /* === CSS VARIABLES === */
    :root {
        --primary-bg: #0D1117;
        --secondary-bg: #161B22;
        --card-bg: #21262D;
        --accent-bg: #30363D;
        --text-primary: #E6EDF3;
        --text-secondary: #8B949E;
        --text-muted: #6E7681;
        --accent-blue: #58A6FF;
        --accent-green: #3FB950;
        --accent-red: #F85149;
        --accent-yellow: #D29922;
        --accent-purple: #A371F7;
        --border-color: #30363D;
        --border-highlight: #58A6FF;
        --shadow-md: 0 4px 12px rgba(0,0,0,0.4);
        --shadow-lg: 0 8px 24px rgba(0,0,0,0.5);
        --radius-md: 10px;
        --radius-lg: 16px;
    }

    /* === GLOBAL STYLES === */
    .stApp {
        background: linear-gradient(135deg, var(--primary-bg) 0%, var(--secondary-bg) 100%);
    }

    [data-testid="stHeader"] {
        background: rgba(13, 17, 23, 0.8);
        backdrop-filter: blur(12px);
        border-bottom: 1px solid var(--border-color);
    }

    [data-testid="stSidebar"] {
        background: linear-gradient(180deg, var(--secondary-bg) 0%, var(--primary-bg) 100%);
        border-right: 1px solid var(--border-color);
    }

    /* === TYPOGRAPHY === */
    h1, h2, h3, h4, h5, h6, .stMarkdown h1, .stMarkdown h2, .stMarkdown h3 {
        font-family: 'Noto Sans KR', 'Inter', sans-serif !important;
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

    h2, .stMarkdown h2 {
        font-size: 1.5rem !important;
        margin-top: 2rem !important;
    }

    p, span, label, .stMarkdown, div {
        font-family: 'Noto Sans KR', 'Inter', sans-serif;
    }

    /* === METRIC CARDS === */
    [data-testid="stMetric"] {
        background: linear-gradient(135deg, var(--card-bg) 0%, var(--secondary-bg) 100%);
        border: 1px solid var(--border-color);
        border-radius: var(--radius-lg);
        padding: 1.2rem 1rem;
        box-shadow: var(--shadow-md);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    [data-testid="stMetric"]:hover {
        transform: translateY(-4px);
        box-shadow: var(--shadow-lg), 0 0 20px rgba(88, 166, 255, 0.1);
        border-color: var(--border-highlight);
    }

    [data-testid="stMetric"] label {
        color: var(--text-secondary) !important;
        font-size: 0.85rem !important;
        font-weight: 600 !important;
        text-transform: uppercase;
        letter-spacing: 0.08em;
    }

    [data-testid="stMetric"] [data-testid="stMetricValue"] {
        color: var(--text-primary) !important;
        font-size: 1.6rem !important;
        font-weight: 700 !important;
    }

    /* === BUTTONS === */
    .stButton > button {
        background: linear-gradient(135deg, var(--accent-blue) 0%, #1F6FEB 100%);
        color: white !important;
        border: none;
        border-radius: var(--radius-md);
        padding: 0.6rem 1.5rem;
        font-weight: 600;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 4px 14px rgba(88, 166, 255, 0.3);
    }

    .stButton > button:hover {
        background: linear-gradient(135deg, #1F6FEB 0%, #1158C7 100%);
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(88, 166, 255, 0.4);
    }

    .stButton > button:disabled {
        background: var(--accent-bg) !important;
        color: var(--text-muted) !important;
        box-shadow: none;
    }

    /* === DOWNLOAD BUTTONS === */
    .stDownloadButton > button {
        background: linear-gradient(135deg, var(--accent-green) 0%, #238636 100%);
        color: white !important;
        box-shadow: 0 4px 14px rgba(63, 185, 80, 0.3);
    }

    .stDownloadButton > button:hover {
        background: linear-gradient(135deg, #238636 0%, #196C2E 100%);
    }

    /* === FORM INPUTS === */
    [data-baseweb="input"], [data-baseweb="base-input"] {
        background-color: var(--card-bg) !important;
        border: 1px solid var(--border-color) !important;
        border-radius: var(--radius-md) !important;
    }

    [data-baseweb="input"]:focus-within {
        border-color: var(--accent-blue) !important;
        box-shadow: 0 0 0 3px rgba(88, 166, 255, 0.15) !important;
    }

    /* === DATAFRAMES & TABLES === */
    [data-testid="stDataFrame"] {
        background: var(--card-bg);
        border-radius: var(--radius-lg);
        border: 1px solid var(--border-color);
        box-shadow: var(--shadow-md);
    }

    [data-testid="stDataFrame"] thead th {
        color: var(--accent-blue) !important;
        font-weight: 700 !important;
        text-transform: uppercase;
        font-size: 0.8rem !important;
        border-bottom: 2px solid var(--accent-blue) !important;
    }

    [data-testid="stDataFrame"] tbody tr:nth-child(even) {
        background-color: rgba(48, 54, 61, 0.3);
    }

    [data-testid="stDataFrame"] tbody tr:hover {
        background-color: rgba(88, 166, 255, 0.1);
    }

    /* === EXPANDERS === */
    [data-testid="stExpander"] {
        background: var(--card-bg);
        border: 1px solid var(--border-color);
        border-radius: var(--radius-lg);
        margin: 0.5rem 0;
    }

    [data-testid="stExpander"] summary {
        background: linear-gradient(135deg, rgba(88, 166, 255, 0.1) 0%, rgba(163, 113, 247, 0.1) 100%);
        color: var(--text-primary) !important;
        font-weight: 600;
        padding: 1rem 1.2rem;
    }

    /* === TABS === */
    [data-baseweb="tab-list"] {
        background: var(--card-bg);
        border-radius: var(--radius-lg);
        padding: 4px;
    }

    [data-baseweb="tab"] {
        color: var(--text-secondary) !important;
        border-radius: var(--radius-md);
        font-weight: 600;
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
        margin: 2rem 0;
    }

    /* === SCROLLBAR === */
    ::-webkit-scrollbar { width: 8px; height: 8px; }
    ::-webkit-scrollbar-track { background: var(--secondary-bg); border-radius: 4px; }
    ::-webkit-scrollbar-thumb {
        background: linear-gradient(135deg, var(--accent-blue) 0%, var(--accent-purple) 100%);
        border-radius: 4px;
    }

    /* === FORM CONTAINER === */
    [data-testid="stForm"] {
        background: var(--card-bg);
        border: 1px solid var(--border-color);
        border-radius: var(--radius-lg);
        padding: 1.5rem;
    }

    /* === SIDEBAR === */
    [data-testid="stSidebar"] h1, [data-testid="stSidebar"] h2 {
        background: none;
        -webkit-text-fill-color: var(--text-primary);
    }

    [data-testid="stSidebar"] label {
        color: var(--text-secondary) !important;
        font-weight: 600 !important;
    }

    /* === RESPONSIVE === */
    @media (max-width: 768px) {
        h1, .stMarkdown h1 { font-size: 1.6rem !important; }
        [data-testid="stMetric"] { padding: 0.8rem 0.6rem; }
        [data-testid="stMetric"] [data-testid="stMetricValue"] { font-size: 1.3rem !important; }
        
        /* Mobile specific adjustments */
        .stButton > button {
            width: 100%;
            margin-bottom: 0.5rem;
        }
        
        [data-testid="stDataFrame"] {
            overflow-x: auto;
            display: block;
        }
        
        /* Adjust padding for main container on mobile */
        .block-container {
            padding-left: 1rem !important;
            padding-right: 1rem !important;
        }
    }
    </style>
    """, unsafe_allow_html=True)

# CSS 주입 실행
inject_custom_css()

# --- 세션 상태 초기화 ---
if 'history' not in st.session_state:
    st.session_state.history = []
if 'current_G' not in st.session_state:
    st.session_state.current_G = 10.0
if 'default_deposit' not in st.session_state:
    st.session_state.default_deposit = 50.0
if 'simulation_started' not in st.session_state:
    st.session_state.simulation_started = False
if 'view_cycle_index' not in st.session_state:
    st.session_state.view_cycle_index = 0
if 'ticker_name' not in st.session_state:
    st.session_state.ticker_name = "TQQQ"

# --- V3.0 세션 상태 초기화 ---
if 'vr_v3_enabled' not in st.session_state:
    st.session_state.vr_v3_enabled = VR_V3_AVAILABLE
if 'vr_engine' not in st.session_state:
    st.session_state.vr_engine = None
if 'price_history' not in st.session_state:
    st.session_state.price_history = []
if 'asset_preset' not in st.session_state:
    st.session_state.asset_preset = 'TQQQ'
if 'enable_momentum_filter' not in st.session_state:
    st.session_state.enable_momentum_filter = True
if 'enable_risk_management' not in st.session_state:
    st.session_state.enable_risk_management = True

# =============================================================================
# 핵심 계산 함수
# =============================================================================

def calculate_v_next(V_i, pool_before_deposit, E_calc, G, deposit_next, use_convergence=True):
    """다음 목표 가치(V_f) 계산 (V-E 수렴 메커니즘 포함)

    Args:
        V_i: 이전 목표 가치
        pool_before_deposit: 이전 사이클 종료 예수금 (적립금 추가 전)
        E_calc: 이전 사이클 종료 평가금
        G: 그라데이션 값
        deposit_next: 다음 사이클 적립금
        use_convergence: V-E 수렴 메커니즘 적용 여부

    Returns:
        float: 다음 목표 가치 (V_f)
    """
    if G <= 0:
        return V_i
    try:
        term1 = V_i
        term2 = pool_before_deposit / G
        term3 = (E_calc - V_i) / (2 * math.sqrt(G))
        term4 = deposit_next

        # V-E 수렴 항 (V가 E를 향해 수렴하도록 유도)
        # V > E일 때 음수가 되어 V 성장을 억제, V < E일 때 양수가 되어 V 성장 촉진
        convergence_term = 0.0
        if use_convergence and ADAPTIVE_BAND_ENABLED and VE_CONVERGENCE_ALPHA > 0:
            # V2.5: 비대칭 수렴 - V > E일 때 더 강한 수렴 적용
            if VE_ASYMMETRIC_CONVERGENCE and V_i > E_calc:
                # V가 E보다 클 때 강화된 수렴 계수 사용
                alpha = VE_CONVERGENCE_ALPHA_STRONG
            else:
                alpha = VE_CONVERGENCE_ALPHA
            convergence_term = alpha * (E_calc - V_i)

        V_f = term1 + term2 + term3 + term4 + convergence_term

        # V2.5: V_f가 양수임을 보장 (극단적 수렴 시에도 최소값 유지)
        V_f = max(V_f, 0.01)

        return V_f
    except Exception as e:
        st.error(f"V 계산 오류: {e}")
        return V_i

def calculate_bands(V_target, E_calc=None, use_adaptive=None):
    """LBand, HBand 계산 (적응형 밴드 지원, V3.0 포함)

    Args:
        V_target: 목표 가치
        E_calc: 현재 평가금 (적응형 밴드 사용 시 필요)
        use_adaptive: 적응형 밴드 사용 여부 (None이면 전역 설정 사용)

    Returns:
        tuple: (LBand, HBand)
    """
    # V3.0: 변동성 적응형 밴드 사용
    if (st.session_state.get('vr_v3_enabled') and
        st.session_state.get('vr_engine') is not None):
        try:
            engine = st.session_state.vr_engine
            bands_result = engine.calculate_adaptive_bands(V_target, E_calc or V_target)
            return bands_result.l_band, bands_result.h_band
        except Exception as e:
            # V3.0 실패 시 V2.5로 폴백
            pass

    # V2.5 로직 (기존)
    if use_adaptive is None:
        use_adaptive = ADAPTIVE_BAND_ENABLED

    # 기본 밴드 (적응형 비활성화 또는 E_calc 없음)
    if not use_adaptive or E_calc is None or E_calc <= 0:
        return BASE_BAND_LOWER * V_target, BASE_BAND_UPPER * V_target

    # 적응형 밴드 계산
    result = calculate_adaptive_bands(V_target, E_calc)
    return result['LBand'], result['HBand']


def calculate_band_compression_factor(V_target, E_calc):
    """V/E 괴리율에 따른 밴드 압축 계수 계산

    Args:
        V_target: 목표 가치
        E_calc: 현재 평가금

    Returns:
        tuple: (compression_factor, divergence_ratio, divergence_direction)
            - compression_factor: 1.0 (압축 없음) ~ 0.0 (최대 압축)
            - divergence_ratio: V/E 괴리율 (절대값)
            - divergence_direction: 'over' (V>E), 'under' (V<E), 'neutral'
    """
    if E_calc <= 0 or V_target <= 0:
        return 1.0, 0.0, 'neutral'

    ve_ratio = V_target / E_calc
    divergence_ratio = abs(ve_ratio - 1.0)

    # 괴리 방향 결정
    if ve_ratio > 1.0 + VE_DIVERGENCE_THRESHOLD:
        divergence_direction = 'over'
    elif ve_ratio < 1.0 - VE_DIVERGENCE_THRESHOLD:
        divergence_direction = 'under'
    else:
        divergence_direction = 'neutral'

    # 압축 계수 계산 (선형 스케일링)
    if divergence_ratio <= VE_DIVERGENCE_THRESHOLD:
        compression_factor = 1.0
    else:
        # 임계값 초과분에 대해 선형 압축
        excess = divergence_ratio - VE_DIVERGENCE_THRESHOLD
        max_excess = VE_MAX_DIVERGENCE - VE_DIVERGENCE_THRESHOLD
        normalized = min(excess / max_excess, 1.0) if max_excess > 0 else 1.0
        compression_factor = 1.0 - normalized

    return compression_factor, divergence_ratio, divergence_direction


def calculate_adaptive_bands(V_target, E_calc, shares=None, current_price=None, use_trade_friendly=None):
    """V/E 괴리율에 따라 압축된 적응형 밴드 계산 (V2.5: 거래 친화적 밴드 포함)

    Args:
        V_target: 목표 가치
        E_calc: 현재 평가금
        shares: 현재 보유 주식 수 (거래 친화적 밴드 계산용)
        current_price: 현재 가격 (거래 친화적 밴드 계산용)
        use_trade_friendly: 거래 친화적 밴드 사용 여부 (None이면 전역 설정 사용)

    Returns:
        dict: LBand, HBand, compression_factor, divergence_ratio 등
    """
    # V2.5: use_trade_friendly가 명시되지 않으면 전역 설정 사용
    if use_trade_friendly is None:
        use_trade_friendly = TRADE_FRIENDLY_BAND_ENABLED

    compression_factor, divergence_ratio, divergence_direction = \
        calculate_band_compression_factor(V_target, E_calc)

    # 압축된 밴드 비율 계산 (선형 보간)
    # compression_factor=1.0: 기본 밴드, compression_factor=0.0: 최대 압축
    compressed_lower = BASE_BAND_LOWER + (MIN_BAND_LOWER - BASE_BAND_LOWER) * (1 - compression_factor)
    compressed_upper = BASE_BAND_UPPER + (MAX_BAND_UPPER - BASE_BAND_UPPER) * (1 - compression_factor)

    # V2.5: E 기반 밴드 앵커링 (V 대신 E 사용)
    if use_trade_friendly and E_BASED_BAND_ANCHOR and E_calc > 0:
        # V와 E 중 더 작은 값을 기준으로 밴드 계산 (밴드 폭 억제)
        anchor_value = min(V_target, E_calc)
    else:
        anchor_value = V_target

    LBand = compressed_lower * anchor_value
    HBand = compressed_upper * anchor_value

    # V2.5: 거래 친화적 밴드 - 매수/매도 임계가 조정
    trade_friendly_applied = False
    if use_trade_friendly and shares is not None and current_price is not None and current_price > 0:
        LBand, HBand, trade_friendly_applied = apply_trade_friendly_bands(
            LBand, HBand, shares, current_price, anchor_value
        )
        # 거래 친화적 밴드 적용 후 비율 재계산
        if anchor_value > 0:
            compressed_lower = LBand / anchor_value
            compressed_upper = HBand / anchor_value

    return {
        'LBand': LBand,
        'HBand': HBand,
        'compression_factor': compression_factor,
        'divergence_ratio': divergence_ratio,
        'divergence_direction': divergence_direction,
        'band_lower_ratio': compressed_lower,
        'band_upper_ratio': compressed_upper,
        'trade_friendly_applied': trade_friendly_applied,
        'anchor_value': anchor_value
    }


def apply_trade_friendly_bands(LBand, HBand, shares, current_price, anchor_value):
    """거래 친화적 밴드 적용 - 매수/매도가 현재가 대비 합리적 범위 내에서 가능하도록 조정

    Args:
        LBand: 현재 LBand
        HBand: 현재 HBand
        shares: 보유 주식 수
        current_price: 현재 가격
        anchor_value: 밴드 기준값 (V 또는 E)

    Returns:
        tuple: (adjusted_LBand, adjusted_HBand, was_adjusted)
    """
    if shares <= 0 or current_price <= 0:
        return LBand, HBand, False

    s = int(round(shares))
    was_adjusted = False

    # 현재 매수/매도 임계가 계산
    buy_threshold = LBand / (s + 1) if (s + 1) > 0 else 0  # 매수 최대 허용가
    sell_threshold = HBand / (s - 1) if s > 1 else (HBand / s if s > 0 else 0)  # 매도 최소 허용가

    # 매수 임계가 조정: 현재가에서 너무 멀면 조정
    max_buy_price = current_price * (1 - MAX_TRADE_GAP_PERCENT)  # 현재가의 95%까지 하락하면 매수
    if buy_threshold < max_buy_price:
        # LBand를 조정하여 매수 임계가를 max_buy_price로 설정
        # LBand / (s + 1) = max_buy_price → LBand = max_buy_price * (s + 1)
        adjusted_LBand = max_buy_price * (s + 1)
        # 단, LBand가 anchor_value의 일정 비율 이하로 내려가지 않도록 제한
        min_LBand = anchor_value * MIN_BAND_LOWER
        LBand = max(adjusted_LBand, min_LBand)
        was_adjusted = True

    # 매도 임계가 조정: 현재가에서 너무 멀면 조정
    min_sell_price = current_price * (1 + MAX_TRADE_GAP_PERCENT)  # 현재가의 105%까지 상승하면 매도
    if s > 1 and sell_threshold > min_sell_price:
        # HBand를 조정하여 매도 임계가를 min_sell_price로 설정
        # HBand / (s - 1) = min_sell_price → HBand = min_sell_price * (s - 1)
        adjusted_HBand = min_sell_price * (s - 1)
        # 단, HBand가 anchor_value의 일정 비율 이상으로 올라가지 않도록 제한
        max_HBand = anchor_value * MAX_BAND_UPPER
        HBand = min(adjusted_HBand, max_HBand)
        was_adjusted = True

    # 최소 거래 가능 주식 수 보장
    # MIN_TRADABLE_SHARES 주 범위 내에서 매수/매도가 가능하도록 밴드 조정
    if MIN_TRADABLE_SHARES > 1:
        target_buy_shares = s + MIN_TRADABLE_SHARES
        target_sell_shares = max(0, s - MIN_TRADABLE_SHARES)

        # 매수 N주가 가능하려면: current_price <= LBand / target_buy_shares
        # → LBand >= current_price * target_buy_shares
        min_LBand_for_trade = current_price * target_buy_shares * 0.98  # 2% 마진
        if LBand < min_LBand_for_trade:
            LBand = min_LBand_for_trade
            was_adjusted = True

        # 매도 N주가 가능하려면: current_price >= HBand / target_sell_shares (target_sell_shares > 0)
        # → HBand <= current_price * target_sell_shares
        if target_sell_shares > 0:
            max_HBand_for_trade = current_price * target_sell_shares * 1.02  # 2% 마진
            if HBand > max_HBand_for_trade:
                HBand = max_HBand_for_trade
                was_adjusted = True

    # [Safety Buffer] Minimum Band Width Logic
    # Prevent bands from becoming too narrow when share count is high
    # Ensure at least +/- 2% width from anchor value
    MIN_WIDTH_PERCENT = 0.02
    safety_LBand = anchor_value * (1 - MIN_WIDTH_PERCENT)
    safety_HBand = anchor_value * (1 + MIN_WIDTH_PERCENT)

    # If LBand is too high (close to anchor), push it down
    if LBand > safety_LBand:
        LBand = safety_LBand
        was_adjusted = True
    
    # If HBand is too low (close to anchor), push it up
    if HBand < safety_HBand:
        HBand = safety_HBand
        was_adjusted = True

    # V2.5: LBand <= HBand 불변 조건 보장
    if LBand > HBand:
        # 밴드가 역전된 경우 중간점 기준으로 재조정
        midpoint = (LBand + HBand) / 2
        LBand = midpoint * 0.95
        HBand = midpoint * 1.05
        was_adjusted = True

    return LBand, HBand, was_adjusted

def calculate_simple_targets(shares_start, LBand, HBand):
    """단순 매수/매도 임계가 계산 (+/- 1주 기준)
    반환값은 '허용 상한 지정가(매수)'와 '허용 하한 지정가(매도)'에 해당한다.
    """
    buy_target_price = 0
    s = max(0, int(round(shares_start)))
    if s >= 0:
        buy_target_price = LBand / (s + 1) if (s + 1) > 0 else 0

    sell_target_price = 0
    if s > 1:
        sell_target_price = HBand / (s - 1) if (s - 1) > 0 else 0
    elif s == 1:
        sell_target_price = HBand / s if s > 0 else 0

    return round(buy_target_price, 2), round(sell_target_price, 2)


def enforce_pool_cap(pool_value, portfolio_value, cap_ratio=POOL_CAP_RATIO):
    """풀(현금)이 평가금의 일정 비율을 초과하지 않도록 제한"""
    cap_limit = max(0.0, cap_ratio * portfolio_value)
    effective_pool = min(pool_value, cap_limit)
    return effective_pool, cap_limit


def apply_band_reset(V_candidate, portfolio_value, pool_value, cap_limit):
    """평가금이 목표 밴드 밖으로 벗어나면 V를 재조정"""
    reset_type = "none"
    lower_bound = BAND_RESET_LOWER_FACTOR * V_candidate
    upper_bound = BAND_RESET_UPPER_FACTOR * V_candidate

    if BAND_RESET_LOWER_FACTOR > 0 and portfolio_value < lower_bound:
        V_candidate = portfolio_value / BAND_RESET_LOWER_FACTOR
        reset_type = "lower"
    elif (
        BAND_RESET_UPPER_FACTOR > 0
        and cap_limit > 0
        and pool_value >= cap_limit
        and portfolio_value > upper_bound
    ):
        V_candidate = portfolio_value / BAND_RESET_UPPER_FACTOR
        reset_type = "upper"

    if reset_type != "none":
        lower_bound = BAND_RESET_LOWER_FACTOR * V_candidate
        upper_bound = BAND_RESET_UPPER_FACTOR * V_candidate

    return V_candidate, reset_type, lower_bound, upper_bound


def normalize_history_entry(entry):
    """신규/기존 기록에 필요한 메타데이터 필드를 채운다"""
    entry = copy.deepcopy(entry)
    E_val = float(entry.get('E_calc', 0.0))
    pool_val = float(entry.get('pool_end_before_deposit', 0.0))
    V_target = float(entry.get('V_target', entry.get('V_i', 0.0)))

    cap_limit = entry.get('pool_cap_limit')
    if cap_limit is None:
        cap_limit = POOL_CAP_RATIO * E_val
        entry['pool_cap_limit'] = cap_limit

    if 'pool_effective_for_v' not in entry:
        entry['pool_effective_for_v'] = min(pool_val, cap_limit)

    entry.setdefault('pool_cap_ratio_used', POOL_CAP_RATIO)
    entry.setdefault('band_reset_type', 'none')
    entry.setdefault('band_reset_range_min', BAND_RESET_LOWER_FACTOR * V_target)
    entry.setdefault('band_reset_range_max', BAND_RESET_UPPER_FACTOR * V_target)

    # --- 적응형 밴드 메타데이터 ---
    entry.setdefault('adaptive_band_enabled', ADAPTIVE_BAND_ENABLED)

    # V/E 괴리율 및 압축 계수 계산 (기존 기록 호환성)
    if 've_divergence_ratio' not in entry:
        if E_val > 0 and V_target > 0:
            compression_factor, divergence_ratio, divergence_direction = \
                calculate_band_compression_factor(V_target, E_val)
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

    # 기본값 설정 (필드가 없을 경우)
    entry.setdefault('ve_divergence_direction', 'neutral')
    entry.setdefault('band_compression_factor', 1.0)
    entry.setdefault('band_lower_ratio', BASE_BAND_LOWER)
    entry.setdefault('band_upper_ratio', BASE_BAND_UPPER)

    # V2.5: 거래 친화적 밴드 메타데이터
    entry.setdefault('trade_friendly_applied', False)
    entry.setdefault('trade_friendly_enabled', TRADE_FRIENDLY_BAND_ENABLED)

    return entry

# ========================= NEW: Hybrid Buy Tables ============================
def calculate_buy_tables_v2(LBand, current_shares, pool, buy_ratio, current_price, max_levels=1000):
    """
    하이브리드 매수 테이블 생성
      - buy_now_table: 현재가 기준 즉시 체결 가능한 연속 매수 내역 (현금 차감은 현재가)
      - ladder_table: 남은 배정 현금으로 깔 수 있는 '대기 지정가' 래더 (상한가로 여력 예약)
    """
    buy_now_table = []
    ladder_table = []

    s = max(0, int(math.floor(current_shares)))
    allocated_cash = pool * buy_ratio
    remaining_cash = allocated_cash

    if current_price <= 0:
        return buy_now_table, ladder_table

    # 즉시 체결 가능한 최대 주수(밴드/현금 동시 제약)
    max_by_band = max(0, int(math.floor(LBand / current_price) - s))
    max_by_cash = max(0, int(math.floor(remaining_cash / current_price)))
    q_now = min(max_by_band, max_by_cash)

    for _ in range(q_now):
        s += 1
        remaining_cash -= current_price
        buy_now_table.append({
            '매수 후 목표 주식수': s,
            '체결가/지정가 ($)': round(current_price, 2),
            '매수 후 총 예수금 ($)': round(pool - (allocated_cash - remaining_cash), 2)
        })

    # 하향 래더: 상한가(LBand/(s+1))로 지정가를 내며 예약
    iterations = 0
    while remaining_cash > 0 and iterations < max_levels:
        iterations += 1
        next_shares = s + 1
        limit_price = LBand / next_shares if next_shares > 0 else 0
        if limit_price <= 0 or remaining_cash < limit_price:
            break
        remaining_cash -= limit_price
        s = next_shares
        ladder_table.append({
            '매수 후 목표 주식수': s,
            '대기 지정가 ($)': round(limit_price, 2),
            '매수 후 총 예수금 ($)': round(pool - (allocated_cash - remaining_cash), 2)
        })

    if iterations >= max_levels:
        st.warning("매수 래더 계산 중 최대 반복 횟수에 도달했습니다. 결과가 불완전할 수 있습니다.")

    return buy_now_table, ladder_table

# ========================= NEW: Hybrid Sell Tables ===========================
def calculate_sell_tables_v2(HBand, current_shares, pool, current_price, max_levels=1000):
    """
    하이브리드 매도 테이블 생성
      - sell_now_table: 현재가 기준 즉시 체결 가능한 연속 매도 내역 (현금 유입은 현재가)
      - ladder_table: 남은 보유 주식으로 깔 수 있는 상향 래더(대기 지정가)
    """
    sell_now_table = []
    ladder_table = []

    s = max(0, int(math.floor(current_shares)))
    if s == 0 or current_price <= 0:
        return sell_now_table, ladder_table

    iterations = 0

    # 즉시 매도: 현재가가 허용 하한(HBand/target) 이상이면 연속 매도
    while s > 0 and iterations < max_levels:
        iterations += 1
        target_after_sell = s - 1
        threshold = HBand if target_after_sell == 0 else (HBand / target_after_sell)
        if current_price >= threshold:
            pool += current_price
            s = target_after_sell
            sell_now_table.append({
                '매도 후 목표 주식수': s,
                '체결가/지정가 ($)': round(current_price, 2),
                '매도 후 총 예수금 ($)': round(pool, 2)
            })
        else:
            break

    # 상향 래더: 허용 하한가격(threshold) 이상일 때만 체결되도록 지정가 설정
    iterations = 0
    temp_s = s
    while temp_s > 0 and iterations < max_levels:
        iterations += 1
        target_after_sell = temp_s - 1
        threshold = HBand if target_after_sell == 0 else (HBand / target_after_sell)
        ladder_table.append({
            '매도 후 목표 주식수': target_after_sell,
            '대기 지정가 ($)': round(threshold, 2),
            '매도 후 총 예수금 ($)': round(pool + (threshold if target_after_sell < temp_s else 0), 2) if target_after_sell < temp_s else round(pool, 2)
        })
        temp_s = target_after_sell

    if iterations >= max_levels:
        st.warning("매도 래더 계산 중 최대 반복 횟수에 도달했습니다. 결과가 불완전할 수 있습니다.")

    return sell_now_table, ladder_table

# --- 마켓 상태 함수 (변경 없음) ---
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
        localized_us_time = us_eastern.localize(datetime.datetime.combine(us_time.date(), datetime.time(0, 0)))
        current_us_dt_naive = datetime.datetime.combine(us_time.date(), us_time.time())
        localized_us_dt = us_eastern.localize(current_us_dt_naive)

        market_open_dt_naive = datetime.datetime.combine(us_time.date(), market_open_time_in_et)
        market_open_dt_et = us_eastern.localize(market_open_dt_naive)

        if localized_us_dt.time() >= market_open_time_in_et:
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

# --- 네비게이션 콜백 함수 (변경 없음) ---
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

    # 다크 테마 스타일 적용
    plt.style.use('dark_background')
    fig, axs = plt.subplots(2, 2, figsize=(14, 10), facecolor='#0D1117')
    fig.patch.set_facecolor('#0D1117')

    # 색상 팔레트
    colors = {
        'v_target': '#58A6FF',
        'e_calc': '#A371F7',
        'lband': '#3FB950',
        'hband': '#F85149',
        'pool': '#39D353',
        'shares': '#D29922'
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
    axs[0, 0].plot(x_axis, history_df['V_target'], marker='o', linestyle='-', linewidth=2.5,
                   color=colors['v_target'], label='Target (V)', markersize=6)
    axs[0, 0].plot(x_axis, history_df['LBand'], marker='^', linestyle='--', linewidth=2,
                   color=colors['lband'], label='LBand', markersize=5, alpha=0.9)
    axs[0, 0].plot(x_axis, history_df['HBand'], marker='v', linestyle='--', linewidth=2,
                   color=colors['hband'], label='HBand', markersize=5, alpha=0.9)
    axs[0, 0].fill_between(x_axis, history_df['LBand'], history_df['HBand'],
                           color=colors['v_target'], alpha=0.08)
    axs[0, 0].set_title('Value Band Tracking', fontsize=14, fontweight='bold', color='#E6EDF3', pad=15)
    axs[0, 0].set_xlabel('Cycle', fontsize=11, color='#8B949E')
    axs[0, 0].set_ylabel('Value ($)', fontsize=11, color='#8B949E')
    axs[0, 0].legend(loc='upper left', frameon=True, facecolor='#21262D', edgecolor='#30363D', fontsize=9)

    # Chart 2: Portfolio vs Target
    axs[0, 1].plot(x_axis, history_df['E_calc'], marker='s', linestyle='-', linewidth=2.5,
                   color=colors['e_calc'], label='Portfolio (E)', markersize=6)
    axs[0, 1].plot(x_axis, history_df['V_target'], marker='o', linestyle=':', linewidth=2,
                   color=colors['v_target'], label='Target (V)', markersize=5, alpha=0.8)
    axs[0, 1].fill_between(x_axis, history_df['E_calc'], history_df['V_target'],
                           alpha=0.15, color=colors['e_calc'])
    axs[0, 1].set_title('Portfolio (E) vs Target (V)', fontsize=14, fontweight='bold', color='#E6EDF3', pad=15)
    axs[0, 1].set_xlabel('Cycle', fontsize=11, color='#8B949E')
    axs[0, 1].set_ylabel('Value ($)', fontsize=11, color='#8B949E')
    axs[0, 1].legend(loc='upper left', frameon=True, facecolor='#21262D', edgecolor='#30363D', fontsize=9)

    # Chart 3: Pool Balance
    pool_start_of_cycle = history_df['pool_end_before_deposit'] + history_df['deposit_next']
    axs[1, 0].bar(x_axis, pool_start_of_cycle, color=colors['pool'], alpha=0.8, label='Pool Balance')
    axs[1, 0].set_title('Pool Balance Trend', fontsize=14, fontweight='bold', color='#E6EDF3', pad=15)
    axs[1, 0].set_xlabel('Cycle', fontsize=11, color='#8B949E')
    axs[1, 0].set_ylabel('Pool ($)', fontsize=11, color='#8B949E')
    axs[1, 0].legend(loc='upper left', frameon=True, facecolor='#21262D', edgecolor='#30363D', fontsize=9)

    # Chart 4: Shares Held
    axs[1, 1].plot(x_axis, history_df['shares_end'], marker='D', linestyle='-', linewidth=2.5,
                   color=colors['shares'], label='Shares Held', markersize=6)
    axs[1, 1].fill_between(x_axis, 0, history_df['shares_end'], alpha=0.2, color=colors['shares'])
    axs[1, 1].set_title('Shares Held Trend', fontsize=14, fontweight='bold', color='#E6EDF3', pad=15)
    axs[1, 1].set_xlabel('Cycle', fontsize=11, color='#8B949E')
    axs[1, 1].set_ylabel('Shares', fontsize=11, color='#8B949E')
    axs[1, 1].legend(loc='upper left', frameon=True, facecolor='#21262D', edgecolor='#30363D', fontsize=9)

    fig.tight_layout(pad=3)
    return fig

# --- Plotly 인터랙티브 차트 생성 함수 ---
def create_plotly_charts(history_df):
    """Plotly를 사용한 인터랙티브 차트 생성"""
    if history_df.empty or len(history_df) < 2:
        return None, None, None, None

    # 색상 팔레트 (다크 테마)
    colors = {
        'v_target': '#58A6FF',
        'e_calc': '#A371F7',
        'lband': '#3FB950',
        'hband': '#F85149',
        'pool': '#39D353',
        'shares': '#D29922',
        'bg': '#0D1117',
        'paper': '#161B22',
        'grid': '#30363D',
        'text': '#E6EDF3',
        'text_secondary': '#8B949E'
    }

    x_axis = history_df.index.tolist()

    # 공통 레이아웃 설정
    layout_common = dict(
        paper_bgcolor=colors['paper'],
        plot_bgcolor=colors['bg'],
        font=dict(family='Noto Sans KR, Inter, sans-serif', color=colors['text']),
        xaxis=dict(
            gridcolor=colors['grid'],
            linecolor=colors['grid'],
            tickfont=dict(color=colors['text_secondary']),
            title_font=dict(color=colors['text_secondary'])
        ),
        yaxis=dict(
            gridcolor=colors['grid'],
            linecolor=colors['grid'],
            tickfont=dict(color=colors['text_secondary']),
            title_font=dict(color=colors['text_secondary'])
        ),
        legend=dict(
            bgcolor='rgba(33, 38, 45, 0.9)',
            bordercolor=colors['grid'],
            borderwidth=1,
            font=dict(size=11)
        ),
        margin=dict(l=50, r=30, t=50, b=50),
        hovermode='x unified'
    )

    # Chart 1: Value Band Tracking
    fig1 = go.Figure()
    fig1.add_trace(go.Scatter(
        x=x_axis, y=history_df['HBand'],
        mode='lines', name='HBand',
        line=dict(color=colors['hband'], width=2, dash='dash'),
        hovertemplate='HBand: $%{y:,.2f}<extra></extra>'
    ))
    fig1.add_trace(go.Scatter(
        x=x_axis, y=history_df['LBand'],
        mode='lines', name='LBand',
        line=dict(color=colors['lband'], width=2, dash='dash'),
        fill='tonexty', fillcolor='rgba(88, 166, 255, 0.1)',
        hovertemplate='LBand: $%{y:,.2f}<extra></extra>'
    ))
    fig1.add_trace(go.Scatter(
        x=x_axis, y=history_df['V_target'],
        mode='lines+markers', name='Target (V)',
        line=dict(color=colors['v_target'], width=3),
        marker=dict(size=8, symbol='circle'),
        hovertemplate='Target V: $%{y:,.2f}<extra></extra>'
    ))
    fig1.update_layout(
        **layout_common,
        title=dict(text='📈 Value Band Tracking', font=dict(size=16, color=colors['text'])),
        xaxis_title='Cycle',
        yaxis_title='Value ($)',
        yaxis_tickprefix='$',
        yaxis_tickformat=',.0f'
    )

    # Chart 2: Portfolio vs Target
    fig2 = go.Figure()
    fig2.add_trace(go.Scatter(
        x=x_axis, y=history_df['V_target'],
        mode='lines+markers', name='Target (V)',
        line=dict(color=colors['v_target'], width=2, dash='dot'),
        marker=dict(size=6),
        hovertemplate='Target V: $%{y:,.2f}<extra></extra>'
    ))
    fig2.add_trace(go.Scatter(
        x=x_axis, y=history_df['E_calc'],
        mode='lines+markers', name='Portfolio (E)',
        line=dict(color=colors['e_calc'], width=3),
        marker=dict(size=8, symbol='square'),
        fill='tonexty', fillcolor='rgba(163, 113, 247, 0.15)',
        hovertemplate='Portfolio E: $%{y:,.2f}<extra></extra>'
    ))
    fig2.update_layout(
        **layout_common,
        title=dict(text='💰 Portfolio (E) vs Target (V)', font=dict(size=16, color=colors['text'])),
        xaxis_title='Cycle',
        yaxis_title='Value ($)',
        yaxis_tickprefix='$',
        yaxis_tickformat=',.0f'
    )

    # Chart 3: Pool Balance
    pool_data = history_df['pool_end_before_deposit'] + history_df['deposit_next']
    fig3 = go.Figure()
    fig3.add_trace(go.Bar(
        x=x_axis, y=pool_data,
        name='Pool Balance',
        marker=dict(
            color=pool_data,
            colorscale=[[0, '#238636'], [1, '#3FB950']],
            line=dict(width=0)
        ),
        hovertemplate='Pool: $%{y:,.2f}<extra></extra>'
    ))
    fig3.update_layout(
        **layout_common,
        title=dict(text='💵 Pool Balance Trend', font=dict(size=16, color=colors['text'])),
        xaxis_title='Cycle',
        yaxis_title='Pool ($)',
        yaxis_tickprefix='$',
        yaxis_tickformat=',.0f',
        showlegend=False
    )

    # Chart 4: Shares Held
    fig4 = go.Figure()
    fig4.add_trace(go.Scatter(
        x=x_axis, y=history_df['shares_end'],
        mode='lines+markers', name='Shares',
        line=dict(color=colors['shares'], width=3),
        marker=dict(size=10, symbol='diamond'),
        fill='tozeroy', fillcolor='rgba(210, 153, 34, 0.2)',
        hovertemplate='Shares: %{y:,.0f}<extra></extra>'
    ))
    fig4.update_layout(
        **layout_common,
        title=dict(text='📊 Shares Held', font=dict(size=16, color=colors['text'])),
        xaxis_title='Cycle',
        yaxis_title='Shares',
        showlegend=False
    )

    return fig1, fig2, fig3, fig4

# --- 커스텀 UI 컴포넌트 함수 ---
def create_status_badge(text, status="info"):
    """상태 뱃지 HTML 생성"""
    colors = {
        "success": ("linear-gradient(135deg, #3FB950, #238636)", "white"),
        "warning": ("linear-gradient(135deg, #D29922, #9E6A03)", "white"),
        "danger": ("linear-gradient(135deg, #F85149, #DA3633)", "white"),
        "info": ("linear-gradient(135deg, #58A6FF, #1F6FEB)", "white"),
        "neutral": ("linear-gradient(135deg, #30363D, #21262D)", "#8B949E")
    }
    bg, color = colors.get(status, colors["info"])
    return f"""<span style="
        display: inline-flex; align-items: center; gap: 6px;
        padding: 4px 12px; border-radius: 20px;
        font-size: 0.8rem; font-weight: 600; letter-spacing: 0.03em;
        background: {bg}; color: {color};
    ">{text}</span>"""

def create_highlight_card(title, content, icon="📊", variant="info"):
    """하이라이트 카드 HTML 생성"""
    border_colors = {
        "success": "#3FB950",
        "warning": "#D29922",
        "danger": "#F85149",
        "info": "#58A6FF",
        "purple": "#A371F7"
    }
    border = border_colors.get(variant, "#58A6FF")
    bg = f"linear-gradient(135deg, {border}15 0%, #21262D 100%)"
    return f"""
    <div style="
        background: {bg};
        border: 1px solid {border}40;
        border-left: 4px solid {border};
        border-radius: 12px;
        padding: 1.2rem 1.5rem;
        margin: 0.8rem 0;
    ">
        <div style="font-size: 1.1rem; font-weight: 700; color: #E6EDF3; margin-bottom: 0.5rem;">
            {icon} {title}
        </div>
        <div style="color: #8B949E; line-height: 1.6;">
            {content}
        </div>
    </div>
    """

def create_metric_row_html(metrics):
    """가로 메트릭 행 HTML 생성 (최대 4개)"""
    cards = ""
    for m in metrics:
        delta_html = ""
        if m.get("delta"):
            delta_color = "#3FB950" if m.get("delta_positive", True) else "#F85149"
            delta_html = f'<div style="color: {delta_color}; font-size: 0.9rem; font-weight: 600; margin-top: 4px;">{m["delta"]}</div>'
        cards += f"""
        <div style="
            flex: 1; min-width: 150px;
            background: linear-gradient(135deg, #21262D 0%, #161B22 100%);
            border: 1px solid #30363D;
            border-radius: 12px;
            padding: 1rem;
            text-align: center;
        ">
            <div style="color: #8B949E; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em;">
                {m.get("label", "")}
            </div>
            <div style="color: #E6EDF3; font-size: 1.4rem; font-weight: 700; margin-top: 4px;">
                {m.get("value", "")}
            </div>
            {delta_html}
        </div>
        """
    return f'<div style="display: flex; gap: 1rem; flex-wrap: wrap;">{cards}</div>'

def calculate_portfolio_summary(history):
    """포트폴리오 요약 통계 계산"""
    if not history or len(history) < 1:
        return None

    df = pd.DataFrame(history)

    initial_e = df.iloc[0].get('E_calc', 0)
    current_e = df.iloc[-1].get('E_calc', 0)
    initial_v = df.iloc[0].get('V_target', 0)
    current_v = df.iloc[-1].get('V_target', 0)

    total_deposits = df['deposit_next'].sum() if 'deposit_next' in df.columns else 0

    # ROI 계산 (투자금 대비 수익률)
    total_invested = initial_e + total_deposits
    roi = ((current_e - total_invested) / total_invested * 100) if total_invested > 0 else 0

    # V 성장률
    v_growth = ((current_v - initial_v) / initial_v * 100) if initial_v > 0 else 0

    # V/E 평균 괴리율
    if 've_divergence_ratio' in df.columns:
        avg_divergence = df['ve_divergence_ratio'].mean() * 100
    else:
        avg_divergence = 0

    # 밴드 리셋 횟수
    band_resets = 0
    if 'band_reset_type' in df.columns:
        band_resets = df[df['band_reset_type'] != 'none'].shape[0]

    # 주식 수 변동
    initial_shares = df.iloc[0].get('shares_end', 0)
    current_shares = df.iloc[-1].get('shares_end', 0)
    shares_change = current_shares - initial_shares

    return {
        'total_cycles': len(df),
        'initial_e': initial_e,
        'current_e': current_e,
        'total_deposits': total_deposits,
        'roi': roi,
        'v_growth': v_growth,
        'avg_divergence': avg_divergence,
        'band_resets': band_resets,
        'initial_shares': initial_shares,
        'current_shares': current_shares,
        'shares_change': shares_change
    }

# =============================================================================
# Streamlit UI 구성
# =============================================================================
st.title(f"🔄 VR 시뮬레이터 V{VR_VERSION}")
st.markdown("| Written by **[Woojin Go](https://woojingo.notion.site/)**")

# --- 오늘 날짜 가져오기 ---
today_date = datetime.datetime.now().strftime("%Y%m%d")

# --- 사이드바 ---
with st.sidebar:
    st.header("⚙️ 시뮬레이션 설정")
    if not st.session_state.simulation_started:
        st.session_state.ticker_name = st.text_input("분석 종목명/티커", value=st.session_state.ticker_name)
        st.session_state.current_G = st.number_input("초기 G 값 (Gradient)", min_value=1.0, value=st.session_state.current_G, step=0.1, help="VR 공식의 안정성 계수 (10~20 추천)")
        st.session_state.default_deposit = st.number_input("기본 적립금 ($)", min_value=0.0, value=st.session_state.default_deposit, step=1.0, help="매 사이클 종료 후 추가될 기본 예수금")
    else:
        st.write(f"**분석 종목:** {st.session_state.ticker_name}")
        st.write(f"**현재 기준 G 값:** {st.session_state.current_G}")
        st.write(f"**현재 기준 적립금:** ${st.session_state.default_deposit:,.2f}")

    buy_ratio_for_table = st.slider("매수 테이블 계산용 예수금 비율", min_value=0.0, max_value=1.0, value=0.75, step=0.05, help="상세 매수 테이블 계산 시 사용할 예수금 비율")

    st.divider()
    st.header("📐 적응형 밴드")
    # 세션 상태에 적응형 밴드 설정 저장 (기본값은 전역 상수)
    if 'adaptive_band_enabled' not in st.session_state:
        st.session_state.adaptive_band_enabled = ADAPTIVE_BAND_ENABLED
    if 'trade_friendly_enabled' not in st.session_state:
        st.session_state.trade_friendly_enabled = TRADE_FRIENDLY_BAND_ENABLED

    adaptive_enabled_ui = st.toggle(
        "적응형 밴드 활성화",
        value=st.session_state.adaptive_band_enabled,
        key="adaptive_toggle",
        help="목표 가치(V)와 실제 평가금(E)의 차이가 클 때, 거래 가능 범위를 자동으로 좁혀서 매수/매도가 더 쉽게 일어나도록 합니다."
    )
    # 토글 상태를 세션 상태에 저장
    st.session_state.adaptive_band_enabled = adaptive_enabled_ui

    if adaptive_enabled_ui:
        st.caption(
            f"📊 목표-실제 차이 {VE_DIVERGENCE_THRESHOLD*100:.0f}% 초과 시 거래 조건 완화 | "
            f"최대 완화: ±{(MAX_BAND_UPPER-1.0)*100:.0f}% 범위"
        )
    else:
        st.caption("기본 거래 범위 ±15% 적용 (완화 없음)")

    # V2.5: 거래 친화적 밴드 설정
    st.markdown("---")
    st.markdown("**🔧 거래 친화적 밴드**")
    trade_friendly_ui = st.toggle(
        "거래 친화적 밴드 활성화",
        value=st.session_state.trade_friendly_enabled,
        key="trade_friendly_toggle",
        help="현재 주가에서 ±5% 이내에서 거래가 가능하도록 자동 조정합니다. 예: 현재가 $100이면 $95~$105 범위에서 거래 신호가 발생합니다."
    )
    st.session_state.trade_friendly_enabled = trade_friendly_ui

    if trade_friendly_ui:
        st.caption(
            f"✅ 현재가 기준 ±{MAX_TRADE_GAP_PERCENT*100:.0f}% 범위 내 거래 보장 | "
            f"최소 {MIN_TRADABLE_SHARES}주 거래 가능 | "
            f"실제 자산 기준 계산"
        )
    else:
        st.caption("거래 친화적 밴드 비활성화 (목표 가치 기준 계산)")

    # --- V3.0: 변동성 적응형 설정 ---
    if VR_V3_AVAILABLE:
        st.divider()
        st.header(f"🚀 VR V{VR_VERSION} 설정")

        v3_enabled = st.toggle(
            "V3.0 변동성 적응형 모드",
            value=st.session_state.vr_v3_enabled,
            key="v3_toggle",
            help="변동성에 따라 밴드 폭을 자동 조정합니다. 높은 변동성 = 넓은 밴드, 낮은 변동성 = 좁은 밴드"
        )
        st.session_state.vr_v3_enabled = v3_enabled

        if v3_enabled:
            # 자산 프리셋 선택
            asset_options = list(ASSET_PRESETS.keys())
            current_idx = asset_options.index(st.session_state.asset_preset) if st.session_state.asset_preset in asset_options else 0

            selected_asset = st.selectbox(
                "자산 프리셋",
                options=asset_options,
                index=current_idx,
                key="asset_select",
                help="자산 유형에 맞는 최적화된 설정을 적용합니다"
            )
            st.session_state.asset_preset = selected_asset

            # 선택된 자산 정보 표시
            preset_info = ASSET_PRESETS.get(selected_asset, {})
            st.caption(f"📊 {preset_info.get('description', selected_asset)}")

            # 모멘텀 필터 & 리스크 관리
            col1, col2 = st.columns(2)
            with col1:
                momentum_filter = st.checkbox(
                    "모멘텀 필터",
                    value=st.session_state.enable_momentum_filter,
                    key="momentum_check",
                    help="강한 추세에서 역방향 거래 차단"
                )
                st.session_state.enable_momentum_filter = momentum_filter

            with col2:
                risk_mgmt = st.checkbox(
                    "리스크 관리",
                    value=st.session_state.enable_risk_management,
                    key="risk_check",
                    help="손절매 및 포지션 제한 적용"
                )
                st.session_state.enable_risk_management = risk_mgmt

            # V3.0 엔진 초기화/업데이트
            if st.session_state.vr_engine is None or st.session_state.vr_engine.asset_preset.upper() != selected_asset:
                try:
                    st.session_state.vr_engine = create_vr_engine(
                        selected_asset,
                        enable_momentum_filter=momentum_filter,
                        enable_risk_management=risk_mgmt
                    )
                except Exception as e:
                    st.error(f"V3.0 엔진 초기화 오류: {e}")
                    st.session_state.vr_v3_enabled = False

            # V3.0 상태 표시
            if st.session_state.vr_engine:
                with st.expander("V3.0 엔진 상태", expanded=False):
                    engine = st.session_state.vr_engine
                    st.write(f"**자산:** {engine.asset_preset}")
                    st.write(f"**가격 히스토리:** {len(engine.price_history)} cycles")
                    st.write(f"**모멘텀 필터:** {'✅' if engine.enable_momentum_filter else '❌'}")
                    st.write(f"**리스크 관리:** {'✅' if engine.enable_risk_management else '❌'}")
        else:
            st.caption("V3.0 모드 사용 중 (기존 적응형 밴드)")

    st.divider()
    st.header("📈 미국 마켓 정보")
    current_time_str, market_status_str, dst_status_str, is_trading_now, is_reservation_now = get_market_status()
    st.write(f"**현재 한국 시간:** {current_time_str}")
    st.write(f"**미국 마켓 상태:** {market_status_str}")
    st.write(f"**써머타임:** {dst_status_str}")

    if is_trading_now:
        st.markdown("**<span style='color:blue;'>✔️ 정규장 거래 가능</span>**", unsafe_allow_html=True)
    else:
        st.markdown("**<span style='color:red;'>❌ 정규장 거래 불가능</span>**", unsafe_allow_html=True)

    if is_reservation_now:
        st.markdown("**<span style='color:blue;'>✔️ 예약 주문 가능</span>**", unsafe_allow_html=True)
    else:
        st.markdown("**<span style='color:red;'>❌ 예약 주문 불가능</span>**", unsafe_allow_html=True)

    with st.expander("ℹ️ 도움말 및 VR 공식"):
        # 용어집 추가
        st.info("""
**📖 핵심 용어 설명**
- **V (목표 가치)**: 시스템이 목표로 하는 포지션 크기 (이 금액만큼 주식을 보유하려 함)
- **E (평가금)**: 현재 보유 주식 × 현재 주가 = 실제 자산 가치
- **밴드**: 매수/매도를 할 수 있는 가격 범위 (LBand~HBand)
- **괴리율**: V와 E의 차이 비율 (0%가 이상적, 클수록 조정 필요)
        """)

        st.markdown(r"""
        #### 사용 방법(개요):
        1. **초기 설정**에서 종목, G, 기본 적립금을 정합니다.
        2. **초기값 입력** 또는 **CSV 불러오기**로 시작 상태를 준비합니다.
        3. **시뮬레이션 시작/재설정** 버튼으로 시작합니다.
        4. 상단 네비게이션으로 과거 사이클을 조회하고, **마지막 사이클에서 결과 입력 → 다음 사이클 계산**을 반복합니다.
        5. 하단 테이블/차트/PNG, CSV 다운로드로 결과를 저장합니다.

        #### Value Rebalancing (VR) 공식 (변형):
        $$
        V_f = V_i + \frac{pool_{prev}}{G} + \frac{(E - V_i)}{2\sqrt{G}} + deposit_{next}
        $$
        - $V_f$: **다음** 사이클 목표 가치
        - $V_i$: **이전** 사이클 목표 가치
        - $pool_{prev}$: 이전 사이클 종료 시점의 예수금 (**적립금 추가 전**)
        - $G$: 그라데이션 값 (설정값)
        - $E$: 이전 사이클 종료 시점의 평가금 (최종 주식 수 × 최종 가격)
        - $deposit_{next}$: 다음 사이클 시작 시 추가될 적립금

        #### 매수/매도표 해석(중요):
        - **매수표**: 이 가격 **이하**에서 매수 가능 (예: $50 이하에서 매수 OK)
        - **매도표**: 이 가격 **이상**에서 매도 가능 (예: $70 이상에서 매도 OK)
        - 현재가가 조건에 맞으면 **즉시 체결**, 아니면 **대기 지정가**로 예약

        ---

        #### 📐 적응형 밴드란? (V2.4)
        📌 **한 줄 요약**: 목표와 현실의 차이가 클 때, 거래 기회를 늘려줍니다.

        **왜 필요한가요?**
        - 시간이 지나면 목표 가치(V)가 실제 보유 가치(E)보다 훨씬 커질 수 있습니다
        - 이 차이가 커지면 매수/매도 조건이 너무 엄격해져서 거래가 어려워집니다
        - 적응형 밴드는 이 차이를 감지하고 거래 조건을 자동으로 완화합니다

        **작동 방식 (간단히):**
        | 목표-실제 차이 | 거래 조건 |
        |-------------|---------|
        | 5% 이하 | 기본 설정 유지 (±15%) |
        | 5~50% | 점점 완화 |
        | 50% 이상 | 최대 완화 (±8%) |

        ---

        #### 🔧 거래 친화적 밴드란?
        📌 **한 줄 요약**: 현재 주가 근처에서 확실하게 거래할 수 있도록 보장합니다.

        **왜 필요한가요?**
        - 적응형 밴드로도 거래 조건이 현재가와 너무 멀어질 수 있습니다
        - 예: 현재가 $100인데 매수는 $70 이하, 매도는 $130 이상에서만 가능 → 거래 불가!
        - 이 기능은 현재가 기준 **±5% 이내**에서 거래가 가능하도록 강제 조정합니다

        **4가지 자동 조정:**
        1. 🎯 **현재 자산 기준 계산**: 과대평가된 목표 대신 실제 자산 기준으로 계산
        2. 📊 **±5% 범위 보장**: 현재가 $100이면 $95~$105 범위에서 거래 가능
        3. 📈 **최소 2주 거래 보장**: 아무리 조건이 엄격해도 최소 2주는 거래 가능
        4. ⚡ **빠른 목표 조정**: 목표가 너무 높으면 빠르게 현실에 맞춰 조정
        """)

    components.html(
        """
        <a href="https://www.buymeacoffee.com/woojingo" target="_blank">
            <img src="https://cdn.buymeacoffee.com/buttons/v2/default-red.png" alt="Buy Me A Coffee" style="height: 40px !important;width: 145px !important;">
        </a>
        """,
        height=50,
    )

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
                    records = df_history.to_dict('records')
                    normalized_records = [normalize_history_entry(rec) for rec in records]

                    st.session_state.history = normalized_records
                    st.session_state.view_cycle_index = len(st.session_state.history) - 1

                    # [V3.0 Fix] CSV 로드 시 가격 히스토리 복원
                    prices_from_csv = [rec['price_end'] for rec in normalized_records if 'price_end' in rec]
                    if prices_from_csv:
                        st.session_state.price_history = prices_from_csv
                        # 엔진이 있다면 업데이트
                        if st.session_state.get('vr_engine'):
                            # 엔진 상태 재설정 및 히스토리 주입
                            engine = st.session_state.vr_engine
                            engine.price_history = []
                            engine.peak_price = 0.0
                            engine.trough_price = float('inf')
                            for p in prices_from_csv:
                                engine.update_price(p)

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
            init_shares = st.number_input("초기 보유 주식 수", min_value=0, value=1, step=1, key="init_shares", help="정수 주식 수")
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
            # 시작 주식 수가 0일 경우 초기 V를 예수금 기준으로 설정 (Workaround)
            if init_shares == 0 and init_pool > 0:
                V0 = init_pool
            # 일반적인 경우
            elif init_price > 0:
                V0 = init_shares * init_price
            else:
                st.warning("현재 가격은 0보다 커야 합니다.")
                V0 = -1  # 오류 플래그

            if V0 >= 0:
                E0 = init_shares * init_price
                # 적응형 밴드 계산 (초기 상태) - 세션 상태의 토글 설정 반영
                use_adaptive = st.session_state.get('adaptive_band_enabled', ADAPTIVE_BAND_ENABLED)
                if use_adaptive and E0 > 0:
                    adaptive_result = calculate_adaptive_bands(V0, E0)
                    L0, H0 = adaptive_result['LBand'], adaptive_result['HBand']
                else:
                    L0, H0 = calculate_bands(V0, use_adaptive=False)
                    adaptive_result = {
                        'divergence_ratio': 0.0,
                        'divergence_direction': 'neutral',
                        'compression_factor': 1.0,
                        'band_lower_ratio': BASE_BAND_LOWER,
                        'band_upper_ratio': BASE_BAND_UPPER
                    }

                initial_state = {
                    'cycle_num': 0,
                    'V_target': V0,
                    'LBand': L0,
                    'HBand': H0,
                    'shares_end': int(init_shares),
                    'pool_end_before_deposit': init_pool,
                    'deposit_next': st.session_state.default_deposit,
                    'price_end': init_price,
                    'G': st.session_state.current_G,
                    'E_calc': E0,
                    'V_i': V0,
                    # 적응형 밴드 초기 메타데이터
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

        st.markdown("**매수/매도 임계 참고:**")
        buy_target_simple, sell_target_simple = calculate_simple_targets(shares_start_display, LBand_display, HBand_display)

        # 밴드 정보 표시
        col_t1, col_t2 = st.columns(2)
        col_t1.metric("📉 LBand ($)", f"${LBand_display:,.2f}", help="Lower Band - 평가금이 이 값 이하로 떨어지면 매수 권장")
        col_t2.metric("📈 HBand ($)", f"${HBand_display:,.2f}", help="Higher Band - 평가금이 이 값 이상으로 오르면 매도 권장")

        # 매수/매도 신호 카드
        st.markdown("#### 🎯 거래 신호")
        signal_col1, signal_col2 = st.columns(2)

        # 매수 신호 분석
        buy_gap = ((last_price_display - buy_target_simple) / last_price_display * 100) if last_price_display > 0 else 0
        can_buy_now = last_price_display <= buy_target_simple

        with signal_col1:
            if can_buy_now:
                buy_status = "success"
                buy_icon = "✅"
                buy_msg = "즉시 매수 가능!"
            elif buy_gap <= 5:
                buy_status = "warning"
                buy_icon = "⏳"
                buy_msg = "매수 근접 (5% 이내)"
            else:
                buy_status = "info"
                buy_icon = "📊"
                buy_msg = f"가격 하락 대기 ({buy_gap:.1f}%)"

            st.markdown(f"""
            <div style="
                background: linear-gradient(135deg, {'#3FB95020' if buy_status == 'success' else '#D2992220' if buy_status == 'warning' else '#58A6FF20'} 0%, #21262D 100%);
                border: 1px solid {'#3FB950' if buy_status == 'success' else '#D29922' if buy_status == 'warning' else '#58A6FF'};
                border-radius: 12px;
                padding: 1.2rem;
                margin-bottom: 0.5rem;
            ">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                    <span style="font-size: 1.5rem;">{buy_icon}</span>
                    <span style="color: {'#3FB950' if buy_status == 'success' else '#D29922' if buy_status == 'warning' else '#58A6FF'}; font-weight: 700; font-size: 1rem;">
                        매수 (+1주) {buy_msg}
                    </span>
                </div>
                <div style="color: #E6EDF3; font-size: 1.4rem; font-weight: 700; margin: 8px 0;">
                    ${buy_target_simple:,.2f}
                </div>
                <div style="color: #8B949E; font-size: 0.85rem;">
                    현재가 ${last_price_display:,.2f} | 괴리 {buy_gap:.1f}%
                </div>
            </div>
            """, unsafe_allow_html=True)

        # 매도 신호 분석
        with signal_col2:
            if sell_target_simple > 0:
                sell_gap = ((sell_target_simple - last_price_display) / last_price_display * 100) if last_price_display > 0 else 0
                can_sell_now = last_price_display >= sell_target_simple

                if can_sell_now:
                    sell_status = "danger"
                    sell_icon = "✅"
                    sell_msg = "즉시 매도 가능!"
                elif sell_gap <= 5:
                    sell_status = "warning"
                    sell_icon = "⏳"
                    sell_msg = "매도 근접 (5% 이내)"
                else:
                    sell_status = "info"
                    sell_icon = "📊"
                    sell_msg = f"가격 상승 대기 ({sell_gap:.1f}%)"

                st.markdown(f"""
                <div style="
                    background: linear-gradient(135deg, {'#F8514920' if sell_status == 'danger' else '#D2992220' if sell_status == 'warning' else '#58A6FF20'} 0%, #21262D 100%);
                    border: 1px solid {'#F85149' if sell_status == 'danger' else '#D29922' if sell_status == 'warning' else '#58A6FF'};
                    border-radius: 12px;
                    padding: 1.2rem;
                    margin-bottom: 0.5rem;
                ">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                        <span style="font-size: 1.5rem;">{sell_icon}</span>
                        <span style="color: {'#F85149' if sell_status == 'danger' else '#D29922' if sell_status == 'warning' else '#58A6FF'}; font-weight: 700; font-size: 1rem;">
                            매도 (-1주) {sell_msg}
                        </span>
                    </div>
                    <div style="color: #E6EDF3; font-size: 1.4rem; font-weight: 700; margin: 8px 0;">
                        ${sell_target_simple:,.2f}
                    </div>
                    <div style="color: #8B949E; font-size: 0.85rem;">
                        현재가 ${last_price_display:,.2f} | 괴리 {sell_gap:.1f}%
                    </div>
                </div>
                """, unsafe_allow_html=True)
            else:
                st.markdown(f"""
                <div style="
                    background: linear-gradient(135deg, #30363D20 0%, #21262D 100%);
                    border: 1px solid #30363D;
                    border-radius: 12px;
                    padding: 1.2rem;
                    margin-bottom: 0.5rem;
                ">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                        <span style="font-size: 1.5rem;">⚠️</span>
                        <span style="color: #8B949E; font-weight: 700; font-size: 1rem;">
                            매도 불가
                        </span>
                    </div>
                    <div style="color: #6E7681; font-size: 0.9rem;">
                        보유량 부족 (1주 이하)
                    </div>
                </div>
                """, unsafe_allow_html=True)

        band_display_cols = st.columns(2)
        band_display_cols[0].metric(
            "다음 사이클 리셋 하한 (80% V)",
            f"${active_state.get('band_reset_range_min', BAND_RESET_LOWER_FACTOR * V_i_display):,.2f}"
        )
        band_display_cols[1].metric(
            "다음 사이클 리셋 상한 (120% V)",
            f"${active_state.get('band_reset_range_max', BAND_RESET_UPPER_FACTOR * V_i_display):,.2f}"
        )

        pool_cap_limit_display = active_state.get('pool_cap_limit', POOL_CAP_RATIO * active_state.get('E_calc', 0.0))
        pool_effective_display = active_state.get(
            'pool_effective_for_v',
            min(active_state.get('pool_end_before_deposit', 0.0), pool_cap_limit_display)
        )
        st.caption(
            f"풀 한도: 평가금의 {POOL_CAP_RATIO*100:.0f}% = ${pool_cap_limit_display:,.2f}. "
            f"V 계산 반영 예수금은 ${pool_effective_display:,.2f} 입니다."
        )

        reset_flag_display = active_state.get('band_reset_type', 'none')
        if reset_flag_display and reset_flag_display != 'none':
            if reset_flag_display == 'lower':
                st.warning("직전 사이클에서 밴드 하단 이탈로 목표 V가 하향 조정되었습니다.")
            elif reset_flag_display == 'upper':
                st.info("직전 사이클에서 밴드 상단 돌파 및 풀 한도 충족으로 목표 V가 상향 조정되었습니다.")

        # --- 적응형 밴드 정보 표시 ---
        if active_state.get('adaptive_band_enabled', ADAPTIVE_BAND_ENABLED):
            st.markdown("---")
            st.markdown("**📐 적응형 밴드 상태:**")

            compression_factor = active_state.get('band_compression_factor', 1.0)
            divergence_ratio = active_state.get('ve_divergence_ratio', 0.0)
            divergence_direction = active_state.get('ve_divergence_direction', 'neutral')
            lower_ratio = active_state.get('band_lower_ratio', BASE_BAND_LOWER)
            upper_ratio = active_state.get('band_upper_ratio', BASE_BAND_UPPER)

            # 괴리 방향 한글 표시 (더 쉬운 용어로)
            direction_text = {
                'over': '목표 > 실제',
                'under': '실제 > 목표',
                'neutral': '균형'
            }.get(divergence_direction, '균형')

            adaptive_cols = st.columns(4)
            adaptive_cols[0].metric(
                "목표 vs 실제 차이",
                f"{divergence_ratio * 100:.1f}%",
                delta=direction_text,
                delta_color="normal" if divergence_direction == 'neutral' else ("inverse" if divergence_direction == 'over' else "normal"),
                help="0%: 목표와 실제가 같음 (이상적)\n5% 이하: 정상\n5~50%: 거래 조건 자동 완화 중\n50% 이상: 최대 완화 적용"
            )
            adaptive_cols[1].metric(
                "거래 조건 완화",
                f"{(1 - compression_factor) * 100:.1f}%",
                help="0%: 기본 설정 (엄격한 조건)\n50%: 중간 완화\n100%: 최대 완화 (거래 쉬움)"
            )
            adaptive_cols[2].metric(
                "매수 범위",
                f"-{(1.0 - lower_ratio) * 100:.1f}%",
                delta=f"{(lower_ratio - BASE_BAND_LOWER) * 100:+.1f}%p" if abs(lower_ratio - BASE_BAND_LOWER) > 0.001 else None,
                help="목표 가치 대비 이 비율 이하로 평가금이 떨어지면 매수 신호"
            )
            adaptive_cols[3].metric(
                "매도 범위",
                f"+{(upper_ratio - 1.0) * 100:.1f}%",
                delta=f"{(upper_ratio - BASE_BAND_UPPER) * 100:+.1f}%p" if abs(upper_ratio - BASE_BAND_UPPER) > 0.001 else None,
                help="목표 가치 대비 이 비율 이상으로 평가금이 오르면 매도 신호"
            )

            # 압축 상태 안내 (더 쉬운 설명으로)
            if compression_factor < 0.5:
                st.warning(
                    f"💡 목표와 실제 자산의 차이가 {divergence_ratio * 100:.1f}%로 큽니다. "
                    f"거래가 더 쉽게 일어나도록 조건이 크게 완화되었습니다. "
                    f"(기본 ±15% → 현재 -{(1.0 - lower_ratio) * 100:.1f}%/+{(upper_ratio - 1.0) * 100:.1f}%)"
                )
            elif compression_factor < 1.0:
                st.info(
                    f"📊 거래 조건 완화 적용 중: 기본(±15%) → 현재(-{(1.0 - lower_ratio) * 100:.1f}%/+{(upper_ratio - 1.0) * 100:.1f}%)"
                )

        # V2.5: 거래 친화적 밴드 상태 표시
        if active_state.get('trade_friendly_enabled', TRADE_FRIENDLY_BAND_ENABLED):
            trade_friendly_applied = active_state.get('trade_friendly_applied', False)
            anchor_value = active_state.get('band_anchor_value', V_i_display)

            st.markdown("**🔧 거래 친화적 밴드 상태:**")
            tf_cols = st.columns(3)
            tf_cols[0].metric(
                "계산 기준",
                "실제 자산" if E_BASED_BAND_ANCHOR else "목표 가치",
                delta=f"${anchor_value:,.2f}" if anchor_value else None,
                help="실제 자산(E) 기준: 과대평가된 목표 대신 현재 보유 자산을 기준으로 계산\n목표 가치(V) 기준: 시스템이 설정한 목표 금액 기준으로 계산"
            )
            tf_cols[1].metric(
                "범위 조정",
                "✅ 적용됨" if trade_friendly_applied else "미적용",
                delta="자동 조정 활성" if trade_friendly_applied else None,
                delta_color="normal" if trade_friendly_applied else "off",
                help="적용됨: 현재가 대비 ±5% 이내에서 거래 가능하도록 밴드가 자동 조정됨\n미적용: 기본 설정대로 거래 조건 유지"
            )
            # 현재 매수/매도 임계가와 현재가의 괴리율 표시
            if last_price_display > 0:
                buy_gap = (last_price_display - buy_target_simple) / last_price_display * 100 if buy_target_simple > 0 else 0
                sell_gap = (sell_target_simple - last_price_display) / last_price_display * 100 if sell_target_simple > 0 else 0
                tf_cols[2].metric(
                    "현재가 대비 거리",
                    f"매수 {buy_gap:.1f}% / 매도 {sell_gap:.1f}%",
                    delta="✅ 거래 가능 범위" if buy_gap <= MAX_TRADE_GAP_PERCENT * 100 and sell_gap <= MAX_TRADE_GAP_PERCENT * 100 else "⚠️ 거리 멂",
                    delta_color="normal" if buy_gap <= MAX_TRADE_GAP_PERCENT * 100 and sell_gap <= MAX_TRADE_GAP_PERCENT * 100 else "inverse",
                    help=f"현재가에서 매수/매도 조건까지의 거리\n±{MAX_TRADE_GAP_PERCENT*100:.0f}% 이내: 거래 가능 범위 (녹색)\n±{MAX_TRADE_GAP_PERCENT*100:.0f}% 초과: 거래 어려움 (빨간색)"
                )

        price_diff_ratio = (last_price_display - buy_target_simple) / last_price_display if last_price_display > 0 else 0
        if buy_target_simple > 0 and price_diff_ratio > 0.20 and display_cycle_num < 5:
            st.warning(f"⚠️ 매수 상한(${buy_target_simple:,.2f}$)이 이전 가격(${last_price_display:,.2f}$)과 차이가 큽니다. 다음 거래일 시초가 매수를 고려해볼 수 있습니다.")

        # V3.0: 변동성 적응형 상태 표시
        if st.session_state.get('vr_v3_enabled') and st.session_state.get('vr_engine'):
            with st.expander(f"🚀 VR V{VR_VERSION} 분석", expanded=False):
                engine = st.session_state.vr_engine
                try:
                    # 모멘텀 분석
                    if len(engine.price_history) >= 2:
                        momentum_info = engine.calculate_momentum()
                        # Calculate position value and total equity for risk status
                        position_value = last_price_display * st.session_state.get('shares', 0)
                        total_equity = position_value + st.session_state.get('pool', 0)
                        risk_info = engine.calculate_risk_status(last_price_display, position_value, total_equity)

                        col_v1, col_v2, col_v3, col_v4 = st.columns(4)

                        # 변동성
                        vol_pct = engine.calculate_rolling_volatility() * 100
                        col_v1.metric("롤링 변동성", f"{vol_pct:.1f}%",
                                     help="최근 가격 변동성 (높을수록 넓은 밴드)")

                        # 모멘텀
                        if momentum_info:
                            mom_val = momentum_info.score * 100
                            mom_color = "🟢" if mom_val > 5 else ("🔴" if mom_val < -5 else "🟡")
                            col_v2.metric("모멘텀", f"{mom_color} {mom_val:+.1f}%")

                        # 리스크
                        if risk_info:
                            dd_pct = risk_info.drawdown_pct * 100
                            dd_color = "🟢" if dd_pct < 10 else ("🟡" if dd_pct < 20 else "🔴")
                            col_v3.metric("드로다운", f"{dd_color} {dd_pct:.1f}%")

                            risk_level = risk_info.level.value if hasattr(risk_info.level, 'value') else str(risk_info.level)
                            col_v4.metric("리스크 수준", risk_level.upper())

                        # 거래 허용 상태
                        can_buy, buy_reason = engine.should_execute_trade('buy', last_price_display)
                        can_sell, sell_reason = engine.should_execute_trade('sell', last_price_display)

                        st.markdown("**V3.0 거래 필터 상태:**")
                        trade_col1, trade_col2 = st.columns(2)
                        with trade_col1:
                            if can_buy:
                                st.success(f"✅ 매수 허용: {buy_reason}")
                            else:
                                st.warning(f"⚠️ 매수 차단: {buy_reason}")
                        with trade_col2:
                            if can_sell:
                                st.success(f"✅ 매도 허용: {sell_reason}")
                            else:
                                st.warning(f"⚠️ 매도 차단: {sell_reason}")
                    else:
                        st.info("가격 히스토리가 부족합니다 (최소 2개 사이클 필요)")
                except Exception as e:
                    st.error(f"V3.0 분석 오류: {e}")

        with st.expander("상세 매수/매도 테이블 보기"):
            # NEW: 하이브리드 매수/매도 테이블 생성
            buy_now, buy_ladder = calculate_buy_tables_v2(
                LBand_display, shares_start_display, pool_start_display, buy_ratio_for_table, last_price_display
            )
            sell_now, sell_ladder = calculate_sell_tables_v2(
                HBand_display, shares_start_display, pool_start_display, last_price_display
            )

            tcol1, tcol2 = st.columns(2)
            with tcol1:
                st.write("**즉시 체결 매수표 (현재가 기준)**")
                if buy_now:
                    df_buy_now = pd.DataFrame(buy_now).set_index('매수 후 목표 주식수')
                    st.dataframe(df_buy_now)
                    st.download_button(
                        label="📥 즉시 매수표 다운로드 (.csv)",
                        data=df_buy_now.to_csv().encode('utf-8-sig'),
                        file_name=f"{today_date}_buy_now.csv",
                        mime='text/csv',
                    )
                else:
                    st.info("현재가 기준 즉시 매수 없음 (현재가가 LBand/(S+1)보다 높음 또는 예산 부족)")

                st.write("**하향 분할매수 래더 (대기 지정가)**")
                if buy_ladder:
                    df_ladder = pd.DataFrame(buy_ladder).set_index('매수 후 목표 주식수')
                    st.dataframe(df_ladder)
                    st.download_button(
                        label="📥 매수 래더 다운로드 (.csv)",
                        data=df_ladder.to_csv().encode('utf-8-sig'),
                        file_name=f"{today_date}_buy_ladder.csv",
                        mime='text/csv',
                    )
                else:
                    st.info("남은 배정 예산으로 깔 래더 없음")

            with tcol2:
                st.write("**즉시 체결 매도표 (현재가 기준)**")
                if sell_now:
                    df_sell_now = pd.DataFrame(sell_now).set_index('매도 후 목표 주식수')
                    st.dataframe(df_sell_now)
                    st.download_button(
                        label="📤 즉시 매도표 다운로드 (.csv)",
                        data=df_sell_now.to_csv().encode('utf-8-sig'),
                        file_name=f"{today_date}_sell_now.csv",
                        mime='text/csv',
                    )
                else:
                    st.info("현재가 기준 즉시 매도 없음 (현재가가 허용 하한 미달 또는 보유량 0)")

                st.write("**상향 분할매도 래더 (대기 지정가)**")
                if sell_ladder:
                    df_sell_ladder = pd.DataFrame(sell_ladder).set_index('매도 후 목표 주식수')
                    st.dataframe(df_sell_ladder)
                    st.download_button(
                        label="📤 매도 래더 다운로드 (.csv)",
                        data=df_sell_ladder.to_csv().encode('utf-8-sig'),
                        file_name=f"{today_date}_sell_ladder.csv",
                        mime='text/csv',
                    )
                else:
                    st.info("설정 가능한 상향 매도 래더 없음")

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
        default_pool_for_input = active_state['pool_end_before_deposit']
        default_deposit = st.session_state.default_deposit
        default_g = st.session_state.current_G

        # 폼 안내 카드
        st.markdown(create_highlight_card(
            f"Cycle {input_cycle_num} 결과 입력",
            f"이번 사이클 종료 시점의 투자 결과를 입력하세요. 기본값은 이전 사이클 데이터입니다.",
            "📝", "info"
        ), unsafe_allow_html=True)

        with st.form(key=f"cycle_{input_cycle_num}_form"):
            # 시장 데이터 그룹
            st.markdown("**📊 시장 데이터**")
            market_cols = st.columns(2)
            price_end_input = market_cols[0].number_input(
                "종료 시점 가격 ($)",
                min_value=0.01,
                value=float(default_price),
                step=0.01,
                key=f"price_{input_cycle_num}",
                help=f"이전 가격: ${default_price:.2f}"
            )
            shares_end_input = market_cols[1].number_input(
                "종료 시점 보유 주식 수",
                min_value=0,
                value=int(default_shares),
                step=1,
                key=f"shares_{input_cycle_num}",
                help=f"이전 보유량: {default_shares}주"
            )

            # 자금 현황 그룹
            st.markdown("**💰 자금 현황**")
            fund_cols = st.columns(2)
            pool_end_input = fund_cols[0].number_input(
                "종료 시점 예수금 ($)",
                min_value=0.0,
                value=float(default_pool_for_input),
                step=0.01,
                key=f"pool_{input_cycle_num}",
                help="적립금 추가 전 예수금. 매매로 인한 증감 반영."
            )
            deposit_next_input = fund_cols[1].number_input(
                "다음 사이클 적립금 ($)",
                min_value=0.0,
                value=float(default_deposit),
                step=1.0,
                key=f"deposit_{input_cycle_num}",
                help="다음 사이클 시작 시 추가할 적립금"
            )

            # 전략 설정 그룹
            st.markdown("**⚙️ 전략 설정**")
            g_input = st.number_input(
                "적용 G 값",
                min_value=1.0,
                value=float(default_g),
                step=0.1,
                key=f"g_{input_cycle_num}",
                help="그라데이션 값 (10~20 추천). 값이 클수록 V 변동이 완만해집니다."
            )

            # 입력 미리보기
            preview_e = shares_end_input * price_end_input
            st.caption(f"💡 예상 평가금(E): ${preview_e:,.2f} | 예상 총 자산: ${preview_e + pool_end_input:,.2f}")

            submitted = st.form_submit_button(f"🚀 Cycle {input_cycle_num + 1} 계산하기", use_container_width=True)

            if submitted:
                shares_end_int = int(round(shares_end_input))
                E_calc = shares_end_int * price_end_input
                pool_end_before_deposit = pool_end_input
                V_i_calc = active_state['V_target']
                pool_effective, pool_cap_limit = enforce_pool_cap(pool_end_before_deposit, E_calc)
                pool_excess = pool_end_before_deposit - pool_effective
                if pool_excess > 0.01:
                    st.info(
                        f"풀 한도(평가금의 {POOL_CAP_RATIO*100:.0f}%)가 적용되어 V 계산 시 ${pool_excess:,.2f} 만큼 제외되었습니다."
                    )

                V_next_candidate = calculate_v_next(V_i_calc, pool_effective, E_calc, g_input, deposit_next_input)
                V_next, reset_type, band_range_min, band_range_max = apply_band_reset(
                    V_next_candidate, E_calc, pool_end_before_deposit, pool_cap_limit
                )
                if reset_type != "none":
                    msg = "평가금이 밴드를 벗어나 목표 V가 재조정되었습니다."
                    if reset_type == "lower":
                        msg = "평가금이 밴드 하단 아래로 내려가 V가 하향 리셋되었습니다."
                    elif reset_type == "upper":
                        msg = "밴드 상단을 돌파했고 풀이 한도에 도달하여 V가 상향 리셋되었습니다."
                    st.warning(msg)

                # 적응형 밴드 계산 (UI 토글 상태 반영)
                use_adaptive = st.session_state.get('adaptive_band_enabled', ADAPTIVE_BAND_ENABLED)
                use_trade_friendly = st.session_state.get('trade_friendly_enabled', TRADE_FRIENDLY_BAND_ENABLED)

                if use_adaptive:
                    # V2.5: 거래 친화적 밴드 설정을 함수에 전달
                    adaptive_result = calculate_adaptive_bands(
                        V_next, E_calc,
                        shares=shares_end_int if use_trade_friendly else None,
                        current_price=price_end_input if use_trade_friendly else None,
                        use_trade_friendly=use_trade_friendly
                    )
                    L_next = adaptive_result['LBand']
                    H_next = adaptive_result['HBand']
                else:
                    L_next, H_next = calculate_bands(V_next, use_adaptive=False)
                    adaptive_result = {
                        'compression_factor': 1.0,
                        'divergence_ratio': abs(V_next / E_calc - 1.0) if E_calc > 0 else 0.0,
                        'divergence_direction': 'neutral',
                        'band_lower_ratio': BASE_BAND_LOWER,
                        'band_upper_ratio': BASE_BAND_UPPER,
                        'trade_friendly_applied': False,
                        'anchor_value': V_next
                    }

                # V2.5: 거래 친화적 밴드 적용 메시지
                if use_trade_friendly and adaptive_result.get('trade_friendly_applied', False):
                    st.info("거래 친화적 밴드가 적용되어 매수/매도 임계가가 조정되었습니다.")

                new_state = {
                    'cycle_num': input_cycle_num,
                    'V_target': V_next,
                    'LBand': L_next,
                    'HBand': H_next,
                    'shares_end': shares_end_int,
                    'pool_end_before_deposit': pool_end_before_deposit,
                    'deposit_next': deposit_next_input,
                    'price_end': price_end_input,
                    'G': g_input,
                    'E_calc': E_calc,
                    'V_i': V_i_calc,
                    'pool_effective_for_v': pool_effective,
                    'pool_cap_limit': pool_cap_limit,
                    'pool_cap_ratio_used': POOL_CAP_RATIO,
                    'band_reset_range_min': band_range_min,
                    'band_reset_range_max': band_range_max,
                    'band_reset_type': reset_type,
                    # 적응형 밴드 메타데이터
                    'adaptive_band_enabled': use_adaptive,
                    've_divergence_ratio': adaptive_result.get('divergence_ratio', 0.0),
                    've_divergence_direction': adaptive_result.get('divergence_direction', 'neutral'),
                    'band_compression_factor': adaptive_result.get('compression_factor', 1.0),
                    'band_lower_ratio': adaptive_result.get('band_lower_ratio', BASE_BAND_LOWER),
                    'band_upper_ratio': adaptive_result.get('band_upper_ratio', BASE_BAND_UPPER),
                    # V2.5: 거래 친화적 밴드 메타데이터
                    'trade_friendly_enabled': use_trade_friendly,
                    'trade_friendly_applied': adaptive_result.get('trade_friendly_applied', False),
                    'band_anchor_value': adaptive_result.get('anchor_value', V_next)
                }

                new_state = normalize_history_entry(new_state)

                st.session_state.history.append(new_state)
                st.session_state.current_G = g_input
                st.session_state.default_deposit = deposit_next_input
                st.session_state.view_cycle_index = len(st.session_state.history) - 1

                # V3.0: 가격 히스토리 업데이트
                if price_end_input > 0:
                    st.session_state.price_history.append(price_end_input)
                    if st.session_state.get('vr_engine'):
                        st.session_state.vr_engine.update_price(price_end_input)

                st.success(f"Cycle {input_cycle_num + 1} 계산 완료!")
                st.rerun()

# --- 3. 결과 요약 및 다운로드 ---
if st.session_state.simulation_started and st.session_state.history:
    st.divider()
    st.header(f"3. 📜 `{st.session_state.ticker_name}` 시뮬레이션 결과 요약")

    if len(st.session_state.history) > 0:
        # 포트폴리오 성과 요약 계산
        summary = calculate_portfolio_summary(st.session_state.history)

        # === 성과 대시보드 ===
        if summary:
            st.markdown("### 📈 포트폴리오 성과 대시보드")

            # 상단 KPI 메트릭 (4열)
            kpi_col1, kpi_col2, kpi_col3, kpi_col4 = st.columns(4)

            with kpi_col1:
                roi_delta = f"{summary['roi']:+.1f}%" if summary['roi'] != 0 else None
                st.metric(
                    "💰 총 수익률 (ROI)",
                    f"${summary['current_e']:,.0f}",
                    delta=roi_delta,
                    delta_color="normal" if summary['roi'] >= 0 else "inverse"
                )

            with kpi_col2:
                v_delta = f"{summary['v_growth']:+.1f}%" if summary['v_growth'] != 0 else None
                st.metric(
                    "🎯 V 성장률",
                    f"{summary['v_growth']:.1f}%",
                    delta=v_delta,
                    delta_color="normal" if summary['v_growth'] >= 0 else "inverse"
                )

            with kpi_col3:
                st.metric(
                    "📊 완료 사이클",
                    f"{summary['total_cycles']}회",
                    delta=f"밴드 리셋 {summary['band_resets']}회" if summary['band_resets'] > 0 else None,
                    delta_color="off"
                )

            with kpi_col4:
                shares_delta = f"{summary['shares_change']:+.0f}주" if summary['shares_change'] != 0 else None
                st.metric(
                    "📈 보유 주식",
                    f"{summary['current_shares']}주",
                    delta=shares_delta,
                    delta_color="normal" if summary['shares_change'] >= 0 else "inverse"
                )

            # 하단 보조 메트릭 (4열)
            sub_col1, sub_col2, sub_col3, sub_col4 = st.columns(4)

            with sub_col1:
                st.metric("💵 총 투자금", f"${summary['initial_e'] + summary['total_deposits']:,.0f}")

            with sub_col2:
                st.metric("📥 총 적립금", f"${summary['total_deposits']:,.0f}")

            with sub_col3:
                divergence_status = "정상" if summary['avg_divergence'] < 5 else ("주의" if summary['avg_divergence'] < 10 else "위험")
                st.metric("⚖️ 평균 V/E 괴리율", f"{summary['avg_divergence']:.1f}%", delta=divergence_status, delta_color="off")

            with sub_col4:
                profit_loss = summary['current_e'] - (summary['initial_e'] + summary['total_deposits'])
                st.metric("💹 순이익", f"${profit_loss:,.0f}", delta_color="normal" if profit_loss >= 0 else "inverse")

            st.markdown("---")

        # === 탭 기반 상세 정보 ===
        result_tabs = st.tabs(["📋 상세 기록", "📊 차트", "💾 다운로드"])

        with result_tabs[0]:
            # 기존 테이블 표시
            df_full_history_display = pd.DataFrame(st.session_state.history)
            df_full_history_display['display_cycle'] = df_full_history_display['cycle_num'] + 1

            # 기본 컬럼 선택 (적응형 밴드 컬럼은 존재할 경우에만 포함)
            base_cols = [
                'display_cycle', 'V_i', 'price_end', 'shares_end', 'pool_end_before_deposit', 'pool_cap_limit',
                'pool_effective_for_v', 'E_calc', 'deposit_next', 'G', 'V_target', 'LBand', 'HBand',
                'band_reset_range_min', 'band_reset_range_max', 'band_reset_type'
            ]
            adaptive_cols = ['ve_divergence_ratio', 'band_compression_factor', 'band_lower_ratio', 'band_upper_ratio']

            # 존재하는 컬럼만 선택
            available_cols = [c for c in base_cols + adaptive_cols if c in df_full_history_display.columns]
            df_display_formatted = df_full_history_display[available_cols].copy()

            # 컬럼 이름 매핑
            rename_map = {
                'display_cycle': '사이클', 'V_i': '시작 목표 V (V_i)', 'price_end': '종료 가격', 'shares_end': '종료 주식수',
                'pool_end_before_deposit': '종료 예수금(적립전)', 'pool_cap_limit': '풀 한도 (50% of E)',
                'pool_effective_for_v': 'V 계산 반영 예수금', 'E_calc': '평가금(E)', 'deposit_next': '다음 적립금',
                'G': '적용 G', 'V_target': '다음 목표 V (V_f)', 'LBand': '다음 LBand', 'HBand': '다음 HBand',
                'band_reset_range_min': '다음 리셋 하한', 'band_reset_range_max': '다음 리셋 상한', 'band_reset_type': '리셋 타입',
                've_divergence_ratio': 'V/E 괴리율', 'band_compression_factor': '밴드 압축률',
                'band_lower_ratio': 'LBand 비율', 'band_upper_ratio': 'HBand 비율'
            }
            df_display_formatted = df_display_formatted.rename(columns=rename_map).set_index('사이클')

            # 포맷 설정
            format_dict = {
                '시작 목표 V (V_i)': '{:,.2f}', '종료 가격': '{:,.2f}', '종료 주식수': '{:.0f}', '종료 예수금(적립전)': '{:,.2f}',
                '풀 한도 (50% of E)': '{:,.2f}', 'V 계산 반영 예수금': '{:,.2f}',
                '평가금(E)': '{:,.2f}', '다음 적립금': '{:,.2f}', '적용 G': '{:.1f}',
                '다음 목표 V (V_f)': '{:,.2f}', '다음 LBand': '{:,.2f}', '다음 HBand': '{:,.2f}',
                '다음 리셋 하한': '{:,.2f}', '다음 리셋 상한': '{:,.2f}',
                'V/E 괴리율': '{:.1%}', '밴드 압축률': '{:.1%}',
                'LBand 비율': '{:.1%}', 'HBand 비율': '{:.1%}'
            }
            # 존재하는 컬럼만 포맷 적용
            format_dict_filtered = {k: v for k, v in format_dict.items() if k in df_display_formatted.columns}
            st.dataframe(df_display_formatted.style.format(format_dict_filtered, na_rep="-"), use_container_width=True)

        # === 차트 탭 ===
        with result_tabs[1]:
            graph_df = pd.DataFrame(st.session_state.history)

            if len(graph_df) > 1:
                plot_data = graph_df.copy()
                plot_data['cycle_num_display'] = plot_data['cycle_num'] + 1
                plot_data = plot_data.set_index('cycle_num_display')

                # Plotly 인터랙티브 차트 생성
                fig1, fig2, fig3, fig4 = create_plotly_charts(plot_data)

                if fig1 and fig2 and fig3 and fig4:
                    chart_col1, chart_col2 = st.columns(2)

                    with chart_col1:
                        st.plotly_chart(fig1, use_container_width=True, key="chart_band")
                        st.plotly_chart(fig3, use_container_width=True, key="chart_pool")

                    with chart_col2:
                        st.plotly_chart(fig2, use_container_width=True, key="chart_portfolio")
                        st.plotly_chart(fig4, use_container_width=True, key="chart_shares")

                    st.caption("💡 차트를 마우스로 호버하면 상세 값을 확인할 수 있습니다. 드래그로 확대/축소, 더블클릭으로 초기화가 가능합니다.")
                else:
                    st.warning("차트 데이터가 부족합니다.")
            else:
                st.info("사이클이 최소 1회 진행되어야 차트를 표시할 수 있습니다. (데이터 2개 이상 필요)")

        # === 다운로드 탭 ===
        with result_tabs[2]:
            st.markdown("### 📥 데이터 다운로드")

            download_col1, download_col2 = st.columns(2)

            with download_col1:
                st.markdown(create_highlight_card(
                    "CSV 데이터",
                    "전체 사이클 기록을 CSV 파일로 다운로드합니다. Excel이나 Google Sheets에서 열 수 있습니다.",
                    "📄", "info"
                ), unsafe_allow_html=True)

                df_full_history_download = pd.DataFrame(st.session_state.history)
                csv_buffer = io.StringIO()
                df_full_history_download.to_csv(csv_buffer, index=False, encoding='utf-8-sig')

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
                st.markdown(create_highlight_card(
                    "차트 이미지 (PNG)",
                    "시뮬레이션 차트를 고해상도 PNG 이미지로 다운로드합니다. 보고서나 발표 자료에 활용하세요.",
                    "🖼️", "success"
                ), unsafe_allow_html=True)

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
