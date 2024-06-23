export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function unlerp(a: number, b: number, value: number) {
  return (value - a) / (b - a);
}

export function map(value: number, a: number, b: number, c: number, d: number) {
  return ((value - a) / (b - a)) * (d - c) + c;
}

export function saturate(value: number) {
  return Math.max(0, Math.min(1, value));
}

export function step(value: number, step: number) {
  return value < step ? 0 : 1;
}

export function smoothstep(value: number, a: number, b: number) {
  const t = clamp((value - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}

export function smootherstep(value: number, a: number, b: number) {
  const t = clamp((value - a) / (b - a), 0, 1);
  return t * t * t * (t * (t * 6 - 15) + 10);
}

export function modulo(value: number, mod: number) {
  return ((value % mod) + mod) % mod;
}

export const PI = Math.PI;
export const TAU = PI * 2;

export namespace angles {
  export const DEG = 180 / PI;
  export const RAD = PI / 180;

  export function deg(angle: number) {
    return angle * DEG;
  }

  export function rad(angle: number) {
    return angle * RAD;
  }

  export function normalize(angle: number) {
    return modulo(angle, TAU);
  }

  export function delta(delta: number) {
    return normalize(delta + PI) - PI;
  }

  export function sub(a: number, b: number) {
    return delta(a - b);
  }

  export function add(a: number, b: number) {
    return normalize(a + b);
  }

  export function lerp(a: number, b: number, t: number) {
    return add(b, sub(a, b) * t);
  }

  export function unlerp(a: number, b: number, value: number) {
    return sub(value, b) / sub(a, b);
  }

  export function map(
    value: number,
    a: number,
    b: number,
    c: number,
    d: number
  ) {
    return add((sub(value, a) / sub(b, a)) * sub(d, c), c);
  }

  export function from(x: number, y: number) {
    return Math.atan2(y, x);
  }
}
