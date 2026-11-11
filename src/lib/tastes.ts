/** Geschmacksrichtungen – bewusst ohne Schema-Abhängigkeit, damit Browserskripte schlank bleiben. */
export const TASTES = ['fresh', 'fruity', 'classic', 'free'] as const;
export type Taste = (typeof TASTES)[number];
