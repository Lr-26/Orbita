export function getDistanceKm(c1: [number, number], c2: [number, number]) {
    const R = 6371; // Earth radius
    const dLat = (c2[1] - c1[1]) * Math.PI / 180;
    const dLon = (c2[0] - c1[0]) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(c1[1] * Math.PI / 180) * Math.cos(c2[1] * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

export function calculateETA(timeMinutes: number) {
    const now = new Date();
    now.setMinutes(now.getMinutes() + timeMinutes);
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function formatTimeText(timeMinutes: number) {
    return timeMinutes >= 60 
        ? `${Math.floor(timeMinutes/60)}h ${timeMinutes%60}m` 
        : `${timeMinutes} min`;
}
