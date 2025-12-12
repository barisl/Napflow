import React, { useState, useEffect, useRef, useCallback } from 'react';
import './index.css';
import { Play, Pause, Trophy, Activity, Moon, Battery, Zap, Wind, CheckCircle, Flame, Clock, Plus, Minus, X, User, RotateCcw, Star, Award, Target, TrendingUp, Calendar, BarChart3, Sparkles } from 'lucide-react';
import { supabase } from './supabaseClient';

// Data
const LEVELS = [
    { name: "Schlafwandler", minXP: 0, color: "text-gray-400" },
    { name: "Novize", minXP: 100, color: "text-blue-400" },
    { name: "Meister", minXP: 500, color: "text-green-400" },
    { name: "Traum-Reisender", minXP: 1500, color: "text-purple-400" },
    { name: "Schlaf-Gott", minXP: 5000, color: "text-rose-500" },
];

const PRESETS = [
    { id: 'focus', name: 'Power Focus', duration: 20 * 60, icon: Zap, color: 'bg-orange-500', desc: 'Ideal für Konzentration' },
    { id: 'refresh', name: 'Quick Refresh', duration: 15 * 60, icon: Wind, color: 'bg-blue-400', desc: 'Kurz & knackig' },
    { id: 'recharge', name: 'Deep Recharge', duration: 90 * 60, icon: Battery, color: 'bg-indigo-500', desc: 'Voller Schlafzyklus' },
];

// Helper function to get authenticated user ID
const getUserId = (user) => {
    if (user) {
        return user.id;
    }
    return null;
};

// Helper functions for Supabase
const storage = {
    getItem: async (key, user) => {
        try {
            const userId = getUserId(user);
            if (!userId) {
                return null;
            }
            
            const { data, error } = await supabase
                .from('user_stats')
                .select('data')
                .eq('user_id', userId)
                .eq('key', key)
                .single();
            
            if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
                console.error('Error reading from Supabase:', error);
                return null;
            }
            
            return data?.data || null;
        } catch (e) {
            console.error('Error reading from Supabase:', e);
            return null;
        }
    },
    setItem: async (key, value, user) => {
        try {
            const userId = getUserId(user);
            if (!userId) {
                console.error('No user ID available for saving');
                return;
            }
            
            const { error } = await supabase
                .from('user_stats')
                .upsert({
                    user_id: userId,
                    key: key,
                    data: value,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'user_id,key'
                });
            
            if (error) {
                console.error('Error writing to Supabase:', error);
            }
        } catch (e) {
            console.error('Error writing to Supabase:', e);
        }
    },
    clear: async (user) => {
        try {
            const userId = getUserId(user);
            if (!userId) {
                return;
            }
            
            const { error } = await supabase
                .from('user_stats')
                .delete()
                .eq('user_id', userId);
            
            if (error) {
                console.error('Error clearing Supabase:', error);
            }
        } catch (e) {
            console.error('Error clearing Supabase:', e);
        }
    }
};

// Helper function for Web Notifications
const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
        console.log('This browser does not support notifications');
        return 'denied';
    }
    if (Notification.permission === 'granted') {
        return 'granted';
    }
    if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        return permission;
    }
    return 'denied';
};

const showNotification = (title, body, options = {}) => {
    if (Notification.permission === 'granted') {
        new Notification(title, {
            body,
            icon: '/icon.png',
            badge: '/icon.png',
            ...options
        });
    }
};

// Helper function for Web Audio (alarm sound)
let alarmAudioContext = null;
let alarmOscillator = null;
let alarmGainNode = null;

// Function to activate AudioContext (on timer start)
const unlockAudioContext = async () => {
    try {
        if (!alarmAudioContext) {
            alarmAudioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        if (alarmAudioContext.state === 'suspended') {
            await alarmAudioContext.resume();
            console.log('AudioContext activated');
        }
        
        // Very short, almost silent "Unlock" sound to activate AudioContext
        const unlockOsc = alarmAudioContext.createOscillator();
        const unlockGain = alarmAudioContext.createGain();
        unlockGain.gain.value = 0.001; // Almost silent
        unlockOsc.connect(unlockGain);
        unlockGain.connect(alarmAudioContext.destination);
        unlockOsc.frequency.value = 1; // Very low frequency
        unlockOsc.start();
        unlockOsc.stop(alarmAudioContext.currentTime + 0.01); // Very short
        
        return true;
    } catch (e) {
        console.error('Error unlocking audio context:', e);
        return false;
    }
};

const playAlarmSound = async () => {
    try {
        if (!alarmAudioContext) {
            alarmAudioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        // IMPORTANT: Activate AudioContext if suspended (wait asynchronously!)
        if (alarmAudioContext.state === 'suspended') {
            await alarmAudioContext.resume();
            console.log('AudioContext resumed for alarm');
        }
        
        // Stop previous oscillator if exists
        if (alarmOscillator) {
            try {
                alarmOscillator.stop();
            } catch (e) {
                // Ignore if already stopped
            }
        }
        
        const currentTime = alarmAudioContext.currentTime;
        
        // Create and play sound with smooth fade-in and fade-out
        alarmOscillator = alarmAudioContext.createOscillator();
        alarmGainNode = alarmAudioContext.createGain();
        alarmOscillator.connect(alarmGainNode);
        alarmGainNode.connect(alarmAudioContext.destination);
        
        // Smoother frequency (lower and more pleasant)
        alarmOscillator.frequency.value = 600;
        alarmOscillator.type = 'sine'; // Smoother wave type
        
        // Smooth fade-in and fade-out
        alarmGainNode.gain.setValueAtTime(0, currentTime);
        alarmGainNode.gain.linearRampToValueAtTime(0.4, currentTime + 0.1); // Fade in over 0.1s
        alarmGainNode.gain.setValueAtTime(0.4, currentTime + 0.7); // Hold at 0.4
        alarmGainNode.gain.linearRampToValueAtTime(0, currentTime + 0.8); // Fade out over 0.1s
        
        alarmOscillator.start(currentTime);
        // Sound for 0.8 seconds (then 0.6s pause until next sound)
        alarmOscillator.stop(currentTime + 0.8);
    } catch (e) {
        console.error('Error playing alarm sound:', e);
    }
};

const stopAlarmSound = () => {
    if (alarmOscillator && alarmAudioContext && alarmGainNode) {
        try {
            const currentTime = alarmAudioContext.currentTime;
            
            // Fade out smoothly over 0.1 seconds
            const currentGain = alarmGainNode.gain.value;
            alarmGainNode.gain.cancelScheduledValues(currentTime);
            alarmGainNode.gain.setValueAtTime(currentGain, currentTime);
            alarmGainNode.gain.linearRampToValueAtTime(0, currentTime + 0.1);
            
            // Stop oscillator after fade-out
            setTimeout(() => {
                try {
                    if (alarmOscillator) {
                        alarmOscillator.stop();
                    }
                } catch (e) {
                    // Ignore if already stopped
                }
                alarmOscillator = null;
                alarmGainNode = null;
            }, 100);
        } catch (e) {
            // Fallback: just stop if fade-out fails
            try {
                if (alarmOscillator) {
                    alarmOscillator.stop();
                }
            } catch (e2) {
                // Ignore
            }
            alarmOscillator = null;
            alarmGainNode = null;
        }
    } else if (alarmOscillator) {
        // Fallback if gainNode is not available
        try {
            alarmOscillator.stop();
        } catch (e) {
            // Ignore
        }
        alarmOscillator = null;
        alarmGainNode = null;
    }
};

// LinearGradient component using CSS
const LinearGradient = ({ colors, children, style, start, end, ...props }) => {
    const gradientStyle = {
        background: `linear-gradient(${start?.x === 0 && start?.y === 0 && end?.x === 1 ? 'to right' : 'to bottom'}, ${colors.join(', ')})`,
        ...style
    };
    return <div style={gradientStyle} {...props}>{children}</div>;
};

export default function App() {
    console.log('App component rendering...');
    const [activeTab, setActiveTab] = useState('timer');
    const [timeLeft, setTimeLeft] = useState(20 * 60);
    const [totalTime, setTotalTime] = useState(20 * 60);
    const [isRunning, setIsRunning] = useState(false);
    const [selectedPreset, setSelectedPreset] = useState(PRESETS[0]);
    const [showCompleteModal, setShowCompleteModal] = useState(false);
    const [showCustomModal, setShowCustomModal] = useState(false);
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [tempName, setTempName] = useState("");
    const [customMinutes, setCustomMinutes] = useState(25);
    const [userStats, setUserStats] = useState({
        name: "", xp: 0, totalNaps: 0, totalMinutes: 0, currentStreak: 0, lastNapDate: null
    });
    const [statsKey, setStatsKey] = useState(0); // Force re-render key
    const [weeklyNaps, setWeeklyNaps] = useState({}); // { '2024-01-15': 2, '2024-01-16': 1, ... }
    const [isLoaded, setIsLoaded] = useState(false);
    const isUpdatingStatsRef = useRef(false); // Prevent loadUserData from overwriting updates
    
    // Auth state
    const [user, setUser] = useState(null);
    const [session, setSession] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [isLoginMode, setIsLoginMode] = useState(true);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [authError, setAuthError] = useState("");
    const alarmTimeoutsRef = useRef([]);
    const isAlarmActiveRef = useRef(false);
    const customTimeIntervalRef = useRef(null);
    const customTimePressTimeoutRef = useRef(null);
    
    // Swipe gesture handling
    const touchStartX = useRef(0);
    const touchStartY = useRef(0);
    const minSwipeDistance = 50;

    // Check auth session on mount
    useEffect(() => {
        const checkSession = async () => {
            try {
                // Get existing session from storage
                const { data: { session }, error } = await supabase.auth.getSession();
                
                if (error) {
                    console.error('Error getting session:', error);
                }
                
                if (session) {
                    console.log('Session found, user:', session.user.email);
                    setSession(session);
                    setUser(session.user);
                    setShowAuthModal(false);
                    // Load user data
                    await loadUserData(session.user);
                } else {
                    console.log('No session found');
                    setShowAuthModal(true);
                }
            } catch (error) {
                console.error('Error checking session:', error);
                setShowAuthModal(true);
            } finally {
                setAuthLoading(false);
            }
        };
        
        checkSession();
        
        // Listen for auth changes (login, logout, token refresh)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                console.log('Auth state changed:', event, session?.user?.email);
                setSession(session);
                setUser(session?.user ?? null);
                
                if (session) {
                    setShowAuthModal(false);
                    // Load user data after login or token refresh
                    await loadUserData(session.user);
                } else {
                    // Only show auth modal on explicit logout, not on initial load
                    if (event === 'SIGNED_OUT') {
                        setShowAuthModal(true);
                    }
                }
            }
        );
        
        return () => subscription.unsubscribe();
    }, []);
    
    // Load weekly naps from database
    const loadWeeklyNaps = async (currentUser) => {
        try {
            const today = new Date();
            const monday = new Date(today);
            const dayOfWeek = monday.getDay();
            const diff = monday.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
            monday.setDate(diff);
            monday.setHours(0, 0, 0, 0);
            
            const sunday = new Date(monday);
            sunday.setDate(monday.getDate() + 6);
            sunday.setHours(23, 59, 59, 999);
            
            const { data, error } = await supabase
                .from('naps')
                .select('nap_date, duration_minutes')
                .eq('user_id', currentUser.id)
                .gte('nap_date', monday.toISOString().split('T')[0])
                .lte('nap_date', sunday.toISOString().split('T')[0])
                .order('nap_date', { ascending: true });
            
            if (error) {
                console.error('Error loading weekly naps:', error);
                return;
            }
            
            // Group naps by date and count
            const napsByDate = {};
            if (data) {
                data.forEach(nap => {
                    const date = nap.nap_date;
                    if (!napsByDate[date]) {
                        napsByDate[date] = 0;
                    }
                    napsByDate[date] += 1;
                });
            }
            
            setWeeklyNaps(napsByDate);
        } catch (e) {
            console.error('Error loading weekly naps:', e);
        }
    };
    
    // Load user data
    const loadUserData = async (currentUser) => {
        // Don't overwrite if stats are being updated
        if (isUpdatingStatsRef.current) {
            console.log('loadUserData - skipping, stats are being updated');
            return;
        }
        
        try {
            const jsonValue = await storage.getItem('@napflow_data_final_v2', currentUser);
            if (jsonValue != null) {
                const parsed = typeof jsonValue === 'string' ? JSON.parse(jsonValue) : jsonValue;
                setUserStats(parsed);
                if (!parsed.name || parsed.name === "") {
                    setShowOnboarding(true);
                }
            } else {
                setShowOnboarding(true);
            }
            // Load weekly naps
            await loadWeeklyNaps(currentUser);
            setIsLoaded(true);
        } catch(e) { 
            console.error('Error loading user data:', e);
            setShowOnboarding(true);
            setIsLoaded(true);
        }
    };
    
    // Initialize after auth
    useEffect(() => {
        const init = async () => {
            if (!authLoading && user) {
                // Request notifications
                await requestNotificationPermission();
                await loadUserData(user);
            } else if (!authLoading && !user) {
                setIsLoaded(true);
            }
        };
        init();
    }, [authLoading, user]);
    
    // Reload weekly naps when user changes
    useEffect(() => {
        if (user && isLoaded) {
            loadWeeklyNaps(user);
        }
    }, [user, isLoaded]);
    
    // Auto-refresh weekly naps when a new week starts
    useEffect(() => {
        if (!user || !isLoaded) return;
        
        // Calculate current week's Monday
        const today = new Date();
        const monday = new Date(today);
        const dayOfWeek = monday.getDay();
        const diff = monday.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        monday.setDate(diff);
        monday.setHours(0, 0, 0, 0);
        
        // Calculate time until next Monday
        const nextMonday = new Date(monday);
        nextMonday.setDate(monday.getDate() + 7);
        const msUntilNextMonday = nextMonday.getTime() - today.getTime();
        
        // Reload weekly naps when new week starts
        const timeoutId = setTimeout(() => {
            loadWeeklyNaps(user);
            // Set up interval to check every hour if we're in a new week
            const intervalId = setInterval(() => {
                const now = new Date();
                const currentMonday = new Date(now);
                const currentDayOfWeek = currentMonday.getDay();
                const currentDiff = currentMonday.getDate() - currentDayOfWeek + (currentDayOfWeek === 0 ? -6 : 1);
                currentMonday.setDate(currentDiff);
                currentMonday.setHours(0, 0, 0, 0);
                
                // If we're in a new week, reload data
                if (currentMonday.getTime() !== monday.getTime()) {
                    loadWeeklyNaps(user);
                }
            }, 60 * 60 * 1000); // Check every hour
            
            return () => clearInterval(intervalId);
        }, msUntilNextMonday);
        
        // Also check on app focus/visibility change
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                loadWeeklyNaps(user);
            }
        };
        
        document.addEventListener('visibilitychange', handleVisibilityChange);
        
        return () => {
            clearTimeout(timeoutId);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [user, isLoaded]);

    // Don't auto-save on every userStats change - we save explicitly in finishNap
    // This useEffect was causing issues by potentially overwriting updates
    // useEffect(() => {
    //     if (isLoaded && user) {
    //         // Only save if stats have meaningful data (not initial empty state)
    //         if (userStats.name || userStats.xp > 0 || userStats.totalNaps > 0) {
    //             // Async setItem - nicht blockierend
    //             storage.setItem('@napflow_data_final_v2', JSON.stringify(userStats), user).catch(err => {
    //                 console.error('Error saving to Supabase:', err);
    //             });
    //         }
    //     }
    // }, [userStats, isLoaded, user]);

    // Define handleAlarm before useEffect that uses it
    const handleAlarm = useCallback(async () => {
        console.log('Alarm triggered!');
        setIsRunning(false);
        
        // Show modal immediately
        setShowCompleteModal(true);
        
        // Ensure AudioContext is unlocked before playing sound
        try {
            await unlockAudioContext();
        } catch (error) {
            console.error('Error unlocking audio context:', error);
        }
        
        // Request notification permission and show notification asynchronously
        requestNotificationPermission().then(permission => {
            console.log('Notification permission:', permission);
            if (permission === 'granted') {
                showNotification("Aufwachen!", "Dein Nap ist vorbei.");
            }
        }).catch(error => {
            console.error('Error requesting notification permission:', error);
        });
        
        // Continuous alarm sound and notifications
        alarmTimeoutsRef.current = [];
        isAlarmActiveRef.current = true;
        
        // Function for continuous alarm
        const sendAlarmNotification = async () => {
            if (!isAlarmActiveRef.current) {
                console.log('Alarm stopped - not playing sound');
                return;
            }
            try {
                console.log('Playing alarm sound...');
                await playAlarmSound();
                
                // Only first notification with text, then silent
                if (Notification.permission === 'granted') {
                    showNotification("", "");
                }
                
                // Next sound after 1.4 seconds (sound lasts 0.8s, then 0.6s pause)
                const timeoutId = setTimeout(() => {
                    sendAlarmNotification();
                }, 1400);
                alarmTimeoutsRef.current.push(timeoutId);
            } catch (error) {
                console.error('Error sending alarm notification:', error);
                // Trotzdem weitermachen
                if (isAlarmActiveRef.current) {
                    const timeoutId = setTimeout(() => {
                        sendAlarmNotification();
                    }, 1400);
                    alarmTimeoutsRef.current.push(timeoutId);
                }
            }
        };
        
        // Starte kontinuierlichen Alarm sofort (kein doppelter initialer Sound)
        sendAlarmNotification();
    }, []);

    useEffect(() => {
        let interval = null;
        if (isRunning && timeLeft > 0) {
            isAlarmActiveRef.current = false;
            alarmTimeoutsRef.current.forEach(timeoutId => clearTimeout(timeoutId));
            alarmTimeoutsRef.current = [];
            interval = setInterval(() => {
                setTimeLeft((t) => {
                    const newTime = t - 1;
                    if (newTime <= 0) {
                        // Timer reached 0, trigger alarm immediately
                        clearInterval(interval);
                        handleAlarm();
                        return 0;
                    }
                    return newTime;
                });
            }, 1000);
        } else if (timeLeft === 0 && isRunning) {
            // Fallback: if timer is already at 0 and running, trigger alarm
            handleAlarm();
        }
        return () => {
            if (interval) {
                clearInterval(interval);
            }
        };
    }, [isRunning, timeLeft, handleAlarm]);

    useEffect(() => {
        return () => {
            isAlarmActiveRef.current = false;
            alarmTimeoutsRef.current.forEach(timeoutId => clearTimeout(timeoutId));
            alarmTimeoutsRef.current = [];
            stopAlarmSound();
            if (customTimeIntervalRef.current) {
                clearInterval(customTimeIntervalRef.current);
                customTimeIntervalRef.current = null;
            }
            if (customTimePressTimeoutRef.current) {
                clearTimeout(customTimePressTimeoutRef.current);
                customTimePressTimeoutRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (!showCustomModal) {
            if (customTimeIntervalRef.current) {
                clearInterval(customTimeIntervalRef.current);
                customTimeIntervalRef.current = null;
            }
            if (customTimePressTimeoutRef.current) {
                clearTimeout(customTimePressTimeoutRef.current);
                customTimePressTimeoutRef.current = null;
            }
        } else {
            // When modal opens, set customMinutes to 1 by default
            setCustomMinutes(1);
        }
    }, [showCustomModal]);

    const finishNap = async () => {
        isAlarmActiveRef.current = false;
        alarmTimeoutsRef.current.forEach(timeoutId => clearTimeout(timeoutId));
        alarmTimeoutsRef.current = [];
        stopAlarmSound();
        
        const today = new Date();
        const todayString = today.toDateString();
        const todayDateString = today.toISOString().split('T')[0]; // YYYY-MM-DD format
        
        let newStreak = userStats.currentStreak;
        if (userStats.lastNapDate && userStats.lastNapDate !== todayString) {
            newStreak += 1;
        } else if (!userStats.lastNapDate) {
            newStreak = 1;
        }
        
        // Calculate minutes from the original preset duration
        // selectedPreset.duration is in SECONDS, so we need to convert to minutes
        // Use the original preset duration, not the current totalTime (which might be 0)
        const originalDurationSeconds = selectedPreset?.duration || (totalTime > 0 ? totalTime : PRESETS[0].duration);
        const minutes = Math.floor(originalDurationSeconds / 60);
        const xpEarned = minutes * 5;
        
        console.log('finishNap - originalDurationSeconds:', originalDurationSeconds, 'minutes:', minutes, 'xpEarned:', xpEarned, 'selectedPreset:', selectedPreset);
        
        // Save nap to database
        if (user) {
            try {
                const { error } = await supabase
                    .from('naps')
                    .insert({
                        user_id: user.id,
                        nap_date: todayDateString,
                        duration_minutes: minutes,
                        xp_earned: xpEarned
                    });
                
                if (error) {
                    console.error('Error saving nap to database:', error);
                } else {
                    // Reload weekly naps to update the chart
                    await loadWeeklyNaps(user);
                }
            } catch (e) {
                console.error('Error saving nap:', e);
            }
        }
        
        // Mark that we're updating stats
        isUpdatingStatsRef.current = true;
        
        // Update stats immediately (like before Supabase)
        // Use functional update to ensure we have the latest state
        setUserStats(prev => {
            const newXP = (prev.xp || 0) + xpEarned;
            const newStats = {
                ...prev,
                xp: newXP,
                totalNaps: (prev.totalNaps || 0) + 1,
                totalMinutes: (prev.totalMinutes || 0) + minutes,
                currentStreak: newStreak,
                lastNapDate: todayString
            };
            
            console.log('finishNap - State update:', {
                oldXP: prev.xp,
                xpEarned: xpEarned,
                newXP: newXP,
                newStats: newStats
            });
            
            // Save to Supabase asynchronously (don't block)
            if (user) {
                setTimeout(() => {
                    storage.setItem('@napflow_data_final_v2', JSON.stringify(newStats), user)
                        .then(() => {
                            console.log('finishNap - saved to Supabase');
                            // Allow loadUserData after save is complete
                            setTimeout(() => {
                                isUpdatingStatsRef.current = false;
                            }, 500);
                        })
                        .catch(err => {
                            console.error('Error saving:', err);
                            isUpdatingStatsRef.current = false;
                        });
                }, 100);
            } else {
                isUpdatingStatsRef.current = false;
            }
            
            return newStats;
        });
        
        setStatsKey(prev => prev + 1);
        
        // Reset timer and stop running - ensure totalTime is valid
        // Always use selectedPreset.duration for reset, as it's the original duration
        const resetTime = selectedPreset?.duration || totalTime || PRESETS[0].duration;
        console.log('finishNap - resetting timer to:', resetTime, 'selectedPreset:', selectedPreset);
        setTimeLeft(resetTime);
        setTotalTime(resetTime);
        setIsRunning(false);
        setShowCompleteModal(false);
    };

    const currentLevel = LEVELS.slice().reverse().find(l => userStats.xp >= l.minXP) || LEVELS[0];
    const nextLevel = LEVELS.find(l => l.minXP > userStats.xp);
    const isMaxLevel = !nextLevel;
    const xpForNextLevel = nextLevel ? nextLevel.minXP - userStats.xp : 0;
    const xpInCurrentLevel = userStats.xp - currentLevel.minXP;
    const xpNeededForNext = nextLevel ? (nextLevel.minXP - currentLevel.minXP) : 1;
    const progressPercentage = isMaxLevel ? 100 : Math.min(100, (xpInCurrentLevel / xpNeededForNext) * 100);

    const startCustom = () => {
        // Use the current customMinutes value directly
        const minutes = customMinutes;
        const sec = minutes * 60;
        setSelectedPreset({ id: 'custom', name: 'Custom', duration: sec, icon: Clock, color: 'bg-pink-500' });
        setTotalTime(sec);
        setTimeLeft(sec);
        setIsRunning(false);
        setShowCustomModal(false);
    };

    // Auth functions
    const handleSignUp = async () => {
        setAuthError("");
        try {
            const { data, error } = await supabase.auth.signUp({
                email: email,
                password: password,
            });
            
            if (error) throw error;
            
            if (data.user) {
                console.log('Sign up successful');
                // Note: Supabase may require email confirmation
                // If email confirmation is enabled, session might be null initially
                if (data.session) {
                    setSession(data.session);
                    setUser(data.user);
                    setShowAuthModal(false);
                    setShowOnboarding(true);
                } else {
                    // Email confirmation required
                    setAuthError('Bitte bestätige deine E-Mail-Adresse. Prüfe dein Postfach.');
                }
                // Clear email/password fields
                setEmail("");
                setPassword("");
            }
        } catch (error) {
            console.error('Sign up error:', error);
            setAuthError(error.message || 'Fehler beim Registrieren');
        }
    };
    
    const handleSignIn = async () => {
        setAuthError("");
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password,
            });
            
            if (error) throw error;
            
            if (data.user && data.session) {
                console.log('Login successful, session saved');
                setSession(data.session);
                setUser(data.user);
                setShowAuthModal(false);
                // Clear email/password fields
                setEmail("");
                setPassword("");
            }
        } catch (error) {
            console.error('Login error:', error);
            setAuthError(error.message || 'Fehler beim Anmelden');
        }
    };
    
    const handleSignOut = async () => {
        await supabase.auth.signOut();
        setUserStats({
            name: "", xp: 0, totalNaps: 0, totalMinutes: 0, currentStreak: 0, lastNapDate: null
        });
    };
    
    const handleReset = async () => {
        if (window.confirm('Möchtest du wirklich alle Daten löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) {
            try {
                // Delete all naps
                if (user) {
                    const { error: napsError } = await supabase
                        .from('naps')
                        .delete()
                        .eq('user_id', user.id);
                    
                    if (napsError) {
                        console.error('Error deleting naps:', napsError);
                    }
                }
                
                // Delete user stats
                await storage.clear(user);
                
                // Reset weekly naps
                setWeeklyNaps({});
                
                window.alert('Daten gelöscht. Bitte lade die Seite neu.');
                window.location.reload();
            } catch (error) {
                console.error('Error resetting data:', error);
                window.alert('Fehler beim Löschen der Daten.');
            }
        }
    };

    if (!isLoaded) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#111827', color: 'white' }}>
                <p>Lädt...</p>
            </div>
        );
    }

    return (
        <div 
            style={{ minHeight: '100vh', paddingTop: '40px', backgroundColor: '#111827' }}
            onTouchStart={(e) => {
                // Don't handle swipes when modal is open
                if (showCustomModal || showCompleteModal || showOnboarding) return;
                touchStartX.current = e.touches[0].clientX;
                touchStartY.current = e.touches[0].clientY;
            }}
            onTouchEnd={(e) => {
                // Don't handle swipes when modal is open
                if (showCustomModal || showCompleteModal || showOnboarding) return;
                if (!touchStartX.current || !touchStartY.current) return;
                
                const touchEndX = e.changedTouches[0].clientX;
                const touchEndY = e.changedTouches[0].clientY;
                
                const deltaX = touchEndX - touchStartX.current;
                const deltaY = touchEndY - touchStartY.current;
                
                // Only handle horizontal swipes (ignore vertical scrolling)
                if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
                    if (deltaX > 0) {
                        // Swipe right → go to Stats (left tab)
                        if (activeTab === 'timer') {
                            setActiveTab('stats');
                        } else if (activeTab === 'profile') {
                            setActiveTab('timer');
                        }
                    } else {
                        // Swipe left → go to Profile (right tab)
                        if (activeTab === 'timer') {
                            setActiveTab('profile');
                        } else if (activeTab === 'stats') {
                            setActiveTab('timer');
                        }
                    }
                }
                
                touchStartX.current = 0;
                touchStartY.current = 0;
            }}
        >
            <div style={{ paddingBottom: '100px', overflowY: 'auto', height: 'calc(100vh - 80px)', position: 'relative', overflowX: 'hidden' }}>
                {/* Header */}
                <div className="p-6 flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Napflow</h1>
                        <p className="text-gray-400">Hallo, {userStats.name || "Schläfer"}</p>
                    </div>
                    <div className="bg-gray-800 px-4 py-2 rounded-full flex items-center border border-gray-700" key={`xp-display-${statsKey}`}>
                        <Trophy size={16} color="#FACC15" />
                        <span className="text-white font-bold ml-2">{userStats.xp} XP</span>
                    </div>
                </div>

                {/* Tab Content Container */}
                <div>
                    {activeTab === 'timer' && (
                    <div className="px-6 items-center">
                        <p className={`text-sm uppercase tracking-widest font-bold mb-8 ${currentLevel.color}`}>
                            {currentLevel.name}
                        </p>

                        {/* Timer Circle */}
                        <div className="items-center justify-center mb-10" style={{ width: 256, height: 256, position: 'relative', margin: '0 auto' }}>
                            <div 
                                style={{
                                    position: 'absolute',
                                    width: 256,
                                    height: 256,
                                    borderRadius: '50%',
                                    border: '8px solid #1f2937',
                                }}
                            />
                            <div 
                                style={{
                                    position: 'absolute',
                                    width: 240,
                                    height: 240,
                                    borderRadius: '50%',
                                    backgroundColor: 'rgba(31, 41, 55, 0.3)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexDirection: 'column',
                                    border: '2px solid #1f2937',
                                    top: 8,
                                    left: 8,
                                }}
                            >
                                <span className="text-6xl font-bold text-white" style={{ fontVariantNumeric: 'tabular-nums' }}>
                                    {Math.floor(timeLeft / 60).toString().padStart(2, '0')}:{(timeLeft % 60).toString().padStart(2, '0')}
                                </span>
                                <p className="text-gray-400 mt-2">{isRunning ? 'Gute Nacht...' : 'Bereit'}</p>
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="flex gap-6 mb-10 items-center justify-center mt-2">
                            {!isRunning && (
                                <button onClick={() => setTimeLeft(totalTime)} className="p-3 bg-gray-800 rounded-full border border-gray-700">
                                    <RotateCcw size={20} color="gray" />
                                </button>
                            )}
                            <button onClick={async () => {
                                // IMPORTANT: Activate AudioContext on start (uses user interaction)
                                if (!isRunning) {
                                    await unlockAudioContext();
                                    // Ensure timeLeft is valid before starting
                                    if (timeLeft <= 0) {
                                        const resetTime = selectedPreset?.duration || totalTime || PRESETS[0].duration;
                                        console.log('Play button - resetting timeLeft from', timeLeft, 'to', resetTime);
                                        setTimeLeft(resetTime);
                                        setTotalTime(resetTime);
                                    }
                                }
                                setIsRunning(!isRunning);
                            }} className={`p-6 rounded-full ${isRunning ? 'bg-gray-800 border-2 border-red-500' : 'bg-blue-600'}`}>
                                {isRunning ? <Pause size={32} color="red" /> : <Play size={32} color="white" />}
                            </button>
                        </div>

                        {/* Presets */}
                        <div className="w-full gap-3" style={{ display: 'flex', flexDirection: 'column' }}>
                            {PRESETS.map(p => {
                                const IconComponent = p.icon;
                                return (
                                    <button 
                                        key={p.id} 
                                        onClick={() => { setSelectedPreset(p); setTotalTime(p.duration); setTimeLeft(p.duration); setIsRunning(false); }}
                                        className={`flex items-center p-4 rounded-xl bg-gray-800 border ${selectedPreset.id === p.id ? 'border-blue-500' : 'border-transparent'}`}
                                    >
                                        <div className={`p-3 rounded-lg ${p.color}`}><IconComponent size={20} color="white" /></div>
                                        <div className="ml-4 flex-1 text-left">
                                            <p className="text-white font-bold">{p.name}</p>
                                            <p className="text-gray-400 text-xs">{p.desc}</p>
                                        </div>
                                        <span className="text-gray-500">{p.duration / 60}m</span>
                                    </button>
                                );
                            })}
                            <button onClick={() => setShowCustomModal(true)} className="flex items-center p-4 rounded-xl bg-gray-800 border border-transparent">
                                <div className="p-3 rounded-lg bg-pink-500"><Clock size={20} color="white" /></div>
                                <span className="ml-4 text-white font-bold">Eigene Zeit</span>
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'stats' && (
                    <div className="px-6 py-4">
                        <h2 className="text-3xl font-bold text-white mb-2">Deine Statistik</h2>
                        <p className="text-gray-400 mb-6">Übersicht deiner Nap-Performance</p>

                        {/* Hauptstatistiken Grid */}
                        <div className="flex gap-3 mb-4">
                            <LinearGradient 
                                colors={['rgba(249, 115, 22, 0.2)', 'rgba(234, 88, 12, 0.1)']}
                                style={{ flex: 1, padding: 16, borderRadius: 16, border: '1px solid rgba(249, 115, 22, 0.3)' }}
                            >
                                <Flame size={20} color="orange" />
                                <p className="text-3xl font-bold text-white mt-2">{userStats.currentStreak}</p>
                                <p className="text-gray-400 text-xs">Tage Streak</p>
                                {userStats.currentStreak > 0 && (
                                    <div className="flex items-center gap-1 mt-1">
                                        <TrendingUp size={12} color="#22c55e" />
                                        <span className="text-green-400 text-xs">Aktiv</span>
                                    </div>
                                )}
                            </LinearGradient>

                            <LinearGradient 
                                colors={['rgba(59, 130, 246, 0.2)', 'rgba(37, 99, 235, 0.1)']}
                                style={{ flex: 1, padding: 16, borderRadius: 16, border: '1px solid rgba(59, 130, 246, 0.3)' }}
                            >
                                <Moon size={20} color="#3B82F6" />
                                <p className="text-3xl font-bold text-white mt-2">{userStats.totalNaps}</p>
                                <p className="text-gray-400 text-xs">Naps Gesamt</p>
                                <span className="text-blue-400 text-xs mt-1">
                                    Ø {userStats.totalNaps > 0 ? Math.round(userStats.totalMinutes / userStats.totalNaps) : 0} Min
                                </span>
                            </LinearGradient>
                        </div>

                        {/* Zeit-Statistik */}
                        <LinearGradient 
                            colors={['rgba(168, 85, 247, 0.2)', 'rgba(147, 51, 234, 0.1)']}
                            style={{ padding: 20, borderRadius: 16, border: '1px solid rgba(168, 85, 247, 0.3)', marginBottom: 16 }}
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <Clock size={22} color="#A855F7" />
                                    <p className="text-white font-bold">Geschlafene Zeit</p>
                                </div>
                                <Sparkles size={18} color="#A855F7" />
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-4xl font-bold text-white">{Math.floor(userStats.totalMinutes / 60)}</span>
                                <span className="text-gray-400 text-lg">Stunden</span>
                                <span className="text-gray-400 text-lg">{userStats.totalMinutes % 60}</span>
                                <span className="text-gray-400 text-lg">Minuten</span>
                            </div>
                            <p className="text-purple-400 text-xs mt-2">
                                {userStats.totalNaps > 0 ? `Durchschnitt: ${Math.round(userStats.totalMinutes / userStats.totalNaps)} Min pro Nap` : 'Starte deinen ersten Nap!'}
                            </p>
                        </LinearGradient>

                        {/* Bestleistungen */}
                        <div className="bg-gray-800 p-5 rounded-2xl border border-gray-700 mb-4">
                            <div className="flex items-center gap-2 mb-4">
                                <Trophy size={20} color="#FACC15" />
                                <p className="text-white font-bold text-lg">Bestleistungen</p>
                            </div>
                            <div className="flex flex-col gap-3">
                                <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <Flame size={18} color="orange" />
                                        <span className="text-white">Längster Streak</span>
                                    </div>
                                    <span className="text-white font-bold">{userStats.currentStreak} Tage</span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <Calendar size={18} color="#3B82F6" />
                                        <span className="text-white">Naps diese Woche</span>
                                    </div>
                                    <span className="text-white font-bold">
                                        {userStats.totalNaps > 0 ? Math.min(7, Math.floor(userStats.totalNaps / Math.max(1, Math.floor(userStats.totalNaps / 7)))) : 0}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <BarChart3 size={18} color="#22c55e" />
                                        <span className="text-white">Gesamt XP</span>
                                    </div>
                                    <span className="text-white font-bold">{userStats.xp} XP</span>
                                </div>
                            </div>
                        </div>

                        {/* Motivationskarte */}
                        <LinearGradient 
                            colors={['rgba(37, 99, 235, 0.2)', 'rgba(147, 51, 234, 0.2)']}
                            style={{ padding: 20, borderRadius: 16, border: '1px solid rgba(59, 130, 246, 0.3)', marginBottom: 16 }}
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <Sparkles size={20} color="#8b5cf6" />
                                <p className="text-white font-bold text-lg">Dein Fortschritt</p>
                            </div>
                            {userStats.totalNaps === 0 ? (
                                <p className="text-gray-300">
                                    Starte deinen ersten Nap und beginne deine Reise zu mehr Energie! 💪
                                </p>
                            ) : userStats.totalNaps < 5 ? (
                                <p className="text-gray-300">
                                    Du bist auf dem richtigen Weg! {5 - userStats.totalNaps} weitere Naps bis zu deinem ersten Meilenstein! 🚀
                                </p>
                            ) : userStats.currentStreak >= 7 ? (
                                <p className="text-gray-300">
                                    Wow! {userStats.currentStreak} Tage Streak - du bist ein wahrer Nap-Meister! 🔥
                                </p>
                            ) : (
                                <p className="text-gray-300">
                                    Großartig! Du hast bereits {userStats.totalNaps} Naps gemacht. Weiter so! ⭐
                                </p>
                            )}
                        </LinearGradient>

                        {/* Wöchentliche Übersicht */}
                        <div className="bg-gray-800 p-5 rounded-2xl border border-gray-700 mb-4">
                            <div className="flex items-center gap-2 mb-4">
                                <Calendar size={20} color="#3B82F6" />
                                <p className="text-white font-bold text-lg">Diese Woche</p>
                            </div>
                            <div className="flex justify-between items-end" style={{ height: 96, gap: 8 }}>
                                {(() => {
                                    const today = new Date();
                                    const dayLabels = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
                                    const monday = new Date(today);
                                    const dayOfWeek = monday.getDay();
                                    const diff = monday.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
                                    monday.setDate(diff);
                                    
                                    return dayLabels.map((dayLabel, index) => {
                                        const dayDate = new Date(monday);
                                        dayDate.setDate(monday.getDate() + index);
                                        const isPastOrToday = dayDate <= today;
                                        const isToday = dayDate.toDateString() === today.toDateString();
                                        
                                        // Get nap count for this day from database
                                        const dayDateString = dayDate.toISOString().split('T')[0]; // YYYY-MM-DD
                                        const napCount = weeklyNaps[dayDateString] || 0;
                                        const hasNap = napCount > 0;
                                        
                                        // Calculate height based on nap count (max 3 naps = full height)
                                        const maxNaps = 3;
                                        const height = hasNap ? Math.min(60, 20 + (napCount / maxNaps) * 40) : 10;
                                        
                                        return (
                                            <div key={index} className="flex-1 flex flex-col items-center gap-2">
                                                <div className="relative w-full" style={{ height: 96 }}>
                                                    <div 
                                                        className={`w-full rounded-t-lg ${hasNap ? 'bg-blue-500' : isToday ? 'bg-gray-600' : 'bg-gray-700'}`}
                                                        style={{ 
                                                            height: Math.max(10, height), 
                                                            opacity: isPastOrToday ? 1 : 0.3,
                                                            position: 'absolute',
                                                            bottom: 0,
                                                            width: '100%'
                                                        }}
                                                    />
                                                    {/* Show nap count on top of bar */}
                                                    {hasNap && (
                                                        <div 
                                                            className="absolute"
                                                            style={{
                                                                bottom: Math.max(10, height) + 4,
                                                                left: '50%',
                                                                transform: 'translateX(-50%)',
                                                                fontSize: '12px',
                                                                fontWeight: 'bold',
                                                                color: '#3B82F6',
                                                                whiteSpace: 'nowrap'
                                                            }}
                                                        >
                                                            {napCount}
                                                        </div>
                                                    )}
                                                </div>
                                                <span className={`text-xs ${isToday ? 'text-blue-400 font-bold' : 'text-gray-400'}`}>
                                                    {dayLabel}
                                                </span>
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                            <p className="text-gray-400 text-xs mt-3 text-center">
                                Naps pro Tag (diese Woche)
                            </p>
                        </div>

                        {/* Level Fortschritt */}
                        <div className="bg-gray-800 p-5 rounded-2xl border border-gray-700 mb-4">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <Award size={20} color="#8b5cf6" />
                                    <p className="text-white font-bold">{currentLevel.name}</p>
                                </div>
                                <span className="text-gray-400 text-sm">{userStats.xp} / {nextLevel ? nextLevel.minXP : userStats.xp} XP</span>
                            </div>
                            <div className="h-3 bg-gray-700 rounded-full overflow-hidden mb-2">
                                <LinearGradient
                                    colors={['#3b82f6', '#8b5cf6']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={{ 
                                        height: '100%', 
                                        width: `${progressPercentage}%`,
                                        borderRadius: 9999,
                                    }}
                                />
                            </div>
                            <p className="text-gray-400 text-sm">
                                {isMaxLevel ? '🎉 Maximales Level erreicht!' : `${xpForNextLevel} XP bis ${nextLevel.name}`}
                            </p>
                        </div>
                    </div>
                )}

                {activeTab === 'profile' && (
                    <div className="px-6 py-6">
                        {/* Header Card */}
                        <div className="items-center mb-6" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <LinearGradient 
                                colors={['#6366f1', '#8b5cf6']} 
                                style={{ width: 112, height: 112, borderRadius: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}
                            >
                                <span className="text-5xl text-white font-bold">{userStats.name ? userStats.name[0].toUpperCase() : '?'}</span>
                            </LinearGradient>
                            <h2 className="text-3xl font-bold text-white mb-2">{userStats.name || 'Schläfer'}</h2>
                            <div className="flex items-center gap-2">
                                <Trophy size={16} color="#FACC15" />
                                <span className={`text-lg font-semibold ${currentLevel.color}`}>{currentLevel.name}</span>
                            </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="flex gap-3 mb-4">
                            <div className="flex-1 bg-gray-800 p-4 rounded-2xl border border-gray-700">
                                <div className="flex items-center gap-2 mb-2">
                                    <Star size={18} color="#FACC15" />
                                    <span className="text-gray-400 text-xs">XP</span>
                                </div>
                                <p className="text-2xl font-bold text-white">{userStats.xp}</p>
                            </div>
                            <div className="flex-1 bg-gray-800 p-4 rounded-2xl border border-gray-700">
                                <div className="flex items-center gap-2 mb-2">
                                    <Moon size={18} color="#3B82F6" />
                                    <span className="text-gray-400 text-xs">Naps</span>
                                </div>
                                <p className="text-2xl font-bold text-white">{userStats.totalNaps}</p>
                            </div>
                            <div className="flex-1 bg-gray-800 p-4 rounded-2xl border border-gray-700">
                                <div className="flex items-center gap-2 mb-2">
                                    <Flame size={18} color="orange" />
                                    <span className="text-gray-400 text-xs">Streak</span>
                                </div>
                                <p className="text-2xl font-bold text-white">{userStats.currentStreak}</p>
                            </div>
                        </div>

                        {/* Level Progress Card */}
                        <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 mb-4">
                            <div className="flex justify-between items-center mb-3">
                                <div className="flex items-center gap-2">
                                    <Award size={20} color="#8b5cf6" />
                                    <p className="text-white font-bold text-lg">Level Fortschritt</p>
                                </div>
                                <span className="text-gray-400 text-sm">{userStats.xp} / {nextLevel ? nextLevel.minXP : userStats.xp} XP</span>
                            </div>
                            <div className="h-3 bg-gray-700 rounded-full overflow-hidden mb-2">
                                <LinearGradient
                                    colors={['#3b82f6', '#8b5cf6']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={{ 
                                        height: '100%', 
                                        width: `${progressPercentage}%`,
                                        borderRadius: 9999,
                                    }}
                                />
                            </div>
                            <p className="text-gray-400 text-sm">
                                {isMaxLevel ? '🎉 Maximales Level erreicht!' : `${xpForNextLevel} XP bis ${nextLevel.name}`}
                            </p>
                        </div>

                        {/* Achievements Card */}
                        <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 mb-4">
                            <div className="flex items-center gap-2 mb-4">
                                <Target size={20} color="#22c55e" />
                                <p className="text-white font-bold text-lg">Erfolge</p>
                            </div>
                            <div className="flex flex-col gap-3">
                                <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <Trophy size={20} color="#FACC15" />
                                        <span className="text-white">Erster Nap</span>
                                    </div>
                                    {userStats.totalNaps > 0 && <CheckCircle size={20} color="#22c55e" />}
                                </div>
                                <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <Flame size={20} color="orange" />
                                        <span className="text-white">7-Tage Streak</span>
                                    </div>
                                    {userStats.currentStreak >= 7 && <CheckCircle size={20} color="#22c55e" />}
                                </div>
                                <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <Moon size={20} color="#3B82F6" />
                                        <span className="text-white">50 Naps</span>
                                    </div>
                                    {userStats.totalNaps >= 50 && <CheckCircle size={20} color="#22c55e" />}
                                </div>
                            </div>
                        </div>

                        {/* Settings */}
                        <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700">
                            <p className="text-white font-bold text-lg mb-4">Einstellungen</p>
                            
                            {/* User Info */}
                            {user && (
                                <div className="mb-4 p-4 bg-gray-700/50 rounded-xl">
                                    <p className="text-gray-400 text-xs mb-1">E-Mail</p>
                                    <p className="text-white text-sm">{user.email}</p>
                                </div>
                            )}
                            
                            <div className="flex flex-col gap-3">
                                <button 
                                    onClick={handleSignOut}
                                    className="flex items-center justify-between p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl w-full"
                                >
                                    <div className="flex items-center gap-3">
                                        <User size={20} color="#3b82f6" />
                                        <span className="text-blue-400 font-semibold">Abmelden</span>
                                    </div>
                                </button>
                                
                                <button 
                                    onClick={handleReset}
                                    className="flex items-center justify-between p-4 bg-red-500/10 border border-red-500/30 rounded-xl w-full"
                                >
                                    <div className="flex items-center gap-3">
                                        <X size={20} color="#ef4444" />
                                        <span className="text-red-500 font-semibold">App zurücksetzen</span>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                </div>
            </div>

            {/* Tab Bar */}
            <div className="fixed bottom-0 w-full bg-gray-900 border-t border-gray-800 flex justify-around py-4 pb-8" style={{ zIndex: 1000 }}>
                <button onClick={() => setActiveTab('stats')} className="p-2">
                    <Activity color={activeTab==='stats'?'#3B82F6':'gray'} size={24} />
                </button>
                <button onClick={() => setActiveTab('timer')} className="-mt-8 bg-blue-600 p-4 rounded-full shadow-lg">
                    <Moon color="white" fill="white" size={24} />
                </button>
                <button onClick={() => setActiveTab('profile')} className="p-2">
                    <User color={activeTab==='profile'?'#3B82F6':'gray'} size={24} />
                </button>
            </div>

            {/* MODALS */}
            {showAuthModal && (
                <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50" style={{ padding: 24 }}>
                    <LinearGradient 
                        colors={['#0b1224', '#1e1b4b', '#312e81']} 
                        style={{ width: '100%', maxWidth: 448, borderRadius: 24, padding: 32, border: '1px solid rgba(31, 41, 55, 0.5)' }}
                    >
                        {/* Icon */}
                        <div className="items-center mb-6" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <LinearGradient 
                                colors={['#6366f1', '#8b5cf6']} 
                                style={{ width: 80, height: 80, borderRadius: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                                <Moon size={36} color="#e0e7ff" />
                            </LinearGradient>
                        </div>

                        {/* Title */}
                        <h2 className="text-3xl text-white font-bold text-center mb-2">
                            {isLoginMode ? 'Willkommen zurück' : 'Registrieren'}
                        </h2>
                        <p className="text-gray-400 text-center mb-8">
                            {isLoginMode ? 'Melde dich an, um fortzufahren' : 'Erstelle ein Konto, um zu starten'}
                        </p>

                        {/* Error Message */}
                        {authError && (
                            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mb-6">
                                <p className="text-red-400 text-sm">{authError}</p>
                            </div>
                        )}

                        {/* Email Input */}
                        <div className="flex items-center bg-gray-800/50 border border-purple-500/30 rounded-xl px-4 py-3 mb-4">
                            <User size={18} color="#94a3b8" className="mr-3" />
                            <input 
                                type="email"
                                value={email} 
                                onChange={(e) => setEmail(e.target.value)} 
                                placeholder="E-Mail" 
                                className="flex-1 text-white text-base bg-transparent border-none outline-none"
                                style={{ color: '#94a3b8' }}
                            />
                        </div>

                        {/* Password Input */}
                        <div className="flex items-center bg-gray-800/50 border border-purple-500/30 rounded-xl px-4 py-3 mb-6">
                            <User size={18} color="#94a3b8" className="mr-3" />
                            <input 
                                type="password"
                                value={password} 
                                onChange={(e) => setPassword(e.target.value)} 
                                placeholder="Passwort" 
                                className="flex-1 text-white text-base bg-transparent border-none outline-none"
                                style={{ color: '#94a3b8' }}
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                        isLoginMode ? handleSignIn() : handleSignUp();
                                    }
                                }}
                            />
                        </div>

                        {/* Action Button */}
                        <button 
                            onClick={isLoginMode ? handleSignIn : handleSignUp}
                            disabled={!email.trim() || !password.trim()}
                            style={{ opacity: (!email.trim() || !password.trim()) ? 0.5 : 1 }}
                            className="w-full mb-4"
                        >
                            <LinearGradient 
                                colors={['#3b82f6', '#8b5cf6']} 
                                style={{ paddingTop: 16, paddingBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 12 }}
                            >
                                <span className="text-white font-bold text-lg">
                                    {isLoginMode ? 'Anmelden' : 'Registrieren'}
                                </span>
                            </LinearGradient>
                        </button>

                        {/* Toggle Login/Register */}
                        <button 
                            onClick={() => {
                                setIsLoginMode(!isLoginMode);
                                setAuthError("");
                            }}
                            className="w-full text-center"
                        >
                            <span className="text-gray-400 text-sm">
                                {isLoginMode ? 'Noch kein Konto? ' : 'Bereits ein Konto? '}
                                <span className="text-blue-400 font-semibold">
                                    {isLoginMode ? 'Registrieren' : 'Anmelden'}
                                </span>
                            </span>
                        </button>
                    </LinearGradient>
                </div>
            )}

            {showOnboarding && (
                <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50" style={{ padding: 24 }}>
                    <LinearGradient 
                        colors={['#0b1224', '#1e1b4b', '#312e81']} 
                        style={{ width: '100%', maxWidth: 448, borderRadius: 24, padding: 32, border: '1px solid rgba(31, 41, 55, 0.5)' }}
                    >
                        {/* Icon */}
                        <div className="items-center mb-6" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <LinearGradient 
                                colors={['#6366f1', '#8b5cf6']} 
                                style={{ width: 80, height: 80, borderRadius: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                                <Moon size={36} color="#e0e7ff" />
                            </LinearGradient>
                        </div>

                        {/* Title */}
                        <h2 className="text-3xl text-white font-bold text-center mb-2">Willkommen</h2>
                        <p className="text-gray-400 text-center mb-8">Wie dürfen wir dich nennen?</p>

                        {/* Input Field */}
                        <div className="flex items-center bg-gray-800/50 border border-purple-500/30 rounded-xl px-4 py-3 mb-6">
                            <User size={18} color="#94a3b8" className="mr-3" />
                            <input 
                                type="text"
                                value={tempName} 
                                onChange={(e) => setTempName(e.target.value)} 
                                placeholder="Dein Name" 
                                className="flex-1 text-white text-base bg-transparent border-none outline-none"
                                style={{ color: '#94a3b8' }}
                            />
                        </div>

                        {/* Button */}
                        <button 
                            onClick={() => { 
                                if(tempName.trim()) { 
                                    setUserStats({...userStats, name: tempName}); 
                                    setShowOnboarding(false); 
                                }
                            }} 
                            disabled={!tempName.trim()}
                            style={{ opacity: !tempName.trim() ? 0.5 : 1 }}
                            className="w-full"
                        >
                            <LinearGradient 
                                colors={['#3b82f6', '#8b5cf6']} 
                                style={{ paddingTop: 16, paddingBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 12 }}
                            >
                                <span className="text-white font-bold text-lg">Los geht's</span>
                            </LinearGradient>
                        </button>
                    </LinearGradient>
                </div>
            )}

            {showCustomModal && (
                <div 
                    className="fixed inset-0 bg-black/80 flex items-end justify-center z-50"
                    onTouchStart={(e) => e.stopPropagation()}
                    onTouchEnd={(e) => e.stopPropagation()}
                >
                    <div className="bg-gray-800 p-6 rounded-t-3xl border-t border-gray-700 w-full max-w-md">
                        <div className="flex justify-end mb-6">
                            <button onClick={()=>setShowCustomModal(false)}>
                                <X color="gray" size={24} />
                            </button>
                        </div>

                        <div className="mb-8">
                            <div className="flex items-center justify-center mb-6 relative">
                                <span className="text-6xl text-white font-bold">{customMinutes}</span>
                                <button 
                                    onClick={startCustom} 
                                    className="bg-pink-500 px-4 py-2 rounded-lg hover:bg-pink-600 transition-colors absolute right-0"
                                    style={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'center'
                                    }}
                                >
                                    <span className="text-white font-bold">OK</span>
                                </button>
                            </div>
                            
                            <input
                                type="range"
                                min="1"
                                max="180"
                                value={customMinutes}
                                onChange={(e) => setCustomMinutes(parseInt(e.target.value))}
                                onTouchStart={(e) => e.stopPropagation()}
                                onTouchMove={(e) => e.stopPropagation()}
                                onTouchEnd={(e) => e.stopPropagation()}
                                className="w-full h-3 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                                style={{
                                    background: `linear-gradient(to right, #ec4899 0%, #ec4899 ${(customMinutes - 1) / 179 * 100}%, #374151 ${(customMinutes - 1) / 179 * 100}%, #374151 100%)`
                                }}
                            />
                            
                            <div className="flex justify-between text-sm text-gray-400 mt-2">
                                <span>1 Min</span>
                                <span>180 Min</span>
                            </div>
                        </div>

                        <div className="flex justify-center">
                            <button 
                                onClick={() => setShowCustomModal(false)} 
                                className="bg-gray-700 px-6 py-3 rounded-xl text-center"
                            >
                                <span className="text-white font-bold">Abbrechen</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showCompleteModal && (
                <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 px-6">
                    <div className="bg-gray-800 p-8 rounded-2xl w-full max-w-md items-center border border-gray-700" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <CheckCircle size={50} color="#22c55e" className="mb-4" />
                        <h2 className="text-2xl text-white font-bold mb-2">Guten Morgen!</h2>
                        <p className="text-gray-400 mb-8">Energielevel wiederhergestellt.</p>
                        <button onClick={finishNap} className="bg-white w-full p-4 rounded-xl text-center">
                            <span className="font-bold text-gray-900">XP Einsammeln</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

