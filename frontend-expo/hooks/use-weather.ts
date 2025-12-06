import { useState, useEffect } from 'react';

interface WeatherData {
  temperature: number;
  feelsLike: number;
  windSpeed: number;
  windDirection: number;
  humidity: number;
  description: string;
  icon: string;
}

interface UseWeatherOptions {
  latitude: number | null;
  longitude: number | null;
  enabled?: boolean;
}

export function useWeather({ latitude, longitude, enabled = true }: UseWeatherOptions) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!enabled || latitude === null || longitude === null) {
      return;
    }

    const fetchWeather = async () => {
      setLoading(true);
      setError(null);

      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,apparent_temperature,wind_speed_10m,wind_direction_10m,relative_humidity_2m,weather_code`;
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error('Failed to fetch weather data');
        }

        const data = await response.json();

        // Map weather codes to descriptions
        const weatherCode = data.current.weather_code;
        const weatherDescription = getWeatherDescription(weatherCode);
        const weatherIcon = getWeatherIcon(weatherCode);

        setWeather({
          temperature: data.current.temperature_2m,
          feelsLike: data.current.apparent_temperature,
          windSpeed: data.current.wind_speed_10m,
          windDirection: data.current.wind_direction_10m,
          humidity: data.current.relative_humidity_2m,
          description: weatherDescription,
          icon: weatherIcon,
        });
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();

    // Refresh weather every 10 minutes
    const interval = setInterval(fetchWeather, 10 * 60 * 1000);

    return () => clearInterval(interval);
  }, [latitude, longitude, enabled]);

  return { weather, loading, error };
}

/**
 * Map Open-Meteo weather codes to human-readable descriptions
 * https://open-meteo.com/en/docs
 */
function getWeatherDescription(code: number): string {
  const weatherCodes: Record<number, string> = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Foggy',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    71: 'Slight snow',
    73: 'Moderate snow',
    75: 'Heavy snow',
    77: 'Snow grains',
    80: 'Slight rain showers',
    81: 'Moderate rain showers',
    82: 'Violent rain showers',
    85: 'Slight snow showers',
    86: 'Heavy snow showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with slight hail',
    99: 'Thunderstorm with heavy hail',
  };

  return weatherCodes[code] || 'Unknown';
}

/**
 * Map Open-Meteo weather codes to icon names
 */
function getWeatherIcon(code: number): string {
  if (code === 0) return 'clear';
  if (code <= 3) return 'partly-cloudy';
  if (code <= 48) return 'fog';
  if (code <= 55) return 'drizzle';
  if (code <= 65) return 'rain';
  if (code <= 77) return 'snow';
  if (code <= 82) return 'rain-showers';
  if (code <= 86) return 'snow-showers';
  return 'thunderstorm';
}
