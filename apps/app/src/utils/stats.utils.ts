const DAY_MS = 86_400_000;

/** Début de la période précédente, de même durée, se terminant à `start`. */
export const prevStartOf = (start: Date, end: Date) =>
  new Date(start.getTime() - (end.getTime() - start.getTime()));

/** Nombre de journées entre deux bornes alignées sur minuit. */
export const daysBetween = (start: Date, end: Date) =>
  Math.round((end.getTime() - start.getTime()) / DAY_MS);

/** Index du bucket journalier auquel appartient `target`. */
export const dayIndexOf = (start: Date, target: Date) =>
  Math.floor((target.getTime() - start.getTime()) / DAY_MS);

export const addDays = (date: Date, days: number): Date =>
  new Date(date.getTime() + days * DAY_MS);

export interface LegendEntry {
  date: string;
  dayNumber: number;
  dayLabelShort: string;
  dayLabelLong: string;
  weekNumber: number;
}

const shortDayFormatter = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' });
const longDayFormatter = new Intl.DateTimeFormat('fr-FR', { weekday: 'long' });

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);
const stripDot = (value: string) => value.replace(/\.$/, '');

/** Légende jour par jour d'une période : date, quantième, jour court/long, numéro de semaine. */
export const buildLegend = (start: Date, end: Date): LegendEntry[] => {
  const dayCount = daysBetween(start, end);

  // Lundi de la semaine contenant `start` → semaine 1
  const startMonday = addDays(start, -((start.getDay() + 6) % 7));

  return Array.from({ length: dayCount }, (_, i) => {
    const d = addDays(start, i);
    const weekNumber = Math.floor((d.getTime() - startMonday.getTime()) / (7 * DAY_MS)) + 1;

    return {
      date: d.toISOString().slice(0, 10),
      dayNumber: d.getDate(),
      dayLabelShort: capitalize(stripDot(shortDayFormatter.format(d))),
      dayLabelLong: capitalize(longDayFormatter.format(d)),
      weekNumber,
    };
  });
};
