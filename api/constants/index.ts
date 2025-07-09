export const HOUR_IN_MS = 3_600_000;
export const DAY_IN_MS = HOUR_IN_MS * 24;
export const WEEK_IN_MS = DAY_IN_MS * 7;
export const MONTH_IN_MS = DAY_IN_MS * 30;
export const YEAR_IN_MS = DAY_IN_MS * 365;

export function PREV_HOUR() {
	return Date.now() - HOUR_IN_MS;
}

export function PREV_DAY() {
	return Date.now() - DAY_IN_MS;
}

export function PREV_WEEK() {
	return Date.now() - WEEK_IN_MS;
}

export function PREV_MONTH() {
	return Date.now() - MONTH_IN_MS;
}

export function PREV_YEAR() {
	return Date.now() - YEAR_IN_MS;
}
