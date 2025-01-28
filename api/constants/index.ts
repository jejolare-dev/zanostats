export const HOUR_IN_MS = 3_600_000;
export const DAY_IN_MS = HOUR_IN_MS * 24;
export const WEEK_IN_MS = DAY_IN_MS * 7;
export const MONTH_IN_MS = DAY_IN_MS * 30;
export const YEAR_IN_MS = DAY_IN_MS * 365;

export const PREV_HOUR = Date.now() - HOUR_IN_MS;
export const PREV_DAY = Date.now() - DAY_IN_MS;
export const PREV_WEEK = Date.now() - WEEK_IN_MS;
export const PREV_MONTH = Date.now() - MONTH_IN_MS;
export const PREV_YEAR = Date.now() - YEAR_IN_MS;
