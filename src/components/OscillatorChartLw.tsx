import React, { useEffect, useRef, useMemo } from 'react';
import { createChart, IChartApi, ISeriesApi, LineStyle, LineType, CrosshairMode, LineSeries, HistogramSeries, BaselineSeries } from 'lightweight-charts';
import { CandleData } from '../lib/calculators';
import type { IndicatorSettings } from '../App';
import { useChartSync } from '../contexts/ChartSyncContext';

interface OscillatorChartProps {
  id?: string;
  type: 'SMI' | 'STOCHRSI' | 'ZMACD' | 'STDSMI' | 'TWOPOLE' | 'WAE' | 'SCALPING' | 'CSO' | 'TMOSCALPER' | 'NR' | string;
  data: CandleData[];
  settings: IndicatorSettings;
  zoomLevel: number;
  scrollOffset: number;
  calcData: any;
}

export const OscillatorChart = React.memo(({ id, type, data, settings, calcData }: OscillatorChartProps) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const { registerChart, unregisterChart } = useChartSync();
  const chartId = useRef(id || `osc-${Math.random()}`);

  const seriesRefs = useRef<Record<string, ISeriesApi<any>>>({});

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
        visible: true,
      },
    });

    chartRef.current = chart;
    if (type === 'SMI') {
       seriesRefs.current.histogram = chart.addSeries(HistogramSeries, { color: settings.colors.smiHistogramUp });
       seriesRefs.current.smi = chart.addSeries(LineSeries, { color: settings.colors.smiSmi, lineWidth: 2 });
       seriesRefs.current.signal = chart.addSeries(LineSeries, { color: settings.colors.smiSignal, lineWidth: 2 });
    } else if (type === 'STOCHRSI' || type.startsWith('STOCH')) {
       seriesRefs.current.stochK = chart.addSeries(LineSeries, { color: settings.colors?.stochK || '#3b82f6', lineWidth: 2 });
       seriesRefs.current.stochD = chart.addSeries(LineSeries, { color: settings.colors?.stochD || '#f59e0b', lineWidth: 2 });
       // reference lines map to price lines on lightweight-charts:
       seriesRefs.current.stochK.createPriceLine({ price: 80, color: '#444', lineWidth: 1, lineStyle: LineStyle.Dashed });
       seriesRefs.current.stochK.createPriceLine({ price: 20, color: '#444', lineWidth: 1, lineStyle: LineStyle.Dashed });
    } else if (type === 'ZMACD') {
       seriesRefs.current.histogram = chart.addSeries(HistogramSeries, { color: settings.colors.zmacdHistUp });
       seriesRefs.current.macd = chart.addSeries(LineSeries, { color: settings.colors.zmacdMacd, lineWidth: 2 });
       seriesRefs.current.signal = chart.addSeries(LineSeries, { color: settings.colors.zmacdSignal, lineWidth: 2 });
    } else if (type === 'TMOSCALPER') {
       seriesRefs.current.tmoObZone = chart.addSeries(BaselineSeries, { 
           baseValue: { type: 'price', price: 10 }, 
           topFillColor1: 'rgba(255, 0, 0, 0.4)', 
           topFillColor2: 'rgba(255, 0, 0, 0.4)', 
           bottomFillColor1: 'rgba(0, 0, 0, 0)', 
           bottomFillColor2: 'rgba(0, 0, 0, 0)', 
           topLineColor: 'rgba(0,0,0,0)', 
           bottomLineColor: 'rgba(0,0,0,0)',
           lineWidth: 0,
           crosshairMarkerVisible: false,
           autoscaleInfoProvider: () => null,
       });

       seriesRefs.current.tmoOsZone = chart.addSeries(BaselineSeries, { 
           baseValue: { type: 'price', price: -10 }, 
           topFillColor1: 'rgba(0, 0, 0, 0)', 
           topFillColor2: 'rgba(0, 0, 0, 0)', 
           bottomFillColor1: 'rgba(39, 194, 46, 0.4)', 
           bottomFillColor2: 'rgba(39, 194, 46, 0.4)', 
           topLineColor: 'rgba(0,0,0,0)', 
           bottomLineColor: 'rgba(0,0,0,0)',
           lineWidth: 0,
           crosshairMarkerVisible: false,
           autoscaleInfoProvider: () => null,
       });

       seriesRefs.current.tmo1Main = chart.addSeries(LineSeries, { color: '#22c55e', lineWidth: 2, lineType: LineType.Curved });
       seriesRefs.current.tmo1Signal = chart.addSeries(LineSeries, { color: '#ef4444', lineWidth: 1, lineType: LineType.Curved });
       seriesRefs.current.tmo2Main = chart.addSeries(LineSeries, { color: '#16a34a', lineWidth: 2, lineType: LineType.Curved });
       seriesRefs.current.tmo2Signal = chart.addSeries(LineSeries, { color: '#dc2626', lineWidth: 2, lineType: LineType.Curved });
       
       seriesRefs.current.tmo2Main.createPriceLine({ price: 10, color: 'rgba(255,0,0,0.8)', lineWidth: 1, lineStyle: LineStyle.Solid, title: 'OB (+10)' });
       seriesRefs.current.tmo2Main.createPriceLine({ price: -10, color: 'rgba(39,194,46,0.8)', lineWidth: 1, lineStyle: LineStyle.Solid, title: 'OS (-10)' });
       seriesRefs.current.tmo2Main.createPriceLine({ price: 0, color: 'rgba(42, 46, 57, 0.5)', lineWidth: 1, lineStyle: LineStyle.Dashed });
       
       chart.priceScale('right').applyOptions({
         autoScale: true,
         scaleMargins: { top: 0.1, bottom: 0.1 },
       });
    } else if (type === 'TMOTRIGGER') {
       seriesRefs.current.tmoMain = chart.addSeries(LineSeries, { color: '#22c55e', lineWidth: 2, lineType: LineType.Curved });
       seriesRefs.current.tmoSignal = chart.addSeries(LineSeries, { color: '#ef4444', lineWidth: 1, lineType: LineType.Curved });

       seriesRefs.current.tmoMain.createPriceLine({ price: 55, color: '#ef4444', lineWidth: 1, lineStyle: LineStyle.Dashed, title: 'Exit Armed' });
       seriesRefs.current.tmoMain.createPriceLine({ price: -55, color: '#22c55e', lineWidth: 1, lineStyle: LineStyle.Dashed, title: 'Entry Armed' });
       seriesRefs.current.tmoMain.createPriceLine({ price: 0, color: '#6b7280', lineWidth: 1, lineStyle: LineStyle.Dotted, title: 'Zero' });
       
       chart.priceScale('right').applyOptions({
         autoScale: true,
         scaleMargins: { top: 0.1, bottom: 0.1 },
       });
    } else if (type === 'STDSMI') {
       seriesRefs.current.histogram = chart.addSeries(HistogramSeries, { color: '#3b82f6' });
       seriesRefs.current.smi = chart.addSeries(LineSeries, { color: '#10b981', lineWidth: 2 });
       seriesRefs.current.signal = chart.addSeries(LineSeries, { color: '#ef4444', lineWidth: 2 });
       seriesRefs.current.smi.createPriceLine({ price: 40, color: '#ef4444', lineWidth: 1, lineStyle: LineStyle.Dashed });
       seriesRefs.current.smi.createPriceLine({ price: -40, color: '#10b981', lineWidth: 1, lineStyle: LineStyle.Dashed });
    } else if (type === 'TWOPOLE') {
       seriesRefs.current.filter = chart.addSeries(LineSeries, { color: '#a855f7', lineWidth: 2 });
    } else if (type === 'WAE') {
       seriesRefs.current.trend = chart.addSeries(HistogramSeries, { color: '#10b981' });
       seriesRefs.current.explosion = chart.addSeries(LineSeries, { color: '#f59e0b', lineWidth: 2 });
       seriesRefs.current.deadZone = chart.addSeries(LineSeries, { color: '#6b7280', lineWidth: 1, lineStyle: LineStyle.Dashed });
    } else if (type === 'CSO') {
       seriesRefs.current.oscillator = chart.addSeries(LineSeries, { color: '#3b82f6', lineWidth: 2 });
       seriesRefs.current.oscillator.createPriceLine({ price: 0, color: '#6b7280', lineWidth: 1, lineStyle: LineStyle.Dashed });
    } else if (type === 'NR') {
       seriesRefs.current.osc = chart.addSeries(LineSeries, { color: '#3b82f6', lineWidth: 2 });
       seriesRefs.current.signal = chart.addSeries(LineSeries, { color: '#f59e0b', lineWidth: 2 });
       seriesRefs.current.osc.createPriceLine({ price: 1, color: '#ef4444', lineWidth: 1, lineStyle: LineStyle.Dashed });
       seriesRefs.current.osc.createPriceLine({ price: -1, color: '#10b981', lineWidth: 1, lineStyle: LineStyle.Dashed });
       seriesRefs.current.osc.createPriceLine({ price: 0, color: '#6b7280', lineWidth: 1, lineStyle: LineStyle.Dashed });
    } else {
       // Dummy series if none matching to ensure crosshair syncing works
       seriesRefs.current.dummy = chart.addSeries(LineSeries, { visible: false });
    }
    
    // Pass the first series as reference for crosshair syncing
    registerChart(chartId.current, chart, Object.values(seriesRefs.current)[0]);
    // Implement others similarly over time...

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
      unregisterChart(chartId.current);
      chart.remove();
    };
  }, [type]);

  const lastDataLength = useRef(0);

  useEffect(() => {
    if (!calcData || data.length === 0 || !chartRef.current) return;

    // Data formatting for LW charts requires an ascending `time` property
    const formattedLength = data.length;
    // Map data
    try {
        if (type === 'SMI' && seriesRefs.current.smi) {
           const sData=[], sigData=[], hData=[];
           let lastTime = 0;
           for(let i=0; i<formattedLength; i++) {
               const time = data[i].epoch as any;
               if (!time || time <= lastTime) continue;
               lastTime = time;
               const smi = calcData?.smi?.[i];
               const sig = calcData?.signal?.[i];
               if (smi !== undefined && !isNaN(smi)) sData.push({ time, value: smi }); else sData.push({ time });
               if (sig !== undefined && !isNaN(sig)) sigData.push({ time, value: sig }); else sigData.push({ time });
               if (smi !== undefined && sig !== undefined && !isNaN(smi) && !isNaN(sig)) {
                  const val = smi - sig;
                  hData.push({ time, value: val, color: val > 0 ? settings.colors.smiHistogramUp : settings.colors.smiHistogramDown });
               } else hData.push({ time });
           }
           seriesRefs.current.smi.setData(sData);
           seriesRefs.current.signal.setData(sigData);
           seriesRefs.current.histogram.setData(hData);
        } else if ((type === 'STOCHRSI' || type.startsWith('STOCH')) && seriesRefs.current.stochK) {
           const kData=[], dData=[];
           let lastTime = 0;
           for(let i=0; i<formattedLength; i++) {
               const time = data[i].epoch as any;
               if (!time || time <= lastTime) continue;
               lastTime = time;
               const k = calcData?.stochK?.[i];
               const d = calcData?.stochD?.[i];
               if (k !== undefined && !isNaN(k)) kData.push({ time, value: k }); else kData.push({ time });
               if (d !== undefined && !isNaN(d)) dData.push({ time, value: d }); else dData.push({ time });
           }
           seriesRefs.current.stochK.setData(kData);
           seriesRefs.current.stochD.setData(dData);
        } else if (type === 'ZMACD' && seriesRefs.current.macd) {
           const mData=[], sigData=[], hData=[];
           let lastTime = 0;
           for(let i=0; i<formattedLength; i++) {
               const time = data[i].epoch as any;
               if (!time || time <= lastTime) continue;
               lastTime = time;
               const m = calcData?.macd?.[i];
               const s = calcData?.signal?.[i];
               const h = calcData?.histogram?.[i];
               if (m !== undefined && !isNaN(m)) mData.push({ time, value: m }); else mData.push({ time });
               if (s !== undefined && !isNaN(s)) sigData.push({ time, value: s }); else sigData.push({ time });
               if (h !== undefined && !isNaN(h)) hData.push({ time, value: h, color: h > 0 ? settings.colors.zmacdHistUp : settings.colors.zmacdHistDown }); else hData.push({ time });
           }
           seriesRefs.current.macd.setData(mData);
           seriesRefs.current.signal.setData(sigData);
           seriesRefs.current.histogram.setData(hData);
        } else if (type === 'TMOSCALPER' && seriesRefs.current.tmo1Main) {
           const t1m=[], t1s=[], t2m=[], t2s=[];
           const obZone=[], osZone=[];
           const markers: any[] = [];
           let lastTime = 0;
           for(let i=0; i<formattedLength; i++) {
               const time = data[i].epoch as any;
               if (!time || time <= lastTime) continue;
               lastTime = time;
               const v = calcData?.[i];
               if (v?.tmo1_main !== undefined && !isNaN(v.tmo1_main as any) && v.tmo1_main !== null) t1m.push({ time, value: v.tmo1_main }); else t1m.push({ time });
               if (v?.tmo1_signal !== undefined && !isNaN(v.tmo1_signal as any) && v.tmo1_signal !== null) t1s.push({ time, value: v.tmo1_signal }); else t1s.push({ time });
               if (v?.tmo2_main !== undefined && !isNaN(v.tmo2_main as any) && v.tmo2_main !== null) {
                   const stepColor = v.tmo_zone_color === 'bullish' ? '#16a34a' : (v.tmo_zone_color === 'bearish' ? '#dc2626' : undefined);
                   t2m.push({ time, value: v.tmo2_main, color: stepColor });
                   if (v.tmo_buy_signal) markers.push({ time, position: 'inBar', color: '#10b981', shape: 'circle', size: 2 });
                   if (v.tmo_sell_signal) markers.push({ time, position: 'inBar', color: '#ef4444', shape: 'circle', size: 2 });
               } else t2m.push({ time });
               if (v?.tmo2_signal !== undefined && !isNaN(v.tmo2_signal as any) && v.tmo2_signal !== null) {
                   const stepColor = v.tmo_zone_color === 'bullish' ? '#16a34a' : (v.tmo_zone_color === 'bearish' ? '#dc2626' : undefined);
                   t2s.push({ time, value: v.tmo2_signal, color: stepColor });
               } else t2s.push({ time });
               
               obZone.push({ time, value: 50 });
               osZone.push({ time, value: -50 });
           }
           seriesRefs.current.tmoObZone?.setData(obZone);
           seriesRefs.current.tmoOsZone?.setData(osZone);
           seriesRefs.current.tmo1Main.setData(t1m);
           seriesRefs.current.tmo1Signal.setData(t1s);
           seriesRefs.current.tmo2Main.setData(t2m);
           seriesRefs.current.tmo2Signal.setData(t2s);
           seriesRefs.current.tmo1Main.setMarkers(markers);
        } else if (type === 'TMOTRIGGER' && seriesRefs.current.tmoMain) {
           const tmData=[], tsData=[];
           const markers: any[] = [];
           let lastTime = 0;
           for(let i=0; i<formattedLength; i++) {
               const time = data[i].epoch as any;
               if (!time || time <= lastTime) continue;
               lastTime = time;
               const v = calcData?.[i];
               if (v?.tmoMain !== undefined && !isNaN(v.tmoMain as any) && v.tmoMain !== null) {
                   const stepColor = v.tmoMain > v.tmoSignal ? '#10b981' : '#ef4444';
                   tmData.push({ time, value: v.tmoMain, color: stepColor });
                   if (v.entryArmedSignal) markers.push({ time, position: 'belowBar', color: '#10b981', shape: 'circle', size: 1 });
                   if (v.exitArmedSignal) markers.push({ time, position: 'aboveBar', color: '#ef4444', shape: 'circle', size: 1 });
               } else tmData.push({ time });
               
               if (v?.tmoSignal !== undefined && !isNaN(v.tmoSignal as any) && v.tmoSignal !== null) {
                   tsData.push({ time, value: v.tmoSignal });
               } else tsData.push({ time });
           }
           seriesRefs.current.tmoMain.setData(tmData);
           seriesRefs.current.tmoSignal.setData(tsData);
           seriesRefs.current.tmoMain.setMarkers(markers);
        } else if (type === 'STDSMI' && seriesRefs.current.smi) {
           const sData=[], sigData=[], hData=[];
           let lastTime = 0;
           for(let i=0; i<formattedLength; i++) {
               const time = data[i].epoch as any;
               if (!time || time <= lastTime) continue;
               lastTime = time;
               const v = calcData?.[i];
               if (v?.smi !== undefined && !isNaN(v.smi)) sData.push({ time, value: v.smi }); else sData.push({ time });
               if (v?.signal !== undefined && !isNaN(v.signal)) sigData.push({ time, value: v.signal }); else sigData.push({ time });
               if (v?.histogram !== undefined && !isNaN(v.histogram)) hData.push({ time, value: v.histogram, color: v.histogram > 0 ? '#10b981' : '#ef4444' }); else hData.push({ time });
           }
           seriesRefs.current.smi.setData(sData);
           seriesRefs.current.signal.setData(sigData);
           seriesRefs.current.histogram.setData(hData);
        } else if (type === 'TWOPOLE' && seriesRefs.current.filter) {
           const fData=[];
           let lastTime = 0;
           for(let i=0; i<formattedLength; i++) {
               const time = data[i].epoch as any;
               if (!time || time <= lastTime) continue;
               lastTime = time;
               const v = calcData?.[i];
               if (v?.filter !== undefined && !isNaN(v.filter)) fData.push({ time, value: v.filter }); else fData.push({ time });
           }
           seriesRefs.current.filter.setData(fData);
        } else if (type === 'WAE' && seriesRefs.current.trend) {
           const tData=[], eData=[], dData=[];
           const markers: any[] = [];
           let lastTime = 0;
           for(let i=0; i<formattedLength; i++) {
               const time = data[i].epoch as any;
               if (!time || time <= lastTime) continue;
               lastTime = time;
               const v = calcData?.[i];
               if (v) {
                   const val = v.trendUp > 0 ? v.trendUp : (v.trendDown > 0 ? -v.trendDown : 0);
                   const color = v.trendUp > 0 ? '#10b981' : '#ef4444';
                   tData.push({ time, value: val, color });
                   if (v.explosionLine !== undefined && !isNaN(v.explosionLine)) eData.push({ time, value: v.explosionLine }); else eData.push({ time });
                   if (v.deadZone !== undefined && !isNaN(v.deadZone)) dData.push({ time, value: v.deadZone }); else dData.push({ time });
                   
                   if (v.waeBuySignal) markers.push({ time, position: 'belowBar', color: '#10b981', shape: 'arrowUp', size: 2 });
                   if (v.waeSellSignal) markers.push({ time, position: 'aboveBar', color: '#ef4444', shape: 'arrowDown', size: 2 });
               } else {
                   tData.push({ time }); eData.push({ time }); dData.push({ time });
               }
           }
           seriesRefs.current.trend.setData(tData);
           seriesRefs.current.explosion.setData(eData);
           seriesRefs.current.deadZone.setData(dData);
           seriesRefs.current.explosion.setMarkers(markers);
        } else if (type === 'CSO' && seriesRefs.current.oscillator) {
           const oData=[];
           const markers: any[] = [];
           let lastTime = 0;
           for(let i=0; i<formattedLength; i++) {
               const time = data[i].epoch as any;
               if (!time || time <= lastTime) continue;
               lastTime = time;
               const v = calcData?.[i];
               if (v?.oscillator !== undefined && !isNaN(v.oscillator)) {
                   oData.push({ time, value: v.oscillator });
                   if (v.buySignal) markers.push({ time, position: 'belowBar', color: '#10b981', shape: 'arrowUp', size: 2 });
                   if (v.sellSignal) markers.push({ time, position: 'aboveBar', color: '#ef4444', shape: 'arrowDown', size: 2 });
               } else oData.push({ time });
           }
           seriesRefs.current.oscillator.setData(oData);
           seriesRefs.current.oscillator.setMarkers(markers);
        } else if (type === 'NR' && seriesRefs.current.osc) {
           const oData=[], sData=[];
           const markers: any[] = [];
           let lastTime = 0;
           for(let i=0; i<formattedLength; i++) {
               const time = data[i].epoch as any;
               if (!time || time <= lastTime) continue;
               lastTime = time;
               const v = calcData?.[i];
               if (v?.osc !== undefined && !isNaN(v.osc)) {
                   oData.push({ time, value: v.osc });
                   if (v.buy_signal) markers.push({ time, position: 'belowBar', color: '#10b981', shape: 'arrowUp', size: 2 });
                   if (v.sell_signal) markers.push({ time, position: 'aboveBar', color: '#ef4444', shape: 'arrowDown', size: 2 });
               } else oData.push({ time });
               if (v?.signal !== undefined && !isNaN(v.signal)) sData.push({ time, value: v.signal }); else sData.push({ time });
           }
           seriesRefs.current.osc.setData(oData);
           seriesRefs.current.signal.setData(sData);
           seriesRefs.current.osc.setMarkers(markers);
        } else if (seriesRefs.current.dummy) {
           const dData = [];
           let lastTime = 0;
           for(let i=0; i<formattedLength; i++) {
               const time = data[i].epoch as any;
               if (!time || time <= lastTime) continue;
               lastTime = time;
               dData.push({ time });
           }
           seriesRefs.current.dummy.setData(dData);
        }
        
    } catch(e) {}
  }, [data, calcData, type]);

  return (
    <div className="w-full h-full relative" style={{ minHeight: '120px' }}>
      <div className="absolute top-2 left-2 z-20 flex items-center gap-2 pointer-events-none">
        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider bg-neutral-900/80 px-2 py-0.5 rounded shadow">
          {type}
        </span>
      </div>
      <div ref={chartContainerRef} className="absolute inset-0 z-10" />
    </div>
  );
});
