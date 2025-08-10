# VR (Value Rebalancing) 시뮬레이터

:: 다중 레버리지 ETF VR (Value Rebalancing) 투자 전략 시뮬레이터 ::

## 🌐 라이브 웹 애플리케이션
**최신 버전 이용하기:** [https://wjgoarxiv.github.io/vr-simulator/](https://wjgoarxiv.github.io/vr-simulator/)

---

## V3.2 모던 웹 버전 (JavaScript/React 구현)

React, Vite 및 최신 JavaScript 기술을 활용하여 구현된 VR 시뮬레이터의 완전한 모던 웹 버전입니다. 우수한 성능과 사용자 경험을 제공합니다.

### 🚀 주요 기능:
- **다중 자산 지원**: TQQQ, TECL, SOXL, SPXL, UPRO, FNGU, FAS, GUSH, TNA 등 9개 레버리지 ETF 지원
- **모던 React UI**: 반응형 디자인과 Tailwind CSS 적용
- **인터랙티브 차트**: Chart.js 기반 고품질 시각화
- **실시간 마켓 상태**: 미국 시장 상태 실시간 표시
- **로컬 저장소**: 세션 자동 유지
- **모바일 대응**: 모든 디바이스에서 완벽하게 작동
- **빠른 성능**: Vite 기반 고속 로딩

### 📊 핵심 기능

- VR (Value Rebalancing) 시뮬레이션 (사이클별 진행 방식)
- 각 사이클별 **목표 가치(V), LBand/HBand 및 추천 매수/매도 목표가 확인**
- **과거 사이클 기록 조회 기능**
- 시뮬레이션 **전체 기록 테이블 확인 및 CSV 파일 다운로드**
- 시뮬레이션 결과 **핵심 지표 시각화**
- 시각화된 **전체 차트 이미지(PNG) 다운로드** 기능
- 초기 투자 시 조건부 **'월요일 시초가 매수' 고려 제안** 기능
- 시뮬레이션 **사이클 기록 CSV 업로드/로드** 기능
- 한국 시간 기준 **미국 주식 시장 상태 실시간 표시**

## 앱 링크

### 🌐 웹 버전 (V3.2 - 권장)
**라이브 데모:** [https://wjgoarxiv.github.io/vr-simulator/](https://wjgoarxiv.github.io/vr-simulator/)

### 📱 레거시 Streamlit 버전 (V2.1)
**Streamlit 앱:** [https://vr-simulator.streamlit.app/](https://vr-simulator.streamlit.app/)

## 참고

* VR 이론 및 공식은 [『미국주식 밸류 리밸런싱』](https://product.kyobobook.co.kr/detail/S000061695672)을 참고하였으며, 시뮬레이터에는 일부 변형된 공식이 사용되었습니다.

## 사용된 VR 공식 (변형)

$$
V_f = V_i + \frac{pool_{prev}}{G} + \frac{(E - V_i)}{2\sqrt{G}} + deposit_{next}
$$

* $V_f$: 다음 사이클 목표 가치
* $V_i$: 이전 사이클 목표 가치
* $pool_{prev}$: 이전 사이클 종료 시점의 예수금 (적립금 추가 전)
* $G$: 그라데이션 값
* $E$: 이전 사이클 종료 시점의 평가금 (최종 주식 수 × 최종 가격)
* $deposit_{next}$: 다음 사이클 시작 시 추가될 적립금