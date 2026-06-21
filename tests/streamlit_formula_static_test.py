from pathlib import Path


APP = Path(__file__).resolve().parents[1] / "app.py"
SOURCE = APP.read_text(encoding="utf-8")
VISIBLE_SOURCE = SOURCE[SOURCE.index("# Streamlit UI 구성") :]


def extract_function(name: str) -> str:
    marker = f"def {name}("
    start = SOURCE.index(marker)
    next_def = SOURCE.find("\ndef ", start + 1)
    next_section = SOURCE.find("\n# ---", start + 1)
    candidates = [i for i in (next_def, next_section) if i != -1]
    end = min(candidates) if candidates else len(SOURCE)
    return SOURCE[start:end]


def test_official_vr_formula_has_no_v_e_cap() -> None:
    body = extract_function("calculate_v_next")
    assert "pool_before_deposit / G" in body
    assert "(E_calc - V_i) / (2 * math.sqrt(G))" in body
    assert "V_f > E_calc * MAX_V_E_RATIO" not in body


def test_order_tables_use_pre_trade_share_count() -> None:
    buy_body = extract_function("calculate_buy_table")
    sell_body = extract_function("calculate_sell_table")
    assert "denominator = s if s > 0 else 1" in buy_body
    assert "limit_price = LBand / denominator" in buy_body
    assert "threshold = HBand / s" in sell_body
    assert "sell_proceeds = threshold" in sell_body


def test_streamlit_copy_exposes_official_mode_and_no_trade_visibility() -> None:
    assert "OFFICIAL ±15%" in SOURCE
    assert "밴드 안쪽 대기" in SOURCE
    assert "첫 주문가 = Band ÷ 현재 보유주식" in SOURCE
    assert "VR 리밸런싱 보드" in SOURCE


def test_streamlit_formula_is_shown_as_latex() -> None:
    assert "st.latex" in SOURCE
    assert r"V_{2}=V_{1}+\frac{Pool}{G}+\frac{E-V_{1}}{2\sqrt{G}}+D_{2}" in SOURCE


def test_streamlit_user_copy_avoids_overstylized_terms() -> None:
    visible_forbidden = [
        "VR Trading Cockpit",
        "Retrofuture",
        "HUD",
        "Chakra Petch",
        "V_f = V_i",
        "pool_{prev}",
        "deposit_{next}",
    ]
    for term in visible_forbidden:
        assert term not in VISIBLE_SOURCE


def test_streamlit_adaptive_band_default_stays_on() -> None:
    assert "st.session_state.adaptive_band_enabled = True" in SOURCE
    assert "st.session_state.adaptive_band_enabled = False" not in SOURCE
    assert "기본값은 ON" in SOURCE
    assert "기본값은 OFF" not in VISIBLE_SOURCE


def test_streamlit_typography_contract_is_ibm_first() -> None:
    assert "font=dict(family='IBM Plex Sans KR, Noto Sans KR, sans-serif'" in SOURCE
    assert "font-family: 'IBM Plex Sans KR', 'Noto Sans KR', sans-serif !important" in SOURCE
    assert "font-family:'IBM Plex Sans KR','Noto Sans KR',sans-serif" in SOURCE


def test_streamlit_withdrawals_cannot_overdraw_pool() -> None:
    assert "deposit_next_input < -pool_end_input" in SOURCE
    assert "인출금은 종료 시점 예수금을 초과할 수 없습니다" in SOURCE
    assert "deposit_next' 인출금은 'pool_end_before_deposit' 예수금을 초과할 수 없습니다" in SOURCE


if __name__ == "__main__":
    test_official_vr_formula_has_no_v_e_cap()
    test_order_tables_use_pre_trade_share_count()
    test_streamlit_copy_exposes_official_mode_and_no_trade_visibility()
    test_streamlit_formula_is_shown_as_latex()
    test_streamlit_user_copy_avoids_overstylized_terms()
    test_streamlit_adaptive_band_default_stays_on()
    test_streamlit_typography_contract_is_ibm_first()
    test_streamlit_withdrawals_cannot_overdraw_pool()
    print("PASS streamlit_formula_static_test")
