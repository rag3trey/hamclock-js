/**
 * Prefix Lookup - DXCC entity and CQ zone lookup for amateur radio callsigns
 * Based on ARRL DXCC list and ITU CQ zones
 */

// DXCC Entity database: prefix => { country, cqZone, ituZone, continent, latitude, longitude }
const DXCC_DATABASE = {
  // North America
  'N': { country: 'United States', cqZone: 3, ituZone: 2, continent: 'NA', lat: 39.8, lng: -98.6 },
  'VE': { country: 'Canada', cqZone: 2, ituZone: 2, continent: 'NA', lat: 56.1, lng: -106.3 },
  'XE': { country: 'Mexico', cqZone: 4, ituZone: 3, continent: 'NA', lat: 23.6, lng: -102.5 },
  'W': { country: 'United States', cqZone: 3, ituZone: 2, continent: 'NA', lat: 39.8, lng: -98.6 },
  'K': { country: 'United States', cqZone: 3, ituZone: 2, continent: 'NA', lat: 39.8, lng: -98.6 },
  'AA': { country: 'United States', cqZone: 3, ituZone: 2, continent: 'NA', lat: 39.8, lng: -98.6 },
  'AB': { country: 'United States', cqZone: 3, ituZone: 2, continent: 'NA', lat: 39.8, lng: -98.6 },
  'AC': { country: 'United States', cqZone: 3, ituZone: 2, continent: 'NA', lat: 39.8, lng: -98.6 },
  'AD': { country: 'United States', cqZone: 3, ituZone: 2, continent: 'NA', lat: 39.8, lng: -98.6 },
  'AE': { country: 'United States', cqZone: 3, ituZone: 2, continent: 'NA', lat: 39.8, lng: -98.6 },
  'AF': { country: 'United States', cqZone: 3, ituZone: 2, continent: 'NA', lat: 39.8, lng: -98.6 },
  'AG': { country: 'United States', cqZone: 3, ituZone: 2, continent: 'NA', lat: 39.8, lng: -98.6 },
  'AH': { country: 'United States', cqZone: 3, ituZone: 2, continent: 'NA', lat: 39.8, lng: -98.6 },
  'AI': { country: 'United States', cqZone: 3, ituZone: 2, continent: 'NA', lat: 39.8, lng: -98.6 },
  'AJ': { country: 'United States', cqZone: 3, ituZone: 2, continent: 'NA', lat: 39.8, lng: -98.6 },
  'AK': { country: 'United States', cqZone: 3, ituZone: 2, continent: 'NA', lat: 39.8, lng: -98.6 },

  // Central America & Caribbean
  'HP': { country: 'Panama', cqZone: 4, ituZone: 3, continent: 'NA', lat: 8.7, lng: -80.8 },
  'TI': { country: 'Costa Rica', cqZone: 4, ituZone: 3, continent: 'NA', lat: 9.7, lng: -83.8 },
  'YN': { country: 'Nicaragua', cqZone: 4, ituZone: 3, continent: 'NA', lat: 12.9, lng: -85.2 },
  'HN': { country: 'Honduras', cqZone: 4, ituZone: 3, continent: 'NA', lat: 15.2, lng: -86.2 },
  'N4': { country: 'Puerto Rico', cqZone: 4, ituZone: 2, continent: 'NA', lat: 18.2, lng: -66.5 },
  'NP4': { country: 'Puerto Rico', cqZone: 4, ituZone: 2, continent: 'NA', lat: 18.2, lng: -66.5 },
  'KP4': { country: 'Puerto Rico', cqZone: 4, ituZone: 2, continent: 'NA', lat: 18.2, lng: -66.5 },
  'KP2': { country: 'US Virgin Islands', cqZone: 4, ituZone: 2, continent: 'NA', lat: 18.3, lng: -64.9 },
  'KP1': { country: 'Guantanamo Bay', cqZone: 4, ituZone: 2, continent: 'NA', lat: 19.9, lng: -75.1 },
  'CO': { country: 'Cuba', cqZone: 4, ituZone: 3, continent: 'NA', lat: 21.5, lng: -77.8 },
  'C6': { country: 'Bahamas', cqZone: 5, ituZone: 2, continent: 'NA', lat: 24.2, lng: -76.1 },
  'J3': { country: 'Grenada', cqZone: 8, ituZone: 2, continent: 'SA', lat: 12.1, lng: -61.7 },
  'J6': { country: 'St. Lucia', cqZone: 8, ituZone: 2, continent: 'SA', lat: 13.9, lng: -60.9 },
  'J7': { country: 'Dominica', cqZone: 8, ituZone: 2, continent: 'SA', lat: 15.4, lng: -61.4 },
  'J8': { country: 'St. Vincent', cqZone: 8, ituZone: 2, continent: 'SA', lat: 12.98, lng: -61.2 },

  // South America
  'PY': { country: 'Brazil', cqZone: 11, ituZone: 4, continent: 'SA', lat: -10.3, lng: -55.5 },
  'PZ': { country: 'Suriname', cqZone: 9, ituZone: 4, continent: 'SA', lat: 3.9, lng: -56.0 },
  'PJ': { country: 'Netherlands Antilles', cqZone: 9, ituZone: 2, continent: 'NA', lat: 12.2, lng: -68.9 },
  'HK': { country: 'Colombia', cqZone: 9, ituZone: 4, continent: 'SA', lat: 4.5, lng: -74.3 },
  'HC': { country: 'Ecuador', cqZone: 10, ituZone: 4, continent: 'SA', lat: -1.8, lng: -78.1 },
  'OA': { country: 'Peru', cqZone: 11, ituZone: 4, continent: 'SA', lat: -12.0, lng: -75.1 },
  'CP': { country: 'Bolivia', cqZone: 11, ituZone: 4, continent: 'SA', lat: -16.3, lng: -63.6 },
  'CW': { country: 'Uruguay', cqZone: 13, ituZone: 4, continent: 'SA', lat: -33.8, lng: -56.2 },
  'LU': { country: 'Argentina', cqZone: 13, ituZone: 4, continent: 'SA', lat: -38.4, lng: -63.6 },
  'CE': { country: 'Chile', cqZone: 12, ituZone: 4, continent: 'SA', lat: -30.0, lng: -71.5 },
  'VE3': { country: 'Canada', cqZone: 2, ituZone: 2, continent: 'NA', lat: 45.4, lng: -75.7 },

  // Europe
  'G': { country: 'United Kingdom', cqZone: 14, ituZone: 27, continent: 'EU', lat: 54.4, lng: -3.4 },
  'M': { country: 'United Kingdom', cqZone: 14, ituZone: 27, continent: 'EU', lat: 54.4, lng: -3.4 },
  'F': { country: 'France', cqZone: 14, ituZone: 27, continent: 'EU', lat: 46.2, lng: 2.2 },
  'D': { country: 'Germany', cqZone: 14, ituZone: 28, continent: 'EU', lat: 51.2, lng: 10.5 },
  'DA': { country: 'Germany', cqZone: 14, ituZone: 28, continent: 'EU', lat: 51.2, lng: 10.5 },
  'DB': { country: 'Germany', cqZone: 14, ituZone: 28, continent: 'EU', lat: 51.2, lng: 10.5 },
  'DC': { country: 'Germany', cqZone: 14, ituZone: 28, continent: 'EU', lat: 51.2, lng: 10.5 },
  'DD': { country: 'Germany', cqZone: 14, ituZone: 28, continent: 'EU', lat: 51.2, lng: 10.5 },
  'DE': { country: 'Germany', cqZone: 14, ituZone: 28, continent: 'EU', lat: 51.2, lng: 10.5 },
  'DF': { country: 'Germany', cqZone: 14, ituZone: 28, continent: 'EU', lat: 51.2, lng: 10.5 },
  'I': { country: 'Italy', cqZone: 15, ituZone: 28, continent: 'EU', lat: 41.9, lng: 12.5 },
  'IK': { country: 'Italy', cqZone: 15, ituZone: 28, continent: 'EU', lat: 41.9, lng: 12.5 },
  'E': { country: 'Spain', cqZone: 14, ituZone: 27, continent: 'EU', lat: 40.5, lng: -3.7 },
  'EA': { country: 'Spain', cqZone: 14, ituZone: 27, continent: 'EU', lat: 40.5, lng: -3.7 },
  'P': { country: 'Netherlands', cqZone: 14, ituZone: 27, continent: 'EU', lat: 52.1, lng: 5.3 },
  'PA': { country: 'Netherlands', cqZone: 14, ituZone: 27, continent: 'EU', lat: 52.1, lng: 5.3 },
  'PB': { country: 'Netherlands', cqZone: 14, ituZone: 27, continent: 'EU', lat: 52.1, lng: 5.3 },
  'PC': { country: 'Netherlands', cqZone: 14, ituZone: 27, continent: 'EU', lat: 52.1, lng: 5.3 },
  'PD': { country: 'Netherlands', cqZone: 14, ituZone: 27, continent: 'EU', lat: 52.1, lng: 5.3 },
  'PE': { country: 'Netherlands', cqZone: 14, ituZone: 27, continent: 'EU', lat: 52.1, lng: 5.3 },
  'PF': { country: 'Netherlands', cqZone: 14, ituZone: 27, continent: 'EU', lat: 52.1, lng: 5.3 },
  'OE': { country: 'Austria', cqZone: 15, ituZone: 28, continent: 'EU', lat: 47.5, lng: 14.5 },
  'N': { country: 'Norway', cqZone: 14, ituZone: 27, continent: 'EU', lat: 60.5, lng: 8.5 },
  'LA': { country: 'Norway', cqZone: 14, ituZone: 27, continent: 'EU', lat: 60.5, lng: 8.5 },
  'LB': { country: 'Norway', cqZone: 14, ituZone: 27, continent: 'EU', lat: 60.5, lng: 8.5 },
  'SM': { country: 'Sweden', cqZone: 14, ituZone: 27, continent: 'EU', lat: 60.1, lng: 18.6 },
  'SL': { country: 'Sweden', cqZone: 14, ituZone: 27, continent: 'EU', lat: 60.1, lng: 18.6 },
  'SF': { country: 'Finland', cqZone: 15, ituZone: 27, continent: 'EU', lat: 61.9, lng: 25.7 },
  'SG': { country: 'Finland', cqZone: 15, ituZone: 27, continent: 'EU', lat: 61.9, lng: 25.7 },
  'OH': { country: 'Finland', cqZone: 15, ituZone: 27, continent: 'EU', lat: 61.9, lng: 25.7 },
  'OJ': { country: 'Finland', cqZone: 15, ituZone: 27, continent: 'EU', lat: 61.9, lng: 25.7 },
  'OZ': { country: 'Denmark', cqZone: 14, ituZone: 27, continent: 'EU', lat: 56.3, lng: 9.5 },
  'ON': { country: 'Belgium', cqZone: 14, ituZone: 27, continent: 'EU', lat: 50.5, lng: 4.5 },
  'HB': { country: 'Switzerland', cqZone: 14, ituZone: 28, continent: 'EU', lat: 46.9, lng: 8.2 },
  'HB9': { country: 'Switzerland', cqZone: 14, ituZone: 28, continent: 'EU', lat: 46.9, lng: 8.2 },
  'HA': { country: 'Hungary', cqZone: 15, ituZone: 28, continent: 'EU', lat: 47.5, lng: 19.0 },
  'OK': { country: 'Czech Republic', cqZone: 15, ituZone: 28, continent: 'EU', lat: 49.8, lng: 15.5 },
  'OL': { country: 'Czech Republic', cqZone: 15, ituZone: 28, continent: 'EU', lat: 49.8, lng: 15.5 },
  'OM': { country: 'Slovakia', cqZone: 15, ituZone: 28, continent: 'EU', lat: 48.7, lng: 19.5 },
  'S5': { country: 'Slovenia', cqZone: 15, ituZone: 28, continent: 'EU', lat: 46.2, lng: 14.9 },
  'N7': { country: 'Bosnia', cqZone: 15, ituZone: 28, continent: 'EU', lat: 43.9, lng: 17.7 },
  'W6': { country: 'Bosnia', cqZone: 15, ituZone: 28, continent: 'EU', lat: 43.9, lng: 17.7 },
  'YU': { country: 'Serbia', cqZone: 15, ituZone: 28, continent: 'EU', lat: 44.0, lng: 21.0 },
  'YZ': { country: 'Serbia', cqZone: 15, ituZone: 28, continent: 'EU', lat: 44.0, lng: 21.0 },
  'LZ': { country: 'Bulgaria', cqZone: 16, ituZone: 29, continent: 'EU', lat: 42.7, lng: 25.5 },
  'R': { country: 'Russia', cqZone: 16, ituZone: 29, continent: 'EU', lat: 61.5, lng: 105.3 },
  'UA': { country: 'Russia', cqZone: 16, ituZone: 29, continent: 'EU', lat: 61.5, lng: 105.3 },
  'UB': { country: 'Ukraine', cqZone: 16, ituZone: 29, continent: 'EU', lat: 48.4, lng: 31.2 },
  'UR': { country: 'Ukraine', cqZone: 16, ituZone: 29, continent: 'EU', lat: 48.4, lng: 31.2 },
  'W8': { country: 'Belarus', cqZone: 16, ituZone: 29, continent: 'EU', lat: 53.9, lng: 27.6 },
  'EU': { country: 'Belarus', cqZone: 16, ituZone: 29, continent: 'EU', lat: 53.9, lng: 27.6 },
  'Z3': { country: 'Macedonia', cqZone: 15, ituZone: 28, continent: 'EU', lat: 41.6, lng: 21.7 },
  'Z8': { country: 'Kosovo', cqZone: 15, ituZone: 28, continent: 'EU', lat: 42.3, lng: 21.0 },
  'SV': { country: 'Greece', cqZone: 16, ituZone: 29, continent: 'EU', lat: 39.1, lng: 21.8 },
  'SV5': { country: 'Dodecanese', cqZone: 20, ituZone: 39, continent: 'AS', lat: 36.4, lng: 27.1 },
  'SV9': { country: 'Crete', cqZone: 20, ituZone: 39, continent: 'AS', lat: 35.3, lng: 25.1 },
  'T': { country: 'Turkey', cqZone: 20, ituZone: 39, continent: 'AS', lat: 38.9, lng: 35.2 },
  'TA': { country: 'Turkey', cqZone: 20, ituZone: 39, continent: 'AS', lat: 38.9, lng: 35.2 },
  'YO': { country: 'Romania', cqZone: 16, ituZone: 29, continent: 'EU', lat: 45.9, lng: 24.9 },
  'YP': { country: 'Romania', cqZone: 16, ituZone: 29, continent: 'EU', lat: 45.9, lng: 24.9 },
  'IS': { country: 'Iceland', cqZone: 14, ituZone: 27, continent: 'EU', lat: 64.9, lng: -19.0 },
  'TF': { country: 'Iceland', cqZone: 14, ituZone: 27, continent: 'EU', lat: 64.9, lng: -19.0 },
  'EI': { country: 'Ireland', cqZone: 14, ituZone: 27, continent: 'EU', lat: 53.4, lng: -8.2 },
  'EJ': { country: 'Ireland', cqZone: 14, ituZone: 27, continent: 'EU', lat: 53.4, lng: -8.2 },
  'GI': { country: 'Northern Ireland', cqZone: 14, ituZone: 27, continent: 'EU', lat: 54.6, lng: -6.0 },
  'GJ': { country: 'Guernsey', cqZone: 14, ituZone: 27, continent: 'EU', lat: 49.5, lng: -2.5 },
  'GU': { country: 'Guernsey', cqZone: 14, ituZone: 27, continent: 'EU', lat: 49.5, lng: -2.5 },
  'GW': { country: 'Wales', cqZone: 14, ituZone: 27, continent: 'EU', lat: 52.4, lng: -3.6 },
  'GX': { country: 'Wales', cqZone: 14, ituZone: 27, continent: 'EU', lat: 52.4, lng: -3.6 },
  'GY': { country: 'Isle of Man', cqZone: 14, ituZone: 27, continent: 'EU', lat: 54.2, lng: -4.5 },
  'GM': { country: 'Scotland', cqZone: 14, ituZone: 27, continent: 'EU', lat: 56.8, lng: -4.1 },
  'MS': { country: 'Jersey', cqZone: 14, ituZone: 27, continent: 'EU', lat: 49.2, lng: -2.1 },
  'MU': { country: 'Jersey', cqZone: 14, ituZone: 27, continent: 'EU', lat: 49.2, lng: -2.1 },
  'ZB': { country: 'Gibraltar', cqZone: 14, ituZone: 27, continent: 'EU', lat: 36.1, lng: -5.4 },
  'ZC4': { country: 'Cyprus', cqZone: 20, ituZone: 39, continent: 'AS', lat: 34.6, lng: 33.4 },
  'PA': { country: 'Portugal', cqZone: 14, ituZone: 27, continent: 'EU', lat: 39.4, lng: -8.2 },
  'CT': { country: 'Portugal', cqZone: 14, ituZone: 27, continent: 'EU', lat: 39.4, lng: -8.2 },
  'CT3': { country: 'Madeira', cqZone: 14, ituZone: 27, continent: 'EU', lat: 32.7, lng: -16.8 },
  'CU': { country: 'Azores', cqZone: 14, ituZone: 27, continent: 'EU', lat: 37.7, lng: -25.7 },

  // Africa
  'ZS': { country: 'South Africa', cqZone: 38, ituZone: 57, continent: 'AF', lat: -30.6, lng: 22.9 },
  'ZT': { country: 'South Africa', cqZone: 38, ituZone: 57, continent: 'AF', lat: -30.6, lng: 22.9 },
  'ZU': { country: 'South Africa', cqZone: 38, ituZone: 57, continent: 'AF', lat: -30.6, lng: 22.9 },
  'ZE': { country: 'Zimbabwe', cqZone: 38, ituZone: 53, continent: 'AF', lat: -19.0, lng: 29.2 },
  'Z2': { country: 'Zimbabwe', cqZone: 38, ituZone: 53, continent: 'AF', lat: -19.0, lng: 29.2 },
  '9G': { country: 'Ghana', cqZone: 37, ituZone: 51, continent: 'AF', lat: 7.7, lng: -1.0 },
  '5Z': { country: 'Kenya', cqZone: 37, ituZone: 53, continent: 'AF', lat: -0.0, lng: 37.9 },
  '5Y': { country: 'Kenya', cqZone: 37, ituZone: 53, continent: 'AF', lat: -0.0, lng: 37.9 },
  '9J': { country: 'Zambia', cqZone: 38, ituZone: 53, continent: 'AF', lat: -13.0, lng: 27.8 },
  '9L': { country: 'Sierra Leone', cqZone: 35, ituZone: 47, continent: 'AF', lat: 8.5, lng: -11.8 },
  '3C': { country: 'Equatorial Guinea', cqZone: 36, ituZone: 51, continent: 'AF', lat: 1.8, lng: 10.3 },
  '3D': { country: 'Cameroon', cqZone: 36, ituZone: 51, continent: 'AF', lat: 3.9, lng: 11.5 },
  '3E': { country: 'Liberia', cqZone: 35, ituZone: 47, continent: 'AF', lat: 6.3, lng: -9.7 },
  '3DA': { country: 'Angola', cqZone: 38, ituZone: 52, continent: 'AF', lat: -11.2, lng: 17.9 },
  '3DC': { country: 'Angola', cqZone: 38, ituZone: 52, continent: 'AF', lat: -11.2, lng: 17.9 },
  '5A': { country: 'Libya', cqZone: 33, ituZone: 48, continent: 'AF', lat: 27.0, lng: 17.2 },
  '5H': { country: 'Tanzania', cqZone: 37, ituZone: 53, continent: 'AF', lat: -6.4, lng: 34.9 },
  '5I': { country: 'Tanzania', cqZone: 37, ituZone: 53, continent: 'AF', lat: -6.4, lng: 34.9 },
  '6W': { country: 'Senegal', cqZone: 35, ituZone: 47, continent: 'AF', lat: 14.5, lng: -14.5 },
  '6Y': { country: 'Senegal', cqZone: 35, ituZone: 47, continent: 'AF', lat: 14.5, lng: -14.5 },
  '7O': { country: 'Yemen', cqZone: 39, ituZone: 49, continent: 'AS', lat: 15.4, lng: 48.5 },
  '8J': { country: 'Ivory Coast', cqZone: 35, ituZone: 47, continent: 'AF', lat: 7.5, lng: -5.5 },
  '8Q': { country: 'Ivory Coast', cqZone: 35, ituZone: 47, continent: 'AF', lat: 7.5, lng: -5.5 },
  '8R': { country: 'Ivory Coast', cqZone: 35, ituZone: 47, continent: 'AF', lat: 7.5, lng: -5.5 },
  'A4': { country: 'Oman', cqZone: 39, ituZone: 49, continent: 'AS', lat: 21.5, lng: 55.9 },
  'A6': { country: 'UAE', cqZone: 39, ituZone: 49, continent: 'AS', lat: 23.4, lng: 53.8 },
  'A7': { country: 'Qatar', cqZone: 39, ituZone: 49, continent: 'AS', lat: 25.3, lng: 51.2 },
  'A9': { country: 'Bahrain', cqZone: 39, ituZone: 49, continent: 'AS', lat: 26.1, lng: 50.6 },

  // Middle East
  '4W': { country: 'Yemen', cqZone: 39, ituZone: 49, continent: 'AS', lat: 15.4, lng: 48.5 },
  '4X': { country: 'Israel', cqZone: 20, ituZone: 39, continent: 'AS', lat: 31.9, lng: 35.2 },
  '4Z': { country: 'Israel', cqZone: 20, ituZone: 39, continent: 'AS', lat: 31.9, lng: 35.2 },
  '5B': { country: 'Cyprus', cqZone: 20, ituZone: 39, continent: 'AS', lat: 34.6, lng: 33.4 },
  '5X': { country: 'Uganda', cqZone: 37, ituZone: 53, continent: 'AF', lat: 1.0, lng: 32.3 },
  '6O': { country: 'Somalia', cqZone: 37, ituZone: 53, continent: 'AF', lat: 9.2, lng: 44.2 },
  '7Z': { country: 'Saudi Arabia', cqZone: 39, ituZone: 49, continent: 'AS', lat: 23.9, lng: 45.1 },
  '8Z': { country: 'Saudi Arabia', cqZone: 39, ituZone: 49, continent: 'AS', lat: 23.9, lng: 45.1 },
  '9A': { country: 'Iran', cqZone: 40, ituZone: 40, continent: 'AS', lat: 32.4, lng: 53.7 },

  // Asia
  'BV': { country: 'Taiwan', cqZone: 24, ituZone: 42, continent: 'AS', lat: 23.7, lng: 120.9 },
  'BX': { country: 'Taiwan', cqZone: 24, ituZone: 42, continent: 'AS', lat: 23.7, lng: 120.9 },
  'B': { country: 'China', cqZone: 23, ituZone: 42, continent: 'AS', lat: 35.9, lng: 104.1 },
  'BA': { country: 'China', cqZone: 23, ituZone: 42, continent: 'AS', lat: 35.9, lng: 104.1 },
  'BY': { country: 'China', cqZone: 23, ituZone: 42, continent: 'AS', lat: 35.9, lng: 104.1 },
  'BZ': { country: 'China', cqZone: 23, ituZone: 42, continent: 'AS', lat: 35.9, lng: 104.1 },
  '3H': { country: 'China', cqZone: 23, ituZone: 42, continent: 'AS', lat: 35.9, lng: 104.1 },
  '3I': { country: 'China', cqZone: 23, ituZone: 42, continent: 'AS', lat: 35.9, lng: 104.1 },
  'JA': { country: 'Japan', cqZone: 25, ituZone: 45, continent: 'AS', lat: 36.2, lng: 138.3 },
  'JE': { country: 'Japan', cqZone: 25, ituZone: 45, continent: 'AS', lat: 36.2, lng: 138.3 },
  'JF': { country: 'Japan', cqZone: 25, ituZone: 45, continent: 'AS', lat: 36.2, lng: 138.3 },
  'JG': { country: 'Japan', cqZone: 25, ituZone: 45, continent: 'AS', lat: 36.2, lng: 138.3 },
  'JH': { country: 'Japan', cqZone: 25, ituZone: 45, continent: 'AS', lat: 36.2, lng: 138.3 },
  'JI': { country: 'Japan', cqZone: 25, ituZone: 45, continent: 'AS', lat: 36.2, lng: 138.3 },
  'JJ': { country: 'Japan', cqZone: 25, ituZone: 45, continent: 'AS', lat: 36.2, lng: 138.3 },
  'JK': { country: 'Japan', cqZone: 25, ituZone: 45, continent: 'AS', lat: 36.2, lng: 138.3 },
  'JL': { country: 'Japan', cqZone: 25, ituZone: 45, continent: 'AS', lat: 36.2, lng: 138.3 },
  'JM': { country: 'Japan', cqZone: 25, ituZone: 45, continent: 'AS', lat: 36.2, lng: 138.3 },
  'JN': { country: 'Japan', cqZone: 25, ituZone: 45, continent: 'AS', lat: 36.2, lng: 138.3 },
  'JO': { country: 'Japan', cqZone: 25, ituZone: 45, continent: 'AS', lat: 36.2, lng: 138.3 },
  'JP': { country: 'Japan', cqZone: 25, ituZone: 45, continent: 'AS', lat: 36.2, lng: 138.3 },
  'JQ': { country: 'Japan', cqZone: 25, ituZone: 45, continent: 'AS', lat: 36.2, lng: 138.3 },
  'JR': { country: 'Japan', cqZone: 25, ituZone: 45, continent: 'AS', lat: 36.2, lng: 138.3 },
  'JS': { country: 'Japan', cqZone: 25, ituZone: 45, continent: 'AS', lat: 36.2, lng: 138.3 },
  'JT': { country: 'Japan', cqZone: 25, ituZone: 45, continent: 'AS', lat: 36.2, lng: 138.3 },
  'JU': { country: 'Japan', cqZone: 25, ituZone: 45, continent: 'AS', lat: 36.2, lng: 138.3 },
  'JV': { country: 'Japan', cqZone: 25, ituZone: 45, continent: 'AS', lat: 36.2, lng: 138.3 },
  'JW': { country: 'Japan', cqZone: 25, ituZone: 45, continent: 'AS', lat: 36.2, lng: 138.3 },
  'JX': { country: 'Japan', cqZone: 25, ituZone: 45, continent: 'AS', lat: 36.2, lng: 138.3 },
  'JY': { country: 'Japan', cqZone: 25, ituZone: 45, continent: 'AS', lat: 36.2, lng: 138.3 },
  'JZ': { country: 'Japan', cqZone: 25, ituZone: 45, continent: 'AS', lat: 36.2, lng: 138.3 },
  'HL': { country: 'South Korea', cqZone: 25, ituZone: 44, continent: 'AS', lat: 37.6, lng: 126.9 },
  'HM': { country: 'North Korea', cqZone: 25, ituZone: 44, continent: 'AS', lat: 40.3, lng: 127.1 },
  'DS': { country: 'South Korea', cqZone: 25, ituZone: 44, continent: 'AS', lat: 37.6, lng: 126.9 },
  'DU': { country: 'Philippines', cqZone: 27, ituZone: 42, continent: 'AS', lat: 12.9, lng: 121.8 },
  'DW': { country: 'Philippines', cqZone: 27, ituZone: 42, continent: 'AS', lat: 12.9, lng: 121.8 },
  'XU': { country: 'Cambodia', cqZone: 26, ituZone: 41, continent: 'AS', lat: 12.6, lng: 104.9 },
  'XV': { country: 'Vietnam', cqZone: 26, ituZone: 41, continent: 'AS', lat: 16.0, lng: 107.8 },
  'HS': { country: 'Thailand', cqZone: 26, ituZone: 41, continent: 'AS', lat: 15.9, lng: 100.9 },
  'HT': { country: 'Thailand', cqZone: 26, ituZone: 41, continent: 'AS', lat: 15.9, lng: 100.9 },
  'V2': { country: 'Hong Kong', cqZone: 24, ituZone: 42, continent: 'AS', lat: 22.3, lng: 114.2 },
  'VR': { country: 'Hong Kong', cqZone: 24, ituZone: 42, continent: 'AS', lat: 22.3, lng: 114.2 },
  'VU': { country: 'India', cqZone: 22, ituZone: 41, continent: 'AS', lat: 20.6, lng: 78.9 },
  'AT': { country: 'India', cqZone: 22, ituZone: 41, continent: 'AS', lat: 20.6, lng: 78.9 },
  'AX': { country: 'India', cqZone: 22, ituZone: 41, continent: 'AS', lat: 20.6, lng: 78.9 },
  'P': { country: 'Pakistan', cqZone: 21, ituZone: 41, continent: 'AS', lat: 30.2, lng: 69.3 },
  'AP': { country: 'Pakistan', cqZone: 21, ituZone: 41, continent: 'AS', lat: 30.2, lng: 69.3 },
  'PK': { country: 'Pakistan', cqZone: 21, ituZone: 41, continent: 'AS', lat: 30.2, lng: 69.3 },
  'S': { country: 'Singapore', cqZone: 27, ituZone: 42, continent: 'AS', lat: 1.4, lng: 103.8 },
  'S6': { country: 'Singapore', cqZone: 27, ituZone: 42, continent: 'AS', lat: 1.4, lng: 103.8 },
  'W': { country: 'Malaysia', cqZone: 27, ituZone: 42, continent: 'AS', lat: 4.2, lng: 101.7 },
  'V4': { country: 'Malaysia', cqZone: 27, ituZone: 42, continent: 'AS', lat: 4.2, lng: 101.7 },
  'W2': { country: 'Brunei', cqZone: 27, ituZone: 42, continent: 'AS', lat: 4.9, lng: 114.9 },
  'V8': { country: 'Brunei', cqZone: 27, ituZone: 42, continent: 'AS', lat: 4.9, lng: 114.9 },
  'P': { country: 'Indonesia', cqZone: 28, ituZone: 42, continent: 'AS', lat: -2.5, lng: 113.7 },
  'PK': { country: 'Indonesia', cqZone: 28, ituZone: 42, continent: 'AS', lat: -2.5, lng: 113.7 },
  'Y': { country: 'Indonesia', cqZone: 28, ituZone: 42, continent: 'AS', lat: -2.5, lng: 113.7 },
  'YB': { country: 'Indonesia', cqZone: 28, ituZone: 42, continent: 'AS', lat: -2.5, lng: 113.7 },
  'YC': { country: 'Indonesia', cqZone: 28, ituZone: 42, continent: 'AS', lat: -2.5, lng: 113.7 },
  'YD': { country: 'Indonesia', cqZone: 28, ituZone: 42, continent: 'AS', lat: -2.5, lng: 113.7 },
  'YE': { country: 'Indonesia', cqZone: 28, ituZone: 42, continent: 'AS', lat: -2.5, lng: 113.7 },
  'PK': { country: 'Indonesia', cqZone: 28, ituZone: 42, continent: 'AS', lat: -2.5, lng: 113.7 },
  '9M': { country: 'Malaysia', cqZone: 27, ituZone: 42, continent: 'AS', lat: 4.2, lng: 101.7 },
  '9M2': { country: 'Malaysia', cqZone: 27, ituZone: 42, continent: 'AS', lat: 4.2, lng: 101.7 },
  '9M6': { country: 'Malaysia', cqZone: 27, ituZone: 42, continent: 'AS', lat: 4.2, lng: 101.7 },
  '9M8': { country: 'Malaysia', cqZone: 27, ituZone: 42, continent: 'AS', lat: 4.2, lng: 101.7 },

  // Australia & Oceania
  'VK': { country: 'Australia', cqZone: 30, ituZone: 54, continent: 'OC', lat: -25.3, lng: 133.8 },
  'ZL': { country: 'New Zealand', cqZone: 32, ituZone: 60, continent: 'OC', lat: -40.9, lng: 174.9 },
  'ZM': { country: 'New Zealand', cqZone: 32, ituZone: 60, continent: 'OC', lat: -40.9, lng: 174.9 },
  'FK': { country: 'Fiji', cqZone: 32, ituZone: 60, continent: 'OC', lat: -17.7, lng: 178.1 },
  '3D2': { country: 'Fiji', cqZone: 32, ituZone: 60, continent: 'OC', lat: -17.7, lng: 178.1 },
  'KH0': { country: 'Mariana Islands', cqZone: 31, ituZone: 61, continent: 'OC', lat: 15.1, lng: 145.7 },
  'KH1': { country: 'Baker/Howland', cqZone: 31, ituZone: 61, continent: 'OC', lat: 0.2, lng: -176.5 },
  'KH2': { country: 'Guam', cqZone: 31, ituZone: 61, continent: 'OC', lat: 13.4, lng: 144.8 },
  'KH3': { country: 'Johnston Atoll', cqZone: 31, ituZone: 62, continent: 'OC', lat: 16.7, lng: -169.5 },
  'KH4': { country: 'Midway Islands', cqZone: 31, ituZone: 62, continent: 'OC', lat: 28.2, lng: -177.4 },
  'KH5': { country: 'Palmyra/Jarvis', cqZone: 31, ituZone: 61, continent: 'OC', lat: 5.9, lng: -162.1 },
  'KH6': { country: 'Hawaii', cqZone: 31, ituZone: 62, continent: 'OC', lat: 21.3, lng: -157.9 },
  'KH7': { country: 'Kermadec', cqZone: 32, ituZone: 60, continent: 'OC', lat: -29.3, lng: -177.9 },
  'KH8': { country: 'American Samoa', cqZone: 32, ituZone: 62, continent: 'OC', lat: -14.3, lng: -170.1 },
  'KH9': { country: 'Wake Island', cqZone: 31, ituZone: 61, continent: 'OC', lat: 19.3, lng: 166.6 },
  'ZS8': { country: 'South Africa Islands', cqZone: 38, ituZone: 57, continent: 'AF', lat: -37.7, lng: 12.2 },
  'ZS9': { country: 'South Africa Islands', cqZone: 38, ituZone: 57, continent: 'AF', lat: -37.7, lng: 12.2 },
  '3Y': { country: 'Bouvet Island', cqZone: 38, ituZone: 57, continent: 'AF', lat: -54.4, lng: 3.4 },
  'VP8': { country: 'Falkland Islands', cqZone: 13, ituZone: 4, continent: 'SA', lat: -51.8, lng: -59.5 },
  'VP9': { country: 'Bermuda', cqZone: 5, ituZone: 2, continent: 'NA', lat: 32.3, lng: -64.8 },
};

/**
 * Lookup country info for a callsign
 */
export function lookupCallsign(callsign) {
  if (!callsign) return null;

  const upperCallsign = callsign.toUpperCase();
  
  // Try exact 2-letter prefix first
  if (upperCallsign.length >= 2) {
    const prefix2 = upperCallsign.substring(0, 2);
    if (DXCC_DATABASE[prefix2]) {
      return { prefix: prefix2, ...DXCC_DATABASE[prefix2] };
    }
  }

  // Try 1-letter prefix
  if (upperCallsign.length >= 1) {
    const prefix1 = upperCallsign.substring(0, 1);
    if (DXCC_DATABASE[prefix1]) {
      return { prefix: prefix1, ...DXCC_DATABASE[prefix1] };
    }
  }

  return null;
}

/**
 * Get country name from callsign
 */
export function getCountryForCallsign(callsign) {
  const info = lookupCallsign(callsign);
  return info?.country || 'Unknown';
}

/**
 * Get CQ zone from callsign
 */
export function getCQZoneForCallsign(callsign) {
  const info = lookupCallsign(callsign);
  return info?.cqZone || null;
}

/**
 * Get ITU zone from callsign
 */
export function getITUZoneForCallsign(callsign) {
  const info = lookupCallsign(callsign);
  return info?.ituZone || null;
}

/**
 * Get continent from callsign
 */
export function getContinentForCallsign(callsign) {
  const info = lookupCallsign(callsign);
  return info?.continent || null;
}

/**
 * Get full info for callsign
 */
export function getCallsignInfo(callsign) {
  return lookupCallsign(callsign);
}

/**
 * Format callsign info for display
 */
export function formatCallsignInfo(callsign) {
  const info = getCallsignInfo(callsign);
  if (!info) return null;

  return {
    country: info.country,
    cqZone: `CQ ${info.cqZone}`,
    ituZone: `ITU ${info.ituZone}`,
    continent: info.continent,
    coordinates: `${info.lat.toFixed(1)}°, ${info.lng.toFixed(1)}°`
  };
}
