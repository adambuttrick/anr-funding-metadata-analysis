'use client';

import { useState, useEffect, useRef, useTransition, useCallback } from 'react';

interface ChartAnimationOptions {
  data: Array<{date: string; value: number}>;
  startYear: number;
  endYear: number;
  onFetchData?: () => void;
}

type TransitionPhase = 'idle' | 'prepare' | 'fade-out' | 'animating' | 'fade-in';

function cubicBezier(t: number, p1x: number, p1y: number, p2x: number, p2y: number): number {
  const cx = 3 * p1x;
  const bx = 3 * (p2x - p1x) - cx;
  const ax = 1 - cx - bx;
  
  const cy = 3 * p1y;
  const by = 3 * (p2y - p1y) - cy;
  const ay = 1 - cy - by;
  
  function sampleCurveX(t: number): number {
    return ((ax * t + bx) * t + cx) * t;
  }
  
  function sampleCurveY(t: number): number {
    return ((ay * t + by) * t + cy) * t;
  }
  
  function solveCurveX(x: number, epsilon = 0.0001): number {
    let t0 = 0;
    let t1 = 1;
    let t2 = x;
    
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    
    for (let i = 0; i < 8; i++) {
      const x2 = sampleCurveX(t2);
      if (Math.abs(x2 - x) < epsilon) return t2;
      
      const d2 = (3 * ax * t2 + 2 * bx) * t2 + cx;
      if (Math.abs(d2) < 1e-6) break;
      
      t2 = t2 - (x2 - x) / d2;
    }
    
    while (t0 < t1) {
      const x2 = sampleCurveX(t2);
      if (Math.abs(x2 - x) < epsilon) return t2;
      
      if (x > x2) t0 = t2;
      else t1 = t2;
      
      t2 = (t1 - t0) * 0.5 + t0;
    }
    
    return t2;
  }
  
  return sampleCurveY(solveCurveX(t));
}

function customEaseOut(t: number): number {
  return cubicBezier(t, 0.33, 0, 0.67, 1);
}

export function useChartAnimation({
  data,
  startYear,
  endYear,
  onFetchData
}: ChartAnimationOptions) {
  const [, startTransition] = useTransition();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [prevData, setPrevData] = useState<Array<{date: string; value: number}>>([]);
  const [displayData, setDisplayData] = useState<Array<{date: string; value: number}>>(data);
  const [transitionPhase, setTransitionPhase] = useState<TransitionPhase>('idle');
  const prevDateRange = useRef<{start: number; end: number} | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const dataRef = useRef(data);
  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const getDataMapping = useCallback((oldData: typeof data, newData: typeof data) => {
    const mapping = new Map<string, {oldIndex: number | null, newIndex: number | null}>();
    
    oldData.forEach((item, index) => {
      mapping.set(item.date, { oldIndex: index, newIndex: null });
    });
    
    newData.forEach((item, index) => {
      const existing = mapping.get(item.date);
      if (existing) {
        existing.newIndex = index;
      } else {
        mapping.set(item.date, { oldIndex: null, newIndex: index });
      }
    });
    
    return mapping;
  }, []);

  const cancelAnimations = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    if (transitionTimeoutRef.current !== null) {
      clearTimeout(transitionTimeoutRef.current);
      transitionTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    cancelAnimations();
    
    const currentDateRange = `${startYear}-${endYear}`;
    const previousDateRange = prevDateRange.current ? `${prevDateRange.current.start}-${prevDateRange.current.end}` : null;
    
    if (previousDateRange && currentDateRange !== previousDateRange && prevData.length > 0) {
      setTransitionPhase('prepare');
      setIsTransitioning(true);
      
      transitionTimeoutRef.current = setTimeout(() => {
        setTransitionPhase('fade-out');
        
        const currentData = [...dataRef.current];
        setPrevData(currentData);
        
        transitionTimeoutRef.current = setTimeout(() => {
          startTransition(() => {
            if (onFetchData) {
              onFetchData();
            }
          });
          
          transitionTimeoutRef.current = setTimeout(() => {
          setTransitionPhase('animating');
          
          const dataMapping = getDataMapping(currentData, dataRef.current);
          
          let startTime: number | null = null;
          const duration = 750;
          
          const animateValues = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const elapsed = timestamp - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const eased = customEaseOut(progress);
            
            const interpolated = dataRef.current.map((item) => {
              const mapping = dataMapping.get(item.date);
              const oldIndex = mapping?.oldIndex;
              
              if (oldIndex !== null && oldIndex !== undefined) {
                const oldItem = currentData[oldIndex];
                return {
                  date: item.date,
                  value: oldItem.value + (item.value - oldItem.value) * eased
                };
              } else {
                return {
                  date: item.date,
                  value: item.value * eased
                };
              }
            });
            
            setDisplayData(interpolated);
            
            if (progress < 1) {
              animationFrameRef.current = requestAnimationFrame(animateValues);
            } else {
              animationFrameRef.current = null;
              setDisplayData(dataRef.current);
              setTransitionPhase('fade-in');
              
              transitionTimeoutRef.current = setTimeout(() => {
                setTransitionPhase('idle');
                setIsTransitioning(false);
              }, 200);
            }
          };
          
          animationFrameRef.current = requestAnimationFrame(animateValues);
        }, 200);
      }, 150);
    }, 100);
    } else {
      setDisplayData(data);
      
      if (!previousDateRange && onFetchData) {
        onFetchData();
      }
    }
    
    prevDateRange.current = { start: startYear, end: endYear };
    
    return cancelAnimations;
  }, [startYear, endYear, data, onFetchData, prevData, cancelAnimations, getDataMapping]);
  
  useEffect(() => {
    return cancelAnimations;
  }, [cancelAnimations]);

  return {
    displayData,
    isTransitioning,
    transitionPhase
  };
}
