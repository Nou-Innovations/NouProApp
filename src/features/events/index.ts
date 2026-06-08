// Events feature (B2B networking / workshops / conferences)
export * from './events.service';
export { useUpcomingEvents } from './hooks/useUpcomingEvents';
export { useEvent } from './hooks/useEvent';
export { default as EventCard } from './components/EventCard';
export { default as EventsScreen } from './screens/EventsScreen';
export { default as EventDetailScreen } from './screens/EventDetailScreen';
export { default as CreateEventScreen } from './screens/CreateEventScreen';
