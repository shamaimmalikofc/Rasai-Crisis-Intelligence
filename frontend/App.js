import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Platform,
  SafeAreaView,
  StatusBar,
  TextInput,
  Image
} from 'react-native';

// Platform-specific Map Imports: prevents native react-native-maps from compiling on Web
import { MapView, Marker, Polyline } from './MapViewComponent';

// NOTE FOR PHYSICAL MOBILE TESTING:
// When scanning QR with Expo Go on a physical phone, 'localhost' will fail to connect.
// Replace 'localhost' with your computer's local IP address (e.g., 'http://192.168.10.25:5000').
// Run `ipconfig` (Windows) or `ifconfig` (Mac) to find your local IP address.
const BACKEND_URL = 'https://rasai-backend-152856278316.us-central1.run.app';
const ENABLE_NATIVE_MAPS = false; // Set true only after native maps are tested successfully

// Mock Coordinates for the Web fallback vector map
const MAP_MARKERS = {
  'karachi': { x: 150, y: 380, label: 'Karachi Central' },
  'clifton': { x: 110, y: 440, label: 'Clifton Beach' },
  'dha': { x: 230, y: 410, label: 'DHA Phase 6' },
  'saddar': { x: 140, y: 330, label: 'Saddar Bazaar' },
  'shara-e-faisal': { x: 290, y: 300, label: 'Shara-e-Faisal' },
  'karsaz': { x: 310, y: 340, label: 'Karsaz Hub' },
  'gulshan': { x: 340, y: 380, label: 'Gulshan Chowrangi' },
  'nazimabad': { x: 200, y: 320, label: 'Nazimabad Sector' },
  'airport': { x: 360, y: 440, label: 'Jinnah Int Airport' },
  'islamabad': { x: 450, y: 120, label: 'Islamabad Central' },
  'blue area': { x: 480, y: 150, label: 'Blue Area Metro' },
  'f-6': { x: 420, y: 90, label: 'F-6 Markaz' },
  'f-7': { x: 440, y: 70, label: 'F-7 Markaz' },
  'g-9': { x: 380, y: 160, label: 'G-9 Markaz' },
  'centaurus': { x: 490, y: 110, label: 'Centaurus Mall' },
  'zero point': { x: 520, y: 180, label: 'Zero Point Interchange' },
  'metro station': { x: 460, y: 170, label: 'Metro Hub' },
  'lahore': { x: 600, y: 220, label: 'Lahore Central' },
  'gulberg': { x: 620, y: 240, label: 'Gulberg Liberty' },
  'dha lahore': { x: 650, y: 260, label: 'DHA Lahore' },
  'johar town': { x: 580, y: 280, label: 'Johar Town Chowk' }
};

// Exact regional coordinate map for offline resiliency, telemetry correctness and native map pin rendering
const OFFLINE_COORDINATES = {
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

export default function App() {
  const [loading, setLoading] = useState(false);
  const [activeSignal, setActiveSignal] = useState(null);
  const [telemetry, setTelemetry] = useState(null);
  const [selectedAgentTab, setSelectedAgentTab] = useState('agent1');
  const [systemLogs, setSystemLogs] = useState([]);
  const [customText, setCustomText] = useState('');
  const [copilotResponse, setCopilotResponse] = useState(null);

  const mapRef = useRef(null);

  // Auto-center native map when crisis location updates
  useEffect(() => {
    if (activeSignal && mapRef.current && Platform.OS !== 'web') {
      try {
        mapRef.current.animateToRegion({
          latitude: activeSignal.coordinates.latitude,
          longitude: activeSignal.coordinates.longitude,
          latitudeDelta: 0.08,
          longitudeDelta: 0.08
        }, 1000);
        addLog(`🛰️ Map camera auto-centered on ${activeSignal.location_name.toUpperCase()}`);
      } catch (err) {
        console.log('Map animation failed:', err);
      }
    }
  }, [activeSignal]);

  // Fetch initial signal list or state on start
  useEffect(() => {
    addLog('System Initialized. Awaiting crisis simulations...');
  }, []);

  const addLog = (msg) => {
    setSystemLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 15)]);
  };

  const handleTrigger = async (type, customPayload = null) => {
    setLoading(true);
    let payload = '';

    if (customPayload) {
      payload = customPayload;
      addLog(`Dispatched Custom Alert: "${payload.substring(0, 35)}..."`);
    } else if (type === 'flooding') {
      payload = 'DHA Rahat main boht pani khara hai, grid failure update? Gariyan dub rahi hain!';
      addLog('Dispatched: DHA Flooding Alert (Mixed Roman Urdu/English)');
    } else if (type === 'roadblock') {
      payload = 'Blue area metro station k pas severe road damage due to some utility work. Avoid route.';
      addLog('Dispatched: Blue Area Road Damage Report');
    } else if (type === 'broken') {
      payload = 'Accident near a metro station';
      addLog('Dispatched Incomplete Signal QA Test (No City/Station details)');
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/process-pipeline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw_text: payload }),
      });

      const json = await response.json();
      if (json.status === 'success') {
        setActiveSignal(json.output);
        setTelemetry(json.pipeline_trace);
        
        if (json.recovery_triggered) {
          addLog('🚨 QA Warning: Broken signal caught. Error-recovery triggered.');
        } else {
          addLog(`✅ Crisis identified: ${json.output.crisis_type} at ${json.output.location_name.toUpperCase()}`);
        }
        addLog(`📊 Confidence: ${json.output.confidence_score} | Severity: ${json.output.severity}`);
      } else {
        addLog('❌ Backend execution failed.');
      }
    } catch (err) {
      console.log('Error triggering pipeline:', err);
      addLog('❌ Server connection error. Running locally in simulated offline mode!');
      
      // Fallback local mock simulation if server is completely offline to keep prototype interactive!
      simulateOfflineFallback(type, payload);
    } finally {
      setLoading(false);
    }
  };

  const simulateOfflineFallback = (type, customPayload = null) => {
    addLog('⚠️ Offline Mode: Simulating multi-agent response locally...');
    setTimeout(() => {
      let mockOutput = {};
      let mockTrace = [];
      
      let loc = 'dha';
      let ctype = 'Flooding';
      let text = (customPayload || '').toLowerCase();
      
      // Determine crisis type based on text matching
      if (text.includes('pani') || text.includes('rain') || text.includes('barish') || text.includes('flood') || text.includes('dub')) {
        ctype = 'Flooding';
      } else if (text.includes('accident') || text.includes('takkar') || text.includes('haadsa')) {
        ctype = 'Accident';
      } else if (text.includes('heat') || text.includes('garmi') || text.includes('loo') || text.includes('heatwave')) {
        ctype = 'Heatwave';
      } else if (text.includes('block') || text.includes('jam') || text.includes('heavy traffic') || text.includes('traffic')) {
        ctype = 'Traffic';
      }

      // Determine location
      if (text.includes('dha') || text.includes('rahat')) loc = 'dha';
      else if (text.includes('clifton')) loc = 'clifton';
      else if (text.includes('saddar')) loc = 'saddar';
      else if (text.includes('faisal') || text.includes('nursery')) loc = 'shara-e-faisal';
      else if (text.includes('karsaz')) loc = 'karsaz';
      else if (text.includes('gulshan')) loc = 'gulshan';
      else if (text.includes('nazimabad')) loc = 'nazimabad';
      else if (text.includes('airport')) loc = 'airport';
      else if (text.includes('blue area')) loc = 'blue area';
      else if (text.includes('f-6')) loc = 'f-6';
      else if (text.includes('f-7')) loc = 'f-7';
      else if (text.includes('g-9') || text.includes('g9')) loc = 'g-9';
      else if (text.includes('centaurus')) loc = 'centaurus';
      else if (text.includes('zero point')) loc = 'zero point';
      else if (text.includes('metro')) loc = 'metro station';

      // Using global OFFLINE_COORDINATES for offline resiliency and telemetry consistency

      // Set weather dynamically: Karachi baseline hot 38-40°C, rainy only if flooded.
      let weatherInfo = {
        precipitation: 10,
        condition: 'Clear',
        temp: (loc.includes('islamabad') || loc.includes('blue') || loc.includes('f-6') || loc.includes('f-7') || loc.includes('g-9') || loc.includes('centaurus') || loc.includes('zero') || loc.includes('metro')) ? '35°C' : '40°C'
      };

      if (ctype === 'Flooding') {
        weatherInfo = { precipitation: 90, condition: 'Heavy Rain', temp: '26°C' };
      } else if (ctype === 'Heatwave') {
        weatherInfo = { precipitation: 0, condition: 'Extreme Heatwave', temp: '43°C' };
      }

      const baseCoords = OFFLINE_COORDINATES[loc] || OFFLINE_COORDINATES['karachi'];
      
      if (ctype === 'Flooding') {
        mockOutput = {
          crisis_type: 'Flooding',
          location_name: loc,
          severity: 'High',
          confidence_score: 'High',
          explanation: `Confirmed locally: Simulated precipitation index (${weatherInfo.precipitation}%) correlates with ${loc.toUpperCase()} flooding reports.`,
          coordinates: { latitude: baseCoords.latitude, longitude: baseCoords.longitude },
          diverted_coordinates: { latitude: baseCoords.latitude + 0.004, longitude: baseCoords.longitude + 0.004 },
          route_polyline: [
            { latitude: baseCoords.latitude, longitude: baseCoords.longitude },
            { latitude: baseCoords.latitude + 0.002, longitude: baseCoords.longitude + 0.002 },
            { latitude: baseCoords.latitude + 0.004, longitude: baseCoords.longitude + 0.004 }
          ],
          dispatch_actions: ['🚨 Dispatching WASA de-watering machinery immediately.', '🛑 Block traffic and reroute through adjacent bypass link.']
        };
      } else if (ctype === 'Traffic') {
        mockOutput = {
          crisis_type: 'Traffic',
          location_name: loc,
          severity: 'Medium',
          confidence_score: 'High',
          explanation: `Verified: Traffic congestion index is high in ${loc.toUpperCase()}. Redirecting flow.`,
          coordinates: { latitude: baseCoords.latitude, longitude: baseCoords.longitude },
          diverted_coordinates: { latitude: baseCoords.latitude + 0.004, longitude: baseCoords.longitude + 0.004 },
          route_polyline: [
            { latitude: baseCoords.latitude, longitude: baseCoords.longitude },
            { latitude: baseCoords.latitude + 0.002, longitude: baseCoords.longitude + 0.002 },
            { latitude: baseCoords.latitude + 0.004, longitude: baseCoords.longitude + 0.004 }
          ],
          dispatch_actions: ['🚦 Rerouting traffic from blocked sectors.', '📢 Push SMS alert to citizens nearby.']
        };
      } else if (ctype === 'Heatwave') {
        mockOutput = {
          crisis_type: 'Heatwave',
          location_name: loc,
          severity: 'High',
          confidence_score: 'High',
          explanation: `Confirmed: Severe local temperature index (${weatherInfo.temp}) indicates high risk of heat stroke in ${loc.toUpperCase()}.`,
          coordinates: { latitude: baseCoords.latitude, longitude: baseCoords.longitude },
          diverted_coordinates: { latitude: baseCoords.latitude + 0.004, longitude: baseCoords.longitude + 0.004 },
          route_polyline: [
            { latitude: baseCoords.latitude, longitude: baseCoords.longitude },
            { latitude: baseCoords.latitude + 0.002, longitude: baseCoords.longitude + 0.002 },
            { latitude: baseCoords.latitude + 0.004, longitude: baseCoords.longitude + 0.004 }
          ],
          dispatch_actions: ['💧 Deploy mobile heat stroke hydration camps immediately.', '📢 Alerting local medical centers to stage hydration services.']
        };
      } else {
        mockOutput = {
          crisis_type: ctype || 'Accident',
          location_name: loc,
          severity: 'High',
          confidence_score: 'Medium',
          explanation: `QA Local Validation: Collision or incident reported near ${loc.toUpperCase()}. Redirecting traffic.`,
          coordinates: { latitude: baseCoords.latitude, longitude: baseCoords.longitude },
          diverted_coordinates: { latitude: baseCoords.latitude + 0.004, longitude: baseCoords.longitude + 0.004 },
          route_polyline: [
            { latitude: baseCoords.latitude, longitude: baseCoords.longitude },
            { latitude: baseCoords.latitude + 0.002, longitude: baseCoords.longitude + 0.002 },
            { latitude: baseCoords.latitude + 0.004, longitude: baseCoords.longitude + 0.004 }
          ],
          dispatch_actions: ['🚑 Rescue 1122 ambulances dispatched.', '🚧 Seal collision lane to clear debris.']
        };
      }

      mockTrace = [
        { agent: 'Agent 1 (Signal Ingestion)', data: { structured_json: { crisis_type: mockOutput.crisis_type, location_name: mockOutput.location_name, raw_severity: mockOutput.severity }, reasoning: 'Parsed offline dictionaries for Karachi/Islamabad.' } },
        { agent: 'Agent 2 (Crisis Evaluation)', data: { confidence_score: mockOutput.confidence_score, explanation: mockOutput.explanation, metrics_checked: { source: '⚡ OFFLINE SENSOR FEED', weather: weatherInfo } } },
        { agent: 'Agent 3 (Action Simulation)', data: { recommended_directives: mockOutput.dispatch_actions, diverted_route: mockOutput.diverted_coordinates } }
      ];

      setActiveSignal(mockOutput);
      setTelemetry(mockTrace);
      addLog(`✅ offline simulation parsed: ${mockOutput.crisis_type} at ${mockOutput.location_name.toUpperCase()}`);
    }, 800);
  };

  const handleReset = async () => {
    setLoading(true);
    try {
      await fetch(`${BACKEND_URL}/api/signals/reset`, { method: 'POST' });
      addLog('🔄 Backend cached states and signals successfully reset.');
    } catch (e) {
      addLog('🔄 Offline reset applied locally.');
    }
    setActiveSignal(null);
    setTelemetry(null);
    setLoading(false);
  };

  // Conversational Copilot Query Handler
  const handleCopilotQuery = async (queryText) => {
    if (!queryText.trim()) return;
    setLoading(true);
    addLog(`Asked Copilot: "${queryText.substring(0, 35)}..."`);

    try {
      const response = await fetch(`${BACKEND_URL}/api/copilot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: queryText }),
      });

      const json = await response.json();
      if (json.status === 'success') {
        setCopilotResponse(json);
        if (json.pipeline_output) {
          setActiveSignal(json.pipeline_output);
          addLog(`🛰️ Background crisis-routing plotted for: ${json.pipeline_output.crisis_type}`);
        }
        if (json.pipeline_trace) {
          setTelemetry(json.pipeline_trace);
        }
        addLog('🤖 Copilot compiled response successfully.');
      } else {
        addLog('❌ Copilot query failed.');
      }
    } catch (err) {
      console.log('Error calling copilot:', err);
      // Offline fallback
      addLog('⚠️ Offline Mode: Resolving Copilot query locally...');
      setTimeout(() => {
        const mockReply = runMockCopilotLocal(queryText);
        setCopilotResponse(mockReply);
        if (mockReply.is_crisis_report) {
          addLog('🛰️ Offline background crisis-routing triggered.');
          simulateOfflineFallback('custom', queryText);
        }
        addLog('🤖 Copilot offline reply loaded.');
      }, 600);
    } finally {
      setLoading(false);
    }
  };

  // Local helper for offline copilot in React Native
  const runMockCopilotLocal = (query) => {
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
      const city = getCityOfLocation(detected_location);
      response = `Dost, ${detected_location.toUpperCase()} (${city.toUpperCase()} sector) ki filhal status ye hai:\n🌤️ Weather reports show active conditions in this sector.\n🚗 Traffic congestion is verified. Alternate bypass routing is fully calculated and active on the map screen.`;
      
      if (detected_location === 'dha' || detected_location === 'g-9' || detected_location === 'shara-e-faisal' || detected_location === 'dha lahore') {
        safety_advisory = `⚠️ High flood precipitation or severe bottleneck detected near ${detected_location.toUpperCase()}. Direct vehicles along calculated alternate green routes immediately.`;
      }
    } else if (text.includes('rain') || text.includes('barish') || text.includes('weather') || text.includes('mausam')) {
      response = `Pakistan Metropolitan Weather status summary:\n- Karachi Central/DHA: Sunny & Hot (40°C).\n- Islamabad G-9/Metro Hub: Clear (35°C).\n- Lahore Gulberg/Liberty: Sunny (36°C). Please refer to map coordinates.`;
    }

    return {
      response,
      detected_location,
      safety_advisory,
      is_crisis_report
    };
  };

  // Render high-tech vector fallback map for Web / simulator issues
  const renderFallbackMap = () => {
    const activeLoc = activeSignal ? activeSignal.location_name : null;
    const activeMarker = activeLoc ? MAP_MARKERS[activeLoc] : null;
    const activeCity = activeSignal ? getCityOfLocation(activeSignal.location_name) : null;

    return (
      <View style={styles.fallbackMapContainer}>
        {/* Decorative Grid Lines */}
        <View style={styles.gridOverlay} />
        
        {/* Topographic/Tactical HUD */}
        <Text style={styles.radarLabel}>
          {activeCity ? `TACTICAL SENSOR MESH - ${activeCity.toUpperCase()} SECTOR` : "TACTICAL SENSOR MESH v1.82 (PAKISTAN REGION)"}
        </Text>
        
        {/* Render Locations Nodes */}
        {Object.entries(MAP_MARKERS).filter(([key]) => {
          if (!activeCity) return true; // show all when inactive
          return getCityOfLocation(key) === activeCity;
        }).map(([key, marker]) => {
          const isActive = activeLoc === key;
          const isKarachiGroup = marker.y > 250;

          return (
            <View
              key={key}
              style={[
                styles.mapNode,
                { left: marker.x, top: marker.y },
                isActive && styles.mapNodeActive
              ]}
            >
              <View style={[styles.nodeDot, isActive && styles.nodeDotActive, { backgroundColor: isKarachiGroup ? '#4facfe' : '#9b5de5' }]} />
              <Text style={styles.nodeText}>{marker.label}</Text>
            </View>
          );
        })}

        {/* If crisis is active, draw Red Epicenter and Alternate Route Line */}
        {activeMarker && (
          <>
            {/* Draw Simulated Polyline Redirection */}
            <View style={[styles.svgDivertedLine, {
              left: activeMarker.x + 8,
              top: activeMarker.y + 8,
              width: 120,
              height: 50,
              borderTopWidth: 2,
              borderRightWidth: 2,
              borderStyle: 'dashed',
              borderColor: '#00e676',
              transform: [{ rotate: '-15deg' }]
            }]} />

            {/* Alternate Route Green Endpoint Indicator */}
            <View style={[styles.mapNode, { left: activeMarker.x + 110, top: activeMarker.y + 15 }]}>
              <View style={[styles.nodeDot, { backgroundColor: '#00e676', width: 12, height: 12 }]} />
              <Text style={[styles.nodeText, { color: '#00e676', fontWeight: 'bold' }]}>Diverted Bypass</Text>
            </View>

            {/* Glowing Red Crisis Marker */}
            <View style={[styles.crisisRing, { left: activeMarker.x - 24, top: activeMarker.y - 24 }]}>
              <View style={styles.crisisDot} />
            </View>
          </>
        )}
      </View>
    );
  };

  const getSeverityColor = (sev) => {
    switch (sev) {
      case 'Critical': return '#ff1744';
      case 'High': return '#ff5722';
      case 'Medium': return '#ffc107';
      default: return '#00e5ff';
    }
  };

  const getConfidenceColor = (conf) => {
    switch (conf) {
      case 'High': return '#00e676';
      case 'Medium': return '#ffc107';
      default: return '#ff1744';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Title Header Bar */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Image 
            source={require('./assets/icon.png')} 
            style={{ width: 38, height: 38, borderRadius: 8, marginRight: 10, borderWidth: 1, borderColor: 'rgba(0, 242, 254, 0.4)' }} 
            resizeMode="contain"
          />
          <View>
            <Text style={styles.logo}>RASAI <Text style={styles.logoLight}>CRISIS INTELLIGENCE</Text></Text>
            <Text style={styles.subLogo}>Multi-Agent Crisis Parsing & Dynamic Routing</Text>
          </View>
        </View>
        {loading && <ActivityIndicator color="#00f2fe" size="small" />}
      </View>

      {/* Main Interactive Map (Native View vs Premium Fallback Web View) */}
      <View style={styles.mapFrame}>
        {Platform.OS !== 'web' && MapView && ENABLE_NATIVE_MAPS ? (
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={{
              latitude: activeSignal ? activeSignal.coordinates.latitude : 33.6844,
              longitude: activeSignal ? activeSignal.coordinates.longitude : 73.0479,
              latitudeDelta: 0.12,
              longitudeDelta: 0.12
            }}
            customMapStyle={darkMapStyle}
          >
            {/* Render all IoT Sensor Mesh nodes on Map (filtered by active city to prevent wide zooming) */}
            {Object.entries(OFFLINE_COORDINATES).filter(([key]) => {
              const activeCity = activeSignal ? getCityOfLocation(activeSignal.location_name) : null;
              if (!activeCity) return true; // show all when inactive
              return getCityOfLocation(key) === activeCity;
            }).map(([key, coords]) => {
              const isKarachiGroup = coords.latitude < 30;
              const label = MAP_MARKERS[key]?.label || key.toUpperCase();
              const isActive = activeSignal && activeSignal.location_name === key;

              return (
                <Marker
                  key={key}
                  coordinate={coords}
                  title={`📟 IoT Sensor: ${label}`}
                  description={`Monitoring real-time telemetry at ${label}`}
                  pinColor={isActive ? "#ff1744" : (isKarachiGroup ? "#4facfe" : "#9b5de5")}
                  opacity={isActive ? 1.0 : 0.6}
                />
              );
            })}

            {activeSignal && (
              <>
                {/* Safe Bypass Alternate green Marker */}
                <Marker
                  coordinate={activeSignal.diverted_coordinates}
                  title="Diverted Route Bypass"
                  description="Alternative corridor determined by Action Simulation Agent"
                  pinColor="#00e676"
                />

                {/* Alternate Green Bypass Polyline */}
                <Polyline
                  coordinates={activeSignal.route_polyline || [
                    activeSignal.coordinates,
                    activeSignal.diverted_coordinates
                  ]}
                  strokeColor="#00e676"
                  strokeWidth={4}
                  lineDashPattern={[5, 5]}
                />
              </>
            )}
          </MapView>
        ) : (
          renderFallbackMap()
        )}
      </View>

      {/* bottom Terminal Logs Panel */}
      <View style={styles.consoleLogContainer}>
        <View style={styles.consoleTitleBar}>
          <Text style={styles.consoleTitle}>📟 Antigravity Orchestrator Shell Logs</Text>
        </View>
        <ScrollView style={styles.consoleBody} contentContainerStyle={{ paddingBottom: 10 }}>
          {systemLogs.map((log, index) => (
            <Text key={index} style={styles.consoleText}>{log}</Text>
          ))}
        </ScrollView>
      </View>

      {/* Conversational Copilot Glassmorphic Dialog Box */}
      {copilotResponse && (
        <View style={styles.copilotDialogOverlay}>
          <View style={styles.copilotDialog}>
            <View style={styles.copilotDialogHeader}>
              <Text style={styles.copilotDialogTitle}>🤖 RASAI AI COPILOT</Text>
              <TouchableOpacity onPress={() => setCopilotResponse(null)}>
                <Text style={{ color: '#ff1744', fontWeight: 'bold', fontSize: 20 }}>×</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.copilotDialogBody} contentContainerStyle={{ paddingVertical: 10 }}>
              <Text style={styles.copilotQueryText}>❓ "{customText}"</Text>
              <Text style={styles.copilotAnswerText}>{copilotResponse.response}</Text>
              
              {copilotResponse.safety_advisory && (
                <View style={styles.copilotAdvisory}>
                  <Text style={styles.copilotAdvisoryTitle}>⚠️ SAFETY ADVISORY</Text>
                  <Text style={styles.copilotAdvisoryText}>{copilotResponse.safety_advisory}</Text>
                </View>
              )}
            </ScrollView>
            <View style={styles.copilotDialogFooter}>
              {copilotResponse.detected_location && (
                <TouchableOpacity
                  style={styles.copilotActionBtn}
                  onPress={() => {
                    const loc = copilotResponse.detected_location;
                    // Focus map on the location using a structured alert containing keyword to prevent recovery triggers
                    handleTrigger('custom', `Critical crisis report of flooding or traffic jam at ${loc}`);
                    setCopilotResponse(null);
                  }}
                >
                  <Text style={styles.copilotActionBtnText}>🗺️ Focus Map on {copilotResponse.detected_location.toUpperCase()}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.copilotActionBtn, { backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.2)' }]}
                onPress={() => setCopilotResponse(null)}
              >
                <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>Dismiss</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Floating Simulation Trigger Panel */}
      <View style={styles.triggerPanel}>
        <Text style={styles.triggerPanelTitle}>💬 ASK RASAI COPILOT</Text>

        {/* Custom Text Ingest Bar */}
        <View style={[styles.customInputContainer, { borderColor: '#00f2fe' }]}>
          <TextInput
            style={styles.customTextInput}
            placeholder="Ask Copilot (e.g. DHA ka status kya hai? Clifton weather? roadblocks or flooding reported?)"
            placeholderTextColor="#687293"
            value={customText}
            onChangeText={setCustomText}
          />
          <TouchableOpacity
            style={[styles.customInputBtn, { backgroundColor: 'rgba(0, 242, 254, 0.25)', borderColor: '#00f2fe' }]}
            onPress={() => {
              if (customText.trim()) {
                handleCopilotQuery(customText);
              }
            }}
          >
            <Text style={[styles.customInputBtnText, { color: '#00f2fe' }]}>
              💬 ASK COPILOT
            </Text>
          </TouchableOpacity>
        </View>

        {/* Judging Demo Presets Card */}
        <View style={styles.presetsCard}>
          <Text style={styles.presetsCardTitle}>⚠️ JUDGING DEMO PRESETS (ONE-CLICK SHORTS)</Text>
          <Text style={styles.presetsCardSub}>
            These quick triggers simulate Roman Urdu/English crisis alerts to demo the 3-Agent routing pipeline and live map updates instantly.
          </Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.actionBtn, { borderColor: '#2196f3', backgroundColor: 'rgba(33, 150, 243, 0.08)' }]}
              onPress={() => handleTrigger('flooding')}
            >
              <Text style={[styles.btnText, { color: '#00f2fe' }]}>🌊 Test DHA Flooding</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { borderColor: '#e91e63', backgroundColor: 'rgba(233, 30, 99, 0.08)' }]}
              onPress={() => handleTrigger('roadblock')}
            >
              <Text style={[styles.btnText, { color: '#ff4081' }]}>🚧 Test Blue Area Jam</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { borderColor: '#ff9800', backgroundColor: 'rgba(255, 152, 0, 0.08)' }]}
              onPress={() => handleTrigger('broken')}
            >
              <Text style={[styles.btnText, { color: '#ffb300' }]}>🛠️ Test System Recovery</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { borderColor: 'rgba(255,255,255,0.25)', backgroundColor: 'rgba(255,255,255,0.04)' }]}
              onPress={handleReset}
            >
              <Text style={[styles.btnText, { color: '#fff' }]}>🔄 Reset System Cache</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Floating Telemetry slide-up log panel (when active) - Floats globally outside mapFrame to prevent height cutoffs */}
      {activeSignal && telemetry && (
        <View style={styles.telemetryOverlay}>
          <View style={styles.telemetryHeader}>
            <Text style={styles.telemetryTitle}>🛰️ Agent Telemetry Engine Logs</Text>
            <View style={styles.statusPills}>
              <View style={[styles.pill, { backgroundColor: 'rgba(255, 23, 68, 0.15)', borderColor: getSeverityColor(activeSignal.severity) }]}>
                <Text style={[styles.pillText, { color: getSeverityColor(activeSignal.severity) }]}>Sev: {activeSignal.severity}</Text>
              </View>
              <View style={[styles.pill, { backgroundColor: 'rgba(0, 230, 118, 0.15)', borderColor: getConfidenceColor(activeSignal.confidence_score) }]}>
                <Text style={[styles.pillText, { color: getConfidenceColor(activeSignal.confidence_score) }]}>Conf: {activeSignal.confidence_score}</Text>
              </View>
            </View>
          </View>

          {/* Live Weather Widget */}
          {telemetry[1]?.data?.metrics_checked?.weather && (
            <View style={styles.weatherWidget}>
              <Text style={styles.weatherWidgetTitle}>🌤️ LIVE WEATHER SENSOR</Text>
              <View style={styles.weatherWidgetRow}>
                <Text style={styles.weatherWidgetTemp}>{telemetry[1].data.metrics_checked.weather.temp || 'N/A'}</Text>
                <View style={styles.weatherWidgetMeta}>
                  <Text style={styles.weatherWidgetCond}>{telemetry[1].data.metrics_checked.weather.condition?.toUpperCase() || 'CLEAR'}</Text>
                  <Text style={styles.weatherWidgetPrecip}>Precipitation: {telemetry[1].data.metrics_checked.weather.precipitation}%</Text>
                </View>
                <View style={styles.weatherSourceBadge}>
                  <Text style={styles.weatherSourceText}>
                    {telemetry[1].data.metrics_checked.source?.includes('OpenWeather') ? '📡 LIVE API' : '⚡ SIMULATED'}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Agent Steps Tabs Selector */}
          <View style={styles.agentTabs}>
            <TouchableOpacity
              style={[styles.agentTabButton, selectedAgentTab === 'agent1' && styles.agentTabButtonActive]}
              onPress={() => setSelectedAgentTab('agent1')}
            >
              <Text style={[styles.agentTabBtnText, selectedAgentTab === 'agent1' && styles.agentTabBtnTextActive]}>Ingestion (A1)</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.agentTabButton, selectedAgentTab === 'agent2' && styles.agentTabButtonActive]}
              onPress={() => setSelectedAgentTab('agent2')}
            >
              <Text style={[styles.agentTabBtnText, selectedAgentTab === 'agent2' && styles.agentTabBtnTextActive]}>Evaluation (A2)</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.agentTabButton, selectedAgentTab === 'agent3' && styles.agentTabButtonActive]}
              onPress={() => setSelectedAgentTab('agent3')}
            >
              <Text style={[styles.agentTabBtnText, selectedAgentTab === 'agent3' && styles.agentTabBtnTextActive]}>Simulation (A3)</Text>
            </TouchableOpacity>
          </View>

          {/* Tab content viewer */}
          <ScrollView style={styles.telemetryBody} contentContainerStyle={{ flexGrow: 1, paddingBottom: 15 }}>
            {selectedAgentTab === 'agent1' && (
              <View>
                <Text style={styles.telemetryHeading}>AGENT 1: Semantic NLP Parser</Text>
                <Text style={styles.telemetryMeta}>Model: Gemini 2.5 Flash</Text>
                <Text style={styles.telemetryText}><Text style={styles.labelSpan}>Input Text:</Text> "{telemetry[0]?.data.input}"</Text>
                <Text style={styles.telemetryText}><Text style={styles.labelSpan}>Reasoning Steps:</Text></Text>
                <Text style={styles.reasoningLog}>{telemetry[0]?.data.reasoning}</Text>
                
                <View style={styles.premiumTelemetryCard}>
                  <Text style={styles.premiumCardTitle}>🔍 EXTRACTED CRISIS PARAMETERS</Text>
                  <View style={styles.telemetryRowItem}>
                    <Text style={styles.telemetryLabel}>🚨 Crisis Type:</Text>
                    <Text style={styles.telemetryValue}>{telemetry[0]?.data.structured_json?.crisis_type || 'N/A'}</Text>
                  </View>
                  <View style={styles.telemetryRowItem}>
                    <Text style={styles.telemetryLabel}>📍 Target Landmark:</Text>
                    <Text style={[styles.telemetryValue, { textTransform: 'uppercase' }]}>{telemetry[0]?.data.structured_json?.location_name || 'N/A'}</Text>
                  </View>
                  <View style={styles.telemetryRowItem}>
                    <Text style={styles.telemetryLabel}>⚠️ Raw Severity:</Text>
                    <Text style={[styles.telemetryValue, { color: getSeverityColor(telemetry[0]?.data.structured_json?.raw_severity) }]}>
                      {telemetry[0]?.data.structured_json?.raw_severity || 'N/A'}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {selectedAgentTab === 'agent2' && (
              <View>
                <Text style={styles.telemetryHeading}>AGENT 2: Live telemetry Evaluator & Validator</Text>
                {telemetry[1]?.data.warning && (
                  <View style={styles.warningAlert}>
                    <Text style={styles.warningAlertTitle}>⚠️ RECOVERY REDIRECT TRIGGERED</Text>
                    <Text style={styles.warningAlertText}>{telemetry[1]?.data.warning}</Text>
                  </View>
                )}
                
                <View style={styles.premiumTelemetryCard}>
                  <Text style={styles.premiumCardTitle}>📡 COMPARATIVE TELEMETRY MATRIX</Text>
                  <View style={styles.telemetryRowItem}>
                    <Text style={styles.telemetryLabel}>☁️ Precipitation Index:</Text>
                    <Text style={styles.telemetryValue}>{telemetry[1]?.data.metrics_checked?.weather?.precipitation ?? 10}%</Text>
                  </View>
                  <View style={styles.telemetryRowItem}>
                    <Text style={styles.telemetryLabel}>🌤️ Sensor Weather:</Text>
                    <Text style={styles.telemetryValue}>{telemetry[1]?.data.metrics_checked?.weather?.condition || 'Clear'}</Text>
                  </View>
                  <View style={styles.telemetryRowItem}>
                    <Text style={styles.telemetryLabel}>🌡️ Sensor Temp:</Text>
                    <Text style={styles.telemetryValue}>{telemetry[1]?.data.metrics_checked?.weather?.temp || '34°C'}</Text>
                  </View>
                  <View style={styles.telemetryRowItem}>
                    <Text style={styles.telemetryLabel}>🚗 Traffic Index:</Text>
                    <Text style={styles.telemetryValue}>{telemetry[1]?.data.metrics_checked?.traffic?.congestion_index || '3.2'}/10</Text>
                  </View>
                  <View style={styles.telemetryRowItem}>
                    <Text style={styles.telemetryLabel}>⚡ Avg Road Speed:</Text>
                    <Text style={styles.telemetryValue}>{telemetry[1]?.data.metrics_checked?.traffic?.average_speed || '40 km/h'}</Text>
                  </View>
                </View>
                <Text style={styles.telemetryText}><Text style={styles.labelSpan}>Summary explanation:</Text></Text>
                <Text style={styles.explanationText}>{activeSignal.explanation}</Text>
              </View>
            )}

            {selectedAgentTab === 'agent3' && (
              <View>
                <Text style={styles.telemetryHeading}>AGENT 3: Crisis Action Simulator & Dispatcher</Text>
                <View style={styles.sandboxWarningCard}>
                  <Text style={styles.sandboxWarningTitle}>🤖 SIMULATED EXECUTION SANDBOX</Text>
                  <Text style={styles.sandboxWarningText}>
                    This tab simulates response execution. In a production environment, this module coordinates with real government APIs (WASA, Rescue 1122, Traffic Police). Here, it safely generates directives and routing bypasses to showcase system readiness (Hackathon Req #4).
                  </Text>
                </View>
                <Text style={styles.telemetryText}><Text style={styles.labelSpan}>Grid Epicenter Coordinates:</Text> {activeSignal.coordinates.latitude.toFixed(4)}, {activeSignal.coordinates.longitude.toFixed(4)}</Text>
                <Text style={styles.telemetryText}><Text style={styles.labelSpan}>Calculated Diverted Bypass Coordinates:</Text> {activeSignal.diverted_coordinates.latitude.toFixed(4)}, {activeSignal.diverted_coordinates.longitude.toFixed(4)}</Text>
                <Text style={[styles.telemetryText, { marginTop: 10, fontWeight: 'bold' }]}><Text style={styles.labelSpan}>Dispatched Action Directives:</Text></Text>
                {activeSignal.dispatch_actions.map((act, i) => (
                  <Text key={i} style={styles.directiveItem}>{act}</Text>
                ))}

                {/* Simulated Dispatch Ticket */}
                <View style={styles.ticketCard}>
                  <Text style={styles.ticketTitle}>🎟️ EMERGENCY DISPATCH TICKET</Text>
                  <Text style={styles.ticketText}><Text style={styles.ticketLabel}>Ticket ID:</Text> #CR-2026-3814</Text>
                  <Text style={styles.ticketText}><Text style={styles.ticketLabel}>Status:</Text> <Text style={{ color: '#00e676', fontWeight: 'bold' }}>ACTIVE DISPATCH</Text></Text>
                  <Text style={styles.ticketText}><Text style={styles.ticketLabel}>Dispatched Crews:</Text> Emergency Teams, Municipal WASA crews, Wardens</Text>
                  <Text style={styles.ticketText}><Text style={styles.ticketLabel}>ETA:</Text> 4 - 8 Minutes</Text>
                </View>

                {/* Before vs After Impact Analysis */}
                <View style={styles.impactCard}>
                  <Text style={styles.impactTitle}>📊 SIMULATION OUTCOME & IMPACT</Text>
                  <View style={styles.impactRow}>
                    <View style={styles.impactCol}>
                      <Text style={styles.impactValueRed}>9.5/10</Text>
                      <Text style={styles.impactLabelText}>Before Congestion</Text>
                    </View>
                    <View style={styles.impactArrow}>
                      <Text style={{ color: '#00f2fe', fontSize: 16 }}>➔</Text>
                    </View>
                    <View style={styles.impactCol}>
                      <Text style={styles.impactValueGreen}>3.2/10</Text>
                      <Text style={styles.impactLabelText}>After Congestion</Text>
                    </View>
                  </View>
                  <Text style={styles.impactSummaryText}>
                    ✓ Bypass routes pushed to active GPS drivers successfully. Simulated road congestion reduced by <Text style={{ color: '#00e676', fontWeight: 'bold' }}>66.3%</Text> near {activeSignal.location_name?.toUpperCase()} sector.
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  );
}

// Google Maps Dark Aesthetic Style Array
const darkMapStyle = [
  { "elementType": "geometry", "stylers": [{ "color": "#0c0f1d" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#0c0f1d" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#746855" }] },
  { "featureType": "administrative.locality", "elementType": "labels.text.fill", "stylers": [{ "color": "#d59563" }] },
  { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#d59563" }] },
  { "featureType": "poi.park", "elementType": "geometry", "stylers": [{ "color": "#263c3f" }] },
  { "featureType": "poi.park", "elementType": "labels.text.fill", "stylers": [{ "color": "#6b9a76" }] },
  { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#1f2747" }] },
  { "featureType": "road", "elementType": "geometry.stroke", "stylers": [{ "color": "#212a51" }] },
  { "featureType": "road", "elementType": "labels.text.fill", "stylers": [{ "color": "#9ca2be" }] },
  { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#746855" }] },
  { "featureType": "road.highway", "elementType": "geometry.stroke", "stylers": [{ "color": "#1f284d" }] },
  { "featureType": "road.highway", "elementType": "labels.text.fill", "stylers": [{ "color": "#f3c300" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#080b17" }] },
  { "featureType": "water", "elementType": "labels.text.fill", "stylers": [{ "color": "#515c6d" }] },
  { "featureType": "water", "elementType": "labels.text.stroke", "stylers": [{ "color": "#17263c" }] }
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0c0f1d',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderColor: 'rgba(0, 242, 254, 0.15)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#080a15',
  },
  logo: {
    fontSize: 18,
    fontWeight: '900',
    color: '#00f2fe',
    letterSpacing: 2,
  },
  logoLight: {
    color: '#fff',
    fontWeight: '300',
  },
  subLogo: {
    fontSize: 11,
    color: '#9ca2be',
    marginTop: 2,
  },
  mapFrame: {
    flex: 1.2,
    position: 'relative',
    overflow: 'hidden',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  fallbackMapContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#090c18',
    position: 'relative',
  },
  gridOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    borderColor: 'rgba(0, 242, 254, 0.03)',
    borderWidth: 1,
    // Emulates coordinate mesh grid
    backgroundColor: 'transparent',
  },
  radarLabel: {
    position: 'absolute',
    top: 10,
    left: 15,
    color: 'rgba(0, 242, 254, 0.4)',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
  mapNode: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 5,
  },
  mapNodeActive: {
    scale: 1.1,
  },
  nodeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
    shadowColor: '#00f2fe',
    shadowOpacity: 0.8,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 0 },
  },
  nodeDotActive: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ff1744',
  },
  nodeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '500',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowRadius: 3,
  },
  crisisRing: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: 'rgba(255, 23, 68, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 23, 68, 0.08)',
    zIndex: 10,
  },
  crisisDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#ff1744',
    shadowColor: '#ff1744',
    shadowOpacity: 0.9,
    shadowRadius: 10,
  },
  svgDivertedLine: {
    position: 'absolute',
    zIndex: 4,
  },
  telemetryOverlay: {
    position: 'absolute',
    right: 15,
    top: 80,
    bottom: 180,
    width: Platform.OS === 'web' ? 380 : '75%',
    backgroundColor: 'rgba(12, 16, 32, 0.95)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 254, 0.25)',
    padding: 15,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 15,
    zIndex: 20,
    overflow: 'hidden', // Forces container bounds to clip content and respect absolute height constraints
  },
  telemetryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingBottom: 10,
    marginBottom: 10,
  },
  telemetryTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  statusPills: {
    flexDirection: 'row',
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    marginLeft: 5,
  },
  pillText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  agentTabs: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 8,
    padding: 3,
    marginBottom: 10,
  },
  agentTabButton: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 6,
  },
  agentTabButtonActive: {
    backgroundColor: 'rgba(0, 242, 254, 0.15)',
    borderWidth: 0.5,
    borderColor: 'rgba(0, 242, 254, 0.3)',
  },
  agentTabBtnText: {
    fontSize: 11,
    color: '#9ca2be',
  },
  agentTabBtnTextActive: {
    color: '#00f2fe',
    fontWeight: 'bold',
  },
  telemetryBody: {
    flex: 1,
  },
  telemetryHeading: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  telemetryMeta: {
    color: '#00f2fe',
    fontSize: 10,
    fontWeight: '500',
    marginBottom: 12,
  },
  telemetryText: {
    color: '#fff',
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 6,
  },
  labelSpan: {
    color: '#9ca2be',
    fontWeight: '500',
  },
  reasoningLog: {
    color: '#a5d6a7',
    fontSize: 11,
    lineHeight: 16,
    backgroundColor: 'rgba(76, 175, 80, 0.05)',
    padding: 8,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: 'rgba(76, 175, 80, 0.15)',
    marginBottom: 12,
  },
  jsonDump: {
    backgroundColor: '#05070e',
    padding: 10,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  jsonTitle: {
    color: '#00f2fe',
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  jsonText: {
    color: '#80deea',
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  warningAlert: {
    backgroundColor: 'rgba(255, 179, 0, 0.08)',
    borderColor: '#ffb300',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  warningAlertTitle: {
    color: '#ffb300',
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  warningAlertText: {
    color: '#ffe082',
    fontSize: 10,
    lineHeight: 14,
  },
  successValidation: {
    backgroundColor: 'rgba(0, 230, 118, 0.05)',
    borderColor: 'rgba(0, 230, 118, 0.2)',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  validTitle: {
    color: '#00e676',
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  explanationText: {
    color: '#ffeb3b',
    fontSize: 11,
    lineHeight: 16,
    backgroundColor: 'rgba(255,235,59,0.05)',
    padding: 10,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: 'rgba(255,235,59,0.2)',
  },
  directiveItem: {
    color: '#e0e0e0',
    fontSize: 11,
    lineHeight: 16,
    paddingLeft: 10,
    marginBottom: 5,
    borderLeftWidth: 2,
    borderLeftColor: '#00e676',
  },
  consoleLogContainer: {
    flex: 0.4,
    backgroundColor: '#05070e',
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 10,
  },
  consoleTitleBar: {
    borderBottomWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.15)',
    paddingBottom: 6,
    marginBottom: 6,
  },
  consoleTitle: {
    color: '#00f2fe',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  consoleBody: {
    flex: 1,
  },
  consoleText: {
    color: '#39ff14',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 10,
    lineHeight: 14,
  },
  triggerPanel: {
    backgroundColor: '#090b14',
    borderTopWidth: 1,
    borderColor: 'rgba(0, 242, 254, 0.2)',
    padding: 15,
  },
  triggerPanelTitle: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 2,
    marginBottom: 10,
    color: '#00f2fe',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    marginHorizontal: 3,
    backgroundColor: 'rgba(22, 28, 45, 0.6)',
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  weatherWidget: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 254, 0.15)',
    padding: 10,
    marginBottom: 12,
  },
  weatherWidgetTitle: {
    color: '#00f2fe',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 4,
  },
  weatherWidgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  weatherWidgetTemp: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
    marginRight: 10,
  },
  weatherWidgetMeta: {
    flex: 1,
  },
  weatherWidgetCond: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  weatherWidgetPrecip: {
    color: '#9ca2be',
    fontSize: 9,
    marginTop: 1,
  },
  weatherSourceBadge: {
    backgroundColor: 'rgba(0, 242, 254, 0.08)',
    borderColor: 'rgba(0, 242, 254, 0.25)',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  weatherSourceText: {
    color: '#00f2fe',
    fontSize: 8,
    fontWeight: 'bold',
  },
  customInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#090b14',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 254, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 10,
  },
  customTextInput: {
    flex: 1,
    color: '#fff',
    fontSize: 11,
    paddingVertical: 6,
    paddingHorizontal: 4,
    outlineStyle: 'none',
  },
  customInputBtn: {
    backgroundColor: 'rgba(0, 242, 254, 0.15)',
    borderColor: '#00f2fe',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customInputBtnText: {
    color: '#00f2fe',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  ticketCard: {
    backgroundColor: 'rgba(255, 179, 0, 0.04)',
    borderColor: 'rgba(255, 179, 0, 0.2)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginTop: 12,
  },
  ticketTitle: {
    color: '#ffb300',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  ticketText: {
    color: '#e0e0e0',
    fontSize: 10,
    lineHeight: 14,
    marginBottom: 4,
  },
  ticketLabel: {
    color: '#9ca2be',
    fontWeight: '500',
  },
  impactCard: {
    backgroundColor: 'rgba(0, 230, 118, 0.03)',
    borderColor: 'rgba(0, 230, 118, 0.15)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginTop: 12,
  },
  impactTitle: {
    color: '#00e676',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  impactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.02)',
    paddingVertical: 8,
    borderRadius: 8,
  },
  impactCol: {
    alignItems: 'center',
  },
  impactArrow: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  impactValueRed: {
    color: '#ff1744',
    fontSize: 14,
    fontWeight: 'bold',
  },
  impactValueGreen: {
    color: '#00e676',
    fontSize: 14,
    fontWeight: 'bold',
  },
  impactLabelText: {
    color: '#9ca2be',
    fontSize: 8,
    marginTop: 2,
  },
  impactSummaryText: {
    color: '#e0e0e0',
    fontSize: 10,
    lineHeight: 14,
  },
  copilotDialogOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(5, 7, 18, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
    padding: 20,
  },
  copilotDialog: {
    width: Platform.OS === 'web' ? 450 : '90%',
    backgroundColor: '#0c1020',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#00f2fe',
    padding: 20,
    shadowColor: '#00f2fe',
    shadowOpacity: 0.35,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
  },
  copilotDialogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: 'rgba(0, 242, 254, 0.2)',
    paddingBottom: 10,
    marginBottom: 10,
  },
  copilotDialogTitle: {
    color: '#00f2fe',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  copilotDialogBody: {
    maxHeight: 250,
  },
  copilotQueryText: {
    color: '#9ca2be',
    fontSize: 11,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  copilotAnswerText: {
    color: '#fff',
    fontSize: 12,
    lineHeight: 18,
  },
  copilotAdvisory: {
    backgroundColor: 'rgba(255, 23, 68, 0.08)',
    borderColor: 'rgba(255, 23, 68, 0.3)',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginTop: 15,
  },
  copilotAdvisoryTitle: {
    color: '#ff1744',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 3,
  },
  copilotAdvisoryText: {
    color: '#ff8a80',
    fontSize: 10.5,
    lineHeight: 14,
  },
  copilotDialogFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 15,
    borderTopWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingTop: 12,
  },
  copilotActionBtn: {
    backgroundColor: 'rgba(0, 242, 254, 0.15)',
    borderColor: '#00f2fe',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginLeft: 8,
  },
  copilotActionBtnText: {
    color: '#00f2fe',
    fontSize: 10,
    fontWeight: 'bold',
  },
  presetsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 254, 0.12)',
    padding: 12,
    marginTop: 5,
  },
  presetsCardTitle: {
    color: '#ffb300',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 4,
    textAlign: 'center',
  },
  presetsCardSub: {
    color: '#9ca2be',
    fontSize: 9,
    lineHeight: 13,
    marginBottom: 10,
    textAlign: 'center',
  },
  sandboxWarningCard: {
    backgroundColor: 'rgba(255, 179, 0, 0.08)',
    borderColor: '#ffb300',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 15,
  },
  sandboxWarningTitle: {
    color: '#ffb300',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 4,
  },
  sandboxWarningText: {
    color: '#ffe082',
    fontSize: 9.5,
    lineHeight: 13.5,
  },
  premiumTelemetryCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 254, 0.15)',
    padding: 12,
    marginVertical: 10,
  },
  premiumCardTitle: {
    color: '#00f2fe',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 8,
  },
  telemetryRowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  telemetryLabel: {
    color: '#9ca2be',
    fontSize: 11,
    fontWeight: '500',
  },
  telemetryValue: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  }
});
