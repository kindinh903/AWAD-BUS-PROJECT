// Vietnam cities for autocomplete (aligned with backend routes)
export const vietnameseCities = [
  'Ho Chi Minh City',
  'Hanoi',
  'Da Nang',
  'Hue',
  'Nha Trang',
  'Can Tho',
  'Hai Phong',
  'Vung Tau',
  'Da Lat',
  'Quy Nhon',
  'Phan Thiet',
  'Ha Long',
  'Sapa',
  'Hoi An',
] as const;

export type VietnamCity = typeof vietnameseCities[number];
