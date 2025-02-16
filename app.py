import streamlit as st
import pandas as pd
import matplotlib.pyplot as plt
import math
import io
import streamlit.components.v1 as components

# 페이지 설정
st.set_page_config(page_title="VR 시뮬레이터 V1.0", layout="wide")

# 세션 상태 초기화 (시뮬레이션 결과 보존)
if "simulation_results" not in st.session_state:
    st.session_state.simulation_results = None

# =============================================================================
# 공통 함수 정의
# =============================================================================
def calculate_transactions(LBand, HBand, current_shares, pool, buy_ratio):
    """
    매수표와 매도표를 계산합니다.
    """
    buy_table = []
    allocated_cash = pool * buy_ratio
    remaining_cash = allocated_cash
    temp_shares = current_shares
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

def apply_price_steps(steps, buy_table, sell_table, initial_shares, initial_pool, buy_ratio):
    """
    가격 단계 적용 및 거래 실행
    """
    current_shares = initial_shares
    current_pool = initial_pool
    transaction_log = []

    for price in steps:
        # 매수 조건 확인 (낮은 가격부터)
        executed_buy = None
        for bt in sorted(buy_table, key=lambda x: x['Buy Price ($)']):
            if price <= bt['Buy Price ($)']:
                executed_buy = bt
                break
        
        # 매도 조건 확인 (높은 가격부터)
        executed_sell = None
        for st in sorted(sell_table, key=lambda x: x['Sell Price ($)'], reverse=True):
            if price >= st['Sell Price ($)']:
                executed_sell = st
                break

        # 거래 실행 (매수 우선)
        if executed_buy:
            current_shares = executed_buy['Target Shares After Buy']
            current_pool = executed_buy['Remaining Pool ($)'] + (initial_pool * (1 - buy_ratio))
            transaction_log.append(f"매수 실행: {executed_buy['Target Shares After Buy']}주 @${executed_buy['Buy Price ($)']:.2f}")
            break  # 매수 실행 후 종료
        elif executed_sell:
            current_shares = executed_sell['Target Shares After Sell']
            current_pool = executed_sell['Accumulated Pool ($)']
            transaction_log.append(f"매도 실행: {initial_shares - executed_sell['Target Shares After Sell']}주 @${executed_sell['Sell Price ($)']:.2f}")
            break  # 매도 실행 후 종료
        else:
            transaction_log.append(f"가격 ${price:.2f}에서 거래 없음")

    return current_shares, current_pool, transaction_log

def run_cycle(prev, G, buy_ratio, deposit, price_steps):
    """
    한 사이클을 실행합니다 (가격 단계 적용 포함)
    """
    cycle_idx = prev['Cycle']
    V_i = prev['Target Value (V)']
    pool_prev = prev['Pool Balance ($)']
    shares_prev = prev['Shares Held']
    
    # 첫 사이클 처리
    if cycle_idx == 0:
        LBand = 0.85 * V_i
        HBand = 1.15 * V_i
        buy_table, sell_table = calculate_transactions(LBand, HBand, shares_prev, pool_prev, buy_ratio)
        final_shares = shares_prev
        final_pool = pool_prev
        transaction_log = ["첫 사이클: 거래 없음"]
    else:
        # 확장 공식 적용 전 LBand/HBand 계산
        new_V_temp = V_i + (pool_prev / G)
        LBand_temp = 0.85 * new_V_temp
        HBand_temp = 1.15 * new_V_temp
        buy_table, sell_table = calculate_transactions(LBand_temp, HBand_temp, shares_prev, pool_prev, buy_ratio)
        
        # 가격 단계 적용
        final_shares, final_pool, transaction_log = apply_price_steps(
            price_steps, buy_table, sell_table, shares_prev, pool_prev, buy_ratio
        )

    # 확장 공식 적용
    E = final_shares * price_steps[-1]  # 최종 가격 사용
    final_V = V_i + (pool_prev / G) + ((E - V_i) / (2 * math.sqrt(G))) + deposit
    LBand_final = 0.85 * final_V
    HBand_final = 1.15 * final_V

    new_cycle = {
        'Cycle': cycle_idx + 1,
        'Target Value (V)': final_V,
        'Shares Held': final_shares,
        'Pool Balance ($)': final_pool + deposit,  # 적립금 추가
        'Lower Band (LBand)': LBand_final,
        'Upper Band (HBand)': HBand_final,
        'Market Price ($)': price_steps[-1],
        'Transaction Log': transaction_log
    }
    return new_cycle, buy_table, sell_table

def simulate_cycles(history, G, buy_ratio, deposit, cycles, all_price_steps):
    transaction_history = []
    for i in range(cycles):
        prev = history[-1]
        price_steps = all_price_steps[i] if i < len(all_price_steps) else [prev['Market Price ($)']]
        new_cycle, buy_table, sell_table = run_cycle(prev, G, buy_ratio, deposit, price_steps)
        history.append(new_cycle)
        transaction_history.append({
            'Cycle': new_cycle['Cycle'],
            'Buy Table': buy_table,
            'Sell Table': sell_table,
            'Price Steps': price_steps,
            'Transaction Log': new_cycle['Transaction Log']
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

# =============================================================================
# Streamlit 인터페이스 구성
# =============================================================================
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

with st.expander("사용된 Value Rebalancing (VR) 공식 펼쳐보기:"):
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

st.sidebar.header("VR 시뮬레이터 설정")

# --- 이전 사이클 기록 CSV 파일 업로드 ---
st.sidebar.subheader("1. 이전 사이클 기록 로드하기")
uploaded_file = st.sidebar.file_uploader("이전 사이클 기록에 사용한 CSV 파일 업로드하기 (선택)", type=["csv"])

if uploaded_file is not None:
    try:
        df_history = pd.read_csv(uploaded_file)
        loaded_history = df_history.to_dict('records')
        history = loaded_history[:]  # 전체 기록 유지
        st.sidebar.success("이전 기록이 성공적으로 로드되었어요.")
    except Exception as e:
        st.sidebar.error(f"파일 로드 중 오류 발생: {e}")
        history = None
else:
    history = None
    st.sidebar.info("⚠️ 이전 기록 CSV 파일이 없는 경우, 아래 '템플릿 CSV 다운로드' 버튼을 통해 파일을 저장할 수 있답니다.")
    st.sidebar.markdown("#### **+) 템플릿 CSV 생성용 초기 시스템 설정**")
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
    st.sidebar.subheader("2. 초기 시스템 설정")
    st.sidebar.info("⚠️ 이전 기록이 없는 경우, 아래 설정을 통해 초기 시스템을 설정할 수 있답니다.")
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
    st.sidebar.info("CSV로 불러온 전체 기록을 사용할게요.")

# 시뮬레이션 파라미터 입력
st.sidebar.subheader("3. 시뮬레이션 파라미터 설정하기")
st.sidebar.info("⚠️ 시뮬레이션을 실행하기 전, 아래 파라미터들을 설정해주세요!")
G = st.sidebar.number_input("G 값 (추천: 10-20)", min_value=1.0, value=10.0, step=0.1)
buy_ratio = st.sidebar.number_input("매수 예수금 비율 (0.0 ~ 1.0)", min_value=0.0, max_value=1.0, value=0.75, step=0.05)
deposit = st.sidebar.number_input("사이클 당 적립금 ($)", min_value=0.0, value=250.0, step=1.0)
cycles = st.sidebar.number_input("실행할 사이클 수", min_value=1, value=2, step=1)

# 사이클 당 가격 단계 입력
st.sidebar.subheader("**4. 가격 단계 설정하기**")
st.sidebar.info("⚠️ 여기서는 각 사이클에서의 TQQQ의 주요 가격 변동 경로를 입력해주어야 해요. 이는 매수/매도 조건을 계산하여 TQQQ 보유 주식 수 및 예수금을 업데이트하는 데 유용하답니다. 주로 TQQQ 가격의 최저/최고점을 입력해주는 것이 좋아요.")
price_steps_inputs = []
for i in range(cycles):
    step_input = st.sidebar.text_input(
        f"Cycle {i+1} 가격 단계 (콤마로 구분)", 
        value="44.34, 45",
        key=f"price_steps_{i}"
    )
    try:
        steps = [float(x.strip()) for x in step_input.split(",") if x.strip() != ""]
        price_steps_inputs.append(steps)
    except:
        price_steps_inputs.append([45.45])

# 시뮬레이션 실행 버튼
if st.sidebar.button("**시뮬레이션 실행하기**"):
    with st.spinner("시뮬레이션 실행 중..."):
        history, transaction_history = simulate_cycles(history, G, buy_ratio, deposit, cycles, price_steps_inputs)
        df_result = pd.DataFrame(history)
        fig = plot_results(history)
        st.session_state.simulation_results = {
            "history": history,
            "transaction_history": transaction_history,
            "df_result": df_result,
            "fig": fig
        }
        st.success("시뮬레이션이 완료되었어요!")

if st.session_state.simulation_results is not None:
    simulation = st.session_state.simulation_results
    df_result = simulation["df_result"]
    fig = simulation["fig"]
    transaction_history = simulation["transaction_history"]

    st.subheader("1. 시뮬레이션 결과")
    st.dataframe(df_result)

    st.subheader("2. 거래 내역 및 매수/매도표 확인")
    for trans in transaction_history:
        cycle = trans['Cycle']
        with st.expander(f"Cycle {cycle} 상세 내역"):
            st.markdown(f"**가격 변동 경로:** {', '.join([f'${p:.2f}' for p in trans['Price Steps']])}")
            st.markdown("**거래 로그:**")
            for log in trans['Transaction Log']:
                st.write(log)
            
            st.markdown("**매수표:**")
            if trans['Buy Table']:
                df_buy = pd.DataFrame(trans['Buy Table'])
                st.dataframe(df_buy)
                csv_buy = df_buy.to_csv(index=False).encode('utf-8-sig')
                st.download_button(label=f"Cycle {cycle} 매수표 다운로드", data=csv_buy,
                                   file_name=f"cycle_{cycle}_buy_table.csv", mime="text/csv", key=f"download_buy_{cycle}")
            else:
                st.write("매수표 없음")
                
            st.markdown("**매도표:**")
            if trans['Sell Table']:
                df_sell = pd.DataFrame(trans['Sell Table'])
                st.dataframe(df_sell)
                csv_sell = df_sell.to_csv(index=False).encode('utf-8-sig')
                st.download_button(label=f"Cycle {cycle} 매도표 다운로드", data=csv_sell,
                                   file_name=f"cycle_{cycle}_sell_table.csv", mime="text/csv", key=f"download_sell_{cycle}")
            else:
                st.write("매도표 없음")

    st.subheader("3. 그래프 결과")
    st.pyplot(fig)
    
    csv_buffer = io.StringIO()
    df_result.to_csv(csv_buffer, index=False)
    csv_data = csv_buffer.getvalue().encode('utf-8-sig')
    st.download_button(
        label="전체 결과 CSV 다운로드하기",
        data=csv_data,
        file_name="cycle_history.csv",
        mime="text/csv"
    )
    
    png_buffer = io.BytesIO()
    fig.savefig(png_buffer, format="png", dpi=600, bbox_inches="tight")
    png_buffer.seek(0)
    st.download_button(
        label="그래프 PNG 다운로드하기",
        data=png_buffer,
        file_name="cycle_graph.png",
        mime="image/png"
    )