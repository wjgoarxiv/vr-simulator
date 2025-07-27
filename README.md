# VR (Value Rebalancing) 시뮬레이터

:: TQQQ VR (Value Rebalancing) 투자 전략 시뮬레이터 ::

## V2.1 Modern Web Version (JavaScript/React Implementation)

This is a complete modern web reimplementation of the original Streamlit-based VR Simulator, built with React, Vite, and modern JavaScript technologies for superior performance and user experience.

**LINK:** https://wjgoarxiv.github.io/vr-simulator/

### 🚀 New Features in Web Version:
- **Modern React UI**: Clean, responsive design with Tailwind CSS
- **Interactive Charts**: High-quality visualizations using Chart.js
- **Real-time Market Status**: Live US market status display
- **Enhanced UX**: Smooth animations and transitions
- **Local Storage**: Automatic session persistence
- **Mobile Responsive**: Works perfectly on all devices
- **Fast Performance**: Built with Vite for lightning-fast loading

## V2.1 지원 기능 (Original Streamlit Version)

* [TQQQ](https://kr.investing.com/etfs/proshares-trust-ultrapro-qqq) 대상 VR (Value Rebalancing) 시뮬레이션 (Cycle-by-Cycle 진행 방식)
* 각 사이클별 **목표 가치(V), LBand/HBand 및 추천 매수/매도 목표가 확인** (단순 +/- 1주 목표가 및 상세 테이블 제공)
* **과거 사이클 기록 조회 기능** (이전/다음 버튼)
* 시뮬레이션 **전체 기록 테이블 확인 및 CSV 파일 다운로드** 제공
* 시뮬레이션 결과 **핵심 지표 시각화** (Streamlit 네이티브 차트 2x2 표시)
* 시각화된 **전체 차트 이미지(PNG) 다운로드** 기능 (Matplotlib 기반)
* **신규!** 초기 투자 시 매수 목표가와 현재가 차이가 클 경우 **'월요일 시초가 매수' 고려 제안** 기능 (조건부)
* 시뮬레이션 **사이클 기록 CSV 업로드/로드** 기능
* 한국 시간 기준 **미국 주식 시장 상태 실시간 표시** (사이드바 내 주문 가능 여부 확인)

## APP LINK

LINK: https://vr-simulator.streamlit.app/

## 주요 업데이트 (V2.1)

* **워크플로우 통합**: '현재 계산'과 '장기 시뮬레이션' 탭을 통합하여, 단일 페이지 내에서 초기 설정부터 사이클별 진행까지 일관된 사용자 경험 제공
* **사이클 네비게이션**: '이전/다음 사이클' 버튼을 추가하여 과거 시뮬레이션 기록 및 해당 시점의 목표값들을 쉽게 조회 가능
* **차트 기능 개선**:
    * 화면 표시는 **Streamlit 네이티브 차트**를 사용하여 깔끔한 시각화 제공 (2x2 레이아웃 유지)
    * 전체 차트 **이미지(PNG) 다운로드** 기능은 **Matplotlib**을 활용하여 별도 제공
* **시초가 매수 제안**: 시뮬레이션 초기 단계에서 매수 목표가와 현재 가격 간 차이가 클 경우, 시초가 매수를 고려하도록 안내 메시지 표시
* **UI/UX 개선**: 단계별 입력 과정을 더 명확하게 하고, 도움말 및 공식 설명을 개선

## 참고

* VR 이론 및 공식은 [『미국주식 밸류 리밸런싱』](https://product.kyobobook.co.kr/detail/S000061695672)을 참고하였으며, 시뮬레이터에는 일부 변형된 공식이 사용되었습니다. (앱 내 공식 참고)

## 실행 방법

### Web Version (React/JavaScript)

1. **Dependencies 설치:**
   ```bash
   npm install
   ```

2. **Development 서버 시작:**
   ```bash
   npm run dev
   ```

3. **Production 빌드:**
   ```bash
   npm run build
   npm run preview
   ```

### Original Streamlit Version

1.  [앱 링크](https://vr-simulator.streamlit.app/)를 통해 웹 앱에 접속합니다.
2.  **초기 설정**:
    * 사이드바에서 **초기 G값**과 **기본 적립금**을 설정합니다.
    * 처음 시작 시 메인 화면에서 **초기 보유 주식 수, 현재 가격, 초기 예수금**을 입력하거나, **CSV 파일**을 업로드하여 이전 기록을 불러옵니다.
    * '**시뮬레이션 시작 / 재설정**' 버튼을 클릭합니다.
3.  **사이클 진행**:
    * 화면에 현재 조회 중인 사이클 정보(시작 상태, 목표 V/밴드, 매수/매도 목표가 등)가 표시됩니다.
    * '**이전/다음 사이클**' 버튼으로 과거 기록을 조회할 수 있습니다.
    * **가장 마지막 사이클**을 조회 중일 때, 해당 사이클의 **실제 투자 결과**(종료 가격, 종료 주식 수, 종료 예수금)와 **다음 사이클 정보**(적립금, G값)를 입력 폼에 기입합니다.
    * '**다음 사이클 계산하기**' 버튼을 클릭하여 시뮬레이션을 진행합니다.
4.  **결과 확인 및 다운로드**:
    * 화면 하단에서 전체 시뮬레이션 기록 테이블과 4개의 핵심 차트를 확인합니다.
    * '**전체 기록 CSV 다운로드**' 버튼으로 기록 데이터를 저장합니다.
    * '**전체 차트 PNG 다운로드**' 버튼으로 차트 이미지를 저장합니다.

## 사용된 VR 공식 (변형)

앱 내 '도움말 및 VR 공식' 섹션 또는 아래 수식을 참고하세요.

$$
V_f = V_i + \frac{pool_{prev}}{G} + \frac{(E - V_i)}{2\sqrt{G}} + deposit_{next}
$$

* $V_f$: 다음 사이클 목표 가치
* $V_i$: 이전 사이클 목표 가치
* $pool_{prev}$: 이전 사이클 종료 시점의 예수금 (적립금 추가 전)
* $G$: 그라데이션 값
* $E$: 이전 사이클 종료 시점의 평가금 (최종 주식 수 × 최종 가격)
* $deposit_{next}$: 다음 사이클 시작 시 추가될 적립금
