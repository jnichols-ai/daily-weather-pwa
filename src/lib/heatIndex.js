// NWS Rothfusz regression for heat index, in Fahrenheit / percent relative humidity.
// Reference: https://www.wpc.ncep.noaa.gov/html/heatindex_equation.shtml
//
// Below 80F the "heat index" isn't really a distinct quantity from air temp, so NWS
// just reports the air temperature itself in that range. We mirror that behavior.
export function calcHeatIndex(tempF, relHumidityPct) {
  if (tempF == null || relHumidityPct == null) return null;

  const T = tempF;
  const R = relHumidityPct;

  if (T < 80) return Math.round(T);

  let hi =
    -42.379 +
    2.04901523 * T +
    10.14333127 * R -
    0.22475541 * T * R -
    0.00683783 * T * T -
    0.05481717 * R * R +
    0.00122874 * T * T * R +
    0.00085282 * T * R * R -
    0.00000199 * T * T * R * R;

  // Low relative humidity adjustment
  if (R < 13 && T >= 80 && T <= 112) {
    const adjustment = ((13 - R) / 4) * Math.sqrt((17 - Math.abs(T - 95)) / 17);
    hi -= adjustment;
  }

  // High relative humidity adjustment
  if (R > 85 && T >= 80 && T <= 87) {
    const adjustment = ((R - 85) / 10) * ((87 - T) / 5);
    hi += adjustment;
  }

  return Math.round(hi);
}
