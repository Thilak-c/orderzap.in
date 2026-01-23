'use client';

import { useEffect, useRef, useCallback } from 'react';

/**
 * Hook to play sound, vibrate, and send push notification when new orders/calls arrive
 * @param {number} currentCount - Current count of items (orders + calls)
 * @param {object} options - Optional config { title, body }
 */
export function useNotificationAlert(currentCount, options = {}) {
  const prevCountRef = useRef(null);
  const audioContextRef = useRef(null);
  const permissionAsked = useRef(false);

  // Request notification permission on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && !permissionAsked.current) {
      permissionAsked.current = true;
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, []);

  const sendPushNotification = useCallback((count) => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    const title = options.title || '🔔 New Alert';
    const body = options.body || `You have ${count} new item(s) requiring attention`;

    try {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        vibrate: [200, 100, 200],
        tag: 'staff-alert', // Replaces previous notification with same tag
        renotify: true,
      });
    } catch (e) {
      console.log('Push notification failed:', e);
    }
  }, [options.title, options.body]);

  const playBeep = useCallback(() => {
    try {
      // Create audio context on demand (required for mobile)
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      
      const ctx = audioContextRef.current;
      
      // Urgent alarm sound - 3 rapid high-pitched beeps repeated twice
      const playAlarmSequence = (startTime) => {
        const frequencies = [880, 1100, 880]; // A5, C#6, A5 - urgent pattern
        
        frequencies.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          
          osc.connect(gain);
          gain.connect(ctx.destination);
          
          osc.frequency.value = freq;
          osc.type = 'square'; // Harsher, more alerting sound
          
          const beepStart = startTime + (i * 0.12);
          gain.gain.setValueAtTime(0.4, beepStart);
          gain.gain.exponentialRampToValueAtTime(0.01, beepStart + 0.1);
          
          osc.start(beepStart);
          osc.stop(beepStart + 0.1);
        });
      };
      
      // Play the sequence twice
      playAlarmSequence(ctx.currentTime);
      playAlarmSequence(ctx.currentTime + 0.5);
      
    } catch (e) {
      console.log('Audio not supported');
    }
  }, []);

  const vibrate = useCallback(() => {
    if (navigator.vibrate) {
      navigator.vibrate([300, 100, 300, 100, 300]); // Strong urgent pattern
    }
  }, []);

  useEffect(() => {
    // Skip on first render or when count is undefined
    if (currentCount === undefined || currentCount === null) return;
    
    // Initialize prev count on first valid count
    if (prevCountRef.current === null) {
      prevCountRef.current = currentCount;
      return;
    }

    // Alert if count increased
    if (currentCount > prevCountRef.current) {
      playBeep();
      vibrate();
      sendPushNotification(currentCount);
    }

    prevCountRef.current = currentCount;
  }, [currentCount, playBeep, vibrate, sendPushNotification]);

  // Cleanup audio context on unmount
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);
}