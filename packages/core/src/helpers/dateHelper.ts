import { DateTime } from "luxon";

// ref: https://www.thisdot.co/blog/how-to-handle-time-zones-using-datetime-and-luxon

export const utcNow = (): DateTime => {
    return DateTime.utc();
};

export const utcToTimezone = (isoUtc: string, timezone: string): DateTime => {
    const utcInput = DateTime.fromISO(isoUtc, { zone: "utc" });
    const converted = utcInput.setZone(timezone);

    return converted;
};

export const timezoneToUtc = (isoUtc: string, timezone: string): DateTime => {
    const utcInput = DateTime.fromISO(isoUtc, { zone: timezone });
    const converted = utcInput.toUTC();

    return converted;
};

export function toDateTime(createdAt: string): DateTime {
    return DateTime.fromISO(createdAt);
}

export const diffFromUtcInDays = (date: string | undefined) => {
    if (date === undefined) {
        return;
    }

    return DateTime.fromISO(date)
        .diff(DateTime.utc(), ["days"])
        .toObject()
        .days?.toFixed(0);
};

export const diffInMs = (startDate: DateTime, endDate: DateTime): number => {
    return endDate.toMillis() - startDate.toMillis();
};

const possibleFormats = [
    'yyyy-MM-dd',
    'yyyy/MM/dd',
    'dd/MM/yyyy',
    'dd-MM-yyyy',
    'LLL d, yyyy',
];

export const parseDate = (dateString: string): DateTime | null => {
    for (const format of possibleFormats) {
        const parsedDate = DateTime.fromFormat(dateString, format);
        if (parsedDate.isValid) {
            return parsedDate;
        }
    }
    return null;
}

export const isSame = (date1: string, date2: string): boolean => {
    const parsedDate1 = parseDate(date1);
    const parsedDate2 = parseDate(date2);
    if (!parsedDate1 || !parsedDate2) {
        return false;
    }
    return parsedDate1.equals(parsedDate2);
}

export const isBefore = (date1: string, date2: string): boolean => {
    const parsedDate1 = parseDate(date1);
    const parsedDate2 = parseDate(date2);
    if (!parsedDate1 || !parsedDate2) {
        return false;
    }
    return parsedDate1 < parsedDate2;
}

export const isBeforeOrAt = (date1: string, date2: string): boolean => {
    const parsedDate1 = parseDate(date1);
    const parsedDate2 = parseDate(date2);
    if (!parsedDate1 || !parsedDate2) {
        return false;
    }
    return parsedDate1 <= parsedDate2;
}

export const isAfter = (date1: string, date2: string): boolean => {
    const parsedDate1 = parseDate(date1);
    const parsedDate2 = parseDate(date2);
    if (!parsedDate1 || !parsedDate2) {
        return false;
    }
    return parsedDate1 > parsedDate2;
}

export const isAfterOrAt = (date1: string, date2: string): boolean => {
        const parsedDate1 = parseDate(date1);
        const parsedDate2 = parseDate(date2);
        if (!parsedDate1 || !parsedDate2) {
            return false;
        }
        return parsedDate1 >= parsedDate2;
}
