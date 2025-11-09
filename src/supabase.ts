// src/supabase.ts
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://mizqneuwrkfcqjdpznqm.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1penFuZXV3cmtmY3FqZHB6bnFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2Mjk1MjIsImV4cCI6MjA3ODIwNTUyMn0.X2UREo2hCXdY-HQI8iTBI0nC4IvUu0hkeb26ZlvoNl8";


export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
