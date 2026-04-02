import { Stack, router, useRootNavigationState, useSegments } from "expo-router";
import React, { useEffect } from "react";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import AccountMenu from "@/components/AccountMenu";

function AppNavigator() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const navigationState = useRootNavigationState();

  useEffect(() => {
    if (!navigationState?.key || loading) return;

    const onSignInPage = segments[0] === "sign-in";

    if (!user && !onSignInPage) {
      router.replace("/sign-in");
      return;
    }

    if (user && onSignInPage) {
      router.replace("/");
    }
  }, [user, loading, segments, navigationState]);

  if (!navigationState?.key || loading) {
    return null;
  }

  return (
    <Stack
      screenOptions={{
        headerRight: () => (user ? <AccountMenu /> : null),
      }}
    >
      <Stack.Screen name="index" options={{ title: "Home" }} />
      <Stack.Screen name="bookACourt" options={{ title: "Search" }} />
      <Stack.Screen name="learn" options={{ title: "Classes" }} />
      <Stack.Screen name="compete" options={{ title: "Competitions" }} />
      <Stack.Screen name="findAMatch" options={{ title: "Matches" }} />
      <Stack.Screen name="matchPage/[idString]" options={{ title: "Match" }} />
      <Stack.Screen name="clubPage/[idString]" options={{ title: "Club" }} />
      <Stack.Screen name="userAccount" options={{ title: "My account" }} />
      <Stack.Screen
        name="sign-in"
        options={{ title: "Sign in", headerShown: false }}
      />
    </Stack>
  );
}

export default function StackLayout() {
  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}