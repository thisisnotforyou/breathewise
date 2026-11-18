// Iconic places shown in the 3D "miniature" scene. Matched by distance to the searched city,
// then by state/region name, otherwise the scene shows the city centre.
export type Landmark = { name: string; hi: string; city: string; lat: number; lon: number; zoom?: number };

export const CITY_LANDMARKS: Landmark[] = [
  { city: "Delhi", name: "India Gate", hi: "इंडिया गेट", lat: 28.6129, lon: 77.2295 },
  { city: "Mumbai", name: "Gateway of India", hi: "गेटवे ऑफ़ इंडिया", lat: 18.922, lon: 72.8347 },
  { city: "Kolkata", name: "Victoria Memorial", hi: "विक्टोरिया मेमोरियल", lat: 22.5448, lon: 88.3426 },
  { city: "Chennai", name: "Marina Beach", hi: "मरीना बीच", lat: 13.05, lon: 80.2824, zoom: 15 },
  { city: "Bengaluru", name: "Vidhana Soudha", hi: "विधान सौध", lat: 12.9794, lon: 77.591 },
  { city: "Hyderabad", name: "Charminar", hi: "चारमीनार", lat: 17.3616, lon: 78.4747 },
  { city: "Agra", name: "Taj Mahal", hi: "ताज महल", lat: 27.1751, lon: 78.0421 },
  { city: "Jaipur", name: "Hawa Mahal", hi: "हवा महल", lat: 26.9239, lon: 75.8267 },
  { city: "Lucknow", name: "Bara Imambara", hi: "बड़ा इमामबाड़ा", lat: 26.8692, lon: 80.9128 },
  { city: "Varanasi", name: "Dashashwamedh Ghat", hi: "दशाश्वमेध घाट", lat: 25.3068, lon: 83.0104 },
  { city: "Amritsar", name: "Golden Temple", hi: "स्वर्ण मंदिर", lat: 31.62, lon: 74.8765 },
  { city: "Ahmedabad", name: "Sabarmati Ashram", hi: "साबरमती आश्रम", lat: 23.0607, lon: 72.5807 },
  { city: "Pune", name: "Shaniwar Wada", hi: "शनिवार वाड़ा", lat: 18.5195, lon: 73.8553 },
  { city: "Chandigarh", name: "Rock Garden", hi: "रॉक गार्डन", lat: 30.7525, lon: 76.8101 },
  { city: "Bhopal", name: "Taj-ul-Masajid", hi: "ताज-उल-मस्जिद", lat: 23.262, lon: 77.3945 },
  { city: "Patna", name: "Golghar", hi: "गोलघर", lat: 25.6213, lon: 85.1398 },
  { city: "Indore", name: "Rajwada", hi: "राजवाड़ा", lat: 22.7186, lon: 75.8553 },
  { city: "Gurugram", name: "Cyber Hub", hi: "साइबर हब", lat: 28.495, lon: 77.089 },
  { city: "Mysuru", name: "Mysore Palace", hi: "मैसूर पैलेस", lat: 12.3052, lon: 76.6552 },
  { city: "Kochi", name: "Fort Kochi", hi: "फ़ोर्ट कोच्चि", lat: 9.9683, lon: 76.2425 },
  { city: "Guwahati", name: "Kamakhya Temple", hi: "कामाख्या मंदिर", lat: 26.1664, lon: 91.7055 },
  { city: "Srinagar", name: "Dal Lake", hi: "डल झील", lat: 34.117, lon: 74.8726, zoom: 14 },
  { city: "Lahore", name: "Badshahi Mosque", hi: "बादशाही मस्जिद", lat: 31.5881, lon: 74.3099 },
  { city: "Dhaka", name: "Ahsan Manzil", hi: "अहसान मंज़िल", lat: 23.7086, lon: 90.4061 },
  { city: "Kathmandu", name: "Boudhanath Stupa", hi: "बौद्धनाथ स्तूप", lat: 27.7215, lon: 85.362 },
  { city: "Beijing", name: "Forbidden City", hi: "फ़ॉरबिडन सिटी", lat: 39.9163, lon: 116.3972, zoom: 15 },
  { city: "London", name: "Big Ben", hi: "बिग बेन", lat: 51.5007, lon: -0.1246 },
  { city: "Paris", name: "Eiffel Tower", hi: "एफ़िल टावर", lat: 48.8584, lon: 2.2945 },
  { city: "New York", name: "Empire State Building", hi: "एम्पायर स्टेट बिल्डिंग", lat: 40.7484, lon: -73.9857 },
  // --- More of India (state capitals and famous sites) ---
  { city: "Udaipur", name: "City Palace", hi: "सिटी पैलेस", lat: 24.5764, lon: 73.6835 },
  { city: "Jodhpur", name: "Mehrangarh Fort", hi: "मेहरानगढ़ किला", lat: 26.2978, lon: 73.0185 },
  { city: "Jaisalmer", name: "Jaisalmer Fort", hi: "जैसलमेर किला", lat: 26.9124, lon: 70.9126 },
  { city: "Ajmer", name: "Ajmer Sharif Dargah", hi: "अजमेर शरीफ़ दरगाह", lat: 26.4563, lon: 74.6283 },
  { city: "Gwalior", name: "Gwalior Fort", hi: "ग्वालियर किला", lat: 26.2306, lon: 78.1691 },
  { city: "Khajuraho", name: "Kandariya Mahadeva Temple", hi: "कंदारिया महादेव मंदिर", lat: 24.8522, lon: 79.9199 },
  { city: "Ujjain", name: "Mahakaleshwar Temple", hi: "महाकालेश्वर मंदिर", lat: 23.1828, lon: 75.7682 },
  { city: "Sanchi", name: "Great Stupa", hi: "सांची स्तूप", lat: 23.4793, lon: 77.7398 },
  { city: "Prayagraj", name: "Triveni Sangam", hi: "त्रिवेणी संगम", lat: 25.4246, lon: 81.8851, zoom: 14.5 },
  { city: "Ayodhya", name: "Ram Mandir", hi: "राम मंदिर", lat: 26.7956, lon: 82.1943 },
  { city: "Mathura", name: "Krishna Janmabhoomi", hi: "कृष्ण जन्मभूमि", lat: 27.5047, lon: 77.6697 },
  { city: "Haridwar", name: "Har Ki Pauri", hi: "हर की पौड़ी", lat: 29.956, lon: 78.17 },
  { city: "Rishikesh", name: "Laxman Jhula", hi: "लक्ष्मण झूला", lat: 30.126, lon: 78.329 },
  { city: "Shimla", name: "The Ridge", hi: "द रिज", lat: 31.1044, lon: 77.1734 },
  { city: "Manali", name: "Hadimba Temple", hi: "हिडिम्बा मंदिर", lat: 32.2484, lon: 77.1806 },
  { city: "Leh", name: "Shanti Stupa", hi: "शांति स्तूप", lat: 34.1736, lon: 77.5754 },
  { city: "Gangtok", name: "MG Marg", hi: "एमजी मार्ग", lat: 27.3291, lon: 88.6127 },
  { city: "Darjeeling", name: "Batasia Loop", hi: "बतासिया लूप", lat: 27.0189, lon: 88.2457 },
  { city: "Shillong", name: "Ward's Lake", hi: "वार्ड्स लेक", lat: 25.5747, lon: 91.8869 },
  { city: "Agartala", name: "Ujjayanta Palace", hi: "उज्जयंत महल", lat: 23.8366, lon: 91.2822 },
  { city: "Bodh Gaya", name: "Mahabodhi Temple", hi: "महाबोधि मंदिर", lat: 24.6959, lon: 84.9911 },
  { city: "Bhubaneswar", name: "Lingaraj Temple", hi: "लिंगराज मंदिर", lat: 20.2382, lon: 85.8338 },
  { city: "Puri", name: "Jagannath Temple", hi: "जगन्नाथ मंदिर", lat: 19.8048, lon: 85.818 },
  { city: "Konark", name: "Sun Temple", hi: "सूर्य मंदिर", lat: 19.8876, lon: 86.0945 },
  { city: "Goa", name: "Basilica of Bom Jesus", hi: "बॉम जीसस बेसिलिका", lat: 15.5009, lon: 73.9116 },
  { city: "Aurangabad", name: "Bibi Ka Maqbara", hi: "बीबी का मक़बरा", lat: 19.9014, lon: 75.3203 },
  { city: "Nagpur", name: "Deekshabhoomi", hi: "दीक्षाभूमि", lat: 21.1283, lon: 79.0663 },
  { city: "Vadodara", name: "Laxmi Vilas Palace", hi: "लक्ष्मी विलास पैलेस", lat: 22.2944, lon: 73.1915 },
  { city: "Kevadia", name: "Statue of Unity", hi: "स्टैच्यू ऑफ़ यूनिटी", lat: 21.838, lon: 73.7191 },
  { city: "Gandhinagar", name: "Akshardham", hi: "अक्षरधाम", lat: 23.229, lon: 72.674 },
  { city: "Hampi", name: "Virupaksha Temple", hi: "विरुपाक्ष मंदिर", lat: 15.335, lon: 76.46 },
  { city: "Thiruvananthapuram", name: "Padmanabhaswamy Temple", hi: "पद्मनाभस्वामी मंदिर", lat: 8.4828, lon: 76.9436 },
  { city: "Madurai", name: "Meenakshi Temple", hi: "मीनाक्षी मंदिर", lat: 9.9195, lon: 78.1193 },
  { city: "Thanjavur", name: "Brihadeeswarar Temple", hi: "बृहदेश्वर मंदिर", lat: 10.7828, lon: 79.1318 },
  { city: "Kanyakumari", name: "Vivekananda Rock", hi: "विवेकानंद शिला", lat: 8.078, lon: 77.555, zoom: 15 },
  { city: "Rameswaram", name: "Ramanathaswamy Temple", hi: "रामनाथस्वामी मंदिर", lat: 9.2881, lon: 79.3174 },
  { city: "Puducherry", name: "Promenade Beach", hi: "प्रोमेनेड बीच", lat: 11.9331, lon: 79.8357 },
  { city: "Vijayawada", name: "Kanaka Durga Temple", hi: "कनक दुर्गा मंदिर", lat: 16.5154, lon: 80.6052 },
  { city: "Howrah", name: "Howrah Bridge", hi: "हावड़ा ब्रिज", lat: 22.5851, lon: 88.3468 },
  { city: "Port Blair", name: "Cellular Jail", hi: "सेल्युलर जेल", lat: 11.6743, lon: 92.7478 },
  // --- World ---
  { city: "Karachi", name: "Mazar-e-Quaid", hi: "मज़ार-ए-क़ायद", lat: 24.875, lon: 67.04 },
  { city: "Islamabad", name: "Faisal Mosque", hi: "फ़ैसल मस्जिद", lat: 33.7295, lon: 73.0372 },
  { city: "Dubai", name: "Burj Khalifa", hi: "बुर्ज ख़लीफ़ा", lat: 25.1972, lon: 55.2744 },
  { city: "Singapore", name: "Marina Bay Sands", hi: "मरीना बे सैंड्स", lat: 1.2834, lon: 103.8607 },
  { city: "Bangkok", name: "Grand Palace", hi: "ग्रैंड पैलेस", lat: 13.75, lon: 100.4913 },
  { city: "Shanghai", name: "The Bund", hi: "द बंड", lat: 31.24, lon: 121.49, zoom: 15.5 },
  { city: "Tokyo", name: "Tokyo Tower", hi: "टोक्यो टावर", lat: 35.6586, lon: 139.7454 },
  { city: "Sydney", name: "Sydney Opera House", hi: "सिडनी ओपेरा हाउस", lat: -33.8568, lon: 151.2153 },
  { city: "Cairo", name: "Pyramids of Giza", hi: "गीज़ा के पिरामिड", lat: 29.9792, lon: 31.1342, zoom: 15 },
  { city: "Istanbul", name: "Hagia Sophia", hi: "हागिया सोफ़िया", lat: 41.0086, lon: 28.9802 },
  { city: "Moscow", name: "Red Square", hi: "रेड स्क्वायर", lat: 55.7539, lon: 37.6208 },
  { city: "Rome", name: "Colosseum", hi: "कोलोसियम", lat: 41.8902, lon: 12.4922 },
  { city: "Berlin", name: "Brandenburg Gate", hi: "ब्रैंडेनबर्ग गेट", lat: 52.5163, lon: 13.3777 },
  { city: "Barcelona", name: "Sagrada Família", hi: "सग्रादा फ़मिलिया", lat: 41.4036, lon: 2.1744 },
  { city: "San Francisco", name: "Golden Gate Bridge", hi: "गोल्डन गेट ब्रिज", lat: 37.8199, lon: -122.4783, zoom: 15 },
  { city: "Rio de Janeiro", name: "Christ the Redeemer", hi: "क्राइस्ट द रिडीमर", lat: -22.9519, lon: -43.2105, zoom: 15.5 },
];

export function km(aLat: number, aLon: number, bLat: number, bLon: number) {
  const r = Math.PI / 180;
  const x = (bLon - aLon) * r * Math.cos(((aLat + bLat) / 2) * r);
  const y = (bLat - aLat) * r;
  return Math.sqrt(x * x + y * y) * 6371;
}

/** exact = the precise spot the user picked; city = hand-picked landmark in that city;
 *  nearby = found on Wikipedia near the place; none = the place's own centre. */
export type Scene = { lat: number; lon: number; zoom: number; landmark?: Landmark; scope: "city" | "nearby" | "none" | "exact" };

// Alternative spellings, so "Bangalore" matches "Bengaluru", etc.
const ALIAS: Record<string, string> = {
  "new delhi": "delhi",
  bangalore: "bengaluru",
  gurgaon: "gurugram",
  mysore: "mysuru",
  cochin: "kochi",
  allahabad: "prayagraj",
  bombay: "mumbai",
  calcutta: "kolkata",
  madras: "chennai",
  trivandrum: "thiruvananthapuram",
  pondicherry: "puducherry",
  benares: "varanasi",
  banaras: "varanasi",
  "chhatrapati sambhajinagar": "aurangabad",
  panaji: "goa",
};
const norm = (s = "") => {
  const k = s.toLowerCase().split(",")[0].trim();
  return ALIAS[k] ?? k;
};

/** Hand-picked landmarks are only used for the city they belong to: within ~12 km of the place,
 *  or up to 35 km when the searched city has the same name (big cities like Mumbai). This keeps,
 *  say, Faridabad from showing Delhi's India Gate. */
export const SAME_PLACE_KM = 12;
export const SAME_CITY_KM = 35;

export function sceneFor(lat: number, lon: number, city?: string): Scene {
  const want = norm(city);
  const near = CITY_LANDMARKS.map((l) => ({ l, d: km(lat, lon, l.lat, l.lon) }))
    .filter(({ l, d }) => d < SAME_PLACE_KM || (want && norm(l.city) === want && d < SAME_CITY_KM))
    .sort((a, b) => a.d - b.d)[0];
  if (near) return { lat: near.l.lat, lon: near.l.lon, zoom: near.l.zoom ?? 16.6, landmark: near.l, scope: "city" };
  return { lat, lon, zoom: 15, scope: "none" };
}
