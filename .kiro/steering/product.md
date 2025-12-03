# Product Overview

SpinRoute Neo is a mobility platform for tracking and routing bikeshare and micromobility services. The system provides real-time station information, location tracking, and journey planning capabilities through a **database-first architecture** with minimal microservices.

## Architectural Philosophy

**"Database-first, microservices only when essential"**

- **Direct Supabase + RLS**: Secure client-side access to data
- **Postgres Power**: Triggers, functions, and RPCs for business logic
- **Frontend-Heavy**: Complex UI logic without backend overhead
- **Minimal Microservices**: Only for data ingestion and complex computational logic

## Core Components

- **Mobile App**: React Native/Expo app with map-based interface and direct Supabase access
- **Web Frontend**: Astro-based web application (planned)
- **GBFS Service**: Go-based service for continuous ingestion from 400+ city feeds (stations + free-floating vehicles)
- **Routing Service**: Complex route calculation and provider normalization
- **Database**: Supabase PostgreSQL with RLS policies, triggers, and real-time subscriptions

## Key Features

### ✅ Currently Implemented
- Real-time bikeshare station availability
- Map-based station discovery with Mapbox integration
- User authentication and session management
- Personal bike and part tracking with kilometrage management (stored in km, convertible to miles)
- Trip recording and analytics
- Route planning with OpenRouteService + Mapbox integration
- Multi-platform support (iOS, Android)

### 🆕 Planned Features

#### Real-time Bikeshare Vehicle Tracking
- Free-floating bikeshare bike/scooter locations (not at docking stations)
- Extend existing GBFS service to consume free-floating vehicle data from citybik.es
- Store in `bikeshare` schema alongside station data
- Display on map alongside docked stations
- Note: This is for public bikeshare vehicles, not user-owned bikes

#### Profile & Personal Bike Management
- **Profile Pictures**: User avatar upload via Supabase Storage
- **Personal Bike Pictures**: Multiple photos per user-owned bike (Supabase Storage)
- **Maintenance Reminders**: Automated alerts for user-owned bikes based on distance/time
  - Check chain every X miles
  - Check tires every X miles
  - Custom maintenance schedules per bike
  - Database triggers on trip data to calculate maintenance due dates
- Note: `vehicles` schema is for user-owned bikes, not public bikeshare vehicles

#### Sensor & Health Integrations
- **Sensor Data**: Heart rate monitors, cadence sensors, power meters
- **Health Platforms**: Apple HealthKit, Google Fit integration
- **Data Sync**: Automatic sync of ride data to health platforms
- **Real-time Display**: Live sensor data during rides

#### Safety Features
- **Crash/Fall Detection**: Accelerometer-based detection with emergency contact notification
- **Route Deviation Detection**: Alert when significantly off planned route
- **Emergency Contacts**: Configurable emergency contact list
- **Enhanced Location Sharing**: 
  - Real-time location sharing between users
  - Differentiation from "Find My": Shows active bike, current route, and navigation progress
  - User 1 shares with User 2 → User 2 sees User 1's bike, route, and position
  - Privacy controls and time-limited sharing

#### Premium Feature Gating

**Basic Plan (Free)**
- 1-2 route providers
- Basic cycling directions only
- Limited bikes (e.g., 3 bikes max)
- Limited recorded trips (e.g., 50 trips)
- Basic trip statistics (distance, time, speed)
- No crash/fall detection
- No emergency contact notifications
- Basic location sharing (position only, no route/bike info)

**Premium Plan (Paid)**
- All route providers
- Multiple cycle types: road, e-bike, mountain bike
- Multiple travel modes: walking, cycling, public transport
- Unlimited bikes
- Unlimited recorded trips
- Advanced trip statistics: elevation, power, heart rate zones, segment analysis
- Crash/fall detection with emergency contact notification
- Off-route detection with alerts
- Advanced location sharing: current route, bike info, navigation progress
- Priority support

#### Social & Gamification
- **Achievements**: Distance milestones, streak tracking, challenge completion
- **Leaderboards**: City/global rankings, friend comparisons
- **Challenges**: Monthly distance challenges, segment competitions
- **Social Features**: Follow friends, share rides, kudos/comments

#### Web Interface
- User account management
- Bike fleet management
- Trip history and analytics
- Leaderboards and achievements
- Social features (friend management, activity feed)
- Subscription management
- Settings and preferences
- Shared Supabase backend with mobile app
