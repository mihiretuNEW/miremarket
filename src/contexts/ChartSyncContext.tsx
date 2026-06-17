import React, { createContext, useContext, useRef, useCallback, useEffect } from 'react';
import { IChartApi, LogicalRange, ISeriesApi } from 'lightweight-charts';

type SyncContextType = {
  registerChart: (id: string, chart: IChartApi, series: ISeriesApi<any>) => void;
  unregisterChart: (id: string) => void;
};

const ChartSyncContext = createContext<SyncContextType | null>(null);

export function ChartSyncProvider({ children }: { children: React.ReactNode }) {
  const charts = useRef<Map<string, { chart: IChartApi, series: ISeriesApi<any> }>>(new Map());
  const isSyncingTimeScale = useRef(false);
  const isSyncingCrosshair = useRef(false);

  const registerChart = useCallback((id: string, chart: IChartApi, series: ISeriesApi<any>) => {
    charts.current.set(id, { chart, series });

    // Sync TimeScale (Zoom and Pan)
    const timeScaleHandler = (logicalRange: LogicalRange | null) => {
      if (!logicalRange || isSyncingTimeScale.current) return;
      isSyncingTimeScale.current = true;
      
      charts.current.forEach(({ chart: otherChart }, otherId) => {
        if (otherId !== id) {
          otherChart.timeScale().setVisibleLogicalRange(logicalRange);
        }
      });
      
      // Allow the next sync event on the next microtask or sync
      setTimeout(() => {
        isSyncingTimeScale.current = false;
      }, 0);
    };

    chart.timeScale().subscribeVisibleLogicalRangeChange(timeScaleHandler);
    
    // Sync crosshair
    const crosshairHandler = (param: any) => {
       if (isSyncingCrosshair.current) return;
       isSyncingCrosshair.current = true;

       if (param.time === undefined || param.point === undefined || param.point.x < 0 || param.point.y < 0) {
         // Clear crosshair
         charts.current.forEach(({ chart: otherChart }, otherId) => {
            if (otherId !== id) {
              otherChart.clearCrosshairPosition();
            }
         });
       } else {
         // Set crosshair
         charts.current.forEach(({ chart: otherChart, series: otherSeries }, otherId) => {
           if (otherId !== id) {
              // We just set price to 0 or whatever, we mainly want time sync for vertical line
              // To make it look perfectly normal, we can use the time and the other series
              otherChart.setCrosshairPosition(0, param.time, otherSeries);
           }
         });
       }

       setTimeout(() => {
           isSyncingCrosshair.current = false;
       }, 0);
    };

    chart.subscribeCrosshairMove(crosshairHandler);

    // Store handlers on chart object to manage unsubscription later if needed
    (chart as any).__syncTimeScaleHandler = timeScaleHandler;
    (chart as any).__syncCrosshairHandler = crosshairHandler;

  }, []);

  const unregisterChart = useCallback((id: string) => {
    const entry = charts.current.get(id);
    if (entry) {
      const { chart } = entry;
      if ((chart as any).__syncTimeScaleHandler) {
        chart.timeScale().unsubscribeVisibleLogicalRangeChange((chart as any).__syncTimeScaleHandler);
      }
      if ((chart as any).__syncCrosshairHandler) {
        chart.unsubscribeCrosshairMove((chart as any).__syncCrosshairHandler);
      }
      charts.current.delete(id);
    }
  }, []);

  return (
    <ChartSyncContext.Provider value={{ registerChart, unregisterChart }}>
      {children}
    </ChartSyncContext.Provider>
  );
}

export const useChartSync = () => {
  const ctx = useContext(ChartSyncContext);
  if (!ctx) throw new Error('useChartSync must be used inside ChartSyncProvider');
  return ctx;
};
