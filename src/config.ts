// All tunable constants for the forgetting-curve model live here.

type PerRating = { got: number; shaky: number; missed: number };

export interface Config {
  initialStability: number;
  targetRetention: number;
  stabilityMultiplier: PerRating;
  minStability: number;
  masteredStability: number;
  newCardsPerDay: number;
  studyDayStartHour: number;
  minIntervalDays: number;
  exam: { capFraction: number; finalWindowDays: number };
  recallValue: PerRating;
}

export const CONFIG: Config = {
  /** Stability (days) assigned to a brand-new card. */
  initialStability: 1,

  /** A card is due when predicted recall R(t) = exp(-t/S) drops to this value. */
  targetRetention: 0.9,

  /** Stability updates after a review: S_new = S * multiplier. */
  stabilityMultiplier: {
    got: 2.5,
    shaky: 1.2,
    missed: 0.3,
  },

  /** "Missed" never drops stability below this many days. */
  minStability: 0.5,

  /** A card counts as "mastered" once its stability reaches this many days (4 straight "Got it"s from new). */
  masteredStability: 21,

  /** At most this many never-seen cards are introduced per day (exam final windows ignore the limit). */
  newCardsPerDay: 15,

  /** A study day runs from this local hour to the same hour the next day (4 = 4 am), so late nights count as "today". */
  studyDayStartHour: 4,

  /** Never schedule a card sooner than this many days: one session per day is enough. */
  minIntervalDays: 1,

  exam: {
    /** Max gap between reviews = capFraction * (days from last review to the exam), floored at minIntervalDays. */
    capFraction: 0.2,
    /** Within this many days of the exam, every card must be seen at least once. */
    finalWindowDays: 2,
  },

  /** Recall value assigned to each rating when fitting the forgetting curve. */
  recallValue: {
    got: 1,
    shaky: 0.6,
    missed: 0.1,
  },
};
