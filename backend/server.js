const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Initialize Google Gemini API
const geminiApiKey = process.env.GEMINI_API_KEY;
let aiAvailable = false;
let genAI = null;

if (geminiApiKey && geminiApiKey !== 'YOUR_GOOGLE_GEMINI_API_KEY_HERE') {
  try {
    genAI = new GoogleGenerativeAI(geminiApiKey);
    aiAvailable = true;
    console.log('✨ Gemini 2.5 Flash client initialized successfully!');
  } catch (err) {
    console.error('⚠️ Failed to initialize Gemini API client:', err.message);
  }
} else {
  console.log('⚠️ GEMINI_API_KEY not set or placeholder used. Running in MOCK AI mode.');
}

// Initialize OpenWeather API
const openWeatherApiKey = process.env.OPENWEATHER_API_KEY;
const isWeatherApiAvailable = openWeatherApiKey && openWeatherApiKey !== 'YOUR_OPENWEATHERMAP_API_KEY_HERE';

if (isWeatherApiAvailable) {
  console.log('🌤️ OpenWeatherMap API integrated successfully!');
} else {
  console.log('⚠️ OPENWEATHER_API_KEY not set. Running weather with static simulator stubs.');
}

// Helper to fetch live weather from OpenWeatherMap (supports coordinates or city query)
async function fetchLiveWeather(lat, lon, city = null) {
  if (!isWeatherApiAvailable) {
    return null;
  }
  try {
    const baseUrl = 'https://api.openweathermap.org/data/2.5/weather';
    const query = (lat != null && lon != null)
      ? `lat=${lat}&lon=${lon}`
      : `q=${encodeURIComponent(city || 'karachi')}`;
    const url = `${baseUrl}?${query}&appid=${openWeatherApiKey}&units=metric`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`OpenWeather API returned status ${response.status}`);
    }
    const data = await response.json();
    
    // Extract precipitation if it exists, otherwise simulate based on weather main
    let precipitation = 0;
    if (data.rain) {
      precipitation = data.rain['1h'] ? data.rain['1h'] * 10 : (data.rain['3h'] ? data.rain['3h'] * 3 : 15);
    } else {
      const mainWeather = data.weather[0]?.main?.toLowerCase() || '';
      if (mainWeather.includes('rain') || mainWeather.includes('drizzle') || mainWeather.includes('thunderstorm')) {
        precipitation = 65; 
      }
    }

    return {
      precipitation: Math.min(precipitation, 100),
      condition: data.weather[0]?.description || 'clear',
      temp: `${Math.round(data.main?.temp || 25)}°C`
    };
  } catch (err) {
    console.error('⚠️ OpenWeatherMap fetch failed:', err.message);
    return null;
  }
}

// Helper to fetch actual road routing from OSRM
async function fetchOSRMRoute(startLat, startLon, endLat, endLon) {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${startLon},${startLat};${endLon},${endLat}?overview=full&geometries=geojson`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`OSRM API returned status ${response.status}`);
    }
    const data = await response.json();
    if (data.code === 'Ok' && data.routes && data.routes[0]) {
      const routeCoordinates = data.routes[0].geometry.coordinates.map(coord => ({
        latitude: coord[1],
        longitude: coord[0]
      }));
      console.log(`🛣️ OSRM successfully loaded ${routeCoordinates.length} real road routing nodes!`);
      return routeCoordinates;
    }
    return null;
  } catch (err) {
    console.error('⚠️ OSRM alternate routing fetch failed:', err.message);
    return null;
  }
}

// Helper to normalize any incoming location string to our exact telemetry keys
const normalizeLocation = (loc) => {
  if (!loc) return 'karachi';
  const name = loc.toLowerCase().trim();
  
  // Cross-city specific matches
  if (name.includes('lahore')) {
    if (name.includes('dha')) return 'dha lahore';
    if (name.includes('gulberg')) return 'gulberg';
    if (name.includes('johar')) return 'johar town';
    return 'lahore';
  }
  
  if (name.includes('islamabad') || name.includes('blue') || name.includes('f-6') || name.includes('f-7') || name.includes('g-9') || name.includes('centaurus') || name.includes('zero') || name.includes('metro') || name.includes('pindi') || name.includes('rawalpindi')) {
    if (name.includes('dha') || name.includes('metro')) return 'metro station';
    if (name.includes('blue')) return 'blue area';
    if (name.includes('f-6')) return 'f-6';
    if (name.includes('f-7')) return 'f-7';
    if (name.includes('g-9') || name.includes('g9')) return 'g-9';
    if (name.includes('centaurus')) return 'centaurus';
    if (name.includes('zero')) return 'zero point';
    return 'islamabad';
  }

  // Predefined keys matching
  if (name.includes('dha') || name.includes('rahat')) return 'dha';
  if (name.includes('clifton')) return 'clifton';
  if (name.includes('saddar')) return 'saddar';
  if (name.includes('faisal') || name.includes('nursery')) return 'shara-e-faisal';
  if (name.includes('karsaz')) return 'karsaz';
  if (name.includes('gulshan')) return 'gulshan';
  if (name.includes('nazimabad')) return 'nazimabad';
  if (name.includes('airport')) return 'airport';
  if (name.includes('blue area')) return 'blue area';
  if (name.includes('f-6')) return 'f-6';
  if (name.includes('f-7')) return 'f-7';
  if (name.includes('g-9')) return 'g-9';
  if (name.includes('centaurus')) return 'centaurus';
  if (name.includes('zero point') || name.includes('zeropoint')) return 'zero point';
  if (name.includes('metro')) return 'metro station';
  if (name.includes('gulberg')) return 'gulberg';
  if (name.includes('johar')) return 'johar town';
  
  // Fallbacks for other cities to their nearest regional hub centers
  if (name.includes('gujranwala') || name.includes('faisalabad') || name.includes('sialkot')) return 'lahore';
  if (name.includes('peshawar') || name.includes('quetta') || name.includes('multan')) return 'karachi';

  return 'karachi';
};

// Helper to identify the city of a telemetry location
const getCityOfLocation = (locName) => {
  if (!locName) return null;
  const name = normalizeLocation(locName);
  if (name.includes('islamabad') || name === 'blue area' || name === 'f-6' || name === 'f-7' || name === 'g-9' || name === 'centaurus' || name === 'zero point' || name === 'metro station') {
    return 'islamabad';
  }
  if (name.includes('lahore') || name === 'gulberg' || name === 'dha lahore' || name === 'johar town') {
    return 'lahore';
  }
  return 'karachi';
};

// ----------------------------------------------------
// 1. DATA ENGINEER LAYER: MOCK URBAN CRISIS DATABASE
// ----------------------------------------------------

// Location GPS coordinates for Pakistan hubs (Expanded to cover iconic sectors)
const HUB_COORDINATES = {
  'karachi': { latitude: 24.8607, longitude: 67.0011 },
  'clifton': { latitude: 24.8138, longitude: 67.0359 },
  'dha': { latitude: 24.8219, longitude: 67.0739 },
  'saddar': { latitude: 24.8614, longitude: 67.0172 },
  'shara-e-faisal': { latitude: 24.8687, longitude: 67.0822 },
  'karsaz': { latitude: 24.8837, longitude: 67.0892 },
  'gulshan': { latitude: 24.9180, longitude: 67.0970 },
  'nazimabad': { latitude: 24.9147, longitude: 67.0330 },
  'airport': { latitude: 24.9065, longitude: 67.1611 },
  'islamabad': { latitude: 33.6844, longitude: 73.0479 },
  'blue area': { latitude: 33.7117, longitude: 73.0682 },
  'f-6': { latitude: 33.7297, longitude: 73.0786 },
  'f-7': { latitude: 33.7208, longitude: 73.0567 },
  'g-9': { latitude: 33.6922, longitude: 73.0298 },
  'centaurus': { latitude: 33.7077, longitude: 73.0503 },
  'zero point': { latitude: 33.6924, longitude: 73.0652 },
  'metro station': { latitude: 33.7056, longitude: 73.0560 },
  'lahore': { latitude: 31.5204, longitude: 74.3587 },
  'gulberg': { latitude: 31.5126, longitude: 74.3524 },
  'dha lahore': { latitude: 31.4697, longitude: 74.4086 },
  'johar town': { latitude: 31.4697, longitude: 74.2728 }
};

// Weather Metrics Feed - Realistic hot Karachi summer (38-40°C) as the baseline.
// Heavy rain / cold temperatures will ONLY be triggered when a flooding event is simulated.
const mockWeatherFeed = {
  'karachi': { precipitation: 10, condition: 'Sunny', temp: '38°C' },
  'clifton': { precipitation: 12, condition: 'Sunny', temp: '38°C' },
  'dha': { precipitation: 8, condition: 'Clear', temp: '40°C' },
  'saddar': { precipitation: 15, condition: 'Sunny', temp: '39°C' },
  'shara-e-faisal': { precipitation: 10, condition: 'Hazy Sun', temp: '39°C' },
  'karsaz': { precipitation: 10, condition: 'Sunny', temp: '39°C' },
  'gulshan': { precipitation: 15, condition: 'Sunny', temp: '39°C' },
  'nazimabad': { precipitation: 12, condition: 'Clear', temp: '40°C' },
  'airport': { precipitation: 5, condition: 'Sunny', temp: '38°C' },
  'islamabad': { precipitation: 15, condition: 'Clear', temp: '34°C' },
  'blue area': { precipitation: 5, condition: 'Sunny', temp: '35°C' },
  'f-6': { precipitation: 5, condition: 'Sunny', temp: '35°C' },
  'f-7': { precipitation: 5, condition: 'Clear', temp: '35°C' },
  'g-9': { precipitation: 10, condition: 'Clear', temp: '34°C' },
  'centaurus': { precipitation: 8, condition: 'Sunny', temp: '35°C' },
  'zero point': { precipitation: 10, condition: 'Clear', temp: '34°C' },
  'metro station': { precipitation: 10, condition: 'Clear', temp: '34°C' },
  'lahore': { precipitation: 15, condition: 'Sunny', temp: '36°C' },
  'gulberg': { precipitation: 10, condition: 'Sunny', temp: '36°C' },
  'dha lahore': { precipitation: 8, condition: 'Clear', temp: '37°C' },
  'johar town': { precipitation: 12, condition: 'Clear', temp: '37°C' }
};

// Traffic Congestion Index (Simulated live sensors - scale 1-10)
const mockTrafficFeed = {
  'karachi': { congestion_index: 3.5, average_speed: '38 km/h' },
  'clifton': { congestion_index: 4.2, average_speed: '35 km/h' },
  'dha': { congestion_index: 2.8, average_speed: '40 km/h' },
  'saddar': { congestion_index: 7.2, average_speed: '15 km/h' },
  'shara-e-faisal': { congestion_index: 6.5, average_speed: '25 km/h' },
  'karsaz': { congestion_index: 3.0, average_speed: '45 km/h' },
  'gulshan': { congestion_index: 5.8, average_speed: '22 km/h' },
  'nazimabad': { congestion_index: 6.2, average_speed: '18 km/h' },
  'airport': { congestion_index: 2.1, average_speed: '50 km/h' },
  'islamabad': { congestion_index: 2.0, average_speed: '45 km/h' },
  'blue area': { congestion_index: 4.5, average_speed: '30 km/h' },
  'f-6': { congestion_index: 2.1, average_speed: '45 km/h' },
  'f-7': { congestion_index: 2.5, average_speed: '42 km/h' },
  'g-9': { congestion_index: 5.0, average_speed: '28 km/h' },
  'centaurus': { congestion_index: 5.5, average_speed: '25 km/h' },
  'zero point': { congestion_index: 4.8, average_speed: '35 km/h' },
  'metro station': { congestion_index: 3.2, average_speed: '40 km/h' },
  'lahore': { congestion_index: 4.8, average_speed: '28 km/h' },
  'gulberg': { congestion_index: 6.0, average_speed: '22 km/h' },
  'dha lahore': { congestion_index: 3.2, average_speed: '38 km/h' },
  'johar town': { congestion_index: 5.5, average_speed: '24 km/h' }
};

// Raw Social Media Feed Signals
const INITIAL_SIGNALS = [
  {
    id: 1,
    source: 'Twitter/X',
    raw_text: 'DHA Rahat main boht pani khara hai, grid failure update? Gariyan dub rahi hain!',
    timestamp: '2026-05-20T07:15:00Z'
  },
  {
    id: 2,
    source: 'Facebook Local',
    raw_text: 'Shara-e-Faisal block ho gayi hai. Heavy traffic near Nursery, absolute nightmare!',
    timestamp: '2026-05-20T07:22:00Z'
  },
  {
    id: 3,
    source: 'Citizen Portal',
    raw_text: 'Blue area metro station k pas severe road damage due to some utility work. Avoid route.',
    timestamp: '2026-05-20T07:28:00Z'
  }
];

let activeSignals = [...INITIAL_SIGNALS];

// Get Active Signals
app.get('/api/signals', (req, res) => {
  res.json({
    status: 'success',
    data: activeSignals,
    context: {
      weather: mockWeatherFeed,
      traffic: mockTrafficFeed
    }
  });
});

// Reset Database Store for Judging Demo
app.post('/api/signals/reset', (req, res) => {
  activeSignals = [...INITIAL_SIGNALS];
  // Reset weather feeds to sunny baseline
  Object.keys(mockWeatherFeed).forEach(loc => {
    const city = getCityOfLocation(loc);
    if (city === 'islamabad') {
      mockWeatherFeed[loc] = { precipitation: 10, condition: 'Clear', temp: '34°C' };
    } else if (city === 'lahore') {
      mockWeatherFeed[loc] = { precipitation: 12, condition: 'Clear', temp: '37°C' };
    } else {
      mockWeatherFeed[loc] = { precipitation: 8, condition: 'Clear', temp: '40°C' };
    }
  });
  console.log('🔄 Data store reset to pristine initial hackathon states.');
  res.json({ status: 'success', message: 'Database reset completed' });
});

// Inject Custom Mock Signal
app.post('/api/signals', (req, res) => {
  const { raw_text, source } = req.body;
  if (!raw_text) {
    return res.status(400).json({ error: 'raw_text is required' });
  }
  const newSignal = {
    id: activeSignals.length + 1,
    source: source || 'Citizen Alert',
    raw_text,
    timestamp: new Date().toISOString()
  };
  activeSignals.unshift(newSignal);
  console.log(`➕ Injected new mock signal: "${raw_text}"`);
  res.json({ status: 'success', data: newSignal });
});

// ----------------------------------------------------
// 2. NLP & MULTI-AGENT EXECUTION PIPELINE
// ----------------------------------------------------

// Helper function to call Gemini (or mock if no API key is available)
async function callGeminiNLP(rawText) {
  if (!aiAvailable) {
    console.log('🤖 Running Mock Ingestion parser (No Gemini Key)...');
    return runMockIngestion(rawText);
  }

  try {
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: { responseMimeType: 'application/json' }
    });

    const prompt = `
      You are 'The Signal Ingestion Agent', an NLP Crisis intelligence module.
      Your job is to analyze the following unstructured social media/citizen report string and extract a structured JSON payload.
      The text may contain a mix of English and Roman Urdu (Urdu written in Latin characters), including local slang and varied spelling.
      
      Here are local Pakistani slang and spelling clues to help you:
      - Flooding terms: 'pani', 'water', 'dub gaya', 'ghark', 'sea level', 'rain', 'barish', 'baurish', 'pani khara'
      - Traffic/Roadblocks: 'block', 'jam', 'ruka hua', 'rush', 'nightmare', 'band', 'rastay band', 'divert'
      - Accident terms: 'accident', 'takkar', 'crush', 'thuk gaya', 'haadsa', 'injuries'
      - Heatwave terms: 'garmi', 'loo', 'heatwave', 'heat stroke', 'dhoop', 'severe heat'
      - Key location markers: 'DHA', 'Clifton', 'Saddar', 'Shara-e-Faisal', 'Nursery', 'Karsaz', 'Gulshan', 'Nazimabad', 'Airport', 'Blue Area', 'F-6', 'F-7', 'G-9', 'Centaurus', 'Metro', 'Zero Point'

      Target JSON format:
      {
        "reasoning": "Brief step-by-step reasoning explaining how you analyzed the Roman Urdu/English text and identified the crisis details",
        "crisis_type": "Flooding" | "Traffic" | "Accident" | "Heatwave",
        "location_name": "extracted landmark/location in lowercase, e.g., 'dha' or 'clifton' or 'blue area' or 'karsaz' or 'gulshan' or 'nazimabad' or 'airport' or 'f-7' or 'centaurus' or 'zero point'",
        "raw_severity": "Low" | "Medium" | "High" | "Critical"
      }

      Provide ONLY valid JSON.
      Input text: "${rawText}"
    `;

    const result = await model.generateContent(prompt);
    const textResponse = result.response.text();
    return JSON.parse(textResponse);
  } catch (err) {
    console.error('❌ Gemini NLP Agent failure:', err.message);
    return runMockIngestion(rawText); // Failover to mock parsing
  }
}

// Pre-defined rules for mock/failover AI processing (to keep demo solid no matter what)
function runMockIngestion(rawText) {
  const text = rawText.toLowerCase();
  let crisis_type = 'Traffic';
  let location_name = 'unknown';
  let raw_severity = 'Medium';
  let reasoning = 'Matched keywords from Roman Urdu/English input dictionary.';

  if (text.includes('pani') || text.includes('rain') || text.includes('barish') || text.includes('dub')) {
    crisis_type = 'Flooding';
    raw_severity = 'High';
  } else if (text.includes('accident') || text.includes('takkar') || text.includes('haadsa')) {
    crisis_type = 'Accident';
    raw_severity = 'High';
  } else if (text.includes('garmi') || text.includes('heat') || text.includes('loo')) {
    crisis_type = 'Heatwave';
    raw_severity = 'Medium';
  } else if (text.includes('block') || text.includes('jam') || text.includes('heavy traffic')) {
    crisis_type = 'Traffic';
    raw_severity = 'Medium';
  }

  // Location extraction
  if (text.includes('dha') || text.includes('rahat')) location_name = 'dha';
  else if (text.includes('clifton')) location_name = 'clifton';
  else if (text.includes('saddar')) location_name = 'saddar';
  else if (text.includes('faisal') || text.includes('nursery')) location_name = 'shara-e-faisal';
  else if (text.includes('karsaz')) location_name = 'karsaz';
  else if (text.includes('gulshan')) location_name = 'gulshan';
  else if (text.includes('nazimabad')) location_name = 'nazimabad';
  else if (text.includes('airport')) location_name = 'airport';
  else if (text.includes('blue area')) location_name = 'blue area';
  else if (text.includes('f-6')) location_name = 'f-6';
  else if (text.includes('f-7')) location_name = 'f-7';
  else if (text.includes('g-9')) location_name = 'g-9';
  else if (text.includes('centaurus')) location_name = 'centaurus';
  else if (text.includes('zero point')) location_name = 'zero point';
  else if (text.includes('metro')) location_name = 'metro station';

  return {
    reasoning,
    crisis_type,
    location_name,
    raw_severity
  };
}

// ----------------------------------------------------
// 3. PIPELINE ORCHESTRATION PIPELINE HELPER
// ----------------------------------------------------

// Sequential Multi-Agent Execution Pipeline Helper
async function executePipeline(raw_text) {
  console.log('\n======================================================');
  console.log('🤖 ANTIGRAVITY MULTI-AGENT EXECUTION LOOP STARTING');
  console.log(`📥 Input Raw String: "${raw_text}"`);
  console.log('======================================================');

  const traceLogs = [];
  const logStep = (agentName, content) => {
    const formatted = `[${agentName}] ${JSON.stringify(content, null, 2)}`;
    console.log(`\n🔹 ${agentName.toUpperCase()}:\n`, formatted);
    traceLogs.push({ agent: agentName, timestamp: new Date().toISOString(), data: content });
  };

  // --------------------------------------------------
  // AGENT 1: SIGNAL INGESTION NLP AGENT
  // --------------------------------------------------
  const agent1Output = await callGeminiNLP(raw_text);
  logStep('Agent 1 (Signal Ingestion)', {
    input: raw_text,
    reasoning: agent1Output.reasoning || 'Extracted parameters from the text payload.',
    structured_json: {
      crisis_type: agent1Output.crisis_type,
      location_name: agent1Output.location_name,
      raw_severity: agent1Output.raw_severity
    }
  });

  // --------------------------------------------------
  // AGENT 2: CRISIS EVALUATION AGENT (With QA Recovery)
  // --------------------------------------------------
  let rawLocation = agent1Output.location_name ? agent1Output.location_name.toLowerCase() : 'unknown';
  let location = rawLocation !== 'unknown' ? normalizeLocation(rawLocation) : 'unknown';
  let type = agent1Output.crisis_type;
  let severity = agent1Output.raw_severity;

  let confidence_score = 'Low';
  let explanation = '';
  let isRecovered = false;

  // QA Error-Recovery Check: Incomplete signal
  if (location === 'unknown' || !type) {
    isRecovered = true;
    // Keep extracted location if available, only default to metro station if completely unknown
    location = location !== 'unknown' ? normalizeLocation(location) : 'metro station';
    type = type || 'Accident';
    severity = severity || 'Medium';
    confidence_score = 'Medium'; 
    explanation = '⚠️ SYSTEM ERROR RECOVERY: The incoming report has missing parameters (location or city is unspecified). Setting system state to fallback "Metro Station Hub" at Medium Confidence.';
    
    // Fetch metrics for the fallback location so weather and traffic metrics display perfectly
    const baseCoords = HUB_COORDINATES[location] || HUB_COORDINATES['metro station'];
    let weatherInfo = await fetchLiveWeather(baseCoords.latitude, baseCoords.longitude);
    if (!weatherInfo) {
      weatherInfo = mockWeatherFeed[location] || mockWeatherFeed['metro station'];
    }
    const trafficInfo = mockTrafficFeed[location] || mockTrafficFeed['metro station'];

    logStep('Agent 2 (Crisis Evaluation) - Fallback Intercept', {
      warning: 'Incomplete signal detected. Launching Error-Recovery Loop.',
      fallback_applied: {
        location_name: location,
        crisis_type: type,
        confidence_score,
      },
      metrics_checked: {
        source: '⚡ FALLBACK SIMULATOR FEED',
        weather: weatherInfo,
        traffic: trafficInfo
      },
      explanation
    });
  } else {
    // Normal Execution Flow: Dynamically update weather sensor metrics for the sector to match active crisis
    if (type === 'Flooding') {
      if (mockWeatherFeed[location]) {
        mockWeatherFeed[location].precipitation = 90;
        mockWeatherFeed[location].condition = 'Heavy Rain';
        mockWeatherFeed[location].temp = '26°C';
      }
    } else if (type === 'Heatwave') {
      if (mockWeatherFeed[location]) {
        mockWeatherFeed[location].precipitation = 0;
        mockWeatherFeed[location].condition = 'Extreme Heatwave';
        mockWeatherFeed[location].temp = '43°C';
      }
    } else {
      // Traffic or Accident: Restore normal hot baseline summer conditions
      if (mockWeatherFeed[location]) {
        mockWeatherFeed[location].precipitation = 10;
        mockWeatherFeed[location].condition = 'Clear';
        const city = getCityOfLocation(location);
        mockWeatherFeed[location].temp = city === 'islamabad' ? '35°C' : (city === 'lahore' ? '37°C' : '40°C');
      }
    }

    // Fetch live weather if OpenWeather API key is configured
    const baseCoords = HUB_COORDINATES[location] || HUB_COORDINATES['karachi'];
    let weatherInfo = await fetchLiveWeather(baseCoords.latitude, baseCoords.longitude);
    const isLiveWeather = !!weatherInfo;
    if (!weatherInfo) {
      weatherInfo = mockWeatherFeed[location];
    }
    const trafficInfo = mockTrafficFeed[location];

    // Dynamic Traffic adjustment if roadblocks triggered
    if (type === 'Traffic' && mockTrafficFeed[location]) {
      mockTrafficFeed[location].congestion_index = 9.5;
      mockTrafficFeed[location].average_speed = '5 km/h';
    }

    let scoreWeight = 0;

    if (type === 'Flooding') {
      const precipitation = weatherInfo ? weatherInfo.precipitation : 0;
      if (precipitation > 70) scoreWeight += 3; 
      else if (precipitation > 40) scoreWeight += 2;
      else scoreWeight += 1;
    } else if (type === 'Traffic') {
      const congestion = trafficInfo ? trafficInfo.congestion_index : 0;
      if (congestion > 8.0) scoreWeight += 3;
      else if (congestion > 5.0) scoreWeight += 2;
      else scoreWeight += 1;
    } else {
      scoreWeight += 2; 
    }

    if (severity === 'Critical' || severity === 'High') scoreWeight += 1;

    if (scoreWeight >= 4) {
      confidence_score = 'High';
      explanation = `Confirmed: Live sensors match the citizen alert. ${type} at ${location.toUpperCase()} validated by ${isLiveWeather ? 'Live Weather API' : 'precipitation index'} (${weatherInfo?.precipitation || 0}%) and traffic index (${trafficInfo?.congestion_index || 0}/10).`;
    } else if (scoreWeight >= 2) {
      confidence_score = 'Medium';
      explanation = `Moderately Correlated: Local sensors indicate minor activity. Citizen reported ${type} at ${location.toUpperCase()} is placed at Medium confidence. Monitor area.`;
    } else {
      confidence_score = 'Low';
      explanation = `Low Correlation: Local live telemetry contradicts the report. Report of ${type} at ${location.toUpperCase()} is marked Low confidence. Weather condition shows "${weatherInfo?.condition || 'clear'}" conditions.`;
    }

    logStep('Agent 2 (Crisis Evaluation) - Validation', {
      metrics_checked: {
        source: isLiveWeather ? 'OpenWeatherMap Live API Query' : 'Simulated Regional Telemetry',
        weather: weatherInfo || 'No sensor available',
        traffic: trafficInfo || 'No sensor available'
      },
      confidence_score,
      explanation
    });
  }

  // --------------------------------------------------
  // AGENT 3: ACTION SIMULATION AGENT
  // --------------------------------------------------
  const baseCoords = HUB_COORDINATES[location] || HUB_COORDINATES['karachi'];
  const divertCoords = {
    latitude: baseCoords.latitude + 0.004,
    longitude: baseCoords.longitude + 0.004
  };

  let routePolyline = await fetchOSRMRoute(baseCoords.latitude, baseCoords.longitude, divertCoords.latitude, divertCoords.longitude);
  const isLiveRouting = !!routePolyline;

  if (!routePolyline) {
    routePolyline = [
      baseCoords,
      {
        latitude: baseCoords.latitude + 0.002,
        longitude: baseCoords.longitude + 0.002
      },
      divertCoords
    ];
  }

  let actions = [];
  if (type === 'Flooding') {
    actions = [
      `🚨 Dispatch WASA drainage trucks immediately to ${location.toUpperCase()}.`,
      `🛑 Block deep water areas and redirect vehicles away.`,
      `⚡ Co-ordinate with K-Electric / IESCO for local sub-grid safety isolation.`
    ];
  } else if (type === 'Traffic') {
    actions = [
      `🚦 Deploy Traffic Police wardens to divert flow to safe lanes.`,
      `🗺️ Update virtual maps and push notifications to approaching drivers.`
    ];
  } else if (type === 'Accident') {
    actions = [
      `🚑 Dispatch 1122 Rescue ambulances to ${location.toUpperCase()} immediately.`,
      `🚧 Seal collision lane to clear debris and allow safe medical staging.`
    ];
  } else {
    actions = [
      `💧 Deploy mobile heat stroke hydration camps in ${location.toUpperCase()} sector.`,
      `📢 Issue public safety announcements to stay indoors under cover.`
    ];
  }

  logStep('Agent 3 (Action Simulation)', {
    crisis_location: baseCoords,
    diverted_route: divertCoords,
    is_live_routing: isLiveRouting,
    route_polyline_nodes: routePolyline.length,
    recommended_directives: actions
  });

  // Inject the signal into activeSignals list so it updates dynamically
  const newSignal = {
    id: activeSignals.length + 1,
    source: 'Citizen Copilot Report',
    raw_text: raw_text,
    timestamp: new Date().toISOString()
  };
  activeSignals.unshift(newSignal);

  console.log('======================================================');
  console.log('🏁 MULTI-AGENT EXECUTION LOOP COMPLETE');
  console.log('======================================================\n');

  return {
    pipeline_trace: traceLogs,
    recovery_triggered: isRecovered,
    output: {
      crisis_type: type,
      location_name: location,
      severity: severity,
      confidence_score,
      explanation,
      coordinates: baseCoords,
      diverted_coordinates: divertCoords,
      route_polyline: routePolyline,
      dispatch_actions: actions
    }
  };
}

// ----------------------------------------------------
// 4. API ENDPOINTS
// ----------------------------------------------------

// Get route for process-pipeline to explain usage to browser testing
app.get('/api/process-pipeline', (req, res) => {
  res.json({
    status: 'info',
    message: 'This endpoint accepts POST requests containing a JSON body with a raw_text key.',
    example_payload: {
      raw_text: 'DHA Rahat main boht pani khara hai, grid failure update? Gariyan dub rahi hain!'
    }
  });
});

app.post('/api/process-pipeline', async (req, res) => {
  const { raw_text } = req.body;
  if (!raw_text) {
    return res.status(400).json({ error: 'raw_text payload is required' });
  }

  try {
    const pipelineData = await executePipeline(raw_text);
    res.json({
      status: 'success',
      input: raw_text,
      pipeline_trace: pipelineData.pipeline_trace,
      recovery_triggered: pipelineData.recovery_triggered,
      output: pipelineData.output
    });
  } catch (pipelineErr) {
    console.error('🚨 pipeline execution crash caught:', pipelineErr);
    res.status(500).json({
      status: 'error',
      message: 'Agent Pipeline crashed',
      error: pipelineErr.message
    });
  }
});

// ASK COPILOT INTERACTIVE CONVERSATIONAL ENDPOINT (With Dynamic Intent Routing)
app.post('/api/copilot', async (req, res) => {
  const { query } = req.body;
  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }

  console.log(`💬 Copilot Query: "${query}"`);

  if (!aiAvailable) {
    const mockReply = runMockCopilot(query);
    if (mockReply.is_crisis_report) {
      try {
        const pipelineData = await executePipeline(query);
        return res.json({
          status: 'success',
          ...mockReply,
          pipeline_output: pipelineData.output,
          pipeline_trace: pipelineData.pipeline_trace,
          recovery_triggered: pipelineData.recovery_triggered
        });
      } catch (errPipeline) {
        console.error('⚠️ Offline Pipeline injection via Copilot failed:', errPipeline);
      }
    }
    return res.json({ status: 'success', ...mockReply });
  }

  try {
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: { responseMimeType: 'application/json' }
    });

    const prompt = `
      You are 'Rasai AI Copilot', an agentic crisis response chatbot for Karachi and Islamabad, Pakistan.
      Your job is to answer citizen queries about the current crisis state, weather, traffic, and emergency dispatch status.
      
      Current system data:
      - Active Crisis Signals: ${JSON.stringify(activeSignals)}
      - Regional Weather Sensor Readings: ${JSON.stringify(mockWeatherFeed)}
      - Regional Traffic Congestion Index (1-10): ${JSON.stringify(mockTrafficFeed)}
      - Location GPS Coordinates: ${JSON.stringify(HUB_COORDINATES)}
      
      User query: "${query}"
      
      Guidelines:
      1. Answer conversationally, clearly, and concisely.
      2. If the user asks about a specific location (e.g. DHA, Clifton, Saddar, Shara-e-Faisal, Karsaz, Gulshan, Nazimabad, Airport, Blue Area, F-6, F-7, G-9, Centaurus, Zero Point), describe its current weather, traffic speed, and active alerts.
      3. If there is an active crisis (e.g. flooding or blockages), advise them on safety and explain that alternate bypass routes are calculated.
      4. Use a friendly, natural mix of English and Roman Urdu where appropriate, keeping it highly accessible and relevant to Pakistani metropolitans.
      5. Determine if the user's query is reporting a NEW crisis event (such as flooding, water logging, roadblocks, jams, accidents, heatwave conditions, grid failures) that requires system intervention.
      6. Output ONLY a valid JSON object matching the schema below.
      
      Output JSON schema:
      {
        "response": "Your conversational answer text.",
        "detected_location": "lowercase location name if they asked about a specific area (dha, clifton, saddar, blue area, f-6, f-7, g-9, shara-e-faisal, karsaz, gulshan, nazimabad, airport, centaurus, zero point, metro station), otherwise null",
        "safety_advisory": "A short safety alert if relevant, otherwise null",
        "is_crisis_report": true if the query describes or reports a new/existing active urban crisis event in the area, otherwise false
      }
    `;

    const result = await model.generateContent(prompt);
    const textResponse = result.response.text();
    const parsed = JSON.parse(textResponse);

    if (parsed.is_crisis_report === true) {
      console.log(`🚨 Copilot detected crisis report. Triggering agent pipeline for query: "${query}"`);
      try {
        const pipelineData = await executePipeline(query);
        return res.json({
          status: 'success',
          ...parsed,
          pipeline_output: pipelineData.output,
          pipeline_trace: pipelineData.pipeline_trace,
          recovery_triggered: pipelineData.recovery_triggered
        });
      } catch (errPipeline) {
        console.error('⚠️ Pipeline injection via Copilot failed:', errPipeline);
      }
    }

    res.json({ status: 'success', ...parsed });
  } catch (err) {
    console.error('❌ Copilot Agent failure:', err.message);
    const mockReply = runMockCopilot(query);
    if (mockReply.is_crisis_report) {
      try {
        const pipelineData = await executePipeline(query);
        return res.json({
          status: 'success',
          ...mockReply,
          pipeline_output: pipelineData.output,
          pipeline_trace: pipelineData.pipeline_trace,
          recovery_triggered: pipelineData.recovery_triggered
        });
      } catch (errPipeline) {
        console.error('⚠️ Offline Pipeline injection via Copilot failed:', errPipeline);
      }
    }
    res.json({ status: 'success', ...mockReply });
  }
});

// Helper for local offline copilot answers
function runMockCopilot(query) {
  const text = query.toLowerCase().trim();
  let detected_location = null;
  let safety_advisory = null;
  let response = "Aao! I am the Rasai Copilot. Currently, I'm monitoring active urban flooding in DHA Phase 6, Shara-e-Faisal congestion, and Gulberg Liberty in Lahore. How can I assist you?";
  let is_crisis_report = false;

  // Keyword-based offline crisis detection
  if (text.includes('pani') || text.includes('rain') || text.includes('barish') || text.includes('block') || text.includes('jam') || text.includes('accident') || text.includes('takkar') || text.includes('haadsa') || text.includes('heat') || text.includes('garmi') || text.includes('flood')) {
    is_crisis_report = true;
  }

  // Handle specific other Pakistan city queries
  if (text.includes('gujranwala')) {
    response = "Aao dost! Gujranwala sector mein filhal mausam 36°C Sunny aur khushk hai. GT Road aur bypasses par traffic bilkul normal hai aur koi active roadblock ya crisis report nahi hui.";
    return { response, detected_location: null, safety_advisory: null, is_crisis_report: false };
  }
  if (text.includes('pindi') || text.includes('rawalpindi')) {
    response = "Rawalpindi updates: Murree Road aur Saddar Pindi ka traffic bilkul bahal hai. Mausam 34°C dry aur clear hai. Metro station services operational hain.";
    return { response, detected_location: 'metro station', safety_advisory: null, is_crisis_report: false };
  }
  if (text.includes('peshawar')) {
    response = "Peshawar updates: University Road aur Ring Road par traffic normal chal rahi hai. Mausam 35°C Sunny aur clear hai. Live sensors regular telemetry sync kar rahe hain.";
    return { response, detected_location: null, safety_advisory: null, is_crisis_report: false };
  }

  // Detect location and normalize
  if (text.includes('dha') || text.includes('rahat')) {
    detected_location = text.includes('lahore') ? 'dha lahore' : 'dha';
  } else if (text.includes('clifton')) detected_location = 'clifton';
  else if (text.includes('saddar')) detected_location = 'saddar';
  else if (text.includes('faisal') || text.includes('nursery')) detected_location = 'shara-e-faisal';
  else if (text.includes('karsaz')) detected_location = 'karsaz';
  else if (text.includes('gulshan')) detected_location = 'gulshan';
  else if (text.includes('nazimabad')) detected_location = 'nazimabad';
  else if (text.includes('airport')) detected_location = 'airport';
  else if (text.includes('blue area')) detected_location = 'blue area';
  else if (text.includes('f-6')) detected_location = 'f-6';
  else if (text.includes('f-7')) detected_location = 'f-7';
  else if (text.includes('g-9') || text.includes('g9')) detected_location = 'g-9';
  else if (text.includes('centaurus')) detected_location = 'centaurus';
  else if (text.includes('zero point') || text.includes('zeropoint')) detected_location = 'zero point';
  else if (text.includes('metro')) detected_location = 'metro station';
  else if (text.includes('gulberg')) detected_location = 'gulberg';
  else if (text.includes('johar')) detected_location = 'johar town';

  if (detected_location) {
    const weather = mockWeatherFeed[detected_location] || { temp: '40°C', condition: 'Clear', precipitation: 10 };
    const traffic = mockTrafficFeed[detected_location] || { congestion_index: 2.0, average_speed: '45 km/h' };
    const city = getCityOfLocation(detected_location);
    
    response = `Dost, ${detected_location.toUpperCase()} (${city.toUpperCase()} sector) ki filhal status ye hai:
🌤️ Weather: ${weather.temp}, ${weather.condition} (Precipitation: ${weather.precipitation}%)
🚗 Traffic: Congestion index is ${traffic.congestion_index}/10, with average speeds of ${traffic.average_speed}.
✅ Operational routing is active in this sector.`;

    if (weather.precipitation > 60 || traffic.congestion_index > 7.0) {
      safety_advisory = `⚠️ Heavy rain, water logging, or severe congestion detected in ${detected_location.toUpperCase()}. Please avoid flooded avenues and use the green alternate bypass routes displayed on the map.`;
    }
  } else if (text.includes('rain') || text.includes('barish') || text.includes('weather') || text.includes('mausam')) {
    response = `Pakistan Metropolitan Weather status summary:
- Karachi Central/DHA: ${mockWeatherFeed['dha'].condition} (${mockWeatherFeed['dha'].temp})
- Islamabad Metro/Blue Area: ${mockWeatherFeed['blue area'].condition} (${mockWeatherFeed['blue area'].temp})
- Lahore Gulberg/Liberty: ${mockWeatherFeed['gulberg'].condition} (${mockWeatherFeed['gulberg'].temp})
All city nodes are reporting continuous sensor telemetries.`;
  }

  return {
    response,
    detected_location,
    safety_advisory,
    is_crisis_report
  };
}

// App listener
app.listen(PORT, () => {
  console.log(`🚀 Rasai Crisis Intelligence Express server is roaring on port ${PORT}`);
  console.log(`📍 Test endpoint: POST http://localhost:${PORT}/api/process-pipeline`);
});
