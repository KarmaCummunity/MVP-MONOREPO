// // File overview:
// // - Purpose: Full Canvas-based floating bubbles using Skia - identical to web version
// // - Reached from: Home screen on mobile to render an animated background with full Canvas features
// // - Inputs: None; fetches stats via `EnhancedStatsService` and renders using Skia Canvas
// // - Behavior: Creates Canvas with all web features: gradients, physics, mouse/touch, ripples, particles

// import React, { useEffect, useRef, useState, useCallback } from 'react';
// import { Dimensions, Platform } from 'react-native';
// import {
//   Canvas,
//   useCanvasRef,
//   useTouchHandler,
//   useClockValue,
//   Circle,
//   Paint,
//   LinearGradient,
//   vec,
//   Text,
//   RadialGradient,
//   Group,
//   Oval,
// } from '@shopify/react-native-skia';
// import { EnhancedStatsService, formatShortNumber } from '../utils/statsService';
// import type { CommunityStats } from '../utils/statsService';
// import colors from '../globals/colors';

// const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
// const BOTTOM_SAFE_ZONE_PX = 96;
// const CONTAINER_HEIGHT = SCREEN_HEIGHT - BOTTOM_SAFE_ZONE_PX;

// interface Bubble {
//   id: string;
//   x: number;
//   y: number;
//   originalX: number;
//   originalY: number;
//   vx: number;
//   vy: number;
//   radius: number;
//   originalRadius: number;
//   targetRadius: number;
//   depth: number;
//   speed: number;
//   wobbleSpeed: number;
//   wobbleAmount: number;
//   wobbleOffset: number;
//   shimmerSpeed: number;
//   shimmerOffset: number;
//   opacity: number;
//   hue: number;
//   saturation: number;
//   lightness: number;
//   life: number;
//   floatDirection: number;
//   mouseForceX: number;
//   mouseForceY: number;
//   dragForceX: number;
//   dragForceY: number;
//   labelNumber: number;
//   labelText: string;
//   labelValue: string;
// }

// interface Ripple {
//   x: number;
//   y: number;
//   radius: number;
//   maxRadius: number;
//   strength: number;
//   life: number;
// }

// interface MouseState {
//   x: number;
//   y: number;
//   isPressed: boolean;
// }

// const FloatingBubblesSkia = () => {
//   const canvasRef = useCanvasRef();
//   const [dimensions, setDimensions] = useState({ width: SCREEN_WIDTH, height: CONTAINER_HEIGHT });
//   const bubblesRef = useRef<Bubble[]>([]);
//   const mouseRef = useRef<MouseState>({ x: 0, y: 0, isPressed: false });
//   const rippleRef = useRef<Ripple[]>([]);
//   const statsRef = useRef<CommunityStats | null>(null);
//   const animationFrameRef = useRef<number>();

//   const MIN_LABEL_RADIUS_FOR_STATS = 36;
//   const MAX_LABEL_RADIUS_FOR_STATS = 140;
//   const REFRESH_MS = 60000; // Refresh every 60 seconds - stats don't change frequently

//   // Clock for animations
//   const clock = useClockValue();

//   // Order and labels for mapping stats to bubbles - same as web version
//   const statKeys: Array<keyof CommunityStats> = [
//     'moneyDonations', 'volunteerHours', 'rides', 'events', 'activeMembers', 'totalUsers',
//     'dailyActiveUsers', 'weeklyActiveUsers', 'newUsersThisWeek', 'newUsersThisMonth',
//     'totalOrganizations', 'citiesWithUsers', 'userEngagementRate',
//     'totalDonations', 'donationsThisWeek', 'donationsThisMonth', 'activeDonations',
//     'completedDonations', 'itemDonations', 'serviceDonations', 'totalMoneyDonated',
//     'uniqueDonors', 'avgDonationAmount',
//     'totalRides', 'ridesThisWeek', 'ridesThisMonth', 'activeRides', 'completedRides',
//     'totalSeatsOffered', 'uniqueDrivers', 'avgSeatsPerRide',
//     'totalEvents', 'eventsThisWeek', 'eventsThisMonth', 'activeEvents', 'completedEvents',
//     'totalEventAttendees', 'virtualEvents',
//     'totalActivities', 'activitiesToday', 'activitiesThisWeek', 'totalLogins',
//     'donationActivities', 'chatActivities', 'activeUsersTracked',
//     'totalMessages', 'totalConversations', 'messagesThisWeek', 'groupConversations',
//     'directConversations',
//     'foodKg', 'clothingKg', 'bloodLiters', 'treesPlanted', 'animalsAdopted', 'recyclingBags',
//     'booksDonated', 'appActiveUsers', 'appDownloads', 'activeVolunteers', 'kmCarpooled',
//     'fundsRaised', 'mealsServed', 'courses', 'culturalEvents'
//   ];

//   const STAT_LABELS: Partial<Record<keyof CommunityStats, string>> = {
//     moneyDonations: 'כסף נתרם',
//     volunteerHours: 'שעות התנדבות',
//     rides: 'נסיעות',
//     events: 'אירועים',
//     activeMembers: 'חברים פעילים',
//     totalUsers: 'סה״כ משתמשים',
//     dailyActiveUsers: 'פעילים יומי',
//     weeklyActiveUsers: 'פעילים שבועי',
//     newUsersThisWeek: 'חדשים השבוע',
//     newUsersThisMonth: 'חדשים החודש',
//     totalOrganizations: 'ארגונים',
//     citiesWithUsers: 'ערים',
//     userEngagementRate: 'אחוז מעורבות',
//     totalDonations: 'סה״כ תרומות',
//     donationsThisWeek: 'תרומות השבוע',
//     donationsThisMonth: 'תרומות החודש',
//     activeDonations: 'תרומות פעילות',
//     completedDonations: 'תרומות הושלמו',
//     itemDonations: 'תרומות פריטים',
//     serviceDonations: 'תרומות שירותים',
//     totalMoneyDonated: 'סכום נתרם',
//     uniqueDonors: 'תורמים ייחודיים',
//     avgDonationAmount: 'ממוצע תרומה',
//     totalRides: 'סה״כ נסיעות',
//     ridesThisWeek: 'נסיעות השבוע',
//     ridesThisMonth: 'נסיעות החודש',
//     activeRides: 'נסיעות פעילות',
//     completedRides: 'נסיעות הושלמו',
//     totalSeatsOffered: 'מקומות הוצעו',
//     uniqueDrivers: 'נהגים ייחודיים',
//     avgSeatsPerRide: 'ממוצע מקומות',
//     totalEvents: 'סה״כ אירועים',
//     eventsThisWeek: 'אירועים השבוע',
//     eventsThisMonth: 'אירועים החודש',
//     activeEvents: 'אירועים פעילים',
//     completedEvents: 'אירועים הושלמו',
//     totalEventAttendees: 'משתתפים',
//     virtualEvents: 'אירועים וירטואליים',
//     totalActivities: 'סה״כ פעילויות',
//     activitiesToday: 'פעילויות היום',
//     activitiesThisWeek: 'פעילויות השבוע',
//     totalLogins: 'סה״כ כניסות',
//     donationActivities: 'פעילות תרומה',
//     chatActivities: 'פעילות צ׳אט',
//     activeUsersTracked: 'משתמשים פעילים',
//     totalMessages: 'סה״כ הודעות',
//     totalConversations: 'שיחות',
//     messagesThisWeek: 'הודעות השבוע',
//     groupConversations: 'קבוצות',
//     directConversations: 'שיחות פרטיות',
//     foodKg: 'ק״ג מזון',
//     clothingKg: 'ק״ג בגדים',
//     bloodLiters: 'ליטר דם',
//     treesPlanted: 'עצים ניטעו',
//     animalsAdopted: 'בעלי חיים',
//     recyclingBags: 'שקיות מיחזור',
//     booksDonated: 'ספרים',
//     appActiveUsers: 'משתמשים פעילים',
//     appDownloads: 'הורדות',
//     activeVolunteers: 'מתנדבים',
//     kmCarpooled: 'ק״מ נסיעות',
//     fundsRaised: 'כספים נגויסו',
//     mealsServed: 'ארוחות הוגשו',
//     courses: 'קורסים',
//     culturalEvents: 'אירועי תרבות',
//   };

//   const createBubble = useCallback((): Bubble => {
//     const depth = Math.random();
//     const baseSize = 25 + Math.random() * 40;
//     const size = baseSize * (0.3 + depth * 1.7);

//     const hueBase = Math.random() < 0.3
//       ? 330 + Math.random() * 20 // pinks 330-350
//       : 195 + Math.random() * 45; // light blues 195-240

//     return {
//       id: `bubble-${Math.random().toString(36).substr(2, 9)}`,
//       x: Math.random() * (dimensions.width + 200) - 100,
//       y: Math.random() * (dimensions.height + 200) - 100,
//       originalX: 0,
//       originalY: 0,
//       vx: (Math.random() - 0.5) * 0.08,
//       vy: (Math.random() - 0.5) * 0.08,
//       radius: size,
//       originalRadius: size,
//       targetRadius: size,
//       depth: depth,
//       speed: 0.006 + Math.random() * 0.012,
//       wobbleSpeed: 0.0008 + Math.random() * 0.0015,
//       wobbleAmount: 1 + Math.random() * 3,
//       wobbleOffset: Math.random() * Math.PI,
//       shimmerSpeed: 0.008 + Math.random() * 0.015,
//       shimmerOffset: Math.random() * Math.PI * 2,
//       opacity: 0.5 + depth * 0.4,
//       hue: hueBase,
//       saturation: 35 + Math.random() * 25,
//       lightness: 58 + Math.random() * 18,
//       life: Math.random() * 1000,
//       floatDirection: Math.random() > 0.5 ? 1 : -1,
//       mouseForceX: 0,
//       mouseForceY: 0,
//       dragForceX: 0,
//       dragForceY: 0,
//       labelNumber: 0,
//       labelText: '',
//       labelValue: ''
//     };
//   }, [dimensions]);

//   const initializeBubbles = useCallback(() => {
//     bubblesRef.current = [];
//     for (let i = 0; i < 120; i++) {
//       const bubble = createBubble();
//       bubble.originalX = bubble.x;
//       bubble.originalY = bubble.y;
//       bubble.labelNumber = 0;
//       bubble.labelText = '';
//       bubble.labelValue = '';
//       bubblesRef.current.push(bubble);
//     }
//   }, [createBubble]);

//   const assignStatsToBubbles = useCallback(() => {
//     const stats = statsRef.current;
//     if (!stats || bubblesRef.current.length === 0) return;

//     // ניקוי תוויות קיימות
//     bubblesRef.current.forEach(b => {
//       b.labelText = '';
//       b.labelValue = '';
//       b.labelNumber = 0;
//       b.targetRadius = b.originalRadius;
//     });

//     // הפקת רשימת סטטיסטיקות ממוינות לפי ערך יורד
//     const statList = statKeys.map(key => ({ key, value: Number((stats as any)[key] || 0) || 0 }));
//     statList.sort((a, b) => b.value - a.value);

//     const candidates = [...bubblesRef.current]
//       .filter(b => b.originalRadius >= MIN_LABEL_RADIUS_FOR_STATS)
//       .sort((a, b) => b.originalRadius - a.originalRadius);

//     const count = Math.min(statList.length, candidates.length);
//     const valuesForScale = statList.slice(0, count).map(s => s.value);
//     const maxVal = Math.max(1, ...valuesForScale);
//     const minVal = Math.min(...valuesForScale);
//     const range = Math.max(1, maxVal - minVal);

//     for (let i = 0; i < count; i++) {
//       const bubble = candidates[i];
//       const { key, value } = statList[i];
//       const norm = (value - minVal) / range;
//       const depthFactor = 0.85 + bubble.depth * 0.35;
//       const target = (MIN_LABEL_RADIUS_FOR_STATS + 12) + norm * (MAX_LABEL_RADIUS_FOR_STATS - (MIN_LABEL_RADIUS_FOR_STATS + 12));
//       bubble.targetRadius = target * depthFactor;

//       bubble.labelNumber = value;
//       bubble.labelValue = formatShortNumber(value);
//       bubble.labelText = STAT_LABELS[key] || 'Stat';
//     }
//   }, [statKeys]);

//   const createRipple = useCallback((x: number, y: number, strength: number = 1) => {
//     rippleRef.current.push({
//       x,
//       y,
//       radius: 0,
//       maxRadius: 75 * strength,
//       strength: strength * 0.28,
//       life: 0
//     });
//   }, []);

//   const applyMouseForces = useCallback((bubble: Bubble) => {
//     const dx = mouseRef.current.x - bubble.x;
//     const dy = mouseRef.current.y - bubble.y;
//     const distance = Math.sqrt(dx * dx + dy * dy);
//     const influence = bubble.depth * 160 + 40;

//     if (distance < influence) {
//       const force = (influence - distance) / influence;
//       const angle = Math.atan2(dy, dx);
//       const repelForce = force * force * 1.2;

//       bubble.mouseForceX += Math.cos(angle + Math.PI) * repelForce;
//       bubble.mouseForceY += Math.sin(angle + Math.PI) * repelForce;

//       if (mouseRef.current.isPressed) {
//         bubble.mouseForceX *= 1.15;
//         bubble.mouseForceY *= 1.15;
//         bubble.radius = bubble.originalRadius * (1 + Math.sin(Date.now() * 0.05) * 0.02);
//       }
//     }

//     bubble.mouseForceX *= 0.94;
//     bubble.mouseForceY *= 0.94;
//     bubble.dragForceX *= 0.965;
//     bubble.dragForceY *= 0.965;
//   }, []);

//   // Touch handler
//   const touchHandler = useTouchHandler({
//     onStart: (evt) => {
//       mouseRef.current.x = evt.x;
//       mouseRef.current.y = evt.y;
//       mouseRef.current.isPressed = true;
//       createRipple(evt.x, evt.y, 2);
//     },
//     onActive: (evt) => {
//       mouseRef.current.x = evt.x;
//       mouseRef.current.y = evt.y;
//     },
//     onEnd: () => {
//       mouseRef.current.isPressed = false;
//     }
//   });

//   // Animation loop
//   const updateBubbles = useCallback(() => {
//     const time = Date.now();

//     bubblesRef.current.forEach((bubble) => {
//       // התאמת רדיוס חלקה ליעד
//       const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
//       bubble.radius = lerp(bubble.radius, bubble.targetRadius, 0.04);

//       // תנועה טבעית
//       bubble.life += 0.006;
//       bubble.x += bubble.vx + Math.sin(bubble.life * bubble.speed) * 0.06;
//       bubble.y += bubble.vy + Math.cos(bubble.life * bubble.speed * 0.7) * 0.045;

//       // כוחות עכבה
//       bubble.vx *= 0.998;
//       bubble.vy *= 0.998;

//       // כוחות עליה
//       bubble.vy -= 0.0008 * bubble.depth;

//       // השפעת מגע
//       applyMouseForces(bubble);

//       // השפעת גלי הדף
//       rippleRef.current.forEach(ripple => {
//         const dx = bubble.x - ripple.x;
//         const dy = bubble.y - ripple.y;
//         const distance = Math.sqrt(dx * dx + dy * dy);

//         if (distance < ripple.radius && ripple.life < 0.8) {
//           const force = (ripple.radius - distance) / ripple.radius * ripple.strength * 0.5;
//           const angle = Math.atan2(dy, dx);
//           bubble.dragForceX += Math.cos(angle) * force * bubble.depth;
//           bubble.dragForceY += Math.sin(angle) * force * bubble.depth;
//         }
//       });

//       // גבולות המסך
//       const bottomLimit = dimensions.height - bubble.radius * 0.6;
//       if (bubble.x < -bubble.radius) bubble.x = dimensions.width + bubble.radius;
//       if (bubble.x > dimensions.width + bubble.radius) bubble.x = -bubble.radius;
//       if (bubble.y < -bubble.radius) bubble.y = bottomLimit;
//       if (bubble.y > bottomLimit) bubble.y = -bubble.radius;
//     });

//     // עדכון גלים
//     rippleRef.current.forEach((ripple, index) => {
//       ripple.life += 0.02;
//       ripple.radius = ripple.life * ripple.maxRadius;

//       if (ripple.life >= 1) {
//         rippleRef.current.splice(index, 1);
//       }
//     });

//     animationFrameRef.current = requestAnimationFrame(updateBubbles);
//   }, [dimensions, applyMouseForces]);

//   // Load stats
//   useEffect(() => {
//     let mounted = true;
//     (async () => {
//       try {
//         const stats = await EnhancedStatsService.getCommunityStats();
//         if (!mounted) return;
//         statsRef.current = stats;
//         assignStatsToBubbles();
//       } catch (e) {
//         console.error('Failed to load stats for bubbles', e);
//       }
//     })();
//     return () => { mounted = false; };
//   }, [assignStatsToBubbles]);

//   // Refresh stats periodically
//   useEffect(() => {
//     const interval = setInterval(async () => {
//       try {
//         const stats = await EnhancedStatsService.getCommunityStats();
//         statsRef.current = stats;
//         assignStatsToBubbles();
//       } catch (e) {
//         console.error('Refresh stats error', e);
//       }
//     }, REFRESH_MS);
//     return () => clearInterval(interval);
//   }, [assignStatsToBubbles]);

//   // Initialize bubbles and start animation
//   useEffect(() => {
//     initializeBubbles();
//     assignStatsToBubbles();
//     updateBubbles();

//     return () => {
//       if (animationFrameRef.current) {
//         cancelAnimationFrame(animationFrameRef.current);
//       }
//     };
//   }, [initializeBubbles, assignStatsToBubbles, updateBubbles]);

//   // HSL to RGB conversion for Skia
//   const hslToRgb = (h: number, s: number, l: number): string => {
//     h = h / 360;
//     s = s / 100;
//     l = l / 100;

//     const c = (1 - Math.abs(2 * l - 1)) * s;
//     const x = c * (1 - Math.abs((h * 6) % 2 - 1));
//     const m = l - c / 2;

//     let r = 0, g = 0, b = 0;

//     if (0 <= h && h < 1 / 6) {
//       r = c; g = x; b = 0;
//     } else if (1 / 6 <= h && h < 2 / 6) {
//       r = x; g = c; b = 0;
//     } else if (2 / 6 <= h && h < 3 / 6) {
//       r = 0; g = c; b = x;
//     } else if (3 / 6 <= h && h < 4 / 6) {
//       r = 0; g = x; b = c;
//     } else if (4 / 6 <= h && h < 5 / 6) {
//       r = x; g = 0; b = c;
//     } else if (5 / 6 <= h && h < 1) {
//       r = c; g = 0; b = x;
//     }

//     r = Math.round((r + m) * 255);
//     g = Math.round((g + m) * 255);
//     b = Math.round((b + m) * 255);

//     return `rgb(${r}, ${g}, ${b})`;
//   };

//   // Render bubbles with Skia
//   const renderBubbles = () => {
//     const time = clock.current / 1000;

//     return bubblesRef.current
//       .sort((a, b) => a.depth - b.depth) // Sort by depth for proper layering
//       .map((bubble, index) => {
//         const wobbleX = Math.sin(time * bubble.wobbleSpeed + bubble.wobbleOffset) * bubble.wobbleAmount;
//         const wobbleY = Math.cos(time * bubble.wobbleSpeed * 0.7 + bubble.wobbleOffset) * bubble.wobbleAmount * 0.5;

//         const x = bubble.x + wobbleX + bubble.mouseForceX + bubble.dragForceX;
//         const y = bubble.y + wobbleY + bubble.mouseForceY + bubble.dragForceY;

//         const alpha = bubble.opacity * (0.6 + bubble.depth * 0.4);
//         const shimmer = Math.sin(time * bubble.shimmerSpeed + bubble.shimmerOffset) * 0.2 + 0.65;
//         const hue = bubble.hue + Math.sin(time * 0.001 + bubble.shimmerOffset) * 10;

//         // Main bubble colors
//         const color1 = hslToRgb(hue, bubble.saturation + 10, bubble.lightness + 22);
//         const color2 = hslToRgb(hue - 8, bubble.saturation + 8, bubble.lightness);
//         const color3 = hslToRgb(hue - 16, bubble.saturation + 12, bubble.lightness - 16);
//         const color4 = hslToRgb(hue - 24, bubble.saturation + 16, bubble.lightness - 28);

//         return (
//           <Group key={bubble.id}>
//             {/* Main bubble */}
//             <Circle cx={x} cy={y} r={bubble.radius}>
//               <RadialGradient
//                 c={vec(x - bubble.radius * 0.3, y - bubble.radius * 0.4)}
//                 r={bubble.radius}
//                 colors={[
//                   `${color1}${Math.floor(alpha * shimmer * 255).toString(16).padStart(2, '0')}`,
//                   `${color2}${Math.floor(alpha * 0.85 * 255).toString(16).padStart(2, '0')}`,
//                   `${color3}${Math.floor(alpha * 0.6 * 255).toString(16).padStart(2, '0')}`,
//                   `${color4}${Math.floor(alpha * 0.25 * 255).toString(16).padStart(2, '0')}`
//                 ]}
//                 positions={[0, 0.25, 0.65, 1]}
//               />
//             </Circle>

//             {/* Highlight */}
//             <Circle cx={x - bubble.radius * 0.25} cy={y - bubble.radius * 0.35} r={bubble.radius * 0.45}>
//               <RadialGradient
//                 c={vec(x - bubble.radius * 0.35, y - bubble.radius * 0.45)}
//                 r={bubble.radius * 0.7}
//                 colors={[
//                   `rgba(255, 255, 255, ${alpha * shimmer * 0.5})`,
//                   `rgba(255, 255, 255, ${alpha * shimmer * 0.3})`,
//                   `rgba(200, 230, 255, ${alpha * shimmer * 0.15})`,
//                   'rgba(255, 255, 255, 0)'
//                 ]}
//                 positions={[0, 0.3, 0.7, 1]}
//               />
//             </Circle>

//             {/* Small highlight dot */}
//             <Circle cx={x - bubble.radius * 0.4} cy={y - bubble.radius * 0.5} r={bubble.radius * 0.12}>
//               <Paint color={`rgba(255, 255, 255, ${alpha * 0.4})`} />
//             </Circle>

//             {/* Text labels - using system font */}
//             {bubble.labelValue && (
//               <Text
//                 x={x}
//                 y={y - bubble.radius * 0.12}
//                 text={bubble.labelValue}
//                 color="rgba(255, 255, 255, 0.98)"
//                 style={{
//                   fontSize: Math.max(12, bubble.radius * 0.54),
//                   fontWeight: '800',
//                   textAlign: 'center',
//                 }}
//               />
//             )}
//             {bubble.labelText && (
//               <Text
//                 x={x}
//                 y={y + bubble.radius * 0.28}
//                 text={bubble.labelText}
//                 color="rgba(255, 255, 255, 0.92)"
//                 style={{
//                   fontSize: Math.max(10, bubble.radius * 0.25),
//                   fontWeight: '600',
//                   textAlign: 'center',
//                 }}
//               />
//             )}
//           </Group>
//         );
//       });
//   };

//   // Render ripples
//   const renderRipples = () => {
//     return rippleRef.current.map((ripple, index) => {
//       const alpha = (1 - ripple.life) * ripple.strength * 0.3;
//       return (
//         <Group key={`ripple-${index}`}>
//           <Circle cx={ripple.x} cy={ripple.y} r={ripple.radius}>
//             <Paint
//               style="stroke"
//               strokeWidth={2}
//               color={`rgba(200, 230, 255, ${alpha})`}
//             />
//           </Circle>
//           {ripple.life > 0.3 && (
//             <Circle cx={ripple.x} cy={ripple.y} r={ripple.radius * 0.7}>
//               <Paint
//                 style="stroke"
//                 strokeWidth={1}
//                 color={`rgba(150, 200, 255, ${alpha * 0.5})`}
//               />
//             </Circle>
//           )}
//         </Group>
//       );
//     });
//   };

//   // Render floating particles
//   const renderParticles = () => {
//     const time = clock.current / 1000;
//     const particles = [];

//     for (let i = 0; i < 30; i++) {
//       const particleX = (time * 10 + i * 50) % (dimensions.width + 100) - 50;
//       const particleY = (time * 5 + i * 80) % (dimensions.height + 100) - 50;
//       const particleSize = Math.sin(time * 3 + i) * 1 + 2;
//       const particleAlpha = (Math.sin(time * 2 + i) + 1) * 0.1;

//       particles.push(
//         <Circle
//           key={`particle-${i}`}
//           cx={particleX}
//           cy={particleY}
//           r={particleSize}
//         >
//           <Paint color={`rgba(180, 210, 240, ${particleAlpha})`} />
//         </Circle>
//       );
//     }

//     return particles;
//   };

//   return (
//     <Canvas
//       style={{
//         width: dimensions.width,
//         height: dimensions.height,
//         position: 'absolute',
//         top: 0,
//         left: 0,
//       }}
//       onTouch={touchHandler}
//       ref={canvasRef}
//     >
//       {/* Background gradient */}
//       <Oval x={0} y={0} width={dimensions.width} height={dimensions.height}>
//         <LinearGradient
//           start={vec(0, 0)}
//           end={vec(0, dimensions.height)}
//           colors={[colors.blueLight, colors.blueLight, colors.pinkLight, colors.backgroundTertiary]}
//           positions={[0, 0.35, 0.7, 1]}
//         />
//       </Oval>

//       {/* Floating particles */}
//       {renderParticles()}

//       {/* Bubbles */}
//       {renderBubbles()}

//       {/* Ripples */}
//       {renderRipples()}
//     </Canvas>
//   );
// };

// export default FloatingBubblesSkia;
