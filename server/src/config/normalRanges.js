/**
 * Normal clinical reference ranges for patient vitals.
 * Kept in a single shared configuration for consistency across charts,
 * timeline badges, email notifications, and doctor PDF reports.
 * 
 * Assumption Note: Sugar reference range is configured for fasting blood glucose (70-140 mg/dL).
 */

export const NORMAL_RANGES = {
  bp: {
    label: 'Blood Pressure',
    unit: 'mmHg',
    systolic: { min: 90, max: 140 },
    diastolic: { min: 60, max: 90 },
  },
  pulse: {
    label: 'Pulse / Heart Rate',
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
    label: 'Body Temperature',
    unit: '°C',
    min: 36.1,
    max: 37.5,
  },
  weight: {
    label: 'Weight',
    unit: 'kg',
    hasBand: false, // trend only
  }
};

/**
 * Checks if a vital reading is out of the normal clinical range.
 * @param {string} type - bp, pulse, spo2, sugar, temp, weight
 * @param {number} value - primary reading (systolic for bp)
 * @param {number|null} [value2] - secondary reading (diastolic for bp)
 * @returns {{ isOutOfRange: boolean, reason?: string, severity?: 'low' | 'high' }}
 */
export function checkVitalRange(type, value, value2 = null) {
  const numVal = Number(value);
  if (isNaN(numVal)) return { isOutOfRange: false };

  switch (type) {
    case 'bp': {
      const sysRange = NORMAL_RANGES.bp.systolic;
      const diaRange = NORMAL_RANGES.bp.diastolic;
      const numVal2 = value2 !== null ? Number(value2) : null;

      let isOutOfRange = false;
      const reasons = [];

      if (numVal < sysRange.min) {
        isOutOfRange = true;
        reasons.push(`Low systolic (${numVal} < ${sysRange.min} mmHg)`);
      } else if (numVal > sysRange.max) {
        isOutOfRange = true;
        reasons.push(`High systolic (${numVal} > ${sysRange.max} mmHg)`);
      }

      if (numVal2 !== null && !isNaN(numVal2)) {
        if (numVal2 < diaRange.min) {
          isOutOfRange = true;
          reasons.push(`Low diastolic (${numVal2} < ${diaRange.min} mmHg)`);
        } else if (numVal2 > diaRange.max) {
          isOutOfRange = true;
          reasons.push(`High diastolic (${numVal2} > ${diaRange.max} mmHg)`);
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
      if (numVal < range.min) {
        return { isOutOfRange: true, reason: `Bradycardia: Pulse ${numVal} < ${range.min} bpm`, severity: 'low' };
      }
      if (numVal > range.max) {
        return { isOutOfRange: true, reason: `Tachycardia: Pulse ${numVal} > ${range.max} bpm`, severity: 'high' };
      }
      return { isOutOfRange: false };
    }

    case 'spo2': {
      const range = NORMAL_RANGES.spo2;
      if (numVal < range.min) {
        return { isOutOfRange: true, reason: `Hypoxemia: SpO2 ${numVal}% < ${range.min}%`, severity: 'low' };
      }
      return { isOutOfRange: false };
    }

    case 'sugar': {
      const range = NORMAL_RANGES.sugar;
      if (numVal < range.min) {
        return { isOutOfRange: true, reason: `Hypoglycemia: ${numVal} < ${range.min} mg/dL`, severity: 'low' };
      }
      if (numVal > range.max) {
        return { isOutOfRange: true, reason: `Hyperglycemia: ${numVal} > ${range.max} mg/dL`, severity: 'high' };
      }
      return { isOutOfRange: false };
    }

    case 'temp': {
      const range = NORMAL_RANGES.temp;
      if (numVal < range.min) {
        return { isOutOfRange: true, reason: `Hypothermia: ${numVal}°C < ${range.min}°C`, severity: 'low' };
      }
      if (numVal > range.max) {
        return { isOutOfRange: true, reason: `Fever / Elevated: ${numVal}°C > ${range.max}°C`, severity: 'high' };
      }
      return { isOutOfRange: false };
    }

    case 'weight':
    default:
      return { isOutOfRange: false };
  }
}

