import React from 'react';
import { Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import WelcomeScreen from '../screens/WelcomeScreen';
import ArgentinaScreen from '../screens/ArgentinaScreen';
import BuenosAiresScreen from '../screens/BuenosAiresScreen';

const Tab = createBottomTabNavigator();

function MapIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 4L3 7v13l6-3 6 3 6-3V4l-6 3-6-3z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M9 4v13M15 7v13" stroke={color} strokeWidth={1.8} />
    </Svg>
  );
}

function HomeIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M9 22V12h6v10" stroke={color} strokeWidth={1.8} />
    </Svg>
  );
}

const ACTIVE   = '#0055A5';
const INACTIVE = '#9BAFC4';
const PRIMARY  = '#003366';

export default function AppNavigator() {
  const insets = useSafeAreaInsets();
  // En Android con barra de navegación gestual el inset bottom puede ser 0 o 24+
  // Garantizamos al menos 8 px de padding extra
  const tabBarHeight    = 56 + Math.max(insets.bottom, Platform.OS === 'android' ? 8 : 0);
  const tabBarPaddingBottom = Math.max(insets.bottom + 4, Platform.OS === 'android' ? 12 : 6);

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor:   ACTIVE,
        tabBarInactiveTintColor: INACTIVE,
        tabBarStyle: {
          backgroundColor:  '#FFFFFF',
          borderTopColor:   '#E0E7F0',
          borderTopWidth:   1,
          height:           tabBarHeight,
          paddingBottom:    tabBarPaddingBottom,
          paddingTop:       6,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        headerStyle:      { backgroundColor: PRIMARY },
        headerTintColor:  '#FFFFFF',
        headerTitleStyle: { fontWeight: '700', fontSize: 17 },
      }}
    >
      <Tab.Screen
        name="Inicio"
        component={WelcomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => <HomeIcon color={color} size={size} />,
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="Argentina"
        component={ArgentinaScreen}
        options={{
          title: 'República Argentina',
          tabBarLabel: 'Argentina',
          tabBarIcon: ({ color, size }) => <MapIcon color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="BuenosAires"
        component={BuenosAiresScreen}
        options={{
          title: 'Prov. de Buenos Aires',
          tabBarLabel: 'Bs. Aires',
          tabBarIcon: ({ color, size }) => <MapIcon color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
}
