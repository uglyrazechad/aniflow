import type { RoomState } from '../types';

export interface PlaybackTarget {
  /** Позиция, на которой должен быть плеер прямо сейчас. */
  position: number;
  /** Скорость контента, которую задал хост. */
  rate: number;
  paused: boolean;
}

/** Поправка на расхождение часов устройства и сервера (мс). */
export function clockSkew(serverTime: number, receivedAt = Date.now()): number {
  return serverTime - receivedAt;
}

/**
 * Позиция «по серверу» с учётом прошедшего времени.
 * Сервер — источник истины, клиент только экстраполирует.
 */
export function targetPosition(state: RoomState, skew: number, now = Date.now()): PlaybackTarget {
  const rate = state.playbackRate && state.playbackRate > 0 ? state.playbackRate : 1;
  const elapsed = state.paused ? 0 : Math.max(0, (now + skew - state.serverTime) / 1000);
  return {
    position: Math.max(0, state.time + elapsed * rate),
    rate,
    paused: state.paused,
  };
}

export interface Correction {
  /** Нужен жёсткий переход (расхождение больше 0.5 с). */
  seekTo: number | null;
  /** Скорость, которую надо выставить плееру. */
  rate: number;
}

/**
 * Плавная коррекция: маленькое расхождение гасим скоростью ±2 %,
 * большое — перемоткой, чтобы не тянуть дрейф минутами.
 */
export function correctDrift(actual: number, target: number, baseRate: number): Correction {
  const diff = target - actual;

  if (Math.abs(diff) > 0.5) {
    return { seekTo: target, rate: baseRate };
  }
  if (Math.abs(diff) > 0.15) {
    return { seekTo: null, rate: baseRate * (diff > 0 ? 1.02 : 0.98) };
  }
  return { seekTo: null, rate: baseRate };
}

/** Позиция для гостя, который только что подключился: сразу к серверной точке. */
export function initialPosition(state: RoomState, skew: number): number {
  return targetPosition(state, skew).position;
}
