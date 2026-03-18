import { HeaderTitle } from '@react-navigation/elements';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import React from 'react';
import { useColorScheme } from 'react-native';

export default function StackLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name='index' options={{title: "Home"}}></Stack.Screen>
        <Stack.Screen name='bookACourt' options={{title: "Search"}}></Stack.Screen>
        <Stack.Screen name='learn' options={{title: "Classes"}}></Stack.Screen>
        <Stack.Screen name='compete' options={{title: "Competitions"}}></Stack.Screen>
        <Stack.Screen name='findAMatch' options={{title: "Matches"}}></Stack.Screen>
        <Stack.Screen name='matchPage/[idString]' options={{title: "Match"}}></Stack.Screen>
        <Stack.Screen name='clubPage/[idString]' options={{title: "Club"}}></Stack.Screen>
      </Stack>
    </ThemeProvider>
  );
}
