<p align="center"><img src="./cover.png" width="100%" /></p>

<h1 align="center">VR 시뮬레이터</h1>
<p align="center">
  <em>레버리지 ETF 밸류 리밸런싱 투자 시뮬레이터</em>
</p>
<p align="center">
  <a href="#-quick-start">Quick Start</a> · <a href="#-features">Features</a> · <a href="#-usage">Usage</a> · <a href="#-vr-formula">VR Formula</a>
</p>
<p align="center">
  <a href="https://github.com/wjgoarxiv/vr-simulator/stargazers"><img src="https://img.shields.io/github/stars/wjgoarxiv/vr-simulator?style=social" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue" /></a>
  <a href="https://www.python.org/"><img src="https://img.shields.io/badge/python-3.8+-green" /></a>
  <a href="./react_app"><img src="https://img.shields.io/badge/React-18-61dafb" /></a>
  <a href="#-v320-changes"><img src="https://img.shields.io/badge/version-3.2.0-blueviolet" /></a>
</p>

---

> [!NOTE]
> 레버리지 ETF 밸류 리밸런싱(VR) 투자 시뮬레이터입니다. 사이클별 목표 가치(V), 공식 ±15% 밴드, 매수/매도 지정가 표를 자동 계산하고, 거래가 없는 사이클도 왜 대기 상태인지 바로 확인할 수 있게 보여줍니다.

## 🌐 Live Demos

| 플랫폼 | URL |
|--------|-----|
| **Streamlit** | [vr-simulator.streamlit.app](https://vr-simulator.streamlit.app/) |
| **React** | [wjgoarxiv.github.io/vr-simulator](https://wjgoarxiv.github.io/vr-simulator/) |

> 배포 사이트는 수동/외부 배포 주기에 따라 현재 저장소 버전보다 늦게 반영될 수 있습니다.

## ✨ Features

- **공식 실력공식 VR 계산** -- G 파라미터 기반 사이클별 목표 가치(V) 자동 계산, V/E 상한 없이 자료 기반 공식값 유지
- **공식 ±15% 밴드 기본값** -- LBand는 0.85V, HBand는 1.15V로 계산
- **체결 전 보유수 기준 지정가 표** -- 첫 주문가를 Band ÷ 현재 보유주식으로 계산해 VR 자료 예시와 정렬
- **거래 없음 가시화** -- 현재가가 첫 매수·첫 매도 사이에 있을 때 대기 이유와 거리(%)를 표시
- **확장 밴드 옵션** -- 필요 시 V/E 괴리율에 따른 앱 확장 밴드 압축을 별도 Advanced 모드로 사용
- **인터랙티브 차트** -- Plotly 기반 4종 차트 (V/E 추이, 밴드, Pool, 매수/매도 테이블)
- **CSV 가져오기/내보내기** -- 사이클 기록 저장 및 불러오기, 유효성 검증 포함
- **KST 마켓 상태** -- 한국 시간 기준 미국 주식 시장 상태 + 예약 매매 시간대 표시
- **Financial cockpit UI** -- 공식/확장 모드, 트리거 거리, 공식 해석을 한 화면에서 확인

## 🚀 Quick Start

### Streamlit (Python)

```bash
pip install -r requirements.txt
streamlit run app.py
```

### React

```bash
cd react_app
npm install
npm run dev
```

## 📖 Usage

1. **설정** -- 사이드바에서 G값, 적립/인출금, 공식/확장 밴드 모드, 티커명 설정
2. **시뮬레이션 시작** -- 초기 주가, 주식 수, Pool 입력 후 시작
3. **사이클 진행** -- 매 사이클 종료 시 현재가, 주식 수, Pool 입력 → 다음 사이클 V, 밴드, 목표가 자동 계산
4. **결과 분석** -- 차트 탭에서 V/E 추이, 밴드 변화, 매수/매도 테이블 확인 → CSV로 전체 기록 다운로드

## 📐 VR Formula

실력공식 (Value Rebalancing Formula):

```
V_f = V_i + (Pool / G) + ((E - V_i) / (2 * sqrt(G))) + Deposit
```

| 항목 | 설명 |
|------|------|
| `V_f` | 다음 사이클 목표 가치 |
| `V_i` | 이전 사이클 목표 가치 |
| `Pool` | 이전 사이클 종료 시 예수금 |
| `G` | 그라데이션 값 (권장: 10~20) |
| `E` | 이전 사이클 종료 시 평가금 (주식 수 x 가격) |
| `Deposit` | 다음 사이클 적립/인출금 |

매수/매도 지정가 표는 공식 VR 자료의 체결 전 보유수 기준을 따릅니다.

```
첫 매수 지정가 = LBand / 현재 보유주식수
첫 매도 지정가 = HBand / 현재 보유주식수
```

보유주식이 0주인 시작 상태에서는 첫 매수를 1주 진입 기준으로 표시합니다.

## 🔄 V3.2.0 Changes

### V3.2.0 — Official VR fidelity and visibility
- 공식 VR 실력공식 값을 기본으로 유지하도록 V/E 상한을 공식 계산에서 제거했습니다.
- 매수/매도 첫 지정가를 체결 전 보유수 기준으로 정렬해 `_resources`의 VR 예시와 맞췄습니다.
- 매도표의 예상 Pool은 현재가가 아니라 해당 지정가 체결 기준으로 누적합니다.
- ROI/순이익은 평가금(E)만이 아니라 평가금 + Pool 기준의 총자산으로 계산합니다.
- React와 Streamlit 모두 이번 사이클 상태, 첫 매수/매도까지 거리, 공식/확장 모드 배지를 표시합니다.

## 🔄 V3.1.4 Changes

### V3.1.4 — Toss-like safety copy
- Rewrote the target adjustment notice again so it reads in one pass: what changed, why it changed, and what action it prevents.
- Aligned the React and Streamlit Korean copy around the same plain-language labels: 처음 계산된 목표 / 이번에 적용할 목표.

## 🔄 V3.1.3 Changes

### V3.1.3 — Clearer safety copy
- Rewrote the target-V safety adjustment notice so users see plain-language guidance instead of formula-heavy jargon.
- Added regression coverage to prevent confusing cap/absorption wording from reappearing in user-facing copy.


### V3.1.2 — Formula and React rebuild

1. **목표 V 안전 조정** -- 목표값이 평가금 대비 과도하게 높아질 때 현실적인 범위로 조정
2. **비대칭 밴드 앵커링** -- LBand는 V 기준, HBand는 min(V, E) 기준
3. **밴드 반전 가드** -- HBand <= LBand 시 대칭 V 기반으로 폴백
4. **적응형 밴드 압축** -- V/E 괴리율 5%~50% 구간에서 밴드 폭 자동 조절
5. **안전 조정 표시** -- 목표 V가 자동 조정되었는지 UI에 표시
6. **CSV 스키마 확장** -- 적응형 밴드 상태 메타데이터 포함
7. **차트 개선** -- V/E 괴리 구간 시각화 및 밴드 비대칭 표시

## 🏗 Architecture

| 파일 | 설명 |
|------|------|
| `app.py` | 메인 Streamlit 앱 -- UI + VR 계산 로직 + 차트 (단일 파일) |
| `react_app/` | React 18 웹 앱 (GitHub Pages 배포) |
| `requirements.txt` | Python 의존성 |
| `Assets/` | 스크린샷 및 정적 자산 |

## 📦 Requirements

### Python

| 패키지 | 용도 |
|--------|------|
| `streamlit` | 웹 UI 프레임워크 |
| `numpy` | 수치 계산 |
| `scipy` | VR 공식 수학 함수 |
| `pandas` | CSV 처리 |
| `plotly` | 인터랙티브 차트 |
| `matplotlib` | PNG 차트 내보내기 |
| `pytz` | KST 시간대 변환 |

### React

| 패키지 | 용도 |
|--------|------|
| `react` 18 | UI 프레임워크 |
| `vite` | 빌드 도구 |

## 🤝 Contributing

기여를 환영합니다.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes
4. Open a Pull Request

버그 리포트 또는 기능 요청은 [Issues](https://github.com/wjgoarxiv/vr-simulator/issues)에 등록해주세요.

## 📄 License

This project is licensed under the [MIT License](./LICENSE).
