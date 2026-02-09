// Categories for pins - shared between server and client
export const CATEGORIES = [
    'For You',
    'Home Decor',
    'Food & Drink',
    'Travel',
    'Art',
    'Nature',
    'Fashion',
    'DIY & Crafts',
    'Technology',
    'Fitness',
    'Photography',
    'Design',
    'Animals',
    'Architecture',
] as const;

export type Category = typeof CATEGORIES[number];
