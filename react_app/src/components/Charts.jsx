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
  autosize: true,
  paper_bgcolor: COLORS.paper,
  plot_bgcolor: COLORS.bg,
  font: { color: COLORS.text, family: 'JetBrains Mono, Noto Sans KR, sans-serif', size: 11 },
  margin: { l: 50, r: 20, t: 36, b: 36 },
  xaxis: { gridcolor: COLORS.grid, zeroline: false },
  yaxis: { gridcolor: COLORS.grid, zeroline: false },
  hovermode: 'x unified',
  showlegend: true,
  legend: { bgcolor: 'rgba(0,0,0,0)', font: { size: 9 }, x: 1, xanchor: 'right', y: 1 },
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

  // Export all 4 charts as a single bundled 2x2 high-res PNG (matching app.py matplotlib output)
  const handleExport = async () => {
    if (!history || history.length < 2) return;

    const W = 1400, H = 1000;
    const PADDING = 40;
    const canvasW = W * 2 + PADDING * 3;
    const canvasH = H * 2 + PADDING * 3;

    const canvas = document.createElement('canvas');
    canvas.width = canvasW;
    canvas.height = canvasH;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#07080C';
    ctx.fillRect(0, 0, canvasW, canvasH);

    // Export-specific layout with larger fonts for high-res output
    const exportLayout = {
      paper_bgcolor: COLORS.paper,
      plot_bgcolor: COLORS.bg,
      font: { color: COLORS.text, family: 'JetBrains Mono, Noto Sans KR, sans-serif', size: 36 },
      margin: { l: 110, r: 50, t: 80, b: 80 },
      xaxis: { gridcolor: COLORS.grid, zeroline: false, tickfont: { size: 30 } },
      yaxis: { gridcolor: COLORS.grid, zeroline: false, tickfont: { size: 30 } },
      hovermode: false,
      showlegend: true,
      legend: { bgcolor: 'rgba(0,0,0,0)', font: { size: 28 }, x: 1, xanchor: 'right', y: 1 },
    };

    const exportLayouts = [
      { ...exportLayout, title: { text: 'V & Band 추이', font: { color: COLORS.text, size: 42 } } },
      { ...exportLayout, title: { text: '포트폴리오(E) vs 목표(V)', font: { color: COLORS.text, size: 42 } } },
      { ...exportLayout, title: { text: '예수금 추이', font: { color: COLORS.text, size: 42 } }, showlegend: false },
      { ...exportLayout, title: { text: '보유 주식 수', font: { color: COLORS.text, size: 42 } }, showlegend: false },
    ];

    const { chart1, chart2, chart3, chart4 } = buildTraces(history);
    const traceGroups = [chart1, chart2, chart3, chart4];

    const positions = [
      [PADDING, PADDING],
      [PADDING * 2 + W, PADDING],
      [PADDING, PADDING * 2 + H],
      [PADDING * 2 + W, PADDING * 2 + H],
    ];

    // Render each chart in a temporary off-screen div with export fonts
    for (let i = 0; i < 4; i++) {
      const tempDiv = document.createElement('div');
      tempDiv.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:1400px;height:1000px;';
      document.body.appendChild(tempDiv);
      try {
        await Plotly.newPlot(tempDiv, traceGroups[i], exportLayouts[i], { staticPlot: true });
        const dataUrl = await Plotly.toImage(tempDiv, { format: 'png', width: W, height: H });
        const img = new Image();
        await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; img.src = dataUrl; });
        ctx.drawImage(img, positions[i][0], positions[i][1], W, H);
        Plotly.purge(tempDiv);
      } catch { /* skip */ }
      document.body.removeChild(tempDiv);
    }

    // Download the combined image
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${today}_vr_simulation_charts.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div ref={ref1} className="surface-panel rounded-sm w-full overflow-hidden" style={{ height: '320px' }} />
      <div ref={ref2} className="surface-panel rounded-sm w-full overflow-hidden" style={{ height: '320px' }} />
      <div ref={ref3} className="surface-panel rounded-sm w-full overflow-hidden" style={{ height: '320px' }} />
      <div ref={ref4} className="surface-panel rounded-sm w-full overflow-hidden" style={{ height: '320px' }} />
    </div>
  );
}
