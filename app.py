import streamlit as st
import pandas as pd
import matplotlib.pyplot as plt # Re-introduced for saving graph image
import math
import io
import datetime
import pytz
import streamlit.components.v1 as components
import copy # To deep copy history states

# --- 페이지 설정 ---
st.set_page_config(page_title="VR 시뮬레이터 V2.1", layout="wide") # Version remains 2.1

# --- 세션 상태 초기화 ---
# 'history'는 각 사이클 *종료 후* 상태를 저장
if 'history' not in st.session_state:
    st.session_state.history = []
if 'current_G' not in st.session_state:
    st.session_state.current_G = 10.0
if 'default_deposit' not in st.session_state:
    st.session_state.default_deposit = 50.0
if 'simulation_started' not in st.session_state:
    st.session_state.simulation_started = False
# Navigation state
if 'view_cycle_index' not in st.session_state:
    st.session_state.view_cycle_index = 0

# =============================================================================
# 핵심 계산 함수 (변경 없음)
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
    """단순 매수/매도 목표가 계산 (+/- 1주 기준)"""
    buy_target_price = 0
    if shares_start >= 0:
        buy_target_price = LBand / (shares_start + 1) if (shares_start + 1) > 0 else 0

    sell_target_price = 0
    if shares_start > 1:
         sell_target_price = HBand / (shares_start - 1) if (shares_start -1) > 0 else 0
    elif shares_start == 1:
        sell_target_price = HBand / shares_start if shares_start > 0 else 0

    return round(buy_target_price, 2), round(sell_target_price, 2)


# 상세 매수/매도표 (기존 로직 유지)
def calculate_detailed_tables(LBand, HBand, current_shares, pool, buy_ratio):
    buy_table = []
    allocated_cash = pool * buy_ratio
    remaining_cash = allocated_cash
    temp_shares = current_shares
    max_iterations = 1000
    iterations = 0

    while remaining_cash > 0 and temp_shares >= 0 and iterations < max_iterations:
        iterations += 1
        temp_shares += 1
        buy_price = LBand / temp_shares if temp_shares > 0 else 0
        if buy_price <= 0 or buy_price > remaining_cash:
            break
        remaining_cash -= buy_price
        buy_table.append({
            '매수 후 목표 주식수': temp_shares,
            '매수 목표가 ($)': round(buy_price, 2),
            '매수 후 총 예수금 ($)': round(pool - (allocated_cash - remaining_cash), 2)
        })
    if iterations >= max_iterations:
         st.warning("매수 테이블 계산 중 최대 반복 횟수에 도달했습니다. 결과가 불완전할 수 있습니다.")


    sell_table = []
    temp_sell_shares = current_shares
    iterations = 0
    while temp_sell_shares > 0 and iterations < max_iterations:
        iterations += 1
        shares_to_sell = 1
        target_shares_after_sell = temp_sell_shares - shares_to_sell
        if target_shares_after_sell < 0 :
             break

        sell_price = HBand / target_shares_after_sell if target_shares_after_sell > 0 else HBand
        accumulated_pool = pool + (sell_price * shares_to_sell)

        sell_table.append({
            '매도 후 목표 주식수': target_shares_after_sell,
            '매도 목표가 ($)': round(sell_price, 2),
            '매도 후 총 예수금 ($)': round(accumulated_pool, 2)
        })
        temp_sell_shares -= shares_to_sell

        if target_shares_after_sell == 0:
            break
    if iterations >= max_iterations:
         st.warning("매도 테이블 계산 중 최대 반복 횟수에 도달했습니다. 결과가 불완전할 수 있습니다.")


    return buy_table, sell_table


# --- 마켓 상태 함수 (변경 없음) ---
def get_market_status():
    korea_tz = pytz.timezone('Asia/Seoul')
    now = datetime.datetime.now(korea_tz)
    current_hour = now.hour
    current_minute = now.minute
    current_time_kst = now

    us_eastern = pytz.timezone('US/Eastern')
    us_time = current_time_kst.astimezone(us_eastern)
    us_weekday = us_time.weekday()
    us_hour = us_time.hour
    us_minute = us_time.minute

    is_market_open = (us_weekday < 5) and (datetime.time(9, 30) <= us_time.time() < datetime.time(16, 0))
    status = "정규장 운영 중" if is_market_open else "정규장 종료"
    if us_weekday >=5:
        status = "주말 휴장"

    dst_text = "적용 중" if us_time.dst() != datetime.timedelta(0) else "미적용"

    try:
        market_open_time_in_et = datetime.time(9, 30)
        localized_us_time = us_eastern.localize(datetime.datetime.combine(us_time.date(), datetime.time(0,0)))
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

    except Exception as e:
        is_reservation_possible = False

    return now.strftime("%Y-%m-%d %H:%M:%S"), status, dst_text, is_market_open, is_reservation_possible

# --- 네비게이션 콜백 함수 (변경 없음) ---
def go_previous():
    if st.session_state.view_cycle_index > 0:
        st.session_state.view_cycle_index -= 1

def go_next():
    if st.session_state.view_cycle_index < len(st.session_state.history) - 1:
        st.session_state.view_cycle_index += 1

# --- Matplotlib 그래프 생성 함수 (for Download) ---
def plot_results_matplotlib(history_df):
    """Generates a 2x2 Matplotlib figure for download."""
    if history_df.empty or len(history_df) < 1:
        return None

    fig, axs = plt.subplots(2, 2, figsize=(12, 8))
    plt.style.use('seaborn-v0_8-whitegrid') # Example style

    # Use index if it's set to cycle number, otherwise use 'cycle_num' column
    x_axis = history_df.index if history_df.index.name == 'cycle_num_display' else history_df['cycle_num']

    # 1. Value Band Tracking
    axs[0,0].plot(x_axis, history_df['V_target'], marker='o', linestyle='-', label='Target Value (V)')
    axs[0,0].plot(x_axis, history_df['LBand'], marker='^', linestyle='--', color='green', label='Lower Band (LBand)')
    axs[0,0].plot(x_axis, history_df['HBand'], marker='v', linestyle='--', color='red', label='Upper Band (HBand)')
    axs[0,0].fill_between(x_axis, history_df['LBand'], history_df['HBand'], color='orange', alpha=0.1)
    axs[0,0].set_title('Value Band Tracking')
    axs[0,0].set_xlabel('Cycle Number')
    axs[0,0].set_ylabel('Value ($)')
    axs[0,0].legend()
    axs[0,0].grid(True)

    # 2. Portfolio Value (E) vs Target (V)
    axs[0,1].plot(x_axis, history_df['E_calc'], marker='s', linestyle='-', color='purple', label='Portfolio Value (E)')
    axs[0,1].plot(x_axis, history_df['V_target'], marker='o', linestyle=':', label='Target Value (V)')
    axs[0,1].set_title('Portfolio Value (E) vs Target (V)')
    axs[0,1].set_xlabel('Cycle Number')
    axs[0,1].set_ylabel('Value ($)')
    axs[0,1].legend()
    axs[0,1].grid(True)

    # 3. Pool Balance (Start of Cycle)
    pool_start_of_cycle = history_df['pool_end_before_deposit'] + history_df['deposit_next']
    axs[1,0].bar(x_axis, pool_start_of_cycle, color='skyblue', label='Pool Balance (Start of Cycle)')
    axs[1,0].set_title('Pool Balance Trend')
    axs[1,0].set_xlabel('Cycle Number')
    axs[1,0].set_ylabel('Pool ($)')
    axs[1,0].legend()
    axs[1,0].grid(axis='y')

    # 4. Shares Held Trend
    axs[1,1].plot(x_axis, history_df['shares_end'], marker='D', linestyle='-', color='brown', label='Shares Held')
    axs[1,1].set_title('Shares Held Trend')
    axs[1,1].set_xlabel('Cycle Number')
    axs[1,1].set_ylabel('Number of Shares')
    axs[1,1].legend()
    axs[1,1].grid(True)

    fig.tight_layout()
    return fig

# =============================================================================
# Streamlit UI 구성
# =============================================================================
st.title("🔄 VR 시뮬레이터 V2.1")
st.markdown("| Written by **[Woojin Go](https://woojingo.notion.site/)**")

# --- 사이드바 ---
with st.sidebar:
    st.header("⚙️ 시뮬레이션 설정")
    if not st.session_state.simulation_started:
        st.session_state.current_G = st.number_input("초기 G 값 (Gradient)", min_value=1.0, value=st.session_state.current_G, step=0.1, help="VR 공식의 안정성 계수 (10~20 추천)")
        st.session_state.default_deposit = st.number_input("기본 적립금 ($)", min_value=0.0, value=st.session_state.default_deposit, step=1.0, help="매 사이클 종료 후 추가될 기본 예수금")
    else:
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
        st.markdown("""
        #### 사용 방법:
        1.  **초기 설정**: 시뮬레이션 시작 전, 초기 보유 주식 수, 현재 가격, 초기 예수금을 입력하거나 이전 기록 CSV 파일을 업로드하세요. 초기 G값과 기본 적립금을 설정합니다.
        2.  **시뮬레이션 시작**: '시뮬레이션 시작/재설정' 버튼을 클릭합니다.
        3.  **사이클 조회**: 상단의 '⏮️ 이전 사이클' / '다음 사이클 ⏭️' 버튼으로 과거 기록을 조회할 수 있습니다.
        4.  **다음 사이클 진행 (가장 마지막 사이클에서만 가능)**:
            * 현재 사이클의 목표 V, LBand/HBand, 추천 매수/매도 목표가를 확인합니다.
            * 실제 투자 기간 동안 거래를 수행합니다.
            * 기간 종료 후, **실제 결과 (최종 가격, 최종 주식 수, 최종 예수금)**와 다음 사이클에 추가할 **적립금**, 이번 사이클에 적용할 **G값**을 입력합니다.
            * '다음 사이클 계산' 버튼을 클릭하여 다음 단계로 넘어갑니다.
        5.  **결과 확인**: 하단의 기록 테이블과 차트를 통해 전체 시뮬레이션 결과를 확인하고, 기록 데이터(CSV)와 차트 이미지(PNG)를 다운로드할 수 있습니다.

        #### Value Rebalancing (VR) 공식 (변형):
        $$
        V_f = V_i + \\frac{pool_{prev}}{G} + \\frac{(E - V_i)}{2\\sqrt{G}} + deposit_{next}
        $$
        - $V_f$: **다음** 사이클 목표 가치
        - $V_i$: **이전** 사이클 목표 가치
        - $pool_{prev}$: 이전 사이클 종료 시점의 예수금 (**적립금 추가 전**)
        - $G$: 그라데이션 값 (설정값)
        - $E$: 이전 사이클 종료 시점의 평가금 (최종 주식 수 × 최종 가격)
        - $deposit_{next}$: 다음 사이클 시작 시 추가될 적립금
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
                    st.session_state.view_cycle_index = len(st.session_state.history) -1
                    st.success(f"{len(st.session_state.history)}개 사이클 기록 로드 완료.")
                else:
                    st.error(f"CSV 파일에 필요한 컬럼({', '.join(required_cols)})이 모두 존재하지 않습니다.")
                    st.session_state.history = []
            except Exception as e:
                st.error(f"CSV 파일 처리 오류: {e}")
                st.session_state.history = []
        else:
             st.info("⚠️ 이전 기록 CSV가 없다면, 아래 설정 후 '시뮬레이션 시작' 시 자동으로 생성/다운로드됩니다.")

    else:
        st.markdown("**직접 초기값 입력:**")
        col1, col2, col3 = st.columns(3)
        with col1:
            init_shares = st.number_input("초기 TQQQ 보유 주식 수", min_value=0.0, value=1.0, step=1.0, key="init_shares")
        with col2:
            init_price = st.number_input("현재 TQQQ 가격 ($)", min_value=0.01, value=36.62, step=0.01, key="init_price")
        with col3:
            init_pool = st.number_input("초기 예수금 ($)", min_value=0.0, value=13.36, step=0.01, key="init_pool")

    if st.button("🚀 시뮬레이션 시작 / 재설정", key="start_button"):
        if use_csv and uploaded_file and st.session_state.history:
            last_entry = st.session_state.history[-1]
            st.session_state.current_G = last_entry.get('G', st.session_state.current_G)
            st.session_state.default_deposit = last_entry.get('deposit_next', st.session_state.default_deposit)
            st.session_state.simulation_started = True
            st.rerun()
        elif not use_csv:
            if init_price <= 0:
                 st.warning("현재 가격은 0보다 커야 합니다.")
            else:
                V0 = init_shares * init_price
                L0, H0 = calculate_bands(V0)
                initial_state = {
                    'cycle_num': 0,
                    'V_target': V0,
                    'LBand': L0,
                    'HBand': H0,
                    'shares_end': init_shares,
                    'pool_end_before_deposit': init_pool,
                    'deposit_next': st.session_state.default_deposit,
                    'price_end': init_price,
                    'G': st.session_state.current_G,
                    'E_calc': V0,
                    'V_i': V0 # Cycle 1 계산 시 V_i는 Cycle 0의 V_target
                }
                st.session_state.history = [initial_state]
                st.session_state.view_cycle_index = 0
                st.session_state.simulation_started = True
                st.rerun()
        elif use_csv and not uploaded_file:
             st.warning("CSV 파일을 업로드하거나, 체크박스를 해제하고 초기값을 입력해주세요.")
        # Removed redundant else block from previous version


# --- 2. 시뮬레이션 진행 및 조회 ---
if st.session_state.simulation_started and st.session_state.history:

    # --- 네비게이션 버튼 ---
    nav_cols = st.columns([1, 1, 5, 1, 1])
    with nav_cols[0]:
        st.button("⏮️ 이전 사이클", on_click=go_previous, disabled=(st.session_state.view_cycle_index <= 0), use_container_width=True, key="prev_cycle")
    with nav_cols[1]:
        st.button("다음 사이클 ⏭️", on_click=go_next, disabled=(st.session_state.view_cycle_index >= len(st.session_state.history) - 1), use_container_width=True, key="next_cycle")

    # --- 현재 조회 중인 사이클 정보 표시 ---
    try:
        active_state = copy.deepcopy(st.session_state.history[st.session_state.view_cycle_index])
        display_cycle_num = active_state['cycle_num'] + 1
        st.header(f"2. CYCLE {display_cycle_num} 조회")
        st.info(f"현재 **Cycle {active_state['cycle_num']}** 의 종료 시점 기록을 보고 있습니다. (다음 사이클인 Cycle {display_cycle_num}의 시작 정보)")

        V_i_display = active_state['V_target']
        shares_start_display = active_state['shares_end']
        pool_start_display = active_state['pool_end_before_deposit'] + active_state['deposit_next']
        LBand_display = active_state['LBand']
        HBand_display = active_state['HBand']
        G_display = active_state['G']
        last_price_display = active_state['price_end']

        st.subheader(f"📊 Cycle {display_cycle_num} 시작 상태 및 목표 (예상)")
        col1, col2, col3, col4 = st.columns(4)
        col1.metric("시작 주식 수", f"{shares_start_display:.2f} 주")
        col2.metric("시작 예수금 ($)", f"${pool_start_display:,.2f}")
        col3.metric("목표 V ($)", f"${V_i_display:,.2f}")
        col4.metric("적용 G 값", f"{G_display:.1f}")

        st.markdown("**매수/매도 목표 참고:**")
        buy_target_simple, sell_target_simple = calculate_simple_targets(shares_start_display, LBand_display, HBand_display)

        col_t1, col_t2, col_t3 = st.columns(3)
        col_t1.metric("LBand ($)", f"${LBand_display:,.2f}")
        col_t2.metric("HBand ($)", f"${HBand_display:,.2f}")
        target_col = col_t3.container()
        target_col.success(f"🟢 **매수 (+1주) 목표가: ${buy_target_simple:,.2f}**")
        if sell_target_simple > 0:
             target_col.error(f"🔴 **매도 (-1주) 목표가: ${sell_target_simple:,.2f}**")
        else:
             target_col.warning(f"⚠️ 매도 불가 (보유량 부족 또는 1주)")

        # --- 월요일 시초가 매수 제안 로직 ---
        price_diff_ratio = (last_price_display - buy_target_simple) / last_price_display if last_price_display > 0 else 0
        if buy_target_simple > 0 and price_diff_ratio > 0.20 and display_cycle_num < 5:
             st.warning(f"⚠️ 매수 목표가(${buy_target_simple:,.2f}$)가 이전 가격(${last_price_display:,.2f}$)과 차이가 큽니다. 다음 거래일 시초가 매수를 고려해볼 수 있습니다.")


        with st.expander("상세 매수/매도 테이블 보기"):
            buy_table_detail, sell_table_detail = calculate_detailed_tables(LBand_display, HBand_display, shares_start_display, pool_start_display, buy_ratio_for_table)
            tcol1, tcol2 = st.columns(2)
            with tcol1:
                st.write("**상세 매수표**")
                if buy_table_detail:
                    st.dataframe(pd.DataFrame(buy_table_detail).set_index('매수 후 목표 주식수'))
                else:
                    st.info("계산된 매수 목표 없음")
            with tcol2:
                st.write("**상세 매도표**")
                if sell_table_detail:
                    st.dataframe(pd.DataFrame(sell_table_detail).set_index('매도 후 목표 주식수'))
                else:
                    st.info("계산된 매도 목표 없음")

    except IndexError:
        st.error("기록 인덱스 오류 발생. 시뮬레이션을 재설정해주세요.")
        st.session_state.simulation_started = False
        st.session_state.history = []
        st.session_state.view_cycle_index = 0
    except Exception as e:
        st.error(f"데이터 표시 중 오류 발생: {e}")


    # --- 사이클 결과 입력 폼 (가장 마지막 기록을 볼 때만 표시) ---
    if st.session_state.view_cycle_index == len(st.session_state.history) - 1:
        st.divider()
        input_cycle_num = active_state['cycle_num'] + 1
        st.subheader(f"✍️ Cycle {input_cycle_num} 결과 입력")

        default_price = active_state['price_end']
        default_shares = active_state['shares_end']
        default_pool_for_input = active_state['pool_end_before_deposit']
        default_deposit = st.session_state.default_deposit
        default_g = st.session_state.current_G

        with st.form(key=f"cycle_{input_cycle_num}_form"):
            st.markdown(f"**Cycle {input_cycle_num} 동안의 투자 결과를 입력해주세요.**")
            form_cols = st.columns(4)
            price_end_input = form_cols[0].number_input("종료 시점 가격 ($)", min_value=0.01, value=default_price, step=0.01, key=f"price_{input_cycle_num}")
            shares_end_input = form_cols[1].number_input("종료 시점 보유 주식 수", min_value=0.0, value=default_shares, step=1.0, key=f"shares_{input_cycle_num}")
            pool_end_input = form_cols[2].number_input("종료 시점 예수금 ($) (적립금 추가 전)", min_value=0.0, value=default_pool_for_input, step=0.01, key=f"pool_{input_cycle_num}", help="이번 사이클이 끝났을 때, 다음 적립금이 추가되기 전의 실제 예수금을 입력하세요.")
            deposit_next_input = form_cols[3].number_input("다음 사이클 적립금 ($)", min_value=0.0, value=default_deposit, step=1.0, key=f"deposit_{input_cycle_num}")
            g_input = st.number_input("이번 사이클 적용 G 값", min_value=1.0, value=default_g, step=0.1, key=f"g_{input_cycle_num}")

            submitted = st.form_submit_button(f"➡️ Cycle {input_cycle_num + 1} 계산하기")

            if submitted:
                # --- 다음 사이클 계산 로직 ---
                E_calc = shares_end_input * price_end_input
                pool_end_before_deposit = pool_end_input
                V_i_calc = active_state['V_target']

                V_next = calculate_v_next(V_i_calc, pool_end_before_deposit, E_calc, g_input, deposit_next_input)
                L_next, H_next = calculate_bands(V_next)

                new_state = {
                    'cycle_num': input_cycle_num,
                    'V_target': V_next,
                    'LBand': L_next,
                    'HBand': H_next,
                    'shares_end': shares_end_input,
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
    st.header("3. 📜 시뮬레이션 결과 요약")

    if len(st.session_state.history) > 0:
        df_full_history_display = pd.DataFrame(st.session_state.history)
        df_full_history_display['display_cycle'] = df_full_history_display['cycle_num'] + 1

        # --- 결과 테이블 표시 ---
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

        # --- 전체 기록 CSV 다운로드 ---
        df_full_history_download = pd.DataFrame(st.session_state.history)
        csv_buffer = io.StringIO()
        df_full_history_download.to_csv(csv_buffer, index=False, encoding='utf-8-sig')
        st.download_button(
            label="💾 전체 기록 CSV 다운로드",
            data=csv_buffer.getvalue(),
            file_name="vr_simulation_history.csv",
            mime="text/csv",
            key="download_csv"
        )

        # --- Streamlit 네이티브 차트 생성 ---
        st.subheader(r"📊 시뮬레이션 차트")
        graph_df = pd.DataFrame(st.session_state.history)

        if len(graph_df) > 1:
            plot_data = graph_df.copy()
            plot_data['cycle_num_display'] = plot_data['cycle_num'] + 1
            plot_data = plot_data.set_index('cycle_num_display') # Use display cycle num as index

            chart_col1, chart_col2 = st.columns(2)

            with chart_col1:
                st.markdown("**Value Band Tracking**")
                band_data = plot_data[['V_target', 'LBand', 'HBand']]
                band_data.rename(columns={'V_target':'Target(V)'}, inplace=True)
                st.line_chart(band_data)

                st.markdown("**Pool Balance (Start of Cycle)**")
                pool_data = plot_data['pool_end_before_deposit'] + plot_data['deposit_next']
                pool_data.rename('Pool($)', inplace=True)
                st.bar_chart(pool_data)

            with chart_col2:
                st.markdown("**Portfolio Value (E) vs Target (V)**")
                portfolio_data = plot_data[['E_calc', 'V_target']]
                portfolio_data.rename(columns={'E_calc':'Portfolio(E)','V_target':'Target(V)'}, inplace=True)
                st.line_chart(portfolio_data)

                st.markdown("**Shares Held**")
                shares_data = plot_data[['shares_end']]
                shares_data.rename(columns={'shares_end':'Shares'}, inplace=True)
                st.line_chart(shares_data)
        else:
            st.info("사이클이 최소 1회 진행되어야 차트를 표시할 수 있습니다. (데이터 2개 이상 필요)")


        # --- Matplotlib 기반 그래프 다운로드 ---
        st.markdown("---")
        st.subheader("📊 차트 다운로드 (PNG)")

        # Prepare data for matplotlib function (ensure using display cycle num as index if needed)
        graph_df_mpl = pd.DataFrame(st.session_state.history)
        if len(graph_df_mpl) > 1:
             # We need cycle_num column for the plot function, but index should be display num
            graph_df_mpl['cycle_num_display'] = graph_df_mpl['cycle_num'] + 1
            graph_df_mpl_indexed = graph_df_mpl.set_index('cycle_num_display')

            # Generate matplotlib figure but don't display it here
            fig_mpl = plot_results_matplotlib(graph_df_mpl_indexed) # Pass dataframe with correct index

            if fig_mpl:
                png_buffer = io.BytesIO()
                try:
                     # Explicitly use Agg backend for non-interactive saving
                     # plt.switch_backend('Agg') # Might cause issues in Streamlit Cloud, try without first
                     fig_mpl.savefig(png_buffer, format="png", dpi=300, bbox_inches="tight")
                     plt.close(fig_mpl) # Close the figure to free memory
                     st.download_button(
                        label="📊 전체 차트 PNG 다운로드",
                        data=png_buffer.getvalue(),
                        file_name="vr_simulation_charts.png",
                        mime="image/png",
                        key="download_mpl_png"
                     )
                except Exception as e:
                     st.error(f"차트 이미지 생성 중 오류 발생: {e}")
                     # Ensure figure is closed even if error occurs
                     if 'fig_mpl' in locals() and plt.fignum_exists(fig_mpl.number):
                          plt.close(fig_mpl)
                # No finally block needed here as plt.close handles non-existent figures gracefully

            else:
                st.info("차트 이미지를 생성하기 위한 데이터가 부족합니다.")
        else:
             st.info("사이클이 최소 1회 진행되어야 차트 이미지를 다운로드할 수 있습니다.")


    else:
        st.info("시뮬레이션을 시작하면 결과 요약이 여기에 표시됩니다.")