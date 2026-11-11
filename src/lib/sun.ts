/**
 * Sonnenuntergang für den Standort (NOAA-Näherung, Genauigkeit etwa ±2 Minuten).
 * Eine rein astronomische Angabe – sie sagt nichts über Öffnungszeiten aus.
 */
const RAD = Math.PI / 180;

function sunEventUtcMinutes(dayStartUtc: number, lat: number, lon: number, zenith: number, rising: boolean): number | null {
  const jd = dayStartUtc / 86_400_000 + 2440587.5;
  const t = (jd - 2451545) / 36525;
  const l0 = (280.46646 + t * (36000.76983 + t * 0.0003032)) % 360;
  const m = 357.52911 + t * (35999.05029 - 0.0001537 * t);
  const e = 0.016708634 - t * (0.000042037 + 0.0000001267 * t);
  const c =
    Math.sin(m * RAD) * (1.914602 - t * (0.004817 + 0.000014 * t)) +
    Math.sin(2 * m * RAD) * (0.019993 - 0.000101 * t) +
    Math.sin(3 * m * RAD) * 0.000289;
  const omega = 125.04 - 1934.136 * t;
  const lambda = l0 + c - 0.00569 - 0.00478 * Math.sin(omega * RAD);
  const eps0 = 23 + (26 + (21.448 - t * (46.815 + t * (0.00059 - t * 0.001813))) / 60) / 60;
  const eps = eps0 + 0.00256 * Math.cos(omega * RAD);
  const decl = Math.asin(Math.sin(eps * RAD) * Math.sin(lambda * RAD)) / RAD;
  const y = Math.tan((eps / 2) * RAD) ** 2;
  const eqTime =
    4 *
    (y * Math.sin(2 * l0 * RAD) -
      2 * e * Math.sin(m * RAD) +
      4 * e * y * Math.sin(m * RAD) * Math.cos(2 * l0 * RAD) -
      0.5 * y * y * Math.sin(4 * l0 * RAD) -
      1.25 * e * e * Math.sin(2 * m * RAD)) /
    RAD;
  const cosH = Math.cos(zenith * RAD) / (Math.cos(lat * RAD) * Math.cos(decl * RAD)) - Math.tan(lat * RAD) * Math.tan(decl * RAD);
  if (cosH < -1 || cosH > 1) return null;
  const hourAngle = Math.acos(cosH) / RAD;
  return 720 - 4 * (lon + (rising ? hourAngle : -hourAngle)) - eqTime;
}

function sunEvent(date: string, lat: number, lon: number, zenith: number, rising: boolean): Date | null {
  const dayStart = Date.parse(`${date}T00:00:00Z`);
  if (!Number.isFinite(dayStart)) return null;
  // Zwei Durchläufe: erst grob (Mittag), dann am gefundenen Zeitpunkt verfeinern.
  let minutes = sunEventUtcMinutes(dayStart + 12 * 3_600_000, lat, lon, zenith, rising);
  if (minutes === null) return null;
  minutes = sunEventUtcMinutes(dayStart + minutes * 60_000, lat, lon, zenith, rising) ?? minutes;
  return new Date(dayStart + Math.round(minutes) * 60_000);
}

/** Sonnenuntergang (obere Sonnenkante am Horizont, inkl. Refraktion) am Kalendertag YYYY-MM-DD. */
export const sunset = (date: string, lat: number, lon: number): Date | null => sunEvent(date, lat, lon, 90.833, false);
export const sunrise = (date: string, lat: number, lon: number): Date | null => sunEvent(date, lat, lon, 90.833, true);
/** Ende der bürgerlichen Dämmerung („blaue Stunde“ endet). */
export const civilDusk = (date: string, lat: number, lon: number): Date | null => sunEvent(date, lat, lon, 96, false);

export type SkyPhase = 'day' | 'golden' | 'dusk' | 'night';

/** Grobe Tagesphase für die Himmelsstimmung der Startseite. */
export function skyPhase(now: Date, date: string, lat: number, lon: number): SkyPhase {
  const rise = sunrise(date, lat, lon);
  const set = sunset(date, lat, lon);
  const dusk = civilDusk(date, lat, lon);
  if (!rise || !set || !dusk) return 'night';
  const time = now.getTime();
  if (time < rise.getTime()) return 'night';
  if (time < set.getTime() - 60 * 60_000) return 'day';
  if (time < set.getTime()) return 'golden';
  if (time < dusk.getTime()) return 'dusk';
  return 'night';
}
