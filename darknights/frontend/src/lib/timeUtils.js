export function formatLastSeen(timestamp) {
  if (!timestamp) return 'hace mucho';
  
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return 'ahora mismo';
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `hace ${diffInMinutes} min`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `hace ${diffInHours} h`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return 'ayer';
  if (diffInDays < 7) return `hace ${diffInDays} d`;
  
  return date.toLocaleDateString();
}
