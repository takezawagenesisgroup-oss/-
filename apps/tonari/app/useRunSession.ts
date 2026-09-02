import { useCallback, useRef, useState } from 'react';
import * as Location from 'expo-location';
import type { TriggerType } from './personas';

export type TriggerEvent = {
  trigger: TriggerType;
  km?: number;
  paceMinPerKm?: number;
  min?: number;
};

export type RunMetrics = {
  distanceKm: number;
  elapsedSec: number;
  currentPaceMinPerKm: number | null;
  avgPaceMinPerKm: number | null;
};

export type SessionState = 'idle' | 'running' | 'finished';
export type ActivityMode = 'run' | 'walk';

// ランとウォークではペースの絶対値も変化の出方も違うため、マイルストーンの
// 刻み幅と「ペースが変わった」と判定する閾値をモードごとに変える。
const MODE_CONFIG: Record<ActivityMode, { distanceStepKm: number; paceDeltaMinPerKm: number }> = {
  run: { distanceStepKm: 1, paceDeltaMinPerKm: 0.5 }, // 1kmごと、約30秒/kmの変化で反応
  walk: { distanceStepKm: 0.5, paceDeltaMinPerKm: 0.3 }, // 0.5kmごと、約18秒/kmの変化で反応
};
const LONG_PAUSE_SEC = 45;
const TIME_STEP_SEC = 300; // 5分ごと
const MOVING_SPEED_THRESHOLD_MPS = 0.4;

// デモ再生用のキーフレーム(累積秒, 累積km)。区間ごとの傾きから疑似ペースを作る。
// 0-6分: ウォームアップ / 6-10分: 少し落ちる / 10-15分: 持ち直す / 15-25分: 中盤〜終盤
const DEMO_KEYFRAMES: Array<[number, number]> = [
  [0, 0],
  [360, 1.0],
  [600, 1.5],
  [900, 2.5],
  [1200, 3.3],
  [1500, 4.0],
];
const DEMO_SPEED_MULTIPLIER = 20; // 実時間1秒 = シミュレーション20秒(約75秒でフルラン体験できる)
// デモの累積距離をモードに応じて縮尺し、ウォーキングでは現実的なペース(平均約13分/km)になるようにする
const DEMO_DISTANCE_SCALE: Record<ActivityMode, number> = { run: 1, walk: 0.48 };

function haversineMeters(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const R = 6371000;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function demoDistanceAtSec(simSec: number): number {
  if (simSec <= DEMO_KEYFRAMES[0][0]) return DEMO_KEYFRAMES[0][1];
  for (let i = 1; i < DEMO_KEYFRAMES.length; i++) {
    const [t0, d0] = DEMO_KEYFRAMES[i - 1];
    const [t1, d1] = DEMO_KEYFRAMES[i];
    if (simSec <= t1) {
      const ratio = (simSec - t0) / (t1 - t0);
      return d0 + (d1 - d0) * ratio;
    }
  }
  return DEMO_KEYFRAMES[DEMO_KEYFRAMES.length - 1][1];
}

export function useRunSession(onTrigger: (event: TriggerEvent) => void) {
  const [state, setState] = useState<SessionState>('idle');
  const [metrics, setMetrics] = useState<RunMetrics>({
    distanceKm: 0,
    elapsedSec: 0,
    currentPaceMinPerKm: null,
    avgPaceMinPerKm: null,
  });
  const [targetDistanceKm, setTargetDistanceKm] = useState<number | null>(3);
  const [activityMode, setActivityMode] = useState<ActivityMode>('run');
  const [permissionDenied, setPermissionDenied] = useState(false);

  const startTsRef = useRef<number>(0);
  const lastLocationRef = useRef<{ latitude: number; longitude: number } | null>(null);
  const lastSampleTsRef = useRef<number>(0);
  const distanceRef = useRef(0);
  const smoothedPaceRef = useRef<number | null>(null);
  const lastDistanceMilestoneRef = useRef(0);
  const lastTimeMilestoneRef = useRef(0);
  const movingSinceRef = useRef<number | null>(null);
  const stillSinceRef = useRef<number | null>(null);
  const longPauseFiredRef = useRef(false);
  const midpointFiredRef = useRef(false);
  const nearFinishFiredRef = useRef(false);
  const locationSubRef = useRef<Location.LocationSubscription | null>(null);
  const demoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const demoSimSecRef = useRef(0);

  const resetRefs = useCallback(() => {
    startTsRef.current = Date.now();
    lastLocationRef.current = null;
    lastSampleTsRef.current = Date.now();
    distanceRef.current = 0;
    smoothedPaceRef.current = null;
    lastDistanceMilestoneRef.current = 0;
    lastTimeMilestoneRef.current = 0;
    movingSinceRef.current = null;
    stillSinceRef.current = null;
    longPauseFiredRef.current = false;
    midpointFiredRef.current = false;
    nearFinishFiredRef.current = false;
    demoSimSecRef.current = 0;
  }, []);

  const evaluate = useCallback(
    (distanceKm: number, elapsedSec: number, instantSpeedMps: number | null) => {
      const { distanceStepKm, paceDeltaMinPerKm } = MODE_CONFIG[activityMode];
      const avgPace = distanceKm > 0.02 ? elapsedSec / 60 / distanceKm : null;
      const instantPace = instantSpeedMps && instantSpeedMps > 0.15 ? 1000 / instantSpeedMps / 60 : null;
      const currentPace = instantPace ?? avgPace;

      setMetrics({ distanceKm, elapsedSec, currentPaceMinPerKm: currentPace, avgPaceMinPerKm: avgPace });

      // 距離マイルストーン
      const flooredKm = Math.floor(distanceKm / distanceStepKm) * distanceStepKm;
      if (flooredKm > lastDistanceMilestoneRef.current) {
        lastDistanceMilestoneRef.current = flooredKm;
        onTrigger({ trigger: 'distance', km: flooredKm, paceMinPerKm: currentPace ?? undefined });
      }

      // 時間マイルストーン
      const flooredTimeUnit = Math.floor(elapsedSec / TIME_STEP_SEC);
      if (flooredTimeUnit > lastTimeMilestoneRef.current && flooredTimeUnit > 0) {
        lastTimeMilestoneRef.current = flooredTimeUnit;
        onTrigger({ trigger: 'time', min: (flooredTimeUnit * TIME_STEP_SEC) / 60 });
      }

      // ペース変化(ウォームアップ中=最初の90秒は判定しない)
      if (currentPace !== null && elapsedSec > 90) {
        if (smoothedPaceRef.current === null) {
          smoothedPaceRef.current = currentPace;
        } else {
          const prev = smoothedPaceRef.current;
          const delta = currentPace - prev; // 負 = 速くなった(分/kmが減った)
          if (delta <= -paceDeltaMinPerKm) {
            onTrigger({ trigger: 'paceUp', paceMinPerKm: currentPace });
            smoothedPaceRef.current = currentPace;
          } else if (delta >= paceDeltaMinPerKm) {
            onTrigger({ trigger: 'paceDown', paceMinPerKm: currentPace });
            smoothedPaceRef.current = currentPace;
          } else {
            smoothedPaceRef.current = prev * 0.7 + currentPace * 0.3;
          }
        }
      }

      // 長時間停止
      const isMoving = (instantSpeedMps ?? 999) > MOVING_SPEED_THRESHOLD_MPS;
      const now = Date.now();
      if (isMoving) {
        stillSinceRef.current = null;
        longPauseFiredRef.current = false;
      } else {
        if (stillSinceRef.current === null) stillSinceRef.current = now;
        const stillForSec = (now - stillSinceRef.current) / 1000;
        if (stillForSec >= LONG_PAUSE_SEC && !longPauseFiredRef.current) {
          longPauseFiredRef.current = true;
          onTrigger({ trigger: 'longPause' });
        }
      }

      // 目標距離に対する中間・ラストスパート・ゴール
      if (targetDistanceKm && targetDistanceKm > 0) {
        if (!midpointFiredRef.current && distanceKm >= targetDistanceKm / 2) {
          midpointFiredRef.current = true;
          onTrigger({ trigger: 'midpoint', km: distanceKm });
        }
        if (!nearFinishFiredRef.current && distanceKm >= targetDistanceKm * 0.9) {
          nearFinishFiredRef.current = true;
          onTrigger({ trigger: 'nearFinish', km: distanceKm });
        }
        if (distanceKm >= targetDistanceKm) {
          onTrigger({ trigger: 'finish', km: distanceKm, min: Math.round(elapsedSec / 60) });
          return true; // finished
        }
      }
      return false;
    },
    [onTrigger, targetDistanceKm, activityMode]
  );

  const stopTimers = useCallback(() => {
    if (locationSubRef.current) {
      locationSubRef.current.remove();
      locationSubRef.current = null;
    }
    if (demoTimerRef.current) {
      clearInterval(demoTimerRef.current);
      demoTimerRef.current = null;
    }
  }, []);

  const finish = useCallback(() => {
    stopTimers();
    setState('finished');
    onTrigger({ trigger: 'finish', km: distanceRef.current, min: Math.round((Date.now() - startTsRef.current) / 60000) });
  }, [onTrigger, stopTimers]);

  const startDemo = useCallback(() => {
    resetRefs();
    setState('running');
    onTrigger({ trigger: 'start' });
    const scale = DEMO_DISTANCE_SCALE[activityMode];
    demoTimerRef.current = setInterval(() => {
      const prevSimSec = demoSimSecRef.current;
      const nextSimSec = prevSimSec + 0.5 * DEMO_SPEED_MULTIPLIER;
      demoSimSecRef.current = nextSimSec;
      const prevKm = demoDistanceAtSec(prevSimSec) * scale;
      const nextKm = demoDistanceAtSec(nextSimSec) * scale;
      const deltaKm = Math.max(0, nextKm - prevKm);
      const instantSpeedMps = (deltaKm * 1000) / (nextSimSec - prevSimSec || 1);
      const finished = evaluate(nextKm, nextSimSec, instantSpeedMps);
      if (finished || nextSimSec >= DEMO_KEYFRAMES[DEMO_KEYFRAMES.length - 1][0]) {
        stopTimers();
        setState('finished');
      }
    }, 500);
  }, [evaluate, onTrigger, resetRefs, stopTimers, activityMode]);

  const startGps = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setPermissionDenied(true);
      return;
    }
    setPermissionDenied(false);
    resetRefs();
    setState('running');
    onTrigger({ trigger: 'start' });
    locationSubRef.current = await Location.watchPositionAsync(
      { accuracy: Location.LocationAccuracy.BestForNavigation, timeInterval: 2000, distanceInterval: 3 },
      (location) => {
        const { latitude, longitude, speed } = location.coords;
        const now = location.timestamp || Date.now();
        if (lastLocationRef.current) {
          const meters = haversineMeters(lastLocationRef.current, { latitude, longitude });
          // GPSのふらつきによる誤差(数メートル)を無視
          if (meters > 1.5) {
            distanceRef.current += meters;
          }
        }
        lastLocationRef.current = { latitude, longitude };
        const elapsedSec = (now - startTsRef.current) / 1000;
        const finished = evaluate(distanceRef.current / 1000, elapsedSec, speed);
        if (finished) {
          stopTimers();
          setState('finished');
        }
      }
    );
  }, [evaluate, onTrigger, resetRefs, stopTimers]);

  const stop = useCallback(() => {
    if (state === 'running') finish();
  }, [finish, state]);

  const reset = useCallback(() => {
    stopTimers();
    setState('idle');
    setMetrics({ distanceKm: 0, elapsedSec: 0, currentPaceMinPerKm: null, avgPaceMinPerKm: null });
  }, [stopTimers]);

  return {
    state,
    metrics,
    targetDistanceKm,
    setTargetDistanceKm,
    activityMode,
    setActivityMode,
    permissionDenied,
    startDemo,
    startGps,
    stop,
    reset,
  };
}
