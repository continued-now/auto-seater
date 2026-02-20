export const palette = {
  primary: {
    DEFAULT: '#2563EB',
    light: '#DBEAFE',
    dark: '#1D4ED8',
  },
  success: {
    DEFAULT: '#16A34A',
    light: '#DCFCE7',
    dark: '#15803D',
  },
  danger: {
    DEFAULT: '#DC2626',
    light: '#FEE2E2',
    dark: '#B91C1C',
  },
  warning: {
    DEFAULT: '#D97706',
    light: '#FEF3C7',
    dark: '#B45309',
  },
} as const;

export const dietaryTagColors: Record<string, string> = {
  vegetarian: '#16A34A',
  vegan: '#059669',
  'gluten-free': '#D97706',
  'nut-allergy': '#EA580C',
  'dairy-free': '#0891B2',
  halal: '#0284C7',
  kosher: '#2563EB',
  'shellfish-allergy': '#DC2626',
  other: '#64748B',
};

export const rsvpStatusColors: Record<string, { bg: string; text: string }> = {
  confirmed: { bg: '#DCFCE7', text: '#16A34A' },
  declined: { bg: '#FEE2E2', text: '#DC2626' },
  pending: { bg: '#FEF3C7', text: '#D97706' },
  tentative: { bg: '#DBEAFE', text: '#2563EB' },
};

export const socialCircleColors = [
  '#2563EB', '#16A34A', '#DC2626', '#D97706',
  '#0891B2', '#059669', '#EA580C', '#0284C7',
  '#64748B', '#475569',
];
