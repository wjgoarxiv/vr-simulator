import streamlit as st
import pandas as pd
import matplotlib.pyplot as plt
import math
import io
import datetime
import pytz
import streamlit.components.v1 as components
import copy

# --- 페이지 설정 ---
st.set_page_config(page_title="VR 시뮬레이터 V2.3", layout="wide")

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

# =============================================================================
# 핵심 계산 함수
# =============================================================================

def calculate_v_next(V_i, pool_before_deposit, E_calc, G, deposit_next):
    """다음 목표 가치(V_f) 계산"""
    if G <= 0:
        return V_i
    try:
        term1 = V_i
        term2 = pool_before_deposit / G
        term3 = (E_calc - V_i) / (2 * math.sqrt(G)) if G > 0 else 0
        term4 = deposit_next
        V_f = term1 + term2 + term3 + term4
        return V_f
    except Exception as e:
        st.error(f"V 계산 오류: {e}")
        return V_i

def calculate_bands(V_target):
    """LBand, HBand 계산"""
    LBand = 0.85 * V_target
    HBand = 1.15 * V_target
    return LBand, HBand

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

# --- Matplotlib 그래프 생성 함수 (변경 없음) ---
def plot_results_matplotlib(history_df):
    if history_df.empty or len(history_df) < 1:
        return None

    fig, axs = plt.subplots(2, 2, figsize=(12, 8))
    plt.style.use('seaborn-v0_8-whitegrid')

    x_axis = history_df.index if history_df.index.name == 'cycle_num_display' else history_df['cycle_num']

    axs[0, 0].plot(x_axis, history_df['V_target'], marker='o', linestyle='-', label='Target Value (V)')
    axs[0, 0].plot(x_axis, history_df['LBand'], marker='^', linestyle='--', color='green', label='Lower Band (LBand)')
    axs[0, 0].plot(x_axis, history_df['HBand'], marker='v', linestyle='--', color='red', label='Upper Band (HBand)')
    axs[0, 0].fill_between(x_axis, history_df['LBand'], history_df['HBand'], color='orange', alpha=0.1)
    axs[0, 0].set_title('Value Band Tracking')
    axs[0, 0].set_xlabel('Cycle Number')
    axs[0, 0].set_ylabel('Value ($)')
    axs[0, 0].legend()
    axs[0, 0].grid(True)

    axs[0, 1].plot(x_axis, history_df['E_calc'], marker='s', linestyle='-', color='purple', label='Portfolio Value (E)')
    axs[0, 1].plot(x_axis, history_df['V_target'], marker='o', linestyle=':', label='Target Value (V)')
    axs[0, 1].set_title('Portfolio Value (E) vs Target (V)')
    axs[0, 1].set_xlabel('Cycle Number')
    axs[0, 1].set_ylabel('Value ($)')
    axs[0, 1].legend()
    axs[0, 1].grid(True)

    pool_start_of_cycle = history_df['pool_end_before_deposit'] + history_df['deposit_next']
    axs[1, 0].bar(x_axis, pool_start_of_cycle, color='skyblue', label='Pool Balance (Start of Cycle)')
    axs[1, 0].set_title('Pool Balance Trend')
    axs[1, 0].set_xlabel('Cycle Number')
    axs[1, 0].set_ylabel('Pool ($)')
    axs[1, 0].legend()
    axs[1, 0].grid(axis='y')

    axs[1, 1].plot(x_axis, history_df['shares_end'], marker='D', linestyle='-', color='brown', label='Shares Held')
    axs[1, 1].set_title('Shares Held Trend')
    axs[1, 1].set_xlabel('Cycle Number')
    axs[1, 1].set_ylabel('Number of Shares')
    axs[1, 1].legend()
    axs[1, 1].grid(True)

    fig.tight_layout()
    return fig

# =============================================================================
# Streamlit UI 구성
# =============================================================================
st.title("🔄 VR 시뮬레이터 V2.3")
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
        - 매수표의 가격은 **최대 허용 지정가(상한)** 입니다. 이 가격 **이하**에서 매수해도 LBand를 넘지 않습니다.
        - 현재가가 상한 이하라면 **즉시 체결**이 가능하며, 남은 예산으로 **하향 래더(대기 지정가)** 가 생성됩니다.
        - 매도표는 **최소 허용 지정가(하한)** 를 제시합니다. 현재가가 이 **이상**이면 즉시 매도 가능, 그렇지 않으면 **상향 래더**로 대기합니다.
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
                    st.session_state.history = df_history.to_dict('records')
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
                L0, H0 = calculate_bands(V0)
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
                    'E_calc': init_shares * init_price,
                    'V_i': V0
                }
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

        col_t1, col_t2, col_t3 = st.columns(3)
        col_t1.metric("LBand ($)", f"${LBand_display:,.2f}")
        col_t2.metric("HBand ($)", f"${HBand_display:,.2f}")
        target_col = col_t3.container()
        target_col.success(
            f"🟢 **매수(+1주) 최대 허용 지정가: ${buy_target_simple:,.2f}**  "+
            f"(이 가격 이하에선 매수해도 LBand 유지; 현재가 ${last_price_display:,.2f})"
        )
        if sell_target_simple > 0:
            target_col.error(
                f"🔴 **매도(-1주) 최소 허용 지정가: ${sell_target_simple:,.2f}**  "+
                f"(이 가격 이상에선 매도해도 HBand 유지; 현재가 ${last_price_display:,.2f})"
            )
        else:
            target_col.warning("⚠️ 매도 불가 (보유량 부족 또는 1주)")

        price_diff_ratio = (last_price_display - buy_target_simple) / last_price_display if last_price_display > 0 else 0
        if buy_target_simple > 0 and price_diff_ratio > 0.20 and display_cycle_num < 5:
            st.warning(f"⚠️ 매수 상한(${buy_target_simple:,.2f}$)이 이전 가격(${last_price_display:,.2f}$)과 차이가 큽니다. 다음 거래일 시초가 매수를 고려해볼 수 있습니다.")

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

        with st.form(key=f"cycle_{input_cycle_num}_form"):
            st.markdown(f"**Cycle {input_cycle_num} 동안의 투자 결과를 입력해주세요.**")
            form_cols = st.columns(4)
            price_end_input = form_cols[0].number_input("종료 시점 가격 ($)", min_value=0.01, value=float(default_price), step=0.01, key=f"price_{input_cycle_num}")
            shares_end_input = form_cols[1].number_input("종료 시점 보유 주식 수", min_value=0, value=int(default_shares), step=1, key=f"shares_{input_cycle_num}")
            pool_end_input = form_cols[2].number_input("종료 시점 예수금 ($) (적립금 추가 전)", min_value=0.0, value=float(default_pool_for_input), step=0.01, key=f"pool_{input_cycle_num}", help="이번 사이클이 끝났을 때, 다음 적립금이 추가되기 전의 실제 예수금을 입력하세요.")
            deposit_next_input = form_cols[3].number_input("다음 사이클 적립금 ($)", min_value=0.0, value=float(default_deposit), step=1.0, key=f"deposit_{input_cycle_num}")
            g_input = st.number_input("이번 사이클 적용 G 값", min_value=1.0, value=float(default_g), step=0.1, key=f"g_{input_cycle_num}")

            submitted = st.form_submit_button(f"➡️ Cycle {input_cycle_num + 1} 계산하기")

            if submitted:
                shares_end_int = int(round(shares_end_input))
                E_calc = shares_end_int * price_end_input
                pool_end_before_deposit = pool_end_input
                V_i_calc = active_state['V_target']

                V_next = calculate_v_next(V_i_calc, pool_end_before_deposit, E_calc, g_input, deposit_next_input)
                L_next, H_next = calculate_bands(V_next)

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
                    'V_i': V_i_calc
                }

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
        df_full_history_display = pd.DataFrame(st.session_state.history)
        df_full_history_display['display_cycle'] = df_full_history_display['cycle_num'] + 1

        df_display_formatted = df_full_history_display[[
            'display_cycle', 'V_i', 'price_end', 'shares_end', 'pool_end_before_deposit', 'E_calc', 'deposit_next', 'G', 'V_target', 'LBand', 'HBand'
        ]].rename(columns={
             'display_cycle': '사이클', 'V_i': '시작 목표 V (V_i)', 'price_end': '종료 가격', 'shares_end': '종료 주식수',
            'pool_end_before_deposit': '종료 예수금(적립전)', 'E_calc': '평가금(E)', 'deposit_next': '다음 적립금',
             'G': '적용 G', 'V_target': '다음 목표 V (V_f)', 'LBand': '다음 LBand', 'HBand': '다음 HBand'
        }).set_index('사이클')

        st.dataframe(df_display_formatted.style.format({
             '시작 목표 V (V_i)': '{:,.2f}', '종료 가격': '{:,.2f}', '종료 주식수': '{:.0f}', '종료 예수금(적립전)': '{:,.2f}',
             '평가금(E)': '{:,.2f}', '다음 적립금': '{:,.2f}', '적용 G': '{:.1f}',
             '다음 목표 V (V_f)': '{:,.2f}', '다음 LBand': '{:,.2f}', '다음 HBand': '{:,.2f}'
        }, na_rep="-"))

        df_full_history_download = pd.DataFrame(st.session_state.history)
        csv_buffer = io.StringIO()
        df_full_history_download.to_csv(csv_buffer, index=False, encoding='utf-8-sig')

        csv_filename = f"{today_date}_vr_simulation_history.csv"
        st.download_button(
            label="💾 전체 기록 CSV 다운로드",
            data=csv_buffer.getvalue(),
            file_name=csv_filename,
            mime="text/csv",
            key="download_csv"
        )

        st.subheader(r"📊 시뮬레이션 차트")
        graph_df = pd.DataFrame(st.session_state.history)

        if len(graph_df) > 1:
            plot_data = graph_df.copy()
            plot_data['cycle_num_display'] = plot_data['cycle_num'] + 1
            plot_data = plot_data.set_index('cycle_num_display')

            chart_col1, chart_col2 = st.columns(2)

            with chart_col1:
                st.markdown("**Value Band Tracking**")
                band_data = plot_data[['V_target', 'LBand', 'HBand']]
                band_data.rename(columns={'V_target': 'Target(V)'}, inplace=True)
                st.line_chart(band_data)

                st.markdown("**Pool Balance (Start of Cycle)**")
                pool_data = plot_data['pool_end_before_deposit'] + plot_data['deposit_next']
                pool_data.rename('Pool($)', inplace=True)
                st.bar_chart(pool_data)

            with chart_col2:
                st.markdown("**Portfolio Value (E) vs Target (V)**")
                portfolio_data = plot_data[['E_calc', 'V_target']]
                portfolio_data.rename(columns={'E_calc': 'Portfolio(E)', 'V_target': 'Target(V)'}, inplace=True)
                st.line_chart(portfolio_data)

                st.markdown("**Shares Held**")
                shares_data = plot_data[['shares_end']]
                shares_data.rename(columns={'shares_end': 'Shares'}, inplace=True)
                st.line_chart(shares_data)
        else:
            st.info("사이클이 최소 1회 진행되어야 차트를 표시할 수 있습니다. (데이터 2개 이상 필요)")

        st.markdown("---")
        st.subheader("📊 차트 다운로드 (PNG)")

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
                        key="download_mpl_png"
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
