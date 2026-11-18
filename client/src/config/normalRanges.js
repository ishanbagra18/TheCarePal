export const NORMAL_RANGES = {
  bp: {
    label: 'Blood Pressure',
    unit: 'mmHg',
    systolic: { min: 90, max: 140 },
    diastolic: { min: 60, max: 90 },
  },
  pulse: {
    label: 'Pulse Rate',
    unit: 'bpm',
    min: 60,
    max: 100,
  },
  spo2: {
    label: 'Blood Oxygen (SpO2)',
    unit: '%',
    min: 95,
    max: 100,
  },
  sugar: {
    label: 'Blood Sugar (Fasting)',
    unit: 'mg/dL',
    min: 70,
    max: 140,
  },
  temp: {
    label: 'Temperature',
    unit: '°C',
    min: 36.1,
    max: 37.5,
  },
  weight: {
    label: 'Weight',
    unit: 'kg',
    hasBand: false,
  }
};

export function checkVitalRange(type, value, value2 = null) {
  const numVal = Number(value);
  if (isNaN(numVal) || value === '' || value === null) return { isOutOfRange: false };

  switch (type) {
    case 'bp': {
      const sysRange = NORMAL_RANGES.bp.systolic;
      const diaRange = NORMAL_RANGES.bp.diastolic;
      const numVal2 = value2 !== null && value2 !== '' ? Number(value2) : null;

      let isOutOfRange = false;
      const reasons = [];

      if (numVal < sysRange.min) {
        isOutOfRange = true;
        reasons.push(`Low systolic (${numVal} < ${sysRange.min})`);
      } else if (numVal > sysRange.max) {
        isOutOfRange = true;
        reasons.push(`High systolic (${numVal} > ${sysRange.max})`);
      }

      if (numVal2 !== null && !isNaN(numVal2)) {
        if (numVal2 < diaRange.min) {
          isOutOfRange = true;
          reasons.push(`Low diastolic (${numVal2} < ${diaRange.min})`);
        } else if (numVal2 > diaRange.max) {
          isOutOfRange = true;
          reasons.push(`High diastolic (${numVal2} > ${diaRange.max})`);
        }
      }

      return {
        isOutOfRange,
        reason: reasons.join(', ') || undefined,
        severity: isOutOfRange ? (numVal > sysRange.max || (numVal2 && numVal2 > diaRange.max) ? 'high' : 'low') : undefined
      };
    }

    case 'pulse': {
      const range = NORMAL_RANGES.pulse;
      if (numVal < range.min) return { isOutOfRange: true, reason: `Low Pulse (< ${range.min} bpm)`, severity: 'low' };
      if (numVal > range.max) return { isOutOfRange: true, reason: `High Pulse (> ${range.max} bpm)`, severity: 'high' };
      return { isOutOfRange: false };
    }

    case 'spo2': {
      const range = NORMAL_RANGES.spo2;
      if (numVal < range.min) return { isOutOfRange: true, reason: `Low SpO2 (< ${range.min}%)`, severity: 'low' };
      return { isOutOfRange: false };
    }

    case 'sugar': {
      const range = NORMAL_RANGES.sugar;
      if (numVal < range.min) return { isOutOfRange: true, reason: `Low Sugar (< ${range.min} mg/dL)`, severity: 'low' };
      if (numVal > range.max) return { isOutOfRange: true, reason: `High Sugar (> ${range.max} mg/dL)`, severity: 'high' };
      return { isOutOfRange: false };
    }

    case 'temp': {
      const range = NORMAL_RANGES.temp;
      if (numVal < range.min) return { isOutOfRange: true, reason: `Hypothermia (< ${range.min}°C)`, severity: 'low' };
      if (numVal > range.max) return { isOutOfRange: true, reason: `Fever (> ${range.max}°C)`, severity: 'high' };
      return { isOutOfRange: false };
    }

    default:
      return { isOutOfRange: false };
  }
}

