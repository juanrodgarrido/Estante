/** Reto de lectura del año en curso con su progreso (calculado, no guardado). */
export type GoalProgress = {
  year: number;
  target: number;
  /** Libros leídos con `finishedAt` dentro del año. Puede superar `target`. */
  read: number;
  completed: boolean;
};

/** Un año ya cerrado: objetivo y lo leído ese año. */
export type PastGoal = {
  year: number;
  target: number;
  read: number;
};

export const GOAL_MIN = 1;
export const GOAL_MAX = 365;
