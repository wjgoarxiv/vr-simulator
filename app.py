import streamlit as st
import pandas as pd
import matplotlib.pyplot as plt
import math
import io
import streamlit.components.v1 as components

# 페이지 설정
st.set_page_config(page_title="VR 시뮬레이터 V1.0", layout="wide")

# 세션 상태 초기화
if "simulation_results" not in st.session_state:
    st.session_state.simulation_results = None

def calculate_transactions(LBand, HBand, current_shares, pool, buy_ratio):
    buy_table = []
    allocated_cash = pool * buy_ratio
    remaining_cash = allocated_cash
    temp_shares = current_shares
    
    # 매수 테이블 계산
    while remaining_cash > 0:
        temp_shares += 1
        buy_price = LBand / temp_shares
        if buy_price > remaining_cash:
            break
        remaining_cash -= buy_price
        buy_table.append({
            'Target Shares After Buy': temp_shares,
            'Buy Price ($)': round(buy_price, 2),
            'Remaining Pool ($)': round(pool - (allocated_cash - remaining_cash), 2)
        })
    
    # 매도 테이블 계산
    sell_table = []
    temp_sell_shares = current_shares
    while temp_sell_shares > 1:
        temp_sell_shares -= 1
        sell_price = HBand / temp_sell_shares
        sell_table.append({
            'Target Shares After Sell': temp_sell_shares,
            'Sell Price ($)': round(sell_price, 2),
            'Accumulated Pool ($)': round(pool + sell_price * (current_shares - temp_sell_shares), 2)
        })
    return buy_table, sell_table

def run_cycle(prev, G, buy_ratio, deposit, manual_price_for_cycle):
    """
    한 사이클을 실행합니다.
      1) 임시로 new_V_temp = V_i + (pool_prev / G) 계산 -> 매수/매도 테이블 생성
      2) 매수/매도 실행 후 E, final_V, final_pool 계산
      3) LBand, HBand는 최종 final_V로부터 0.85/1.15 배로 계산
    """
    # 이전 사이클 정보
    V_i = prev['Target Value (V)']
    pool_prev = prev['Pool Balance ($)']
    current_shares = prev['Shares Held']
    
    # (1) 임시 V 계산 -> 매수/매도 테이블 계산용
    new_V_temp = V_i + (pool_prev / G)
    buy_table, sell_table = calculate_transactions(
        LBand=0.85 * new_V_temp,
        HBand=1.15 * new_V_temp,
        current_shares=current_shares,
        pool=pool_prev,
        buy_ratio=buy_ratio
    )
    
    # (2) 실제 시장 종가 적용
    price = manual_price_for_cycle
    shares = current_shares
    pool_after_transactions = pool_prev
    
    # 매수 주문 실행
    for bt in buy_table:
        if price <= bt['Buy Price ($)']:
            shares = bt['Target Shares After Buy']
            pool_after_transactions = bt['Remaining Pool ($)'] + (pool_prev * (1 - buy_ratio))
        else:
            break
    
    # 매도 주문 실행
    for st_table in sell_table:
        if price >= st_table['Sell Price ($)']:
            shares = st_table['Target Shares After Sell']
            pool_after_transactions = st_table['Accumulated Pool ($)']
        else:
            break
    
    # 최종 평가금 E
    E = shares * price
    
    # (3) 최종 final_V, final_pool 계산
    final_pool = pool_after_transactions + deposit
    final_V = V_i + (pool_prev / G) + ((E - V_i) / (2 * math.sqrt(G))) + deposit
    
    # 이제 LBand, HBand는 최종 final_V로부터 계산
    LBand_final = 0.85 * final_V
    HBand_final = 1.15 * final_V
    
    # 새 사이클 정보
    new_cycle = {
        'Cycle': prev['Cycle'] + 1,
        'Target Value (V)': final_V,
        'Shares Held': shares,
        'Pool Balance ($)': final_pool,
        'Lower Band (LBand)': LBand_final,
        'Upper Band (HBand)': HBand_final,
        'Market Price ($)': price
    }
    return new_cycle, buy_table, sell_table

def simulate_cycles(history, G, buy_ratio, deposit, cycles, manual_prices):
    transaction_history = []
    for i in range(cycles):
        prev = history[-1]
        if i < len(manual_prices):
            manual_price_for_cycle = manual_prices[i]
        else:
            manual_price_for_cycle = manual_prices[-1]
        new_cycle, buy_table, sell_table = run_cycle(prev, G, buy_ratio, deposit, manual_price_for_cycle)
        history.append(new_cycle)
        transaction_history.append({
            'Cycle': new_cycle['Cycle'],
            'Buy Table': buy_table,
            'Sell Table': sell_table
        })
    return history, transaction_history

def plot_results(history):
    df = pd.DataFrame(history)
    fig, axs = plt.subplots(2, 2, figsize=(10, 6.5))
    
    # Value Band Tracking
    axs[0,0].plot(df['Cycle'], df['Target Value (V)'], marker='D', label='Target Value (V)')
    axs[0,0].plot(df['Cycle'], df['Lower Band (LBand)'], '--', marker='D', label='Lower Band (LBand)')
    axs[0,0].plot(df['Cycle'], df['Upper Band (HBand)'], '--', marker='D', label='Upper Band (HBand)')
    axs[0,0].fill_between(df['Cycle'], df['Lower Band (LBand)'], df['Upper Band (HBand)'], color='orange', alpha=0.15)
    axs[0,0].set_title('Value Band Tracking')
    axs[0,0].set_xlabel('Cycle')
    axs[0,0].set_ylabel('Value ($)')
    axs[0,0].legend()
    axs[0,0].grid(True)
    
    # Portfolio Value Trend
    portfolio_value = df['Shares Held'] * df['Market Price ($)']
    axs[0,1].plot(df['Cycle'], portfolio_value, marker='o', label='Portfolio Value')
    axs[0,1].plot(df['Cycle'], df['Target Value (V)'], marker='o', label='Target Value (V)')
    axs[0,1].set_title('Portfolio Value Trend')
    axs[0,1].set_xlabel('Cycle')
    axs[0,1].set_ylabel('Value ($)')
    axs[0,1].legend()
    axs[0,1].grid(True)
    
    # Pool Balance Changes
    axs[1,0].bar(df['Cycle'], df['Pool Balance ($)'])
    axs[1,0].set_title('Pool Balance Changes')
    axs[1,0].set_xlabel('Cycle')
    axs[1,0].set_ylabel('Pool ($)')
    axs[1,0].grid(True)
    
    # TQQQ Price Trend
    axs[1,1].plot(df['Cycle'], df['Market Price ($)'], 'g-', marker='D')
    axs[1,1].set_title('TQQQ Price Trend')
    axs[1,1].set_xlabel('Cycle')
    axs[1,1].set_ylabel('Price ($)')
    axs[1,1].grid(True)
    
    fig.tight_layout()
    return fig

# Streamlit 인터페이스 (필수 라이브러리, Buy Me a Coffee 버튼 등은 동일)
# ==============================================================================

st.title("VR 시뮬레이터 V1.0")
st.markdown("| Written by **[Woojin Go](https://woojingo.notion.site/)**")
components.html(
    """
    <a href="https://www.buymeacoffee.com/woojingo" target="_blank">
        <img src="https://cdn.buymeacoffee.com/buttons/v2/default-red.png" alt="Buy Me A Coffee" style="height: 40px !important;width: 145px !important;">
    </a>
    """,
    height=80,
)

st.markdown("""
#### **Value Rebalancing (VR) 공식 (변형 공식):**

$$
V_f = V_i + \\frac{pool}{G} + \\frac{(E - V_i)}{2\\sqrt{G}} + deposit
$$

- $$V_i$$: 이전 목표 가치  
- $$pool$$: 현재 예수금  
- $$G$$: 그라데이션 값 (운용 안정성을 위해 사용); 10 ~ 20 추천  
- $$E$$: 평가금 (현재 주식 수 × 종가)  
- $$deposit$$: 각 사이클마다 추가되는 적립금 ($)
""")

st.sidebar.header("설정 옵션")

# --- 이전 사이클 기록 CSV 파일 업로드 ---
uploaded_file = st.sidebar.file_uploader("이전 사이클 기록 CSV 파일 업로드 (선택)", type=["csv"])

if uploaded_file is not None:
    try:
        df_history = pd.read_csv(uploaded_file)
        # CSV 파일로 불러온 전체 기록을 리스트로 변환
        loaded_history = df_history.to_dict('records')
        history = loaded_history[:]  # 전체 기록 유지
        st.sidebar.success("이전 기록이 성공적으로 로드되었습니다.")
    except Exception as e:
        st.sidebar.error(f"파일 로드 중 오류 발생: {e}")
        history = None
else:
    history = None
    st.sidebar.info("이전 기록 CSV 파일이 없는 경우, 아래 '템플릿 CSV 다운로드' 버튼을 통해 파일을 저장할 수 있습니다.")
    # 템플릿 CSV 생성을 위한 기본값 입력 (템플릿용)
    st.sidebar.markdown("#### **템플릿 CSV 생성용 초기 시스템 설정**")
    template_shares = st.sidebar.number_input("현재 TQQQ 보유 주식 수 (템플릿)", min_value=0.0, value=110.0, step=1.0, key="template_shares")
    template_price = st.sidebar.number_input("현재 TQQQ 가격 ($) (템플릿)", min_value=0.0, value=45.45, step=0.1, key="template_price")
    template_pool = st.sidebar.number_input("초기 예수금 ($) (템플릿)", min_value=0.0, value=0.5, step=0.05, key="template_pool")
    V0_template = template_shares * template_price
    template_data = {
        'Cycle': 0,
        'Target Value (V)': V0_template,
        'Shares Held': template_shares,
        'Pool Balance ($)': template_pool,
        'Lower Band (LBand)': 0.85 * V0_template,
        'Upper Band (HBand)': 1.15 * V0_template,
        'Market Price ($)': template_price
    }
    st.sidebar.download_button(
        label="템플릿 CSV 다운로드",
        data=pd.DataFrame([template_data]).to_csv(index=False),
        file_name="cycle_history_template.csv",
        mime="text/csv"
    )

# --- 초기 데이터 설정 ---
if history is None:
    st.sidebar.subheader("초기 시스템 설정")
    initial_shares = st.sidebar.number_input("현재 TQQQ 보유 주식 수", min_value=0.0, value=110.0, step=1.0)
    initial_price = st.sidebar.number_input("현재 TQQQ 가격 ($)", min_value=0.0, value=45.45, step=0.1)
    initial_pool = st.sidebar.number_input("초기 예수금 ($)", min_value=0.0, value=0.5, step=0.1)
    V0 = initial_shares * initial_price
    history = [{
        'Cycle': 0,
        'Target Value (V)': V0,
        'Shares Held': initial_shares,
        'Pool Balance ($)': initial_pool,
        'Lower Band (LBand)': 0.85 * V0,
        'Upper Band (HBand)': 1.15 * V0,
        'Market Price ($)': initial_price
    }]
else:
    st.sidebar.info("CSV로 불러온 전체 기록을 사용합니다.")

# 시뮬레이션 파라미터 입력
st.sidebar.subheader("시뮬레이션 파라미터")
G = st.sidebar.number_input("G 값 (추천: 10-20)", min_value=1.0, value=10.0, step=0.1)
buy_ratio = st.sidebar.number_input("매수 예수금 비율 (0.0 ~ 1.0)", min_value=0.0, max_value=1.0, value=0.75, step=0.05)
deposit = st.sidebar.number_input("사이클 당 적립금 ($)", min_value=0.0, value=250.0, step=1.0)
cycles = st.sidebar.number_input("실행할 사이클 수", min_value=1, value=2, step=1)

# 수동 종가를 콤마로 구분하여 입력 (각 사이클마다 다른 값 사용)
manual_price_input = st.sidebar.text_input("수동 TQQQ 종가 (각 사이클마다 콤마로 구분)", value="44.34, 45")
try:
    manual_prices = [float(x.strip()) for x in manual_price_input.split(",") if x.strip() != ""]
    if len(manual_prices) == 0:
        manual_prices = [45.45] * cycles
except:
    manual_prices = [45.45] * cycles

# 시뮬레이션 실행 버튼
if st.sidebar.button("시뮬레이션 실행"):
    with st.spinner("시뮬레이션 실행 중..."):
        history, transaction_history = simulate_cycles(history, G, buy_ratio, deposit, cycles, manual_prices)
        df_result = pd.DataFrame(history)
        fig = plot_results(history)
        st.session_state.simulation_results = {
            "history": history,
            "transaction_history": transaction_history,
            "df_result": df_result,
            "fig": fig
        }
        st.success("시뮬레이션이 완료되었습니다!")

# 만약 이전에 실행된 시뮬레이션 결과가 있다면 그대로 사용
if st.session_state.simulation_results is not None:
    simulation = st.session_state.simulation_results
    df_result = simulation["df_result"]
    fig = simulation["fig"]
    transaction_history = simulation["transaction_history"]

    st.subheader("1. 시뮬레이션 결과")
    st.dataframe(df_result)

    st.subheader("2. 매수표 / 매도표 확인")
    for trans in transaction_history:
        cycle = trans['Cycle']
        with st.expander(f"Cycle {cycle} 매수표 / 매도표 확인"):
            st.markdown("**매수표:**")
            if trans['Buy Table']:
                df_buy = pd.DataFrame(trans['Buy Table'])
                st.dataframe(df_buy)
                csv_buy = df_buy.to_csv(index=False).encode('utf-8')
                st.download_button(label=f"Cycle {cycle} 매수표 다운로드", data=csv_buy,
                                   file_name=f"cycle_{cycle}_buy_table.csv", mime="text/csv", key=f"download_buy_{cycle}")
            else:
                st.write("매수표 없음")
            st.markdown("**매도표:**")
            if trans['Sell Table']:
                df_sell = pd.DataFrame(trans['Sell Table'])
                st.dataframe(df_sell)
                csv_sell = df_sell.to_csv(index=False).encode('utf-8')
                st.download_button(label=f"Cycle {cycle} 매도표 다운로드", data=csv_sell,
                                   file_name=f"cycle_{cycle}_sell_table.csv", mime="text/csv", key=f"download_sell_{cycle}")
            else:
                st.write("매도표 없음")

    st.subheader("3. 그래프 결과")
    st.pyplot(fig)
    
    csv_buffer = io.StringIO()
    df_result.to_csv(csv_buffer, index=False)
    csv_data = csv_buffer.getvalue().encode('utf-8')
    st.download_button(
        label="전체 결과 CSV 다운로드",
        data=csv_data,
        file_name="cycle_history.csv",
        mime="text/csv"
    )
    
    png_buffer = io.BytesIO()
    fig.savefig(png_buffer, format="png", dpi=600, bbox_inches="tight")
    png_buffer.seek(0)
    st.download_button(
        label="그래프 PNG 다운로드",
        data=png_buffer,
        file_name="cycle_graph.png",
        mime="image/png"
    )