import useAuth from "@/providers/authProvider";
import { Redirect, Slot } from "expo-router";

/**
 * App Layout Component - Main Authentication Guard
 * 
 * Acts as a protective wrapper around all authenticated app routes.
 * This component implements a simple but effective authentication pattern
 * that secures the entire app section from unauthorized access.
 */
export default function AppLayout() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Redirect href={"/auth"} />;
  }
  return <Slot />;
}
