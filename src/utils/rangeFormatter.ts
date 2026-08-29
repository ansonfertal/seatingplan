export type RegisterNumberParts = {
  raw: string;
  prefix: string;
  value: number;
  width: number;
};

export function parseRegisterNumber(value: string): RegisterNumberParts | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const match = trimmed.match(/([A-Za-z]+)?(\d+)/);
  if (!match) {
    return null;
  }

  const [, prefix = '', digits] = match;
  const numericValue = Number(digits);

  if (!Number.isFinite(numericValue)) {
    return null;
  }

  return {
    raw: trimmed,
    prefix,
    value: numericValue,
    width: digits.length,
  };
}

function formatValue(prefix: string, value: number, width: number): string {
  const formattedNumber = String(value).padStart(width, '0');
  return prefix ? `${prefix}${formattedNumber}` : `${value}`;
}

export function formatRegisterRange(values: string[]): string {
  const normalized = values
    .map((value) => parseRegisterNumber(value))
    .filter((value): value is RegisterNumberParts => Boolean(value))
    .sort((left, right) => left.value - right.value);

  if (normalized.length === 0) {
    return '—';
  }

  const dynamicWidth = Math.max(...normalized.map((value) => value.width));
  const prefixSet = new Set(normalized.map((value) => value.prefix));
  const commonPrefix = prefixSet.size === 1 ? [...prefixSet][0] : '';

  const groups: string[] = [];
  let startIndex = 0;

  for (let pointer = 1; pointer <= normalized.length; pointer += 1) {
    const currentItem = normalized[pointer];
    const previousItem = normalized[pointer - 1];

    if (!currentItem || previousItem.value + 1 !== currentItem.value) {
      const segment = normalized.slice(startIndex, pointer);
      const startValue = segment[0].value;
      const endValue = segment[segment.length - 1].value;

      if (segment.length === 1) {
        groups.push(formatValue(commonPrefix, startValue, dynamicWidth));
      } else {
        const formattedStart = formatValue(commonPrefix, startValue, dynamicWidth);
        const formattedEnd = formatValue(commonPrefix, endValue, dynamicWidth);
        groups.push(`${formattedStart} to ${formattedEnd}`);
      }

      startIndex = pointer;
    }
  }

  return groups.join(', ');
}
