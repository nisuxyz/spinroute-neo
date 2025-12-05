import { useState, useEffect } from 'react';

interface WeatherData {
  temperature: number;
  windSpeed: number;
  humidity?: number;
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
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,wind_speed_10m,relative_humidity_2m`;
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error('Failed to fetch weather data');
        }

        const data = await response.json();

        setWeather({
          temperature: data.current.temperature_2m,
          windSpeed: data.current.wind_speed_10m,
          humidity: data.current.relative_humidity_2m,
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
