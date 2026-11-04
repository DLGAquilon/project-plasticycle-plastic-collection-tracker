import { round2 } from "./security.js";
import { addDays } from "./time.js";

function round2Local(value) {
  return round2(value);
}

export function forecastWeekly(points, horizon = 8) {
  const history = Array.isArray(points) ? points : [];
  if (history.length < 4) {
    return {
      status: "insufficient",
      model: "linear-regression",
      have: history.length,
      needed: 4,
      historyTail: history,
      projection: [],
      nextEightKilos: 0,
    };
  }

  const xs = history.map((_, index) => index);
  const ys = history.map((point) => point.kilos);
  const count = history.length;
  const meanX = xs.reduce((sum, value) => sum + value, 0) / count;
  const meanY = ys.reduce((sum, value) => sum + value, 0) / count;
  let numerator = 0;
  let denominator = 0;
  for (let index = 0; index < count; index += 1) {
    numerator += (xs[index] - meanX) * (ys[index] - meanY);
    denominator += (xs[index] - meanX) ** 2;
  }
  const slope = denominator === 0 ? 0 : numerator / denominator;
  const intercept = meanY - slope * meanX;

  let residualSum = 0;
  let totalSum = 0;
  for (let index = 0; index < count; index += 1) {
    const predicted = intercept + slope * xs[index];
    residualSum += (ys[index] - predicted) ** 2;
    totalSum += (ys[index] - meanY) ** 2;
  }
  const r2 = totalSum === 0 ? 1 : 1 - residualSum / totalSum;
  const sigma = Math.sqrt(residualSum / Math.max(1, count - 2));
  const lastWeek = history[count - 1].weekStart;
  const projection = [];
  for (let step = 1; step <= horizon; step += 1) {
    const expected = Math.max(0, intercept + slope * (count - 1 + step));
    projection.push({
      weekStart: addDays(lastWeek, step * 7),
      kilos: round2Local(expected),
      low: round2Local(Math.max(0, expected - 1.96 * sigma)),
      high: round2Local(expected + 1.96 * sigma),
    });
  }

  return {
    status: "ok",
    model: "linear-regression",
    have: count,
    needed: 4,
    r2: round2Local(r2),
    weeklyChange: round2Local(slope),
    sigma: round2Local(sigma),
    historyTail: history.slice(-12),
    projection,
    nextEightKilos: round2Local(projection.reduce((sum, point) => sum + point.kilos, 0)),
  };
}
