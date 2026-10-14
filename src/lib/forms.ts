// The questions a customer answers for each kind of service.
// Answers are saved on the booking keyed by the label, so every dashboard can show them as-is.
export type Field =
  | { type: 'text' | 'textarea' | 'number' | 'date' | 'time'; label: string; required?: boolean; placeholder?: string }
  | { type: 'select'; label: string; options: string[]; required?: boolean }
  | { type: 'chips'; label: string; options: string[]; required?: boolean };

const propertyTypes = ['Studio', 'One bedroom', 'Two bedroom', 'Three bedroom', 'Own compound', 'Maisonette', 'Apartment', 'Mansionette'];

export const errandTypes = [
  'House hunting errand', 'Market errand', 'Business products / goods purchase', 'Home furnishing errand',
  'Pick up & delivery', 'School search', 'Gift purchase', 'Travel & appointment',
];

const byCategory: Record<string, Field[]> = {
  house_hunting: [
    { type: 'select', label: 'Property type', options: propertyTypes, required: true },
    { type: 'text', label: 'Second-choice area', placeholder: 'Optional (e.g. Juja, Thika Road)' },
    { type: 'number', label: 'Minimum rent budget (KSh)', required: true },
    { type: 'number', label: 'Maximum rent budget (KSh)', required: true },
    { type: 'number', label: 'Number of people moving in', required: true },
    { type: 'chips', label: 'Must-haves', options: ['Water 24/7', 'Parking', 'Balcony', 'Tiled floors', 'CCTV / security', 'Near matatu stage', 'Pets allowed', 'Backup power', 'Near school'] },
    { type: 'date', label: 'Move-in date' },
  ],
  cleaning: [
    { type: 'select', label: 'Property type', options: ['House', 'Apartment', 'Office', 'Shop / commercial', 'Other'], required: true },
    { type: 'select', label: 'Property size', options: ['Studio', '1 bedroom', '2 bedrooms', '3 bedrooms', '4+ bedrooms', 'Small office', 'Large office'], required: true },
    { type: 'number', label: 'Number of bathrooms' },
    { type: 'select', label: 'How dirty is it?', options: ['Lightly dirty', 'Normal', 'Very dirty / long overdue'], required: true },
    { type: 'select', label: 'Cleaning supplies', options: ['Provider brings supplies', 'I will provide supplies'], required: true },
    { type: 'chips', label: 'Extra attention needed', options: ['Windows', 'Kitchen', 'Balcony', 'Fridge', 'Oven', 'Wardrobes / closets', 'Stains'] },
    { type: 'select', label: 'Pets at home?', options: ['No', 'Yes'] },
  ],
  laundry: [
    { type: 'chips', label: 'Items', options: ['Everyday clothes', 'Bedding', 'Towels', 'Delicate garments', 'Uniforms', 'Curtains'], required: true },
    { type: 'select', label: 'Pick up & delivery (free)', options: ['Yes, please collect and deliver', 'No, I will drop off / collect'], required: true },
    { type: 'text', label: 'Detergent allergies or special care', placeholder: 'Optional' },
  ],
  care: [
    { type: 'text', label: 'Children\'s ages', required: true, placeholder: 'e.g. 2 years and 5 years' },
    { type: 'time', label: 'Start time', required: true },
    { type: 'text', label: 'Allergies / medical needs', placeholder: 'None' },
    { type: 'text', label: 'Emergency contact (name & phone)', required: true },
    { type: 'chips', label: 'Help needed with', options: ['Feeding', 'Playtime', 'Homework', 'Bath time', 'Nap time'] },
  ],
  errands: [
    { type: 'select', label: 'Type of errand', options: errandTypes, required: true },
    { type: 'textarea', label: 'What should we do / buy?', required: true, placeholder: 'List items, shops, or tasks' },
    { type: 'text', label: 'Pick up from' },
    { type: 'text', label: 'Deliver to' },
    { type: 'number', label: 'Money for purchases (KSh)', placeholder: 'If we are buying things for you' },
    { type: 'select', label: 'How urgent?', options: ['Flexible', 'Today', 'Within 2 hours'] },
  ],
};

// A few services need extra questions on top of their category
const bySlug: Record<string, Field[]> = {
  'couch-cleaning': [
    { type: 'select', label: 'Couch material', options: ['Fabric', 'Leather', 'Velvet', 'Not sure'], required: true },
    { type: 'select', label: 'Visible stains?', options: ['No', 'A few', 'Many'] },
  ],
  'carpet-cleaning': [
    { type: 'text', label: 'Carpet size (approx.)', required: true, placeholder: 'e.g. 5ft x 8ft, or 2 medium carpets' },
    { type: 'select', label: 'Pick up & delivery (free)', options: ['Yes, please collect and deliver', 'No, clean at my place'], required: true },
  ],
  'mama-fua': [
    { type: 'select', label: 'Pick up & delivery', options: ['Yes, please collect and deliver', 'I will courier it'], required: true },
    { type: 'chips', label: 'Garment types', options: ['Everyday clothes', 'Delicate garments', 'Bedding', 'Towels'] },
  ],
};

// services whose category form should not be used
const skipCategory = new Set(['couch-cleaning', 'carpet-cleaning', 'dish-washing']);

export function fieldsFor(slug: string, category: string): Field[] {
  if (slug === 'house-hunting') return byCategory.house_hunting;
  const base = skipCategory.has(slug) ? [] : byCategory[category] || [];
  return [...(bySlug[slug] || []), ...base];
}

export const locationLabel = (category: string) =>
  category === 'house_hunting' ? 'Area you want to live in' :
  category === 'errands' ? 'Your location / where we meet you' : 'Address of the place to be served';
