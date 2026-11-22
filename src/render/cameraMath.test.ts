import { describe, expect, it } from 'vitest';
import { CAMERA } from '../config';
import { type CameraBounds, stepCamera } from './cameraMath';

const B: CameraBounds = { viewHalfW: 20, viewHalfH: 11.25, worldHalfL: 58.5, worldHalfW: 40 };
const DT = 1 / 60;

describe('stepCamera', () => {
  it('목표가 데드존 안이면 움직이지 않는다', () => {
    const cam = { x: 0, y: 0 };
    stepCamera(cam, CAMERA.DEADZONE_X * 0.9, -CAMERA.DEADZONE_Y * 0.9, DT, B);
    expect(cam).toEqual({ x: 0, y: 0 });
  });

  it('데드존 밖 목표는 부드럽게 따라가 데드존 경계에 멈춘다', () => {
    const cam = { x: 0, y: 0 };
    stepCamera(cam, 10, 0, DT, B);
    expect(cam.x).toBeGreaterThan(0);
    expect(cam.x).toBeLessThan(1);
    for (let i = 0; i < 600; i++) stepCamera(cam, 10, 0, DT, B);
    expect(cam.x).toBeCloseTo(10 - CAMERA.DEADZONE_X, 3);
  });

  it('프레임레이트가 달라도 같은 시간 뒤 위치가 거의 같다', () => {
    const a = { x: 0, y: 0 };
    const b = { x: 0, y: 0 };
    for (let i = 0; i < 60; i++) stepCamera(a, 15, 0, 1 / 60, B);
    for (let i = 0; i < 144; i++) stepCamera(b, 15, 0, 1 / 144, B);
    expect(a.x).toBeCloseTo(b.x, 6);
  });

  it('월드 밖이 보이지 않게 자른다', () => {
    const cam = { x: 0, y: 0 };
    for (let i = 0; i < 600; i++) stepCamera(cam, 100, 100, DT, B);
    expect(cam.x).toBeCloseTo(B.worldHalfL - B.viewHalfW);
    expect(cam.y).toBeCloseTo(B.worldHalfW - B.viewHalfH);
  });

  it('화면이 월드보다 크면 가운데에 둔다', () => {
    const cam = { x: 5, y: 5 };
    stepCamera(cam, 50, 50, DT, { ...B, viewHalfW: 100, viewHalfH: 100 });
    expect(cam).toEqual({ x: 0, y: 0 });
  });
});
