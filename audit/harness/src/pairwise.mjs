import { axes } from "./config.mjs";

export function stateKey(state) {
  return [state.theme, state.face, state.scale, state.shape].join("-");
}

export function allStates() {
  const states = [];
  for (const theme of axes.theme) {
    for (const face of axes.face) {
      for (const scale of axes.scale) {
        for (const shape of axes.shape) {
          states.push({ theme, face, scale, shape });
        }
      }
    }
  }
  return states;
}

const axisNames = Object.freeze(Object.keys(axes));

function pairKey(leftAxis, leftValue, rightAxis, rightValue) {
  return `${leftAxis}=${leftValue}|${rightAxis}=${rightValue}`;
}

export function allRequiredPairs() {
  const pairs = new Set();
  axisNames.forEach((leftAxis, leftIndex) => {
    axisNames.slice(leftIndex + 1).forEach((rightAxis) => {
      axes[leftAxis].forEach((leftValue) => {
        axes[rightAxis].forEach((rightValue) => {
          pairs.add(pairKey(leftAxis, leftValue, rightAxis, rightValue));
        });
      });
    });
  });
  return pairs;
}

export function pairsCoveredBy(state) {
  const pairs = new Set();
  axisNames.forEach((leftAxis, leftIndex) => {
    axisNames.slice(leftIndex + 1).forEach((rightAxis) => {
      pairs.add(pairKey(leftAxis, state[leftAxis], rightAxis, state[rightAxis]));
    });
  });
  return pairs;
}

export function buildPairwiseStates() {
  const candidates = allStates();
  const uncovered = allRequiredPairs();
  const chosen = [];

  while (uncovered.size) {
    let best = null;
    let bestCoverage = -1;
    for (const candidate of candidates) {
      if (chosen.some((state) => stateKey(state) === stateKey(candidate))) continue;
      let coverage = 0;
      for (const pair of pairsCoveredBy(candidate)) {
        if (uncovered.has(pair)) coverage += 1;
      }
      if (coverage > bestCoverage) {
        best = candidate;
        bestCoverage = coverage;
      }
    }
    if (!best || bestCoverage <= 0) {
      throw new Error(`pairwise generator stalled with ${uncovered.size} uncovered pairs`);
    }
    chosen.push(best);
    for (const pair of pairsCoveredBy(best)) uncovered.delete(pair);
  }

  return chosen;
}

export function verifyPairwise(states) {
  const missing = allRequiredPairs();
  states.forEach((state) => {
    pairsCoveredBy(state).forEach((pair) => missing.delete(pair));
  });
  return { valid: missing.size === 0, missing: [...missing].sort() };
}
