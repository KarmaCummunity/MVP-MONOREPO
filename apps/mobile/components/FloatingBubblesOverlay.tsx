// File overview:
// - Purpose: Web-only canvas overlay with animated floating bubbles reflecting live community stats.
// - Reached from: Home screen on Web to render an animated background behind content.
// - Inputs: None; fetches stats via `EnhancedStatsService` and renders to <canvas>.
// - Behavior: Creates many bubbles with depth, wobble and shimmer; assigns labels from stats and updates periodically.
import React, { useEffect, useRef, useCallback, useState } from 'react';
import { EnhancedStatsService, formatShortNumber } from '../utils/statsService';
import type { CommunityStats } from '../utils/statsService';
import colors from '../globals/colors';

// Fallback label by size before stats are loaded
const getSizeLabel = (radius: number): string => {
  if (radius < 18) return 'XS';
  if (radius < 35) return 'S';
  if (radius < 60) return 'M';
  if (radius < 90) return 'L';
  return 'XL';
};

interface Bubble {
  id: string;
  x: number;
  y: number;
  originalX: number;
  originalY: number;
  vx: number;
  vy: number;
  radius: number;
  originalRadius: number;
  targetRadius: number;
  depth: number;
  speed: number;
  wobbleSpeed: number;
  wobbleAmount: number;
  wobbleOffset: number;
  shimmerSpeed: number;
  shimmerOffset: number;
  opacity: number;
  hue: number;
  saturation: number;
  lightness: number;
  life: number;
  floatDirection: number;
  mouseForceX: number;
  mouseForceY: number;
  dragForceX: number;
  dragForceY: number;
  labelNumber: number;
  labelText: string;
  labelValue: string;
}

interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  strength: number;
  life: number;
}

interface MouseState {
  x: number;
  y: number;
  isPressed: boolean;
}

const FloatingBubbles = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const bubblesRef = useRef<Bubble[]>([]);
  const mouseRef = useRef<MouseState>({ x: 0, y: 0, isPressed: false });
  const rippleRef = useRef<Ripple[]>([]);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const statsRef = useRef<CommunityStats | null>(null);
  const BOTTOM_SAFE_ZONE_PX = 96; // שמירת אזור הכפתור בתחתית
  const MIN_LABEL_RADIUS_FOR_STATS = 36; // מציגים סטטיסטיקה רק בבועות גדולות יחסית
  const MAX_LABEL_RADIUS_FOR_STATS = 140; // רדיוס מקסימלי לבועה עם סטטיסטיקה
  const REFRESH_MS = 60000; // רענון נתונים כל 60 שניות - סטטיסטיקות לא משתנות בתדירות גבוהה

  // Order and labels for mapping stats to bubbles - all 40+ stats
  const statKeys: Array<keyof CommunityStats> = [
    // Core high-priority stats
    'moneyDonations', 'volunteerHours', 'rides', 'events', 'activeMembers', 'totalUsers',

    // User engagement
    'dailyActiveUsers', 'weeklyActiveUsers', 'newUsersThisWeek', 'newUsersThisMonth',
    'totalOrganizations', 'citiesWithUsers', 'userEngagementRate',

    // Donation metrics
    'totalDonations', 'donationsThisWeek', 'donationsThisMonth', 'activeDonations',
    'completedDonations', 'itemDonations', 'serviceDonations', 'totalMoneyDonated',
    'uniqueDonors', 'avgDonationAmount',

    // Ride metrics
    'totalRides', 'ridesThisWeek', 'ridesThisMonth', 'activeRides', 'completedRides',
    'totalSeatsOffered', 'uniqueDrivers', 'avgSeatsPerRide',

    // Event metrics
    'totalEvents', 'eventsThisWeek', 'eventsThisMonth', 'activeEvents', 'completedEvents',
    'totalEventAttendees', 'virtualEvents',

    // Activity metrics
    'totalActivities', 'activitiesToday', 'activitiesThisWeek', 'totalLogins',
    'donationActivities', 'chatActivities', 'activeUsersTracked',

    // Communication
    'totalMessages', 'totalConversations', 'messagesThisWeek', 'groupConversations',
    'directConversations',

    // Legacy extended stats
    'foodKg', 'clothingKg', 'bloodLiters', 'treesPlanted', 'animalsAdopted', 'recyclingBags',
    'booksDonated', 'appActiveUsers', 'appDownloads', 'activeVolunteers', 'kmCarpooled',
    'fundsRaised', 'mealsServed', 'courses', 'culturalEvents'
  ];

  const STAT_LABELS: Partial<Record<keyof CommunityStats, string>> = {
    // Core stats
    moneyDonations: 'כסף נתרם',
    volunteerHours: 'שעות התנדבות',
    rides: 'נסיעות',
    events: 'אירועים',
    activeMembers: 'חברים פעילים',
    totalUsers: 'סה״כ משתמשים',

    // User engagement
    dailyActiveUsers: 'פעילים יומי',
    weeklyActiveUsers: 'פעילים שבועי',
    newUsersThisWeek: 'חדשים השבוע',
    newUsersThisMonth: 'חדשים החודש',
    totalOrganizations: 'ארגונים',
    citiesWithUsers: 'ערים',
    userEngagementRate: 'אחוז מעורבות',

    // Donation metrics
    totalDonations: 'סה״כ תרומות',
    donationsThisWeek: 'תרומות השבוע',
    donationsThisMonth: 'תרומות החודש',
    activeDonations: 'תרומות פעילות',
    completedDonations: 'תרומות הושלמו',
    itemDonations: 'תרומות פריטים',
    serviceDonations: 'תרומות שירותים',
    totalMoneyDonated: 'סכום נתרם',
    uniqueDonors: 'תורמים ייחודיים',
    avgDonationAmount: 'ממוצע תרומה',

    // Ride metrics
    totalRides: 'סה״כ נסיעות',
    ridesThisWeek: 'נסיעות השבוע',
    ridesThisMonth: 'נסיעות החודש',
    activeRides: 'נסיעות פעילות',
    completedRides: 'נסיעות הושלמו',
    totalSeatsOffered: 'מקומות הוצעו',
    uniqueDrivers: 'נהגים ייחודיים',
    avgSeatsPerRide: 'ממוצע מקומות',

    // Event metrics
    totalEvents: 'סה״כ אירועים',
    eventsThisWeek: 'אירועים השבוע',
    eventsThisMonth: 'אירועים החודש',
    activeEvents: 'אירועים פעילים',
    completedEvents: 'אירועים הושלמו',
    totalEventAttendees: 'משתתפים',
    virtualEvents: 'אירועים וירטואליים',

    // Activity metrics
    totalActivities: 'סה״כ פעילויות',
    activitiesToday: 'פעילויות היום',
    activitiesThisWeek: 'פעילויות השבוע',
    totalLogins: 'סה״כ כניסות',
    donationActivities: 'פעילות תרומה',
    chatActivities: 'פעילות צ׳אט',
    activeUsersTracked: 'משתמשים פעילים',

    // Communication
    totalMessages: 'סה״כ הודעות',
    totalConversations: 'שיחות',
    messagesThisWeek: 'הודעות השבוע',
    groupConversations: 'קבוצות',
    directConversations: 'שיחות פרטיות',

    // Legacy extended stats
    foodKg: 'ק״ג מזון',
    clothingKg: 'ק״ג בגדים',
    bloodLiters: 'ליטר דם',
    treesPlanted: 'עצים ניטעו',
    animalsAdopted: 'בעלי חיים',
    recyclingBags: 'שקיות מיחזור',
    booksDonated: 'ספרים',
    appActiveUsers: 'משתמשים פעילים',
    appDownloads: 'הורדות',
    activeVolunteers: 'מתנדבים',
    kmCarpooled: 'ק״מ נסיעות',
    fundsRaised: 'כספים נגויסו',
    mealsServed: 'ארוחות הוגשו',
    courses: 'קורסים',
    culturalEvents: 'אירועי תרבות',
  };

  const createBubble = useCallback((canvas: HTMLCanvasElement): Bubble => {
    const depth = Math.random();
    const baseSize = 25 + Math.random() * 40;
    const size = baseSize * (0.3 + depth * 1.7); // גדלים מתאימים לעומק
    const hueBase = Math.random() < 0.3
      ? 330 + Math.random() * 20 // pinks 330-350
      : 195 + Math.random() * 45; // light blues 195-240

    return {
      id: `bubble-${Math.random().toString(36).substr(2, 9)}`,
      x: Math.random() * (canvas.width + 200) - 100,
      y: Math.random() * (canvas.height + 200) - 100,
      originalX: 0,
      originalY: 0,
      vx: (Math.random() - 0.5) * 0.08,
      vy: (Math.random() - 0.5) * 0.08,
      radius: size,
      originalRadius: size,
      targetRadius: size,
      depth: depth, // 0 = רחוק, 1 = קרוב
      speed: 0.006 + Math.random() * 0.012,
      wobbleSpeed: 0.0008 + Math.random() * 0.0015,
      wobbleAmount: 1 + Math.random() * 3,
      wobbleOffset: Math.random() * Math.PI,
      shimmerSpeed: 0.008 + Math.random() * 0.015,
      shimmerOffset: Math.random() * Math.PI * 2,
      opacity: 0.5 + depth * 0.4,
      hue: hueBase,
      saturation: 35 + Math.random() * 25,
      lightness: 58 + Math.random() * 18,
      life: Math.random() * 1000,
      floatDirection: Math.random() > 0.5 ? 1 : -1,
      mouseForceX: 0,
      mouseForceY: 0,
      dragForceX: 0,
      dragForceY: 0,
      labelNumber: 0,
      labelText: '',
      labelValue: ''
    };
  }, []);

  const initializeBubbles = useCallback((canvas: HTMLCanvasElement) => {
    bubblesRef.current = [];
    for (let i = 0; i < 120; i++) {
      const bubble = createBubble(canvas);
      bubble.originalX = bubble.x;
      bubble.originalY = bubble.y;
      // ברירת מחדל ללא תוויות
      bubble.labelNumber = 0;
      bubble.labelText = '';
      bubble.labelValue = '';
      bubblesRef.current.push(bubble);
    }
  }, [createBubble]);

  const assignStatsToBubbles = useCallback(() => {
    const stats = statsRef.current;
    if (!stats || bubblesRef.current.length === 0) return;
    // ניקוי תוויות קיימות
    bubblesRef.current.forEach(b => {
      b.labelText = '';
      b.labelValue = '';
      b.labelNumber = 0;
      b.targetRadius = b.originalRadius; // החזרת יעד רדיוס לברירת מחדל
    });

    // הפקת רשימת סטטיסטיקות ממוינות לפי ערך יורד
    const statList = statKeys.map(key => ({ key, value: Number((stats as any)[key] || 0) || 0 }));
    statList.sort((a, b) => b.value - a.value);

    const candidates = [...bubblesRef.current]
      .filter(b => b.originalRadius >= MIN_LABEL_RADIUS_FOR_STATS)
      .sort((a, b) => b.originalRadius - a.originalRadius);

    const count = Math.min(statList.length, candidates.length);
    const valuesForScale = statList.slice(0, count).map(s => s.value);
    const maxVal = Math.max(1, ...valuesForScale);
    const minVal = Math.min(...valuesForScale);
    const range = Math.max(1, maxVal - minVal);

    for (let i = 0; i < count; i++) {
      const bubble = candidates[i];
      const { key, value } = statList[i];
      const norm = (value - minVal) / range; // 0..1
      // יעד רדיוס לפי ערך, עם מעט השפעת עומק כדי לשמור על פרספקטיבה
      const depthFactor = 0.85 + bubble.depth * 0.35; // 0.85..1.2
      const target = (MIN_LABEL_RADIUS_FOR_STATS + 12) + norm * (MAX_LABEL_RADIUS_FOR_STATS - (MIN_LABEL_RADIUS_FOR_STATS + 12));
      bubble.targetRadius = target * depthFactor;

      bubble.labelNumber = value;
      bubble.labelValue = formatShortNumber(value);
      bubble.labelText = STAT_LABELS[key] || 'Stat';
    }
  }, [statKeys]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const stats = await EnhancedStatsService.getCommunityStats();
        if (!mounted) return;
        statsRef.current = stats;
        assignStatsToBubbles();
      } catch (e) {
        console.error('Failed to load stats for bubbles', e);
      }
    })();
    return () => { mounted = false; };
  }, [assignStatsToBubbles]);

  // רענון נתונים רציף (כמעט בזמן אמת)
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const stats = await EnhancedStatsService.getCommunityStats();
        statsRef.current = stats;
        assignStatsToBubbles();
      } catch (e) {
        console.error('Refresh stats error', e);
      }
    }, REFRESH_MS);
    return () => clearInterval(interval);
  }, [assignStatsToBubbles]);

  const createRipple = useCallback((x: number, y: number, strength: number = 1) => {
    rippleRef.current.push({
      x,
      y,
      radius: 0,
      maxRadius: 75 * strength,
      strength: strength * 0.28,
      life: 0
    });
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    mouseRef.current.x = e.clientX - rect.left;
    mouseRef.current.y = e.clientY - rect.top;
  }, []);

  const handleMouseDown = useCallback((e: MouseEvent) => {
    mouseRef.current.isPressed = true;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    createRipple(x, y, 1.5);
  }, [createRipple]);

  const handleMouseUp = useCallback(() => {
    mouseRef.current.isPressed = false;
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const touch = e.touches[0];
    mouseRef.current.x = touch.clientX - rect.left;
    mouseRef.current.y = touch.clientY - rect.top;
  }, []);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    e.preventDefault();
    mouseRef.current.isPressed = true;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    createRipple(x, y, 2);
  }, [createRipple]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    e.preventDefault();
    mouseRef.current.isPressed = false;
  }, []);

  const applyMouseForces = useCallback((bubble: Bubble) => {
    const dx = mouseRef.current.x - bubble.x;
    const dy = mouseRef.current.y - bubble.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const influence = bubble.depth * 160 + 40; // טווח השפעה מעט רחב יותר לתנועה עדינה

    if (distance < influence) {
      const force = (influence - distance) / influence;
      const angle = Math.atan2(dy, dx);
      const repelForce = force * force * 1.2; // כוח דחייה מעט חזק יותר

      bubble.mouseForceX += Math.cos(angle + Math.PI) * repelForce;
      bubble.mouseForceY += Math.sin(angle + Math.PI) * repelForce;

      // אם לוחצים, כוח מעט מוגבר אך עדיין עדין
      if (mouseRef.current.isPressed) {
        bubble.mouseForceX *= 1.15;
        bubble.mouseForceY *= 1.15;
        // רטט עדין מאוד
        bubble.radius = bubble.originalRadius * (1 + Math.sin(Date.now() * 0.05) * 0.02);
      }
    }

    // החזרת כוחות לאפס בהדרגה
    bubble.mouseForceX *= 0.94;
    bubble.mouseForceY *= 0.94;
    bubble.dragForceX *= 0.965;
    bubble.dragForceY *= 0.965;
  }, []);

  const drawBubble = useCallback((ctx: CanvasRenderingContext2D, bubble: Bubble, time: number) => {
    // התאמת רדיוס חלקה ליעד לפי סטטיסטיקה
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    bubble.radius = lerp(bubble.radius, bubble.targetRadius, 0.04);
    const wobbleX = Math.sin(time * bubble.wobbleSpeed + bubble.wobbleOffset) * bubble.wobbleAmount;
    const wobbleY = Math.cos(time * bubble.wobbleSpeed * 0.7 + bubble.wobbleOffset) * bubble.wobbleAmount * 0.5;

    const x = bubble.x + wobbleX + bubble.mouseForceX + bubble.dragForceX;
    const y = bubble.y + wobbleY + bubble.mouseForceY + bubble.dragForceY;

    ctx.save();

    // שקיפות לפי עומק
    const alpha = bubble.opacity * (0.6 + bubble.depth * 0.4);

    // צבעים דינמיים
    const shimmer = Math.sin(time * bubble.shimmerSpeed + bubble.shimmerOffset) * 0.2 + 0.65;
    const hue = bubble.hue + Math.sin(time * 0.001 + bubble.shimmerOffset) * 10;

    // גרדיאנט מורכב עבור הבועה
    const mainGradient = ctx.createRadialGradient(
      x - bubble.radius * 0.3,
      y - bubble.radius * 0.4,
      0,
      x,
      y,
      bubble.radius
    );

    mainGradient.addColorStop(0, `hsla(${hue}, ${bubble.saturation + 10}%, ${bubble.lightness + 22}%, ${alpha * shimmer})`);
    mainGradient.addColorStop(0.25, `hsla(${hue}, ${bubble.saturation}%, ${bubble.lightness + 8}%, ${alpha * 0.85})`);
    mainGradient.addColorStop(0.65, `hsla(${hue - 8}, ${bubble.saturation + 8}%, ${bubble.lightness}%, ${alpha * 0.6})`);
    mainGradient.addColorStop(0.92, `hsla(${hue - 16}, ${bubble.saturation + 12}%, ${bubble.lightness - 16}%, ${alpha * 0.38})`);
    mainGradient.addColorStop(1, `hsla(${hue - 24}, ${bubble.saturation + 16}%, ${bubble.lightness - 28}%, ${alpha * 0.25})`);

    // ציור הבועה הראשית
    ctx.beginPath();
    ctx.arc(x, y, bubble.radius, 0, Math.PI * 2);
    ctx.fillStyle = mainGradient;
    ctx.fill();

    // הברקה עליונה
    const highlightGradient = ctx.createRadialGradient(
      x - bubble.radius * 0.35,
      y - bubble.radius * 0.45,
      0,
      x - bubble.radius * 0.35,
      y - bubble.radius * 0.45,
      bubble.radius * 0.7
    );

    const highlightAlpha = alpha * shimmer * 0.5;
    highlightGradient.addColorStop(0, `rgba(255, 255, 255, ${highlightAlpha})`);
    highlightGradient.addColorStop(0.3, `rgba(255, 255, 255, ${highlightAlpha * 0.6})`);
    highlightGradient.addColorStop(0.7, `rgba(200, 230, 255, ${highlightAlpha * 0.3})`);
    highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.beginPath();
    ctx.arc(x - bubble.radius * 0.25, y - bubble.radius * 0.35, bubble.radius * 0.45, 0, Math.PI * 2);
    ctx.fillStyle = highlightGradient;
    ctx.fill();

    // קו היקפי דק
    ctx.beginPath();
    ctx.arc(x, y, bubble.radius, 0, Math.PI * 2);
    ctx.strokeStyle = `hsla(${hue + 30}, 70%, 80%, ${alpha * 0.4})`;
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // נקודת הברקה קטנה
    ctx.beginPath();
    ctx.arc(x - bubble.radius * 0.4, y - bubble.radius * 0.5, bubble.radius * 0.12, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.4})`;
    ctx.fill();

    // רפלקציה תחתונה עדינה
    const bottomReflectionGradient = ctx.createRadialGradient(
      x,
      y + bubble.radius * 0.6,
      0,
      x,
      y + bubble.radius * 0.6,
      bubble.radius * 0.4
    );

    bottomReflectionGradient.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.12})`);
    bottomReflectionGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.beginPath();
    ctx.arc(x, y + bubble.radius * 0.7, bubble.radius * 0.25, 0, Math.PI * 2);
    ctx.fillStyle = bottomReflectionGradient;
    ctx.fill();

    // labels: number and short text by size (יותר "בועתי")
    const numberFontSize = Math.max(12, bubble.radius * 0.54);
    const textFontSize = Math.max(10, bubble.radius * 0.25);
    const outlineWidth = Math.min(3.5, Math.max(1.2, numberFontSize * 0.16));

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // number - מציגים רק אם קיימת סטטיסטיקה
    if (bubble.labelValue) {
      ctx.font = `800 ${numberFontSize}px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif`;
      ctx.lineWidth = outlineWidth;
      ctx.strokeStyle = 'rgba(10, 22, 48, 0.7)';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.98)';
      const numberY = y - bubble.radius * 0.12;
      // stroke without shadow
      ctx.shadowColor = 'transparent';
      ctx.strokeText(bubble.labelValue, x, numberY);
      // fill with soft shadow to look bubbly
      ctx.shadowColor = 'rgba(0, 0, 0, 0.22)';
      ctx.shadowBlur = Math.max(1, bubble.radius * 0.08);
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      ctx.fillText(bubble.labelValue, x, numberY);
      // reset shadow for next ops
      ctx.shadowColor = 'transparent';
    }

    // short text under the number - מציגים רק אם יש תווית
    if (bubble.labelText) {
      ctx.font = `700 ${textFontSize}px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif`;
      ctx.lineWidth = Math.max(1, outlineWidth * 0.85);
      ctx.strokeStyle = 'rgba(10, 22, 48, 0.55)';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
      const textY = y + bubble.radius * 0.28;
      // stroke without shadow
      ctx.shadowColor = 'transparent';
      ctx.strokeText(bubble.labelText, x, textY);
      // fill with soft shadow
      ctx.shadowColor = 'rgba(0, 0, 0, 0.18)';
      ctx.shadowBlur = Math.max(1, bubble.radius * 0.06);
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      ctx.fillText(bubble.labelText, x, textY);
      ctx.shadowColor = 'transparent';
    }

    ctx.restore();
  }, []);

  const drawRipples = useCallback((ctx: CanvasRenderingContext2D) => {
    rippleRef.current.forEach((ripple, index) => {
      ripple.life += 0.02;
      ripple.radius = ripple.life * ripple.maxRadius;

      if (ripple.life >= 1) {
        rippleRef.current.splice(index, 1);
        return;
      }

      const alpha = (1 - ripple.life) * ripple.strength * 0.3;

      ctx.beginPath();
      ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(200, 230, 255, ${alpha})`;
      ctx.lineWidth = 2;
      ctx.stroke();

      // גלים נוספים
      if (ripple.life > 0.3) {
        ctx.beginPath();
        ctx.arc(ripple.x, ripple.y, ripple.radius * 0.7, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(150, 200, 255, ${alpha * 0.5})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    });
  }, []);

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const time = Date.now();

    // רקע מדרגי בהיר
    const backgroundGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    backgroundGradient.addColorStop(0, colors.blueLight);
    backgroundGradient.addColorStop(0.35, colors.blueLight);
    backgroundGradient.addColorStop(0.7, colors.pinkLight);
    backgroundGradient.addColorStop(1, colors.backgroundTertiary);

    ctx.fillStyle = backgroundGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // מיון בועות לפי עומק לציור נכון
    const sortedBubbles = [...bubblesRef.current].sort((a, b) => a.depth - b.depth);

    // עדכון ורישום בועות
    sortedBubbles.forEach((bubble) => {
      // תנועה טבעית איטית יותר
      bubble.life += 0.006;
      bubble.x += bubble.vx + Math.sin(bubble.life * bubble.speed) * 0.06;
      bubble.y += bubble.vy + Math.cos(bubble.life * bubble.speed * 0.7) * 0.045;

      // כוחות עכבה במים מעט חזקים יותר
      bubble.vx *= 0.998;
      bubble.vy *= 0.998;

      // כוחות עליה עדינים יותר
      bubble.vy -= 0.0008 * bubble.depth; // בועות קרובות עולות מעט יותר

      // השפעת עכבר/מגע
      applyMouseForces(bubble);

      // השפעת גלי הדף
      rippleRef.current.forEach(ripple => {
        const dx = bubble.x - ripple.x;
        const dy = bubble.y - ripple.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < ripple.radius && ripple.life < 0.8) {
          const force = (ripple.radius - distance) / ripple.radius * ripple.strength * 0.5;
          const angle = Math.atan2(dy, dx);
          bubble.dragForceX += Math.cos(angle) * force * bubble.depth;
          bubble.dragForceY += Math.sin(angle) * force * bubble.depth;
        }
      });

      // גבולות המסך עם מעגלות, משאירים מרווח בתחתית לאזור הכפתור
      const bottomLimit = canvas.height - bubble.radius * 0.6;
      if (bubble.x < -bubble.radius) bubble.x = canvas.width + bubble.radius;
      if (bubble.x > canvas.width + bubble.radius) bubble.x = -bubble.radius;
      if (bubble.y < -bubble.radius) bubble.y = bottomLimit;
      if (bubble.y > bottomLimit) bubble.y = -bubble.radius;

      // ציור הבועה
      drawBubble(ctx, bubble, time);
    });

    // ציור גלי הדף
    drawRipples(ctx);

    // חלקיקים קטנים נוספים באווירה
    for (let i = 0; i < 30; i++) {
      const particleX = (time * 0.01 + i * 50) % (canvas.width + 100) - 50;
      const particleY = (time * 0.005 + i * 80) % (canvas.height + 100) - 50;
      const particleSize = Math.sin(time * 0.003 + i) * 1 + 2;
      const particleAlpha = (Math.sin(time * 0.002 + i) + 1) * 0.1;

      ctx.beginPath();
      ctx.arc(particleX, particleY, particleSize, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(180, 210, 240, ${particleAlpha})`;
      ctx.fill();
    }

    animationRef.current = requestAnimationFrame(animate);
  }, [applyMouseForces, drawBubble, drawRipples]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = Math.max(0, window.innerHeight - BOTTOM_SAFE_ZONE_PX);
      setDimensions({ width: canvas.width, height: canvas.height });
      initializeBubbles(canvas);
      assignStatsToBubbles();
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // הוספת מאזיני אירועים
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchend', handleTouchEnd);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [animate, initializeBubbles, handleMouseMove, handleMouseDown, handleMouseUp,
    handleTouchMove, handleTouchStart, handleTouchEnd]);

  return (
    <div
      className="w-full relative overflow-hidden"
      style={{ height: `calc(100vh - ${BOTTOM_SAFE_ZONE_PX}px)` }}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 touch-none"
        style={{
          background: `linear-gradient(180deg, ${colors.blueLight} 0%, ${colors.blueLight} 35%, ${colors.pinkLight} 70%, ${colors.backgroundTertiary} 100%)`
        }}
      />

    </div>
  );
};

export default FloatingBubbles;