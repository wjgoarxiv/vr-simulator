import { useRef, useEffect } from 'react';
import Plotly from 'plotly.js-dist-min';

const COLORS = {
  v_target: '#00D4FF',   // accent-cyan
  e_calc: '#8B5CF6',     // accent-violet
  lband: '#00FF88',      // accent-green
  hband: '#FF3860',      // accent-red
  pool: '#00FF88',       // accent-green
  shares: '#FFB020',     // accent-amber
  bg: '#07080C',         // surface-0
  paper: '#0E1018',      // surface-1
  grid: '#1E2235',       // border-default
  text: '#E8ECF4',       // tx-primary
};

const layoutCommon = {
  paper_bgcolor: COLORS.paper,
  plot_bgcolor: COLORS.bg,
  font: { color: COLORS.text, family: 'Noto Sans KR, Inter, sans-serif', size: 12 },
  margin: { l: 60, r: 30, t: 40, b: 40 },
  xaxis: { gridcolor: COLORS.grid, zeroline: false },
  yaxis: { gridcolor: COLORS.grid, zeroline: false },
  hovermode: 'x unified',
  showlegend: true,
  legend: { bgcolor: 'rgba(0,0,0,0)', font: { size: 10 } },
};

const plotConfig = { responsive: true, displayModeBar: false };

function buildTraces(history) {
  const x = history.map((d) => d.cycle_num + 1);

  const chart1 = [
    {
      x,
      y: history.map((d) => d.HBand),
      mode: 'lines',
      name: 'HBand',
      line: { color: COLORS.hband, width: 2, dash: 'dash' },
    },
    {
      x,
      y: history.map((d) => d.LBand),
      mode: 'lines',
      name: 'LBand',
      line: { color: COLORS.lband, width: 2, dash: 'dash' },
      fill: 'tonexty',
      fillcolor: 'rgba(0,255,136,0.1)',
    },
    {
      x,
      y: history.map((d) => d.V_target),
      mode: 'lines+markers',
      name: 'V (목표)',
      line: { color: COLORS.v_target, width: 3 },
      marker: { size: 6 },
    },
  ];

  const chart2 = [
    {
      x,
      y: history.map((d) => d.V_target),
      mode: 'lines+markers',
      name: 'V (목표)',
      line: { color: COLORS.v_target, width: 2, dash: 'dot' },
      marker: { size: 5 },
    },
    {
      x,
      y: history.map((d) => d.E_calc),
      mode: 'lines+markers',
      name: 'E (평가금)',
      line: { color: COLORS.e_calc, width: 3 },
      marker: { size: 6 },
      fill: 'tonexty',
      fillcolor: 'rgba(0,212,255,0.1)',
    },
  ];

  const chart3 = [
    {
      x,
      y: history.map((d) => (d.pool_end_before_deposit || 0) + (d.deposit_next || 0)),
      type: 'bar',
      name: '예수금',
      marker: { color: COLORS.pool },
    },
  ];

  const chart4 = [
    {
      x,
      y: history.map((d) => d.shares_end),
      mode: 'lines+markers',
      name: '주식 수',
      line: { color: COLORS.shares, width: 3 },
      marker: { size: 6 },
      fill: 'tozeroy',
      fillcolor: 'rgba(255,176,32,0.15)',
    },
  ];

  return { chart1, chart2, chart3, chart4 };
}

function buildLayouts() {
  return [
    { ...layoutCommon, title: { text: 'V & Band 추이', font: { color: COLORS.text, size: 14 } } },
    { ...layoutCommon, title: { text: '포트폴리오(E) vs 목표(V)', font: { color: COLORS.text, size: 14 } } },
    { ...layoutCommon, title: { text: '예수금 추이', font: { color: COLORS.text, size: 14 } }, showlegend: false },
    { ...layoutCommon, title: { text: '보유 주식 수', font: { color: COLORS.text, size: 14 } }, showlegend: false },
  ];
}

export default function Charts({ history, onExportReady }) {
  const ref1 = useRef(null);
  const ref2 = useRef(null);
  const ref3 = useRef(null);
  const ref4 = useRef(null);
  const refs = [ref1, ref2, ref3, ref4];

  // Export function using internal refs
  const handleExport = async () => {
    const titles = ['vr-band-tracking', 'vr-portfolio-vs-target', 'vr-pool-balance', 'vr-shares-held'];
    for (let i = 0; i < refs.length; i++) {
      const el = refs[i]?.current;
      if (!el) continue;
      try {
        const url = await Plotly.toImage(el, { format: 'png', width: 800, height: 400 });
        const a = document.createElement('a');
        a.href = url;
        a.download = `${titles[i]}.png`;
        a.click();
      } catch { /* skip failed charts */ }
    }
  };

  useEffect(() => {
    if (!history || history.length < 2) return;

    const { chart1, chart2, chart3, chart4 } = buildTraces(history);
    const layouts = buildLayouts();
    const traceGroups = [chart1, chart2, chart3, chart4];

    refs.forEach((ref, i) => {
      if (!ref.current) return;
      Plotly.newPlot(ref.current, traceGroups[i], layouts[i], plotConfig);
    });

    // Notify parent that export is ready
    if (onExportReady) onExportReady(handleExport);

    return () => {
      refs.forEach((ref) => {
        if (ref.current) {
          Plotly.purge(ref.current);
        }
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history]);

  if (!history || history.length < 2) {
    return (
      <div className="flex items-center justify-center h-40 text-tx-muted font-mono text-sm">
        차트를 표시하려면 2개 이상의 사이클이 필요합니다
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div ref={ref1} className="surface-panel rounded-sm w-full" style={{ height: '360px' }} />
      <div ref={ref2} className="surface-panel rounded-sm w-full" style={{ height: '360px' }} />
      <div ref={ref3} className="surface-panel rounded-sm w-full" style={{ height: '360px' }} />
      <div ref={ref4} className="surface-panel rounded-sm w-full" style={{ height: '360px' }} />
    </div>
  );
}
