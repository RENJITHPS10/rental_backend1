// utils/distance.js
const axios = require('axios');
const NodeCache = require('node-cache');

const cache = new NodeCache({ stdTTL: 86400 }); // Cache for 24 hours

// Geocode a location string to lat/lon using Nominatim
const geocodeLocation = async (location) => {
  const cached = cache.get(location);
  if (cached) return cached;

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}`;
    const response = await axios.get(url, {
      headers: { 'User-Agent': 'CarRentalApp/1.0 (yourname@example.com)' },
    });

    if (!response.data || response.data.length === 0) {
      console.error(`No results found for ${location}`);
      return null;
    }

    const { lat, lon } = response.data[0];
    const coords = { latitude: parseFloat(lat), longitude: parseFloat(lon) };
    cache.set(location, coords);
    return coords;
  } catch (err) {
    console.error(`Geocoding error for ${location}: ${err.message}`);
    return null;
  }
};

// Calculate road distance using OpenRouteService
const calculateDistance = async (origin, destination) => {
  try {
    const orsKey = process.env.ORS_API_KEY;
    if (!orsKey) throw new Error('OpenRouteService API key missing');

    const originCoords = await geocodeLocation(origin);
    const destCoords = await geocodeLocation(destination);

    if (!originCoords || !destCoords) {
      throw new Error('Failed to geocode one or both locations');
    }

    const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${orsKey}&start=${originCoords.longitude},${originCoords.latitude}&end=${destCoords.longitude},${destCoords.latitude}`;
    const response = await axios.get(url, {
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.data.features || response.data.features.length === 0) {
      throw new Error('No route found');
    }

    const distanceInMeters = response.data.features[0].properties.summary.distance;
    return distanceInMeters / 1000; // Convert meters to kilometers
  } catch (err) {
    console.error(`Distance calculation error from ${origin} to ${destination}: ${err.message}`);
    return null;
  }
};

module.exports = { calculateDistance };