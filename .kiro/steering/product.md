# Product Overview

SpinRoute Neo is a mobility platform for tracking and routing bikeshare and micromobility services. The system provides real-time station information, location tracking, and journey planning capabilities through a microservices architecture.

## Core Components

- **Mobile App**: React Native/Expo app with map-based interface for finding bikeshare stations
- **Web Frontend**: Astro-based web application
- **API Gateway**: Central backend service for authentication and request routing
- **Microservices**: Specialized services for bikeshare data, ride recording, safety/location sharing, routing, and vehicle management
- **Real-time Data**: Go-based GBFS service consuming CityBikes WebSocket for live station updates

## Key Features

- Real-time bikeshare station availability
- Map-based station discovery with Mapbox integration
- User authentication and session management
- Ride recording and activity tracking
- Live location sharing and safety features (crash detection, emergency alerts)
- Multi-platform support (iOS, Android, Web)
