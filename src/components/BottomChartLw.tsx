import React, { useEffect, useRef, useState, useMemo } from 'react';
import { createChart, IChartApi, ISeriesApi, CrosshairMode, LineStyle, CandlestickSeries, LineSeries, createSeriesMarkers } from 'lightweight-charts';
import { Trash2 } from 'lucide-react';
import { CandleData } from '../lib/calculators';
import type { IndicatorSettings } from '../App';
import { useChartSync } from '../contexts/ChartSyncContext';

interface BottomChartProps {
  data: CandleData[];
  activeIndicators: Record<string, boolean>;
  settings: IndicatorSettings;
  zoomLevel: number;
  scrollOffset: number;
  symbol: string;
  calcData?: any;
  activeDrawingTool?: string;
  setActiveDrawingTool?: (t: string) => void;
  drawings?: any[];
  setDrawings?: React.Dispatch<React.SetStateAction<any[]>>;
  fetchMoreHistory?: () => void;
}

export const BottomChart = React.memo(({
  data,
  activeIndicators,
  settings,
  zoomLevel,
  scrollOffset,
  symbol,
  calcData,
  activeDrawingTool = 'cursor',
  setActiveDrawingTool,
  drawings = [],
  setDrawings,
  fetchMoreHistory
}: BottomChartProps) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const seriesMapRef = useRef<Record<string, ISeriesApi<"Line">>>({});
  const markersPluginRef = useRef<any>(null);
  const { registerChart, unregisterChart } = useChartSync();

  const [hoverData, setHoverData] = useState<any>(null);
  const [selectedDrawingId, setSelectedDrawingId] = useState<string | null>(null);

  // --- INIT LIGHTWEIGHT CHART ---
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: 'solid' as any, color: '#131722' },
        textColor: '#d1d4dc',
      },
      grid: {
        vertLines: { color: 'rgba(42, 46, 57, 0.5)' },
        horzLines: { color: 'rgba(42, 46, 57, 0.5)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      rightPriceScale: {
        borderColor: 'rgba(197, 203, 206, 0.8)',
        autoScale: true,
        minimumWidth: 110,
      },
      timeScale: {
        borderColor: 'rgba(197, 203, 206, 0.8)',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    chartRef.current = chart;

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });
    
    registerChart('bottom-chart', chart, candleSeries);
    
    candleSeriesRef.current = candleSeries;

    // Crosshair hover text update
    chart.subscribeCrosshairMove((param) => {
      if (!param.time || param.point === undefined || !param.seriesData.get(candleSeries)) {
        setHoverData(null);
        return;
      }
      const data = param.seriesData.get(candleSeries) as any;
      setHoverData({
         open: data.open,
         high: data.high,
         low: data.low,
         close: data.close,
      });
    });

    // Resize observer
    const resizeObserver = new ResizeObserver((entries) => {
      window.requestAnimationFrame(() => {
        if (!chartContainerRef.current) return;
        if (entries.length === 0 || entries[0].target !== chartContainerRef.current) return;
        const newRect = entries[0].contentRect;
        chart.applyOptions({ width: Math.floor(newRect.width), height: Math.floor(newRect.height) });
      });
    });

    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      unregisterChart('bottom-chart');
      chart.remove();
    };
  }, []);

  // Use a ref to always access latest fetchMoreHistory
  const fetchMoreRef = useRef(fetchMoreHistory);
  useEffect(() => {
    fetchMoreRef.current = fetchMoreHistory;
  }, [fetchMoreHistory]);

  useEffect(() => {
    if (!chartRef.current) return;
    const scrollHandler = (logicalRange: any) => {
      if (logicalRange && logicalRange.from < 50) {
        if (fetchMoreRef.current) fetchMoreRef.current();
      }
    };
    chartRef.current.timeScale().subscribeVisibleLogicalRangeChange(scrollHandler);
    return () => chartRef.current?.timeScale().unsubscribeVisibleLogicalRangeChange(scrollHandler);
  }, []);

  // --- UPDATE CANDLE DATA ---
  const lastDataLength = useRef(0);

  useEffect(() => {
    if (!candleSeriesRef.current || data.length === 0) return;

    const formattedData = data.map(d => ({
      time: d.epoch as any,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }));
    
    // LW charts requires strictly unique, ascending time arrays
    const deduplicated = [];
    let lastTime = 0;
    for (const d of formattedData) {
      if (d.time > lastTime) {
        deduplicated.push(d);
        lastTime = d.time;
      }
    }

    if (deduplicated.length > 0) {
      candleSeriesRef.current.setData(deduplicated);
    }
  }, [data]);

  // --- OVERLAYS FOR INDICATORS ---
  useEffect(() => {
    if (!chartRef.current || !calcData || data.length === 0) return;

    const formattedLength = data.length;

    // Helper to sync line series
    const syncLine = (key: string, isActive: boolean, color: string, dataKey: (i: number) => number | null | undefined, width: number = 2) => {
       if (isActive) {
          if (!seriesMapRef.current[key]) {
             seriesMapRef.current[key] = chartRef.current!.addSeries(LineSeries, { color, lineWidth: width, crosshairMarkerVisible: false });
          }
          const lineData = [];
           let lastTime = 0;
           for(let i = 0; i < formattedLength; i++) {
               const time = data[i].epoch as any;
               const val = dataKey(i);
               if (val !== null && val !== undefined && !isNaN(val) && time > lastTime) {
                  lineData.push({ time, value: val });
                  lastTime = time;
               }
           }
           console.log(`syncLine ${key}: isActive=${isActive}, data length=${lineData.length}`);
           seriesMapRef.current[key].setData(lineData);
       } else if (seriesMapRef.current[key]) {
          console.log(`syncLine ${key}: removing series`);
          chartRef.current!.removeSeries(seriesMapRef.current[key]);
          delete seriesMapRef.current[key];
       }
    };

    try {
      const visibility = settings.visibility || {};
      syncLine('ma', activeIndicators.MA !== false && visibility.ma !== false, settings.colors?.ma || '#ec4899', i => calcData.maData?.[i], 2);
      
      syncLine('bbUpper', activeIndicators.BB !== false && visibility.bbUpper !== false, settings.colors?.bbUpper || '#14b8a6', i => calcData.bbData?.upper?.[i], 1);
      syncLine('bbLower', activeIndicators.BB !== false && visibility.bbLower !== false, settings.colors?.bbLower || '#14b8a6', i => calcData.bbData?.lower?.[i], 1);

      syncLine('envUpper', activeIndicators.MAENV !== false && visibility.maenvUpper !== false, settings.colors?.maenvUpper || '#a855f7', i => calcData.maEnvData?.upper?.[i], 1);
      syncLine('envLower', activeIndicators.MAENV !== false && visibility.maenvLower !== false, settings.colors?.maenvLower || '#a855f7', i => calcData.maEnvData?.lower?.[i], 1);

      syncLine('fibUpper786', activeIndicators.ATRFIBENV !== false, '#f87171', i => calcData.atrFibData?.upper786?.[i], 1);
      syncLine('fibUpper618', activeIndicators.ATRFIBENV !== false, '#ef4444', i => calcData.atrFibData?.upper618?.[i], 1);
      syncLine('fibUpper50', activeIndicators.ATRFIBENV !== false, '#dc2626', i => calcData.atrFibData?.upper50?.[i], 1);
      syncLine('fibLower786', activeIndicators.ATRFIBENV !== false, '#f87171', i => calcData.atrFibData?.lower786?.[i], 1);
      syncLine('fibLower618', activeIndicators.ATRFIBENV !== false, '#ef4444', i => calcData.atrFibData?.lower618?.[i], 1);
      syncLine('fibLower50', activeIndicators.ATRFIBENV !== false, '#dc2626', i => calcData.atrFibData?.lower50?.[i], 1);

      // Support / Resistance
      const getPivots = () => {
         if (!activeIndicators.SNR || data.length === 0) return { r:[], s:[] };
         const highs = []; const lows = [];
         const windowLen = Math.max(8, Math.floor(data.length / 15));
         for (let i = windowLen; i < data.length - windowLen; i++) {
             let isHigh = true; let isLow = true;
             for (let j = i - windowLen; j <= i + windowLen; j++) {
                if (j === i) continue;
                if (data[j].high > data[i].high) isHigh = false;
                if (data[j].low < data[i].low) isLow = false;
             }
             if (isHigh) highs.push(data[i].high);
             if (isLow) lows.push(data[i].low);
         }
         highs.sort((a,b) => b - a); lows.sort((a,b) => a - b);
         return { r: highs.slice(0, 2), s: lows.slice(0, 2) };
      };

      const pivs = getPivots();
      syncLine('snrR1', activeIndicators.SNR && pivs.r[0] !== undefined, '#ffffff', () => pivs.r[0], 2);
      syncLine('snrR2', activeIndicators.SNR && pivs.r[1] !== undefined, '#ffffff', () => pivs.r[1], 2);
      syncLine('snrS1', activeIndicators.SNR && pivs.s[0] !== undefined, '#ffffff', () => pivs.s[0], 2);
      syncLine('snrS2', activeIndicators.SNR && pivs.s[1] !== undefined, '#ffffff', () => pivs.s[1], 2);

      // Scalping Ribbon
      syncLine('scalpingEma1', activeIndicators.SCALPING !== false, '#10b981', i => calcData.scalpingData?.[i]?.ribbonEma1, 1);
      syncLine('scalpingEma2', activeIndicators.SCALPING !== false, '#10b981', i => calcData.scalpingData?.[i]?.ribbonEma2, 1);
      syncLine('scalpingEma3', activeIndicators.SCALPING !== false, '#10b981', i => calcData.scalpingData?.[i]?.ribbonEma3, 1);
      syncLine('scalpingEma4', activeIndicators.SCALPING !== false, '#10b981', i => calcData.scalpingData?.[i]?.ribbonEma4, 1);
      syncLine('scalpingEma5', activeIndicators.SCALPING !== false, '#ef4444', i => calcData.scalpingData?.[i]?.ribbonEma5, 1);
      syncLine('scalpingEma6', activeIndicators.SCALPING !== false, '#ef4444', i => calcData.scalpingData?.[i]?.ribbonEma6, 1);
      syncLine('scalpingEma7', activeIndicators.SCALPING !== false, '#ef4444', i => calcData.scalpingData?.[i]?.ribbonEma7, 1);
      syncLine('scalpingEma8', activeIndicators.SCALPING !== false, '#ef4444', i => calcData.scalpingData?.[i]?.ribbonEma8, 1);

      // NW Env envelopes
      syncLine('nwenvUpper', activeIndicators.NWENV !== false, '#3b82f6', i => calcData.nwenvData?.env?.[i]?.upper, 1);
      syncLine('nwenvLower', activeIndicators.NWENV !== false, '#3b82f6', i => calcData.nwenvData?.env?.[i]?.lower, 1);

      // --- MARKERS ---
      if (candleSeriesRef.current) {
         const markers: any[] = [];
         let lastTime = 0;
         
         const addMarker = (time: number, position: 'aboveBar' | 'belowBar' | 'inBar', color: string, shape: 'arrowUp' | 'arrowDown' | 'circle', text?: string) => {
             markers.push({ time, position, color, shape, text });
         };

         for(let i = 0; i < formattedLength; i++) {
             const time = data[i].epoch as any;
             if (time <= lastTime) continue;
             lastTime = time;

             // PSAR
             if (activeIndicators.PSAR && visibility.psar !== false) {
                const psar = calcData.psarData?.[i];
                if (psar !== undefined && !isNaN(psar)) {
                   addMarker(time, psar > data[i].high ? 'aboveBar' : 'belowBar', settings.colors?.psar || '#eab308', 'circle');
                }
             }

             // UT Bot
             if (activeIndicators.UTBOT) {
                if (calcData.utbotData?.buySignal?.[i]) addMarker(time, 'belowBar', '#22c55e', 'arrowUp', 'UTBuy');
                if (calcData.utbotData?.sellSignal?.[i]) addMarker(time, 'aboveBar', '#ef4444', 'arrowDown', 'UTSell');
             }

             // NW Env
             if (activeIndicators.NWENV) {
                if (calcData.nwenvData?.buySignal?.[i]) addMarker(time, 'belowBar', '#22c55e', 'arrowUp', 'NWBuy');
                if (calcData.nwenvData?.sellSignal?.[i]) addMarker(time, 'aboveBar', '#ef4444', 'arrowDown', 'NWSell');
             }

             // WAE markers removed from main chart
             
             // CSO markers removed from main chart

             // TMO Scalper markers removed from main chart
             
             // TMO Trigger
             if (activeIndicators.TMOTRIGGER) {
                if (calcData.tmoTriggerData?.[i]?.entryArmedSignal) addMarker(time, 'belowBar', '#0891b2', 'circle', 'ARMED');
                if (calcData.tmoTriggerData?.[i]?.exitArmedSignal) addMarker(time, 'aboveBar', '#f59e0b', 'circle', 'ARMED');
                if (calcData.tmoTriggerData?.[i]?.buyArrow) addMarker(time, 'belowBar', '#22c55e', 'arrowUp', 'BUY NEXT OPEN');
                if (calcData.tmoTriggerData?.[i]?.sellArrow) addMarker(time, 'aboveBar', '#ef4444', 'arrowDown', 'SELL NEXT OPEN');
             }

             // NR markers removed from main chart
             
             // GTA
             if (activeIndicators.GTA) {
                if (calcData.gtaData?.[i]?.buyArrow) addMarker(time, 'belowBar', '#10b981', 'arrowUp', 'GTA');
                if (calcData.gtaData?.[i]?.sellArrow) addMarker(time, 'aboveBar', '#ef4444', 'arrowDown', 'GTA');
             }

             // Session VWAP signals
             if (activeIndicators.SESSION_VWAP && visibility.vwapSignals !== false) {
                if (calcData.sessionVwapData?.[i]?.buy_signal) addMarker(time, 'belowBar', '#22c55e', 'arrowUp', 'VWAP');
                if (calcData.sessionVwapData?.[i]?.sell_signal) addMarker(time, 'aboveBar', '#ef4444', 'arrowDown', 'VWAP');
             }
             
             // Scalping ribbon signals
             if (activeIndicators.SCALPING) {
                if (calcData.scalpingData?.[i]?.ribbonBuyArrow) addMarker(time, 'belowBar', '#10b981', 'arrowUp', 'Ribbon');
                if (calcData.scalpingData?.[i]?.ribbonSellArrow) addMarker(time, 'aboveBar', '#ef4444', 'arrowDown', 'Ribbon');
             }
         }
         
         // Fix multiple markers at same time (lightweight-charts doesn't support multiple at same time natively without sorting/grouping, wait actually it supports multiple markers per candle if mapped correctly, but just array is fine. Wait, LW charts requires markers to be sorted by time)
         markers.sort((a, b) => (a.time as number) - (b.time as number));
         if (!markersPluginRef.current) {
             markersPluginRef.current = createSeriesMarkers(candleSeriesRef.current);
         }
         markersPluginRef.current.setMarkers(markers);
      }

    } catch(e) {
      console.error(e);
    }
  }, [calcData, activeIndicators, settings]);

  // --- OVERLAYS SVG FOR DRAWINGS ---
  const [svgOverlay, setSvgOverlay] = useState<{ width: number, height: number }>({ width: 0, height: 0 });
  
  useEffect(() => {
    if (!chartContainerRef.current) return;
    const rect = chartContainerRef.current.getBoundingClientRect();
    setSvgOverlay({ width: rect.width, height: rect.height });
  }, []);

  // For drawings, use `chart.timeScale().timeToCoordinate` and `series.priceToCoordinate` synchronously
  const getCoordinates = (epoch: number, price: number) => {
    if (!chartRef.current || !candleSeriesRef.current) return { x: 0, y: 0 };
    const x = chartRef.current.timeScale().timeToCoordinate(epoch as any);
    const y = candleSeriesRef.current.priceToCoordinate(price);
    return { x: x || 0, y: y || 0 };
  };

  const getPriceByY = (y: number) => {
    if (!candleSeriesRef.current) return 0;
    return candleSeriesRef.current.coordinateToPrice(y) || 0;
  };

  const getTimeByX = (x: number) => {
    if (!chartRef.current) return 0;
    const coordinateToTime = chartRef.current.timeScale().coordinateToTime(x) as any;
    return coordinateToTime || 0;
  };

  // Listen to visible logic range changes to trigger re-renders of the drawing overlay layer
  const [ticker, setTicker] = useState(0);
  useEffect(() => {
    if (!chartRef.current) return;
    const handler = () => {
       setTicker(t => t + 1);
    };
    chartRef.current.timeScale().subscribeVisibleLogicalRangeChange(handler);
    return () => {
       chartRef.current?.timeScale().unsubscribeVisibleLogicalRangeChange(handler);
    };
  }, []);

  // Drawing event handlers overlaid on top of chart
  const handleOverlayMouseDown = (e: React.MouseEvent) => {
    if (!activeDrawingTool || activeDrawingTool === 'cursor' || !setDrawings) {
        setSelectedDrawingId(null);
        return;
    }
    if (!chartContainerRef.current) return;
    const rect = chartContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const price = getPriceByY(y);
    const epoch = getTimeByX(x);

    if (activeDrawingTool === 'horizontal') {
        setDrawings(prev => [...prev, { id: Date.now().toString(), type: 'horizontal', price }]);
        setActiveDrawingTool?.('cursor');
    } else if (activeDrawingTool === 'text') {
        const text = prompt('Enter text:');
        if (text) {
          setDrawings(prev => [...prev, { id: Date.now().toString(), type: 'text', price, epoch, text }]);
        }
        setActiveDrawingTool?.('cursor');
    } else if (activeDrawingTool === 'trendline') {
        setDrawings(prev => {
          const draft = prev.find(d => d.type === 'trendline' && d.pending);
          if (draft) {
             setActiveDrawingTool?.('cursor');
             return prev.map(d => d.id === draft.id ? { ...d, pending: false, points: [d.points[0], { epoch, price }] } : d);
          } else {
             return [...prev, { id: Date.now().toString(), type: 'trendline', pending: true, points: [{ epoch, price }, { epoch, price }] }];
          }
        });
    }
  };

  const handleOverlayMouseMove = (e: React.MouseEvent) => {
     if (activeDrawingTool === 'trendline' && setDrawings) {
        if (!chartContainerRef.current) return;
        const rect = chartContainerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const price = getPriceByY(y);
        const epoch = getTimeByX(x);

        setDrawings(prev => {
          if (!prev.some(d => d.type === 'trendline' && d.pending)) return prev;
          return prev.map(d => d.pending ? { ...d, points: [d.points[0], { epoch, price }] } : d);
        });
     }
  };

  const updateDrawing = (id: string, updates: any) => {
    if (setDrawings) {
       setDrawings(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
    }
  };

  return (
    <div className="w-full h-full relative" style={{ minHeight: '400px' }}>
      {/* Floating Drawing Toolbar */}
      {selectedDrawingId && (() => {
        const selected = drawings.find(d => d.id === selectedDrawingId);
        if (!selected) return null;
        return (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-[#1e222d] border border-neutral-700 rounded-md p-1.5 flex gap-1 z-[100] shadow-xl items-center pointer-events-auto">
            <div className="flex gap-1 border-r border-neutral-700 pr-1">
              {['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#ffffff'].map(c => (
                 <button key={c} onClick={(e) => { e.stopPropagation(); updateDrawing(selected.id, { color: c }); }} className={`w-5 h-5 rounded-sm ${selected.color === c ? 'ring-1 ring-white' : ''}`} style={{ backgroundColor: c }} />
              ))}
            </div>
            <div className="flex gap-1 border-r border-neutral-700 px-1">
              {[1, 2, 3].map(w => (
                 <button key={w} onClick={(e) => { e.stopPropagation(); updateDrawing(selected.id, { thickness: w }); }} className={`w-6 h-6 flex items-center justify-center hover:bg-neutral-800 rounded ${selected.thickness === w ? 'bg-neutral-800 text-white' : 'text-neutral-500'}`}>
                    <div className="bg-current w-full" style={{ height: `${w}px` }} />
                 </button>
              ))}
            </div>
            {selected.type === 'text' && (
               <button onClick={(e) => {
                 e.stopPropagation();
                 const newText = prompt('Edit text:', selected.text);
                 if (newText) updateDrawing(selected.id, { text: newText });
               }} className="px-2 text-[11px] h-6 flex items-center font-medium hover:bg-neutral-800 rounded">
                 Edit
               </button>
            )}
            <button onClick={(e) => {
              e.stopPropagation();
              setDrawings?.(prev => prev.filter(d => d.id !== selected.id));
              setSelectedDrawingId(null);
            }} className="p-1 h-6 hover:bg-red-500/20 text-red-400 rounded flex items-center">
              <Trash2 className="w-[14px] h-[14px]" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); setSelectedDrawingId(null); }} className="px-1 text-[10px] text-neutral-500 hover:text-white">x</button>
          </div>
        );
      })()}

      {/* Tooltip Header */}
      <div className="absolute top-2 left-2 z-[60] flex items-center gap-2 pointer-events-none">
        {hoverData ? (
           <div className="flex items-center gap-3 text-xs font-mono">
              <span className="text-neutral-400">O<span className="text-neutral-200 ml-1">{hoverData.open?.toFixed(4)}</span></span>
              <span className="text-neutral-400">H<span className="text-neutral-200 ml-1">{hoverData.high?.toFixed(4)}</span></span>
              <span className="text-neutral-400">L<span className="text-neutral-200 ml-1">{hoverData.low?.toFixed(4)}</span></span>
              <span className="text-neutral-400">C<span className="text-neutral-200 ml-1">{hoverData.close?.toFixed(4)}</span></span>
           </div>
        ) : (
           <div className="flex items-center gap-3 text-xs font-mono opacity-50">
             {data.length > 0 && (() => {
                const c = data[data.length - 1];
                return (
                  <>
                    <span className="text-neutral-400">O<span className="text-neutral-200 ml-1">{c.open?.toFixed(4)}</span></span>
                    <span className="text-neutral-400">H<span className="text-neutral-200 ml-1">{c.high?.toFixed(4)}</span></span>
                    <span className="text-neutral-400">L<span className="text-neutral-200 ml-1">{c.low?.toFixed(4)}</span></span>
                    <span className="text-neutral-400">C<span className="text-neutral-200 ml-1">{c.close?.toFixed(4)}</span></span>
                  </>
                )
             })()}
           </div>
        )}
      </div>

      {/* Lightweight Chart Container */}
      <div 
         ref={chartContainerRef} 
         className="absolute inset-0 z-10" 
      />

      {/* Drawing Overlay */}
      <svg 
         className="absolute inset-0 z-50 pointer-events-none" 
         width="100%" 
         height="100%"
      >
        <g className="drawings-layer">
           {/* Invisible rectangle to catch clicks when drawing ONLY */}
           {activeDrawingTool && activeDrawingTool !== 'cursor' && (
               <rect x="0" y="0" width="100%" height="100%" fill="transparent" pointerEvents="all" onMouseDown={handleOverlayMouseDown} onMouseMove={handleOverlayMouseMove} />
           )}
           
            {drawings.map((d, i) => {
              const isSelected = d.id === selectedDrawingId;
              const color = isSelected ? '#ffffff' : (d.color || '#3b82f6');
              const strokeWidth = d.thickness || 2;
              
              if (d.type === 'horizontal') {
                 const { y } = getCoordinates(0, d.price);
                 if (!y) return null;
                 return (
                    <g key={i}>
                      <line x1="0" y1={y} x2="100%" y2={y} stroke={color} strokeWidth={strokeWidth} pointerEvents="auto" />
                      <line x1="0" y1={y} x2="100%" y2={y} stroke="transparent" strokeWidth="15" pointerEvents="auto" onClick={(e) => { e.stopPropagation(); setSelectedDrawingId(d.id); }} style={{ cursor: 'pointer' }} />
                    </g>
                 );
              }

              if (d.type === 'text') {
                 const { x, y } = getCoordinates(d.epoch, d.price);
                 if (!x || !y) return null;
                 return (
                    <text key={i} x={x} y={y} fill={color} fontSize={16} fontWeight="500" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)', cursor: 'pointer' }} pointerEvents="auto" onClick={(e) => { e.stopPropagation(); setSelectedDrawingId(d.id); }}>{d.text}</text>
                 );
              }

              if (d.type === 'trendline' && d.points) {
                 const p1 = getCoordinates(d.points[0].epoch, d.points[0].price);
                 const p2 = getCoordinates(d.points[1].epoch, d.points[1].price);
                 if (!p1.x || !p2.x) return null;
                 return (
                    <g key={i}>
                      <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={color} strokeWidth={strokeWidth} pointerEvents="auto" />
                      <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="transparent" strokeWidth="15" pointerEvents="auto" onClick={(e) => { e.stopPropagation(); setSelectedDrawingId(d.id); }} style={{ cursor: 'pointer' }} />
                    </g>
                 );
              }

              return null;
           })}
        </g>
      </svg>
    </div>
  );
});
