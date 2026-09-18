export interface DistrictInfo {
  name: string;
  blocks: string[];
}

export const MEGHALAYA_STATE = 'Meghalaya';

export const MEGHALAYA_DISTRICTS: DistrictInfo[] = [
  {
    name: 'West Garo Hills',
    blocks: ['Rongram', 'Gambegre', 'Dalu', 'Selsella', 'Tikrikilla', 'Demdema', 'Batabari', 'Tura Urban'],
  },
  {
    name: 'East Khasi Hills',
    blocks: [
      'Mylliem',
      'Mawphlang',
      'Mawkynrew',
      'Mawsynram',
      'Pynursla',
      'Khatarshnong Laitkroh',
      'Shella Bholaganj',
      'Mawryngkneng',
      'Sohiong',
      'Shillong Urban',
    ],
  },
  {
    name: 'Ri-Bhoi',
    blocks: ['Umling', 'Umsning', 'Bhoirymbong', 'Jirang', 'Nongpoh Urban'],
  },
  {
    name: 'South West Garo Hills',
    blocks: ['Betasing', 'Zikzak', 'Rerapara', 'Ampati Urban'],
  },
  {
    name: 'East Garo Hills',
    blocks: ['Samanda', 'Songsak', 'Dambo Rongjeng', 'Williamnagar Urban'],
  },
  {
    name: 'North Garo Hills',
    blocks: ['Resubelpara', 'Kharkutta', 'Bajengdoba', 'Mendipathar'],
  },
  {
    name: 'South Garo Hills',
    blocks: ['Baghmara', 'Gasuapara', 'Chokpot', 'Rongara'],
  },
  {
    name: 'West Khasi Hills',
    blocks: ['Nongstoin', 'Mawshynrut', 'Nongstoin Urban'],
  },
  {
    name: 'Eastern West Khasi Hills',
    blocks: ['Mairang', 'Mawthadraishan'],
  },
  {
    name: 'South West Khasi Hills',
    blocks: ['Mawkyrwat', 'Ranikor'],
  },
  {
    name: 'West Jaintia Hills',
    blocks: ['Thadlaskein', 'Laskein', 'Amlarem', 'Jowai Urban'],
  },
  {
    name: 'East Jaintia Hills',
    blocks: ['Khliehriat', 'Saipung', 'Sutnga'],
  },
  {
    name: 'Other / Outside Meghalaya',
    blocks: ['Other Block / Town'],
  },
];

export const ALL_STATES = [
  'Meghalaya',
  'Assam',
  'Arunachal Pradesh',
  'Manipur',
  'Mizoram',
  'Nagaland',
  'Tripura',
  'Sikkim',
  'West Bengal',
  'Other State',
];

export function getBlocksForDistrict(districtName: string): string[] {
  const match = MEGHALAYA_DISTRICTS.find(
    (d) => d.name.toLowerCase() === (districtName || '').toLowerCase().trim()
  );
  return match ? match.blocks : ['Central / Urban', 'Other Block'];
}

export function formatFullAddress(location: {
  village?: string;
  block?: string;
  district?: string;
  state?: string;
  landmark?: string;
}): string {
  const parts: string[] = [];
  if (location.village && location.village.trim()) parts.push(location.village.trim());
  if (location.block && location.block.trim()) parts.push(`Block: ${location.block.trim()}`);
  if (location.district && location.district.trim()) parts.push(location.district.trim());
  if (location.state && location.state.trim()) parts.push(location.state.trim());
  if (location.landmark && location.landmark.trim()) parts.push(`(Landmark: ${location.landmark.trim()})`);
  return parts.join(', ');
}
