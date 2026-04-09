import type { AwardLetter } from "@/lib/schema";
import { calcNetPrice, calcOutOfPocket } from "@/lib/money";

export interface YearProjection {
  year: 1 | 2 | 3 | 4;
  netPrice: number;
  outOfPocket: number;
}

export interface FourYearProjection {
  years: YearProjection[];
  totalNetPrice: number;
  totalOutOfPocket: number;
}

/**
 * Project 4 years of cost assuming a flat annual inflation rate on net price.
 * Year 1 is the as-given award letter; years 2-4 compound from the previous year.
 *
 * @param letter the analyzed award letter
 * @param inflationRate annual inflation as a decimal (0.05 = 5%)
 * @param declineLoans whether the family is declining optional loans
 */
export function projectFourYear(
  letter: AwardLetter,
  inflationRate: number,
  declineLoans: boolean = false,
): FourYearProjection {
  const year1Net = calcNetPrice(letter);
  const year1Oop = calcOutOfPocket(letter, declineLoans);

  const years: YearProjection[] = [];
  for (let y = 0; y < 4; y++) {
    const factor = Math.pow(1 + inflationRate, y);
    years.push({
      year: (y + 1) as 1 | 2 | 3 | 4,
      netPrice: Math.round(year1Net * factor),
      outOfPocket: Math.round(year1Oop * factor),
    });
  }

  return {
    years,
    totalNetPrice: years.reduce((sum, y) => sum + y.netPrice, 0),
    totalOutOfPocket: years.reduce((sum, y) => sum + y.outOfPocket, 0),
  };
}
