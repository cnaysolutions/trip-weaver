export interface Location {
  name: string;
  iataCode: string;
  subType: 'CITY' | 'AIRPORT';
  cityName: string;
  countryCode?: string;
  countryName?: string;
  lat?: number;
  lon?: number;
  cityCode?: string;
}

export interface LocationSearchResult {
  locations: Location[];
}
