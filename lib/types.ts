export type Lang = "en" | "hi";

export type Hour = { time: string; aqi: number | null; pm25: number | null };
export type Day = { date: string; min: number; avg: number; max: number };
export type Hotspot = { lat: number; lon: number; aqi: number; name?: string };

export type Weather = {
  time: string;
  tempC: number | null;
  humidity: number | null;
  windKmh: number | null;
  windDir: number | null;
  precipMm: number | null;
  cloud: number | null;
};

export type AirData = {
  /** exact = a specific address/shop/locality was picked, so the 3D view centres on that spot. */
  location: { name: string; city: string; region?: string; lat: number; lon: number; timezone: string; exact?: boolean };
  current: {
    time: string;
    aqi: number;
    pm25: number | null;
    pm10: number | null;
    no2: number | null;
    o3: number | null;
    co: number | null;
    so2: number | null;
  };
  hours: Hour[]; // next 24 hours
  days: Day[]; // up to 7 days
  cleanWindows: Hour[]; // best daytime hours today/tomorrow
  hotspots: Hotspot[];
  hotspotSource: "stations" | "model";
  weather?: Weather | null;
};

export type Profile = {
  members: number;
  household: string[];
  commute: string;
  home: string;
  notes: string;
  /** Free-text day plan, e.g. "3 PM school pickup, grocery errand, evening walk". */
  routine: string;
};

export type Exposure = "low" | "medium" | "high";

export type Plan = {
  headline: string;
  summary: string;
  schedule: { time: string; activity: string; why: string; exposure: Exposure; fixed?: boolean }[];
  family: { who: string; advice: string }[];
  indoor: { tip: string; cost: string }[];
  commute: { option: string; why: string }[];
  swaps: string[];
  /** What changes if they follow a suggestion; numbers only when the data supports them. */
  impact: { action: string; effect: string }[];
  weekAhead: string;
  healthWatch: string[];
};

export type ChatMsg = { role: "user" | "assistant"; content: string };
