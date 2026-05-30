// Pet breeds reference data
export const DOG_BREEDS = [
  'Labrador Retriever', 'German Shepherd', 'Golden Retriever', 'French Bulldog',
  'Bulldog', 'Poodle', 'Beagle', 'Rottweiler', 'Yorkshire Terrier', 'Dachshund',
  'Boxer', 'Siberian Husky', 'Great Dane', 'Doberman Pinscher', 'Australian Shepherd',
  'Shih Tzu', 'Border Collie', 'Chihuahua', 'Pomeranian', 'Pug',
  'Cavalier King Charles Spaniel', 'Bernese Mountain Dog', 'Cocker Spaniel',
  'Maltese', 'Boston Terrier', 'Mixed Breed', 'Other',
];

export const CAT_BREEDS = [
  'Persian', 'Maine Coon', 'Ragdoll', 'British Shorthair', 'Siamese',
  'American Shorthair', 'Scottish Fold', 'Sphynx', 'Bengal', 'Russian Blue',
  'Abyssinian', 'Birman', 'Norwegian Forest Cat', 'Oriental Shorthair',
  'Devon Rex', 'Burmese', 'Tonkinese', 'Egyptian Mau', 'Savannah',
  'Domestic Shorthair', 'Domestic Longhair', 'Mixed Breed', 'Other',
];

export const BIRD_BREEDS = [
  'Parakeet (Budgie)', 'Cockatiel', 'Lovebird', 'Canary', 'Finch',
  'African Grey Parrot', 'Macaw', 'Cockatoo', 'Conure', 'Amazon Parrot',
  'Parrotlet', 'Pionus', 'Quaker Parrot', 'Eclectus', 'Pigeon',
  'Dove', 'Other',
];

export const EXOTIC_PETS = [
  'Rabbit', 'Guinea Pig', 'Hamster', 'Ferret', 'Hedgehog', 'Chinchilla',
  'Gerbil', 'Rat', 'Mouse', 'Sugar Glider', 'Bearded Dragon', 'Gecko',
  'Iguana', 'Snake', 'Turtle', 'Tortoise', 'Frog', 'Fish', 'Other',
];

export const getBreedsForPetType = (petType: string): string[] => {
  switch (petType) {
    case 'dog': return DOG_BREEDS;
    case 'cat': return CAT_BREEDS;
    case 'bird': return BIRD_BREEDS;
    case 'exotic': return EXOTIC_PETS;
    default: return [];
  }
};

// Category labels for history filtering
export const SCAN_CATEGORIES = [
  { key: 'all', label: 'All', icon: 'apps' as const },
  { key: 'food', label: 'Food', icon: 'restaurant' as const },
  { key: 'beverage', label: 'Beverage', icon: 'wine' as const },
  { key: 'snack', label: 'Snack', icon: 'fast-food' as const },
  { key: 'supplement', label: 'Supplement', icon: 'medkit' as const },
  { key: 'skin_care', label: 'Skin Care', icon: 'sparkles' as const },
  { key: 'hair_care', label: 'Hair Care', icon: 'cut' as const },
  { key: 'body_care', label: 'Body Care', icon: 'water' as const },
  { key: 'oral_care', label: 'Oral Care', icon: 'happy' as const },
  { key: 'makeup', label: 'Makeup', icon: 'color-palette' as const },
  { key: 'fragrance', label: 'Fragrance', icon: 'flower' as const },
  { key: 'pet_food', label: 'Pet Food', icon: 'paw' as const },
  { key: 'pet_care', label: 'Pet Care', icon: 'paw-outline' as const },
  { key: 'unknown', label: 'Other', icon: 'help-circle' as const },
];
