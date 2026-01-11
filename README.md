# VR 시뮬레이터 V3.1

Value Rebalancing 투자 전략 시뮬레이터

## 🌐 Live Demo

**Streamlit App**: [https://vr-simulator.streamlit.app/](https://vr-simulator.streamlit.app/)

## 🚀 실행 방법

```bash
pip install -r requirements.txt
streamlit run app.py
```

## 📊 핵심 기능

| 기능                    | 설명                                                         |
| ----------------------- | ------------------------------------------------------------ |
| **VR 공식 계산**        | 사이클별 목표 가치(V), 밴드(L/H), 매수/매도 임계가 자동 계산 |
| **CSV 업로드/다운로드** | 기존 사이클 기록 불러오기 및 전체 기록 저장                  |
| **차트 시각화**         | Plotly 인터랙티브 차트 + Matplotlib PNG 다운로드             |
| **마켓 상태**           | 한국 시간 기준 미국 주식 시장 상태 실시간 표시               |
| **적응형 밴드**         | V/E 괴리율에 따른 밴드 자동 압축 (선택적)                    |

## 📐 VR 공식 (변형)

$$
V_f = V_i + \frac{pool_{prev}}{G} + \frac{(E - V_i)}{2\sqrt{G}} + deposit_{next}
$$

| 변수             | 설명                                        |
| ---------------- | ------------------------------------------- |
| $V_f$            | 다음 사이클 목표 가치                       |
| $V_i$            | 이전 사이클 목표 가치                       |
| $pool_{prev}$    | 이전 사이클 종료 시 예수금                  |
| $G$              | 그라데이션 값 (기본값: 10)                  |
| $E$              | 이전 사이클 종료 시 평가금 (주식 수 × 가격) |
| $deposit_{next}$ | 다음 사이클 적립금                          |

## 📈 매수/매도 규칙

```
매수 조건: E < LBand (평가금이 하단 밴드 이하)
매도 조건: E > HBand (평가금이 상단 밴드 이상)

LBand = V × 0.85 (기본)
HBand = V × 1.15 (기본)
```

## 📚 참고

- [『미국주식 밸류 리밸런싱』](https://product.kyobobook.co.kr/detail/S000061695672)

## 📄 License

MIT License
