import React, { useState, useEffect, useRef } from 'react';
import './global.css';
import { View, Text, TouchableOpacity, SafeAreaView, ScrollView, Modal, TextInput, Alert, Animated, Easing } from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';

import * as Notifications from 'expo-notifications';
import { Audio } from 'expo-av';

// Import icons normally

import { Play, Pause, Trophy, Activity, Moon, Battery, Zap, Wind, CheckCircle, Flame, Clock, Plus, Minus, X, User, RotateCcw, Star, Award, Target, TrendingUp, Calendar, BarChart3, Sparkles } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { StatusBar } from 'expo-status-bar';

// Notification handler

Notifications.setNotificationHandler({

    handleNotification: async () => ({

        shouldShowBanner: true,

        shouldShowList: true,

        shouldPlaySound: true,

        shouldSetBadge: false,

    }),

});



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



export default function App() {

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

    const [isLoaded, setIsLoaded] = useState(false);
    const alarmTimeoutsRef = useRef([]);
    const isAlarmActiveRef = useRef(false);
    const customTimeIntervalRef = useRef(null);
    const customTimePressTimeoutRef = useRef(null);



    useEffect(() => {

        const init = async () => {

            // Request notifications

            const { status } = await Notifications.requestPermissionsAsync();

            try {

                const jsonValue = await AsyncStorage.getItem('@napflow_data_final_v2');

                if (jsonValue != null) {

                    const parsed = JSON.parse(jsonValue);

                    setUserStats(parsed);

                    // If no name is set, show onboarding

                    if (!parsed.name || parsed.name === "") {

                        setShowOnboarding(true);

                    }

                } else {

                    // On first launch

                    setShowOnboarding(true);

                }

                setIsLoaded(true);

            } catch(e) { console.error(e); }

        };

        init();

    }, []);



    useEffect(() => {

        if (isLoaded) {

            AsyncStorage.setItem('@napflow_data_final_v2', JSON.stringify(userStats));

        }

    }, [userStats, isLoaded]);



    useEffect(() => {

        let interval = null;

        if (isRunning && timeLeft > 0) {

            // Stop alarm when a new timer starts

            isAlarmActiveRef.current = false;

            alarmTimeoutsRef.current.forEach(timeoutId => clearTimeout(timeoutId));

            alarmTimeoutsRef.current = [];

            interval = setInterval(() => setTimeLeft((t) => t - 1), 1000);

        } else if (timeLeft === 0 && isRunning) {

            handleAlarm();

        }

        return () => clearInterval(interval);

    }, [isRunning, timeLeft]);


    // Cleanup on unmount

    useEffect(() => {

        return () => {

            isAlarmActiveRef.current = false;

            alarmTimeoutsRef.current.forEach(timeoutId => clearTimeout(timeoutId));

            alarmTimeoutsRef.current = [];

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

    // Cleanup for Custom Time Interval when modal is closed

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

        }

    }, [showCustomModal]);



    const handleAlarm = async () => {

        setIsRunning(false);

        try {

            // Request audio permissions for longer sound

            await Audio.setAudioModeAsync({

                playsInSilentModeIOS: true,

                staysActiveInBackground: true,

            });

            // Send multiple notifications for a longer alarm sound

            // First notification with text

            await Notifications.scheduleNotificationAsync({

                content: { 

                    title: "Aufwachen!", 

                    body: "Dein Nap ist vorbei.", 

                    sound: true,

                },

                trigger: null,

            });

            // Continuous notifications for longer sound (every 1.5 seconds)
            // Continues until user clicks "Collect XP"

            alarmTimeoutsRef.current = [];
            isAlarmActiveRef.current = true;

            // Recursive function that calls itself until alarm is stopped
            const sendAlarmNotification = async (iteration = 1) => {
                if (!isAlarmActiveRef.current) {
                    return; // Stop if alarm was deactivated
                }

                try {
                    await Notifications.scheduleNotificationAsync({
                        content: { 
                            title: "", 
                            body: "", 
                            sound: true, // Sound only, no text
                        },
                        trigger: null,
                    });

                    // Schedule next notification
                    const timeoutId = setTimeout(() => {
                        sendAlarmNotification(iteration + 1);
                    }, 1500); // One notification every 1.5 seconds

                    alarmTimeoutsRef.current.push(timeoutId);
                } catch (error) {
                    console.error('Error sending alarm notification:', error);
                }
            };

            // Start continuous notifications
            sendAlarmNotification();

        } catch (error) {

            console.error('Error playing alarm:', error);

            // Fallback: Normal notification

            await Notifications.scheduleNotificationAsync({

                content: { 

                    title: "Aufwachen!", 

                    body: "Dein Nap ist vorbei.", 

                    sound: true,

                },

                trigger: null,

            });

        }

        setShowCompleteModal(true);

    };



    const finishNap = () => {

        // Stop all pending alarm notifications
        isAlarmActiveRef.current = false;
        alarmTimeoutsRef.current.forEach(timeoutId => clearTimeout(timeoutId));
        alarmTimeoutsRef.current = [];

        const today = new Date().toDateString();

        let newStreak = userStats.currentStreak;

        if (userStats.lastNapDate && userStats.lastNapDate !== today) {

            newStreak += 1;

        } else if (!userStats.lastNapDate) {

            newStreak = 1;

        }



        const minutes = Math.floor(totalTime / 60);

        setUserStats(prev => ({

            ...prev,

            xp: prev.xp + (minutes * 5),

            totalNaps: prev.totalNaps + 1,

            totalMinutes: prev.totalMinutes + minutes,

            currentStreak: newStreak,

            lastNapDate: today

        }));

        setShowCompleteModal(false);

        setTimeLeft(selectedPreset.duration);

    };



    const currentLevel = LEVELS.slice().reverse().find(l => userStats.xp >= l.minXP) || LEVELS[0];
    const nextLevel = LEVELS.find(l => l.minXP > userStats.xp);
    const isMaxLevel = !nextLevel;
    const xpForNextLevel = nextLevel ? nextLevel.minXP - userStats.xp : 0;
    const xpInCurrentLevel = userStats.xp - currentLevel.minXP;
    const xpNeededForNext = nextLevel ? (nextLevel.minXP - currentLevel.minXP) : 1;
    const progressPercentage = isMaxLevel ? 100 : Math.min(100, (xpInCurrentLevel / xpNeededForNext) * 100);



    const startCustom = () => {

        const sec = customMinutes * 60;

        setSelectedPreset({ id: 'custom', name: 'Custom', duration: sec, icon: Clock, color: 'bg-pink-500' });

        setTotalTime(sec);

        setTimeLeft(sec);

        setShowCustomModal(false);

    };



    if (!isLoaded) return <View className="flex-1 bg-gray-900" />;



  return (

        <SafeAreaView className="flex-1 bg-gray-900 pt-10">

            <StatusBar style="light" />

            <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>



                {/* Header */}

                <View className="p-6 flex-row justify-between items-center">

                    <View>

                        <Text className="text-2xl font-bold text-white">Napflow</Text>

                        <Text className="text-gray-400">Hallo, {userStats.name || "Schläfer"}</Text>

                    </View>

                    <View className="bg-gray-800 px-4 py-2 rounded-full flex-row items-center border border-gray-700">

                        <Trophy size={16} color="#FACC15" />

                        <Text className="text-white font-bold ml-2">{userStats.xp} XP</Text>

                    </View>

    </View>



                {activeTab === 'timer' && (

                    <View className="px-6 items-center">

                        <Text className={`text-sm uppercase tracking-widest font-bold mb-8 ${currentLevel.color}`}>

                            {currentLevel.name}

                        </Text>

                        {/* Timer Circle */}
                        <View className="items-center justify-center mb-10" style={{ width: 256, height: 256 }}>
                            {/* Background Circle */}
                            <View 
                                style={{
                                    position: 'absolute',
                                    width: 256,
                                    height: 256,
                                    borderRadius: 128,
                                    borderWidth: 8,
                                    borderColor: '#1f2937',
                                }}
                            />
                            

                            {/* Inner Circle with Text */}
                            <View 
                                style={{
                                    position: 'absolute',
                                    width: 240,
                                    height: 240,
                                    borderRadius: 120,
                                    backgroundColor: 'rgba(31, 41, 55, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
                                    borderWidth: 2,
                                    borderColor: '#1f2937',
                                    top: 8,
                                    left: 8,
                                }}
                            >
                                <Text className="text-6xl font-bold text-white tabular-nums">
                                    {Math.floor(timeLeft / 60).toString().padStart(2, '0')}:{(timeLeft % 60).toString().padStart(2, '0')}
                                </Text>
                                <Text className="text-gray-400 mt-2">{isRunning ? 'Gute Nacht...' : 'Bereit'}</Text>
                            </View>
                        </View>

                        {/* Controls */}

                        <View className="flex-row gap-6 mb-10 items-center justify-center">

                            {!isRunning && (

                                <TouchableOpacity onPress={() => setTimeLeft(totalTime)} className="p-3 bg-gray-800 rounded-full border border-gray-700">

                                    <RotateCcw size={20} color="gray" />

                                </TouchableOpacity>

                            )}

                            <TouchableOpacity onPress={() => setIsRunning(!isRunning)} className={`p-6 rounded-full ${isRunning ? 'bg-gray-800 border-2 border-red-500' : 'bg-blue-600'}`}>

                                {isRunning ? <Pause size={32} color="red" /> : <Play size={32} color="white" />}

                            </TouchableOpacity>

                        </View>

                        {/* Presets */}

                        <View className="w-full gap-3">

                            {PRESETS.map(p => (

                                <TouchableOpacity key={p.id} onPress={() => { setSelectedPreset(p); setTotalTime(p.duration); setTimeLeft(p.duration); setIsRunning(false); }}

                                                  className={`flex-row items-center p-4 rounded-xl bg-gray-800 border ${selectedPreset.id === p.id ? 'border-blue-500' : 'border-transparent'}`}>

                                    <View className={`p-3 rounded-lg ${p.color}`}><p.icon size={20} color="white" /></View>

                                    <View className="ml-4 flex-1">

                                        <Text className="text-white font-bold">{p.name}</Text>

                                        <Text className="text-gray-400 text-xs">{p.desc}</Text>

                                    </View>

                                    <Text className="text-gray-500">{p.duration / 60}m</Text>

                                </TouchableOpacity>

                            ))}

                            <TouchableOpacity onPress={() => setShowCustomModal(true)} className="flex-row items-center p-4 rounded-xl bg-gray-800 border border-transparent">

                                <View className="p-3 rounded-lg bg-pink-500"><Clock size={20} color="white" /></View>

                                <Text className="ml-4 text-white font-bold">Eigene Zeit</Text>

                            </TouchableOpacity>

                        </View>

                    </View>

                )}



                {activeTab === 'stats' && (

                    <View className="px-6 py-4">

                        <Text className="text-3xl font-bold text-white mb-2">Deine Statistik</Text>
                        <Text className="text-gray-400 mb-6">Übersicht deiner Nap-Performance</Text>

                        {/* Hauptstatistiken Grid */}
                        <View className="flex-row gap-3 mb-4">
                            <LinearGradient 
                                colors={['rgba(249, 115, 22, 0.2)', 'rgba(234, 88, 12, 0.1)']}
                                style={{ flex: 1, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(249, 115, 22, 0.3)' }}
                            >
                                <Flame size={20} color="orange" />
                                <Text className="text-3xl font-bold text-white mt-2">{userStats.currentStreak}</Text>
                                <Text className="text-gray-400 text-xs">Tage Streak</Text>
                                {userStats.currentStreak > 0 && (
                                    <View className="flex-row items-center gap-1 mt-1">
                                        <TrendingUp size={12} color="#22c55e" />
                                        <Text className="text-green-400 text-xs">Aktiv</Text>
                                    </View>
                                )}
                            </LinearGradient>

                            <LinearGradient 
                                colors={['rgba(59, 130, 246, 0.2)', 'rgba(37, 99, 235, 0.1)']}
                                style={{ flex: 1, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(59, 130, 246, 0.3)' }}
                            >
                                <Moon size={20} color="#3B82F6" />
                                <Text className="text-3xl font-bold text-white mt-2">{userStats.totalNaps}</Text>
                                <Text className="text-gray-400 text-xs">Naps Gesamt</Text>
                                <Text className="text-blue-400 text-xs mt-1">
                                    Ø {userStats.totalNaps > 0 ? Math.round(userStats.totalMinutes / userStats.totalNaps) : 0} Min
                                </Text>
                            </LinearGradient>
                        </View>

                        {/* Zeit-Statistik */}
                        <LinearGradient 
                            colors={['rgba(168, 85, 247, 0.2)', 'rgba(147, 51, 234, 0.1)']}
                            style={{ padding: 20, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(168, 85, 247, 0.3)', marginBottom: 16 }}
                        >
                            <View className="flex-row items-center justify-between mb-3">
                                <View className="flex-row items-center gap-2">
                                    <Clock size={22} color="#A855F7" />
                                    <Text className="text-white font-bold">Geschlafene Zeit</Text>
                                </View>
                                <Sparkles size={18} color="#A855F7" />
                            </View>
                            <View className="flex-row items-baseline gap-2">
                                <Text className="text-4xl font-bold text-white">{Math.floor(userStats.totalMinutes / 60)}</Text>
                                <Text className="text-gray-400 text-lg">Stunden</Text>
                                <Text className="text-gray-400 text-lg">{userStats.totalMinutes % 60}</Text>
                                <Text className="text-gray-400 text-lg">Minuten</Text>
                            </View>
                            <Text className="text-purple-400 text-xs mt-2">
                                {userStats.totalNaps > 0 ? `Durchschnitt: ${Math.round(userStats.totalMinutes / userStats.totalNaps)} Min pro Nap` : 'Starte deinen ersten Nap!'}
                            </Text>
                        </LinearGradient>

                        {/* Bestleistungen */}
                        <View className="bg-gray-800 p-5 rounded-2xl border border-gray-700 mb-4">
                            <View className="flex-row items-center gap-2 mb-4">
                                <Trophy size={20} color="#FACC15" />
                                <Text className="text-white font-bold text-lg">Bestleistungen</Text>
                            </View>
                            <View className="gap-3">
                                <View className="flex-row items-center justify-between p-3 bg-gray-700/50 rounded-xl">
                                    <View className="flex-row items-center gap-3">
                                        <Flame size={18} color="orange" />
                                        <Text className="text-white">Längster Streak</Text>
                                    </View>
                                    <Text className="text-white font-bold">{userStats.currentStreak} Tage</Text>
                                </View>
                                <View className="flex-row items-center justify-between p-3 bg-gray-700/50 rounded-xl">
                                    <View className="flex-row items-center gap-3">
                                        <Calendar size={18} color="#3B82F6" />
                                        <Text className="text-white">Naps diese Woche</Text>
                                    </View>
                                    <Text className="text-white font-bold">
                                        {userStats.totalNaps > 0 ? Math.min(7, Math.floor(userStats.totalNaps / Math.max(1, Math.floor(userStats.totalNaps / 7)))) : 0}
                                    </Text>
                                </View>
                                <View className="flex-row items-center justify-between p-3 bg-gray-700/50 rounded-xl">
                                    <View className="flex-row items-center gap-3">
                                        <BarChart3 size={18} color="#22c55e" />
                                        <Text className="text-white">Gesamt XP</Text>
                                    </View>
                                    <Text className="text-white font-bold">{userStats.xp} XP</Text>
                                </View>
                            </View>
                        </View>

                        {/* Motivationskarte */}
                        <LinearGradient 
                            colors={['rgba(37, 99, 235, 0.2)', 'rgba(147, 51, 234, 0.2)']}
                            style={{ padding: 20, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(59, 130, 246, 0.3)', marginBottom: 16 }}
                        >
                            <View className="flex-row items-center gap-2 mb-2">
                                <Sparkles size={20} color="#8b5cf6" />
                                <Text className="text-white font-bold text-lg">Dein Fortschritt</Text>
                            </View>
                            {userStats.totalNaps === 0 ? (
                                <Text className="text-gray-300">
                                    Starte deinen ersten Nap und beginne deine Reise zu mehr Energie! 💪
                                </Text>
                            ) : userStats.totalNaps < 5 ? (
                                <Text className="text-gray-300">
                                    Du bist auf dem richtigen Weg! {5 - userStats.totalNaps} weitere Naps bis zu deinem ersten Meilenstein! 🚀
                                </Text>
                            ) : userStats.currentStreak >= 7 ? (
                                <Text className="text-gray-300">
                                    Wow! {userStats.currentStreak} Tage Streak - du bist ein wahrer Nap-Meister! 🔥
                                </Text>
                            ) : (
                                <Text className="text-gray-300">
                                    Großartig! Du hast bereits {userStats.totalNaps} Naps gemacht. Weiter so! ⭐
                                </Text>
                            )}
                        </LinearGradient>

                        {/* Wöchentliche Übersicht (Visualisierung) */}
                        <View className="bg-gray-800 p-5 rounded-2xl border border-gray-700 mb-4">
                            <View className="flex-row items-center gap-2 mb-4">
                                <Calendar size={20} color="#3B82F6" />
                                <Text className="text-white font-bold text-lg">Diese Woche</Text>
                            </View>
                            <View className="flex-row justify-between items-end h-24 gap-2">
                                {(() => {
                                    const today = new Date();
                                    const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
                                    const dayNames = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
                                    const dayLabels = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
                                    
                                    // Calculate Monday of this week
                                    const monday = new Date(today);
                                    const dayOfWeek = monday.getDay();
                                    const diff = monday.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // adjust when day is Sunday
                                    monday.setDate(diff);
                                    
                                    return dayLabels.map((dayLabel, index) => {
                                        const dayIndex = index; // 0 = Monday, 6 = Sunday
                                        const dayDate = new Date(monday);
                                        dayDate.setDate(monday.getDate() + dayIndex);
                                        
                                        // Check if the day is in the past or today
                                        const isPastOrToday = dayDate <= today;
                                        const isToday = dayDate.toDateString() === today.toDateString();
                                        
                                        // For now: Show data only for past days or today
                                        // In a real app, the actual nap count would come from the data here
                                        const hasNap = isPastOrToday && (dayDate.toDateString() === userStats.lastNapDate || Math.random() > 0.7);
                                        const height = hasNap ? 40 + Math.random() * 20 : 10;
                                        
                                        return (
                                            <View key={index} className="flex-1 items-center gap-2">
                                                <View 
                                                    className={`w-full rounded-t-lg ${hasNap ? 'bg-blue-500' : isToday ? 'bg-gray-600' : 'bg-gray-700'}`}
                                                    style={{ height: Math.max(10, height), opacity: isPastOrToday ? 1 : 0.3 }}
                                                />
                                                <Text className={`text-xs ${isToday ? 'text-blue-400 font-bold' : 'text-gray-400'}`}>
                                                    {dayLabel}
                                                </Text>
                                            </View>
                                        );
                                    });
                                })()}
                            </View>
                            <Text className="text-gray-400 text-xs mt-3 text-center">
                                Naps pro Tag (diese Woche)
                            </Text>
                        </View>

                        {/* Level Fortschritt */}
                        <View className="bg-gray-800 p-5 rounded-2xl border border-gray-700 mb-4">
                            <View className="flex-row items-center justify-between mb-3">
                                <View className="flex-row items-center gap-2">
                                    <Award size={20} color="#8b5cf6" />
                                    <Text className="text-white font-bold">{currentLevel.name}</Text>
                                </View>
                                <Text className="text-gray-400 text-sm">{userStats.xp} / {nextLevel ? nextLevel.minXP : userStats.xp} XP</Text>
                            </View>
                            <View className="h-3 bg-gray-700 rounded-full overflow-hidden mb-2">
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
                            </View>
                            <Text className="text-gray-400 text-sm">
                                {isMaxLevel ? '🎉 Maximales Level erreicht!' : `${xpForNextLevel} XP bis ${nextLevel.name}`}
                            </Text>
                        </View>

                    </View>

                )}



                {activeTab === 'profile' && (

                    <View className="px-6 py-6">

                        {/* Header Card */}
                        <View className="items-center mb-6">
                            <LinearGradient 
                                colors={['#6366f1', '#8b5cf6']} 
                                style={{ width: 112, height: 112, borderRadius: 56, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}
                            >
                                <Text className="text-5xl text-white font-bold">{userStats.name ? userStats.name[0].toUpperCase() : '?'}</Text>
                            </LinearGradient>
                            <Text className="text-3xl font-bold text-white mb-2">{userStats.name || 'Schläfer'}</Text>
                            <View className="flex-row items-center gap-2">
                                <Trophy size={16} color="#FACC15" />
                                <Text className={`text-lg font-semibold ${currentLevel.color}`}>{currentLevel.name}</Text>
                            </View>
                        </View>

                        {/* Stats Grid */}
                        <View className="flex-row gap-3 mb-4">
                            <View className="flex-1 bg-gray-800 p-4 rounded-2xl border border-gray-700">
                                <View className="flex-row items-center gap-2 mb-2">
                                    <Star size={18} color="#FACC15" />
                                    <Text className="text-gray-400 text-xs">XP</Text>
                                </View>
                                <Text className="text-2xl font-bold text-white">{userStats.xp}</Text>
                            </View>
                            <View className="flex-1 bg-gray-800 p-4 rounded-2xl border border-gray-700">
                                <View className="flex-row items-center gap-2 mb-2">
                                    <Moon size={18} color="#3B82F6" />
                                    <Text className="text-gray-400 text-xs">Naps</Text>
                                </View>
                                <Text className="text-2xl font-bold text-white">{userStats.totalNaps}</Text>
                            </View>
                            <View className="flex-1 bg-gray-800 p-4 rounded-2xl border border-gray-700">
                                <View className="flex-row items-center gap-2 mb-2">
                                    <Flame size={18} color="orange" />
                                    <Text className="text-gray-400 text-xs">Streak</Text>
                                </View>
                                <Text className="text-2xl font-bold text-white">{userStats.currentStreak}</Text>
                            </View>
                        </View>

                        {/* Level Progress Card */}
                        <View className="bg-gray-800 p-6 rounded-2xl border border-gray-700 mb-4">
                            <View className="flex-row justify-between items-center mb-3">
                                <View className="flex-row items-center gap-2">
                                    <Award size={20} color="#8b5cf6" />
                                    <Text className="text-white font-bold text-lg">Level Fortschritt</Text>
                                </View>
                                <Text className="text-gray-400 text-sm">{userStats.xp} / {nextLevel ? nextLevel.minXP : userStats.xp} XP</Text>
                            </View>
                            <View className="h-3 bg-gray-700 rounded-full overflow-hidden mb-2">
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
                            </View>
                            <Text className="text-gray-400 text-sm">
                                {isMaxLevel ? '🎉 Maximales Level erreicht!' : `${xpForNextLevel} XP bis ${nextLevel.name}`}
                            </Text>
                        </View>

                        {/* Achievements Card */}
                        <View className="bg-gray-800 p-6 rounded-2xl border border-gray-700 mb-4">
                            <View className="flex-row items-center gap-2 mb-4">
                                <Target size={20} color="#22c55e" />
                                <Text className="text-white font-bold text-lg">Erfolge</Text>
                            </View>
                            <View className="gap-3">
                                <View className="flex-row items-center justify-between p-3 bg-gray-700/50 rounded-xl">
                                    <View className="flex-row items-center gap-3">
                                        <Trophy size={20} color="#FACC15" />
                                        <Text className="text-white">Erster Nap</Text>
                                    </View>
                                    {userStats.totalNaps > 0 && <CheckCircle size={20} color="#22c55e" />}
                                </View>
                                <View className="flex-row items-center justify-between p-3 bg-gray-700/50 rounded-xl">
                                    <View className="flex-row items-center gap-3">
                                        <Flame size={20} color="orange" />
                                        <Text className="text-white">7-Tage Streak</Text>
                                    </View>
                                    {userStats.currentStreak >= 7 && <CheckCircle size={20} color="#22c55e" />}
                                </View>
                                <View className="flex-row items-center justify-between p-3 bg-gray-700/50 rounded-xl">
                                    <View className="flex-row items-center gap-3">
                                        <Moon size={20} color="#3B82F6" />
                                        <Text className="text-white">50 Naps</Text>
                                    </View>
                                    {userStats.totalNaps >= 50 && <CheckCircle size={20} color="#22c55e" />}
                                </View>
                            </View>
                        </View>

                        {/* Settings */}
                        <View className="bg-gray-800 p-6 rounded-2xl border border-gray-700">
                            <Text className="text-white font-bold text-lg mb-4">Einstellungen</Text>
                            <TouchableOpacity 
                                onPress={() => { 
                                    Alert.alert(
                                        'App zurücksetzen', 
                                        'Möchtest du wirklich alle Daten löschen? Diese Aktion kann nicht rückgängig gemacht werden.',
                                        [
                                            { text: 'Abbrechen', style: 'cancel' },
                                            { 
                                                text: 'Löschen', 
                                                style: 'destructive',
                                                onPress: () => {
                                                    AsyncStorage.clear();
                                                    Alert.alert('Daten gelöscht', 'Bitte starte die App neu.');
                                                }
                                            }
                                        ]
                                    );
                                }} 
                                className="flex-row items-center justify-between p-4 bg-red-500/10 border border-red-500/30 rounded-xl"
                            >
                                <View className="flex-row items-center gap-3">
                                    <X size={20} color="#ef4444" />
                                    <Text className="text-red-500 font-semibold">App zurücksetzen</Text>
                                </View>
                            </TouchableOpacity>
                        </View>

                    </View>

                )}

            </ScrollView>



            <View className="absolute bottom-0 w-full bg-gray-900 border-t border-gray-800 flex-row justify-around py-4 pb-8">

                <TouchableOpacity onPress={() => setActiveTab('stats')} className="p-2"><Activity color={activeTab==='stats'?'#3B82F6':'gray'} /></TouchableOpacity>

                <TouchableOpacity onPress={() => setActiveTab('timer')} className="-mt-8 bg-blue-600 p-4 rounded-full shadow-lg"><Moon color="white" fill="white" /></TouchableOpacity>

                <TouchableOpacity onPress={() => setActiveTab('profile')} className="p-2"><User color={activeTab==='profile'?'#3B82F6':'gray'} /></TouchableOpacity>

            </View>



            {/* MODALS */}

            <Modal visible={showOnboarding} transparent animationType="fade">

                <LinearGradient 
                    colors={['#0b1224', '#1e1b4b', '#312e81']} 
                    style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}
                >

                    <View className="w-full max-w-md bg-gray-900/90 backdrop-blur-lg rounded-3xl p-8 border border-gray-800/50 shadow-2xl">

                        {/* Icon */}
                        <View className="items-center mb-6">
                            <LinearGradient 
                                colors={['#6366f1', '#8b5cf6']} 
                                style={{ width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' }}
                            >
                                <Moon size={36} color="#e0e7ff" />
                            </LinearGradient>
                        </View>

                        {/* Title */}
                        <Text className="text-3xl text-white font-bold text-center mb-2">Willkommen</Text>
                        <Text className="text-gray-400 text-center mb-8">Wie dürfen wir dich nennen?</Text>

                        {/* Input Field */}
                        <View className="flex-row items-center bg-gray-800/50 border border-purple-500/30 rounded-xl px-4 py-3 mb-6">
                            <User size={18} color="#94a3b8" className="mr-3" />
                            <TextInput 
                                value={tempName} 
                                onChangeText={setTempName} 
                                placeholder="Dein Name" 
                                placeholderTextColor="#94a3b8" 
                                className="flex-1 text-white text-base"
                            />
                        </View>

                        {/* Button */}
                        <TouchableOpacity 
                            onPress={() => { 
                                if(tempName) { 
                                    setUserStats({...userStats, name: tempName}); 
                                    setShowOnboarding(false); 
                                }
                            }} 
                            disabled={!tempName.trim()}
                            style={{ opacity: !tempName.trim() ? 0.5 : 1 }}
                        >
                            <LinearGradient 
                                colors={['#3b82f6', '#8b5cf6']} 
                                style={{ paddingVertical: 16, alignItems: 'center', borderRadius: 12 }}
                            >
                                <Text className="text-white font-bold text-lg">Los geht's</Text>
                            </LinearGradient>
                        </TouchableOpacity>

                    </View>

                </LinearGradient>

            </Modal>



            <Modal visible={showCustomModal} transparent animationType="slide">

                <View className="flex-1 justify-end bg-black/80">

                    <View className="bg-gray-800 p-6 rounded-t-3xl border-t border-gray-700">

                        <View className="flex-row justify-between mb-8"><Text className="text-xl text-white font-bold">Zeit wählen</Text><TouchableOpacity onPress={()=>setShowCustomModal(false)}><X color="gray" /></TouchableOpacity></View>

                        <View className="flex-row justify-center items-center gap-8 mb-8">

                            <TouchableOpacity 
                                onPressIn={() => {
                                    // Immediately make a single change
                                    setCustomMinutes(m => Math.max(1, m - 1));
                                    
                                    // After 300ms delay start continuous change (if still pressed)
                                    customTimePressTimeoutRef.current = setTimeout(() => {
                                        customTimeIntervalRef.current = setInterval(() => {
                                            setCustomMinutes(m => {
                                                const newValue = Math.max(1, m - 1);
                                                if (newValue === 1) {
                                                    // Stop when minimum reached
                                                    if (customTimeIntervalRef.current) {
                                                        clearInterval(customTimeIntervalRef.current);
                                                        customTimeIntervalRef.current = null;
                                                    }
                                                }
                                                return newValue;
                                            });
                                        }, 150);
                                    }, 300);
                                }}
                                onPressOut={() => {
                                    // Stop timeout if not yet expired
                                    if (customTimePressTimeoutRef.current) {
                                        clearTimeout(customTimePressTimeoutRef.current);
                                        customTimePressTimeoutRef.current = null;
                                    }
                                    // Stop interval if already started
                                    if (customTimeIntervalRef.current) {
                                        clearInterval(customTimeIntervalRef.current);
                                        customTimeIntervalRef.current = null;
                                    }
                                }}
                                className="bg-gray-700 p-4 rounded-full"
                            >
                                <Minus color="white"/>
                            </TouchableOpacity>

                            <Text className="text-5xl text-white font-bold">{customMinutes}</Text>

                            <TouchableOpacity 
                                onPressIn={() => {
                                    // Immediately make a single change
                                    setCustomMinutes(m => Math.min(180, m + 1));
                                    
                                    // After 300ms delay start continuous change (if still pressed)
                                    customTimePressTimeoutRef.current = setTimeout(() => {
                                        customTimeIntervalRef.current = setInterval(() => {
                                            setCustomMinutes(m => {
                                                const newValue = Math.min(180, m + 1);
                                                if (newValue === 180) {
                                                    // Stop when maximum reached
                                                    if (customTimeIntervalRef.current) {
                                                        clearInterval(customTimeIntervalRef.current);
                                                        customTimeIntervalRef.current = null;
                                                    }
                                                }
                                                return newValue;
                                            });
                                        }, 150);
                                    }, 300);
                                }}
                                onPressOut={() => {
                                    // Stop timeout if not yet expired
                                    if (customTimePressTimeoutRef.current) {
                                        clearTimeout(customTimePressTimeoutRef.current);
                                        customTimePressTimeoutRef.current = null;
                                    }
                                    // Stop interval if already started
                                    if (customTimeIntervalRef.current) {
                                        clearInterval(customTimeIntervalRef.current);
                                        customTimeIntervalRef.current = null;
                                    }
                                }}
                                className="bg-gray-700 p-4 rounded-full"
                            >
                                <Plus color="white"/>
                            </TouchableOpacity>

                        </View>

                        <TouchableOpacity onPress={startCustom} className="bg-pink-500 p-4 rounded-xl items-center"><Text className="text-white font-bold">Starten</Text></TouchableOpacity>

                    </View>

                </View>

            </Modal>



            <Modal visible={showCompleteModal} transparent>

                <View className="flex-1 bg-black/90 justify-center items-center px-6">

                    <View className="bg-gray-800 p-8 rounded-2xl w-full items-center border border-gray-700">

                        <CheckCircle size={50} color="#22c55e" className="mb-4" />

                        <Text className="text-2xl text-white font-bold mb-2">Guten Morgen!</Text>

                        <Text className="text-gray-400 mb-8">Energielevel wiederhergestellt.</Text>

                        <TouchableOpacity onPress={finishNap} className="bg-white w-full p-4 rounded-xl items-center"><Text className="font-bold">XP Einsammeln</Text></TouchableOpacity>

                    </View>

    </View>

            </Modal>

        </SafeAreaView>

    );

}
