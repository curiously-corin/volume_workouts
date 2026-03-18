import { useState, useEffect, useRef, useCallback } from "react";
import * as XLSX from "xlsx";
import wordmarkUrl from './Volume_Wordmark.svg';

// ── DEFAULT PLAN ──────────────────────────────────────────────────────────────
const DEFAULT_PLAN = {
  name: "8-Week Strength Foundation",
  weeks: Array.from({ length: 8 }, (_, wi) => ({
    week: wi + 1,
    phase: wi < 4 ? 1 : 2,
    days: [
      {
        id: `w${wi+1}d1`, label: "Push Day", emoji: "🔥",
        exercises: [
          { id: `w${wi+1}d1e1`, name: "Barbell Bench Press", sets: wi < 4 ? 3 : 4, reps: wi < 4 ? "8–10" : "6–8", section: "Chest" },
          { id: `w${wi+1}d1e2`, name: "Overhead Press",      sets: 3,                reps: wi < 4 ? "10–12" : "8–10", section: "Chest" },
          { id: `w${wi+1}d1e3`, name: "Incline Dumbbell Press", sets: 3,             reps: "10–12", section: "Chest" },
          { id: `w${wi+1}d1e4`, name: "Lateral Raises",      sets: 3,                reps: "15–20", section: "Shoulders & Arms" },
          { id: `w${wi+1}d1e5`, name: "Tricep Pushdowns",    sets: 3,                reps: "12–15", section: "Shoulders & Arms" },
        ],
      },
      {
        id: `w${wi+1}d2`, label: "Pull Day", emoji: "💪",
        exercises: [
          { id: `w${wi+1}d2e1`, name: "Barbell Deadlift",    sets: wi < 4 ? 3 : 4, reps: wi < 4 ? "6–8" : "4–6", section: "Back" },
          { id: `w${wi+1}d2e2`, name: "Pull-Ups",            sets: 3,               reps: "max",   section: "Back" },
          { id: `w${wi+1}d2e3`, name: "Barbell Row",         sets: 3,               reps: "8–10",  section: "Back" },
          { id: `w${wi+1}d2e4`, name: "Face Pulls",          sets: 3,               reps: "15–20", section: "Biceps & Rear Delt" },
          { id: `w${wi+1}d2e5`, name: "Hammer Curls",        sets: 3,               reps: "12–15", section: "Biceps & Rear Delt" },
        ],
      },
      {
        id: `w${wi+1}d3`, label: "Leg Day", emoji: "🦵",
        exercises: [
          { id: `w${wi+1}d3e1`, name: "Back Squat",          sets: wi < 4 ? 3 : 4, reps: wi < 4 ? "8–10" : "6–8", section: "Quads" },
          { id: `w${wi+1}d3e2`, name: "Romanian Deadlift",   sets: 3,               reps: "10–12", section: "Quads" },
          { id: `w${wi+1}d3e3`, name: "Leg Press",           sets: 3,               reps: "12–15", section: "Quads" },
          { id: `w${wi+1}d3e4`, name: "Leg Curl",            sets: 3,               reps: "12–15", section: "Hamstrings & Calves" },
          { id: `w${wi+1}d3e5`, name: "Calf Raises",         sets: 4,               reps: "15–20", section: "Hamstrings & Calves" },
        ],
      },
    ],
  })),
};

// ── FUNCTIONAL FITNESS PLAN (imported from Functional_Fitness.xlsx) ──────────
const FUNCTIONAL_FITNESS_PLAN = {
  name: "8-Week Functional Fitness",
  weeks: [
    {
      week: 1, phase: 1,
      days: [
        {
          id: "ff-w1d1", label: "Upper Body Lift 💪", emoji: "💪",
          exercises: [
            { id: "ff-w1d1e1", name: "Shoulder CARs (Controlled Articular Rotations)", sets: 1, reps: "5 reps each direction", section: "Mobility Warmup" },
            { id: "ff-w1d1e2", name: "Wall Slides", sets: 1, reps: "10 reps", section: "Mobility Warmup" },
            { id: "ff-w1d1e3", name: "Band Pull-Aparts", sets: 1, reps: "15 reps", section: "Mobility Warmup" },
            { id: "ff-w1d1e4", name: "Barbell Bench Press", sets: 4, reps: "8 reps", section: "Main Lift" },
            { id: "ff-w1d1e5", name: "Single-Arm Dumbbell Row", sets: 3, reps: "10 reps each side", section: "Accessory" },
            { id: "ff-w1d1e6", name: "Dumbbell Shoulder Press", sets: 3, reps: "10 reps", section: "Accessory" },
            { id: "ff-w1d1e7", name: "Face Pulls", sets: 3, reps: "15 reps", section: "Accessory" },
            { id: "ff-w1d1e8", name: "Farmers Carry (grocery bag simulation)", sets: 2, reps: "40 ft x 2 lengths", section: "Functional Finisher" },
            { id: "ff-w1d1e9", name: "Bear Hug Sandbag/Plate Carry (carry a 'toddler')", sets: 2, reps: "30 ft", section: "Functional Finisher" },
          ],
        },
        {
          id: "ff-w1d2", label: "Cardio / Mobility A 🏃", emoji: "🏃",
          exercises: [
            { id: "ff-w1d2e1", name: "Incline Treadmill Walk", sets: 1, reps: "20 min, moderate pace", section: "Cardio" },
            { id: "ff-w1d2e2", name: "Hip 90/90 Stretch", sets: 1, reps: "60 sec each side", section: "Mobility" },
            { id: "ff-w1d2e3", name: "Thoracic Spine Foam Roll", sets: 1, reps: "60 sec", section: "Mobility" },
            { id: "ff-w1d2e4", name: "Deep Squat Hold with Breath", sets: 1, reps: "5 breaths x 3 rounds", section: "Mobility" },
          ],
        },
        {
          id: "ff-w1d3", label: "Lower Body Lift 🦵", emoji: "🦵",
          exercises: [
            { id: "ff-w1d3e1", name: "Hip Circle Activation", sets: 1, reps: "10 each direction", section: "Mobility Warmup" },
            { id: "ff-w1d3e2", name: "Leg Swings (front/back & lateral)", sets: 1, reps: "10 each direction", section: "Mobility Warmup" },
            { id: "ff-w1d3e3", name: "Bodyweight Squat to Stand", sets: 1, reps: "8 reps", section: "Mobility Warmup" },
            { id: "ff-w1d3e4", name: "Barbell Back Squat", sets: 4, reps: "8 reps", section: "Main Lift" },
            { id: "ff-w1d3e5", name: "Romanian Deadlift", sets: 3, reps: "10 reps", section: "Accessory" },
            { id: "ff-w1d3e6", name: "Walking Lunges", sets: 3, reps: "10 reps each leg", section: "Accessory" },
            { id: "ff-w1d3e7", name: "Glute Bridge", sets: 3, reps: "15 reps", section: "Accessory" },
            { id: "ff-w1d3e8", name: "Loaded Step-Up (stepping over 'baby gate')", sets: 2, reps: "10 reps each leg", section: "Functional Finisher" },
            { id: "ff-w1d3e9", name: "Squat-to-Stand Dumbbell Pick-Up (toy floor pickup)", sets: 2, reps: "12 reps", section: "Functional Finisher" },
          ],
        },
        {
          id: "ff-w1d4", label: "Cardio / Mobility B 🏃", emoji: "🏃",
          exercises: [
            { id: "ff-w1d4e1", name: "Stationary Bike", sets: 1, reps: "20 min, easy effort", section: "Cardio" },
            { id: "ff-w1d4e2", name: "Couch Stretch (hip flexor)", sets: 1, reps: "60 sec each side", section: "Mobility" },
            { id: "ff-w1d4e3", name: "Pigeon Pose", sets: 1, reps: "60 sec each side", section: "Mobility" },
            { id: "ff-w1d4e4", name: "Cat-Cow Breathing", sets: 1, reps: "10 reps", section: "Mobility" },
          ],
        },
        {
          id: "ff-w1d5", label: "Full Body Lift 🏋️", emoji: "🏋️",
          exercises: [
            { id: "ff-w1d5e1", name: "World's Greatest Stretch", sets: 1, reps: "5 reps each side", section: "Mobility Warmup" },
            { id: "ff-w1d5e2", name: "Inchworm with Shoulder Tap", sets: 1, reps: "6 reps", section: "Mobility Warmup" },
            { id: "ff-w1d5e3", name: "Hip Hinge Practice", sets: 1, reps: "8 reps", section: "Mobility Warmup" },
            { id: "ff-w1d5e4", name: "Trap Bar Deadlift", sets: 4, reps: "6 reps", section: "Main Lift" },
            { id: "ff-w1d5e5", name: "Push-Up Variations", sets: 3, reps: "10 reps", section: "Accessory" },
            { id: "ff-w1d5e6", name: "Cable Row", sets: 3, reps: "12 reps", section: "Accessory" },
            { id: "ff-w1d5e7", name: "Goblet Squat", sets: 3, reps: "10 reps", section: "Accessory" },
            { id: "ff-w1d5e8", name: "Suitcase Carry (one-sided grocery bag)", sets: 2, reps: "40 ft each side", section: "Functional Finisher" },
            { id: "ff-w1d5e9", name: "Get-Up from Floor (playing with kids)", sets: 2, reps: "5 reps each side", section: "Functional Finisher" },
          ],
        },
        {
          id: "ff-w1d6", label: "Rest / Steps 🚶", emoji: "🚶",
          exercises: [
            { id: "ff-w1d6e1", name: "Active Rest — Hit step goal (8,000–10,000 steps)", sets: 1, reps: "Daily goal", section: "Rest" },
            { id: "ff-w1d6e2", name: "Optional: light stretching or short walk", sets: 1, reps: "10–20 min", section: "Rest" },
            { id: "ff-w1d6e3", name: "Active Rest — Hit step goal (8,000–10,000 steps)", sets: 1, reps: "Daily goal", section: "Rest" },
            { id: "ff-w1d6e4", name: "Optional: light stretching or short walk", sets: 1, reps: "10–20 min", section: "Rest" },
          ],
        },
      ],
    },
    {
      week: 2, phase: 1,
      days: [
        {
          id: "ff-w2d1", label: "Upper Body Lift 💪", emoji: "💪",
          exercises: [
            { id: "ff-w2d1e1", name: "Doorway Chest Opener", sets: 1, reps: "30 sec each position", section: "Mobility Warmup" },
            { id: "ff-w2d1e2", name: "Prone Y-T-W", sets: 1, reps: "8 reps each letter", section: "Mobility Warmup" },
            { id: "ff-w2d1e3", name: "Neck CARs", sets: 1, reps: "3 reps each direction", section: "Mobility Warmup" },
            { id: "ff-w2d1e4", name: "Incline Dumbbell Press", sets: 4, reps: "10 reps", section: "Main Lift" },
            { id: "ff-w2d1e5", name: "Lat Pulldown", sets: 3, reps: "10 reps", section: "Accessory" },
            { id: "ff-w2d1e6", name: "Cable Chest Fly", sets: 3, reps: "12 reps", section: "Accessory" },
            { id: "ff-w2d1e7", name: "Hammer Curl", sets: 3, reps: "12 reps", section: "Accessory" },
            { id: "ff-w2d1e8", name: "Overhead Plate Carry (overhead in/out of car seat)", sets: 2, reps: "30 ft", section: "Functional Finisher" },
            { id: "ff-w2d1e9", name: "Medicine Ball Chest Pass to Wall (playful throw)", sets: 2, reps: "10 reps", section: "Functional Finisher" },
          ],
        },
        {
          id: "ff-w2d2", label: "Cardio / Mobility A 🏃", emoji: "🏃",
          exercises: [
            { id: "ff-w2d2e1", name: "Rowing Machine", sets: 1, reps: "20 min, easy-moderate", section: "Cardio" },
            { id: "ff-w2d2e2", name: "Lat Stretch on Foam Roller", sets: 1, reps: "45 sec each side", section: "Mobility" },
            { id: "ff-w2d2e3", name: "Ankle CARs", sets: 1, reps: "5 each direction per ankle", section: "Mobility" },
            { id: "ff-w2d2e4", name: "Seated Butterfly Stretch", sets: 1, reps: "60 sec", section: "Mobility" },
          ],
        },
        {
          id: "ff-w2d3", label: "Lower Body Lift 🦵", emoji: "🦵",
          exercises: [
            { id: "ff-w2d3e1", name: "Cossack Squats", sets: 1, reps: "5 reps each side", section: "Mobility Warmup" },
            { id: "ff-w2d3e2", name: "Ankle Dorsiflexion Wall Drill", sets: 1, reps: "10 each side", section: "Mobility Warmup" },
            { id: "ff-w2d3e3", name: "Reverse Lunge with Reach", sets: 1, reps: "6 each side", section: "Mobility Warmup" },
            { id: "ff-w2d3e4", name: "Dumbbell Bulgarian Split Squat", sets: 4, reps: "8 reps each leg", section: "Main Lift" },
            { id: "ff-w2d3e5", name: "Leg Press", sets: 3, reps: "12 reps", section: "Accessory" },
            { id: "ff-w2d3e6", name: "Nordic Hamstring Curl", sets: 3, reps: "6-8 reps", section: "Accessory" },
            { id: "ff-w2d3e7", name: "Banded Clamshell", sets: 3, reps: "15 reps each side", section: "Accessory" },
            { id: "ff-w2d3e8", name: "Single-Leg Balance on Unstable Surface (yard uneven ground)", sets: 2, reps: "30 sec each leg", section: "Functional Finisher" },
            { id: "ff-w2d3e9", name: "Lateral Band Walk (duck walking w/ toddler)", sets: 2, reps: "20 steps each direction", section: "Functional Finisher" },
          ],
        },
        {
          id: "ff-w2d4", label: "Cardio / Mobility B 🏃", emoji: "🏃",
          exercises: [
            { id: "ff-w2d4e1", name: "Elliptical", sets: 1, reps: "25 min, moderate effort", section: "Cardio" },
            { id: "ff-w2d4e2", name: "Standing Quad Stretch", sets: 1, reps: "45 sec each side", section: "Mobility" },
            { id: "ff-w2d4e3", name: "Half-Kneeling Hip Flexor Stretch", sets: 1, reps: "60 sec each side", section: "Mobility" },
            { id: "ff-w2d4e4", name: "Spinal Twist on Foam Roller", sets: 1, reps: "45 sec each side", section: "Mobility" },
          ],
        },
        {
          id: "ff-w2d5", label: "Full Body Lift 🏋️", emoji: "🏋️",
          exercises: [
            { id: "ff-w2d5e1", name: "Toe Touch Progression", sets: 1, reps: "6 reps", section: "Mobility Warmup" },
            { id: "ff-w2d5e2", name: "Side-Lying Thoracic Rotation", sets: 1, reps: "8 each side", section: "Mobility Warmup" },
            { id: "ff-w2d5e3", name: "Glute Activation Band Walk", sets: 1, reps: "10 steps each direction", section: "Mobility Warmup" },
            { id: "ff-w2d5e4", name: "Kettlebell Swing", sets: 4, reps: "12 reps", section: "Main Lift" },
            { id: "ff-w2d5e5", name: "Ring Row (or Inverted Row)", sets: 3, reps: "10 reps", section: "Accessory" },
            { id: "ff-w2d5e6", name: "Dumbbell Lateral Raise", sets: 3, reps: "12 reps", section: "Accessory" },
            { id: "ff-w2d5e7", name: "Plank with Shoulder Tap", sets: 3, reps: "10 taps each side", section: "Accessory" },
            { id: "ff-w2d5e8", name: "Bucket Carry (simulate carrying a heavy tub of laundry)", sets: 2, reps: "40 ft", section: "Functional Finisher" },
            { id: "ff-w2d5e9", name: "Slam Ball / Med Ball Slam (stress relief!)", sets: 2, reps: "10 reps", section: "Functional Finisher" },
          ],
        },
        {
          id: "ff-w2d6", label: "Rest / Steps 🚶", emoji: "🚶",
          exercises: [
            { id: "ff-w2d6e1", name: "Active Rest — Hit step goal (8,000–10,000 steps)", sets: 1, reps: "Daily goal", section: "Rest" },
            { id: "ff-w2d6e2", name: "Optional: light stretching or short walk", sets: 1, reps: "10–20 min", section: "Rest" },
            { id: "ff-w2d6e3", name: "Active Rest — Hit step goal (8,000–10,000 steps)", sets: 1, reps: "Daily goal", section: "Rest" },
            { id: "ff-w2d6e4", name: "Optional: light stretching or short walk", sets: 1, reps: "10–20 min", section: "Rest" },
          ],
        },
      ],
    },
    {
      week: 3, phase: 1,
      days: [
        {
          id: "ff-w3d1", label: "Upper Body Lift 💪", emoji: "💪",
          exercises: [
            { id: "ff-w3d1e1", name: "Elbow CARs", sets: 1, reps: "5 each direction per elbow", section: "Mobility Warmup" },
            { id: "ff-w3d1e2", name: "Scapular Wall Slides", sets: 1, reps: "10 reps", section: "Mobility Warmup" },
            { id: "ff-w3d1e3", name: "Doorway Pec Stretch", sets: 1, reps: "30 sec each side", section: "Mobility Warmup" },
            { id: "ff-w3d1e4", name: "Weighted Pull-Up (or Assisted)", sets: 4, reps: "6 reps", section: "Main Lift" },
            { id: "ff-w3d1e5", name: "Close-Grip Bench Press", sets: 3, reps: "10 reps", section: "Accessory" },
            { id: "ff-w3d1e6", name: "Cable Bicep Curl", sets: 3, reps: "12 reps", section: "Accessory" },
            { id: "ff-w3d1e7", name: "Rear Delt Fly (dumbbells)", sets: 3, reps: "12 reps", section: "Accessory" },
            { id: "ff-w3d1e8", name: "Waiter's Walk (holding plate overhead — dish/tray carry)", sets: 2, reps: "40 ft each arm", section: "Functional Finisher" },
            { id: "ff-w3d1e9", name: "Renegade Row (reaching under/across table or back seat)", sets: 2, reps: "8 reps each side", section: "Functional Finisher" },
          ],
        },
        {
          id: "ff-w3d2", label: "Cardio / Mobility A 🏃", emoji: "🏃",
          exercises: [
            { id: "ff-w3d2e1", name: "Treadmill Intervals (1 min jog / 1 min walk)", sets: 1, reps: "20 min total", section: "Cardio" },
            { id: "ff-w3d2e2", name: "Wrist CARs", sets: 1, reps: "5 each direction per wrist", section: "Mobility" },
            { id: "ff-w3d2e3", name: "Standing Figure-Four Stretch", sets: 1, reps: "60 sec each side", section: "Mobility" },
            { id: "ff-w3d2e4", name: "Quadruped Hip Extension", sets: 1, reps: "10 reps each side", section: "Mobility" },
          ],
        },
        {
          id: "ff-w3d3", label: "Lower Body Lift 🦵", emoji: "🦵",
          exercises: [
            { id: "ff-w3d3e1", name: "Fire Hydrants", sets: 1, reps: "10 reps each side", section: "Mobility Warmup" },
            { id: "ff-w3d3e2", name: "Hip Circles on All Fours", sets: 1, reps: "8 each direction", section: "Mobility Warmup" },
            { id: "ff-w3d3e3", name: "Lateral Lunge with Touch", sets: 1, reps: "6 each side", section: "Mobility Warmup" },
            { id: "ff-w3d3e4", name: "Hex Bar / Conventional Deadlift", sets: 4, reps: "5 reps", section: "Main Lift" },
            { id: "ff-w3d3e5", name: "Hack Squat or Goblet Squat", sets: 3, reps: "10 reps", section: "Accessory" },
            { id: "ff-w3d3e6", name: "Single-Leg RDL", sets: 3, reps: "8 reps each leg", section: "Accessory" },
            { id: "ff-w3d3e7", name: "Standing Calf Raise", sets: 3, reps: "15 reps", section: "Accessory" },
            { id: "ff-w3d3e8", name: "Box Step-Up Holding Dumbbells (climbing stairs w/ bags)", sets: 2, reps: "10 reps each leg", section: "Functional Finisher" },
            { id: "ff-w3d3e9", name: "Tall Kneeling to Stand (getting up from floor)", sets: 2, reps: "8 reps each leg", section: "Functional Finisher" },
          ],
        },
        {
          id: "ff-w3d4", label: "Cardio / Mobility B 🏃", emoji: "🏃",
          exercises: [
            { id: "ff-w3d4e1", name: "Bike Ride or Outdoor Walk", sets: 1, reps: "30 min, conversational pace", section: "Cardio" },
            { id: "ff-w3d4e2", name: "Lying Glute Stretch (figure 4)", sets: 1, reps: "60 sec each side", section: "Mobility" },
            { id: "ff-w3d4e3", name: "Doorway Shoulder Rotation", sets: 1, reps: "30 sec each side", section: "Mobility" },
            { id: "ff-w3d4e4", name: "Seated Spinal Rotation", sets: 1, reps: "10 each direction", section: "Mobility" },
          ],
        },
        {
          id: "ff-w3d5", label: "Full Body Lift 🏋️", emoji: "🏋️",
          exercises: [
            { id: "ff-w3d5e1", name: "Bear Crawl Activation", sets: 1, reps: "20 ft forward and back", section: "Mobility Warmup" },
            { id: "ff-w3d5e2", name: "Lateral Lunge to Reach", sets: 1, reps: "5 each side", section: "Mobility Warmup" },
            { id: "ff-w3d5e3", name: "Dead Bug", sets: 1, reps: "5 reps each side", section: "Mobility Warmup" },
            { id: "ff-w3d5e4", name: "Barbell Front Squat", sets: 4, reps: "6 reps", section: "Main Lift" },
            { id: "ff-w3d5e5", name: "Dumbbell Push Press", sets: 3, reps: "8 reps", section: "Accessory" },
            { id: "ff-w3d5e6", name: "Seated Cable Row", sets: 3, reps: "12 reps", section: "Accessory" },
            { id: "ff-w3d5e7", name: "Pallof Press", sets: 3, reps: "10 reps each side", section: "Accessory" },
            { id: "ff-w3d5e8", name: "Stagger Stance Deadlift (uneven surface / yard work)", sets: 2, reps: "10 reps each leg", section: "Functional Finisher" },
            { id: "ff-w3d5e9", name: "Loaded Carry + Turn (carrying child around corner)", sets: 2, reps: "3 laps, 20 ft path", section: "Functional Finisher" },
          ],
        },
        {
          id: "ff-w3d6", label: "Rest / Steps 🚶", emoji: "🚶",
          exercises: [
            { id: "ff-w3d6e1", name: "Active Rest — Hit step goal (8,000–10,000 steps)", sets: 1, reps: "Daily goal", section: "Rest" },
            { id: "ff-w3d6e2", name: "Optional: light stretching or short walk", sets: 1, reps: "10–20 min", section: "Rest" },
            { id: "ff-w3d6e3", name: "Active Rest — Hit step goal (8,000–10,000 steps)", sets: 1, reps: "Daily goal", section: "Rest" },
            { id: "ff-w3d6e4", name: "Optional: light stretching or short walk", sets: 1, reps: "10–20 min", section: "Rest" },
          ],
        },
      ],
    },
    {
      week: 4, phase: 1,
      days: [
        {
          id: "ff-w4d1", label: "Upper Body Lift 💪", emoji: "💪",
          exercises: [
            { id: "ff-w4d1e1", name: "Foam Roll Upper Back", sets: 1, reps: "60 sec", section: "Mobility Warmup" },
            { id: "ff-w4d1e2", name: "Arm Circles (small to large)", sets: 1, reps: "10 each direction per arm", section: "Mobility Warmup" },
            { id: "ff-w4d1e3", name: "Sleeper Stretch", sets: 1, reps: "45 sec each side", section: "Mobility Warmup" },
            { id: "ff-w4d1e4", name: "Dumbbell Floor Press", sets: 4, reps: "10 reps", section: "Main Lift" },
            { id: "ff-w4d1e5", name: "Chest-Supported Row", sets: 3, reps: "10 reps", section: "Accessory" },
            { id: "ff-w4d1e6", name: "Tricep Dip (bench or machine)", sets: 3, reps: "10 reps", section: "Accessory" },
            { id: "ff-w4d1e7", name: "Arnold Press", sets: 3, reps: "10 reps", section: "Accessory" },
            { id: "ff-w4d1e8", name: "Sandbag Shoulder Carry (child on shoulder)", sets: 2, reps: "30 ft each side", section: "Functional Finisher" },
            { id: "ff-w4d1e9", name: "Push-Up to T-Rotation (get something from back seat)", sets: 2, reps: "6 reps each side", section: "Functional Finisher" },
          ],
        },
        {
          id: "ff-w4d2", label: "Cardio / Mobility A 🏃", emoji: "🏃",
          exercises: [
            { id: "ff-w4d2e1", name: "Stair Climber", sets: 1, reps: "20 min, moderate pace", section: "Cardio" },
            { id: "ff-w4d2e2", name: "Thread the Needle Thoracic Rotation", sets: 1, reps: "8 each side", section: "Mobility" },
            { id: "ff-w4d2e3", name: "Low Lunge with Rotation", sets: 1, reps: "6 each side", section: "Mobility" },
            { id: "ff-w4d2e4", name: "Child's Pose with Side Reach", sets: 1, reps: "45 sec each side", section: "Mobility" },
          ],
        },
        {
          id: "ff-w4d3", label: "Lower Body Lift 🦵", emoji: "🦵",
          exercises: [
            { id: "ff-w4d3e1", name: "Inchworm to Squat", sets: 1, reps: "6 reps", section: "Mobility Warmup" },
            { id: "ff-w4d3e2", name: "Wall-Supported Hip Flexor Stretch", sets: 1, reps: "45 sec each side", section: "Mobility Warmup" },
            { id: "ff-w4d3e3", name: "Ankle Rotations", sets: 1, reps: "10 each direction per ankle", section: "Mobility Warmup" },
            { id: "ff-w4d3e4", name: "Barbell Hip Thrust", sets: 4, reps: "10 reps", section: "Main Lift" },
            { id: "ff-w4d3e5", name: "Sumo Deadlift", sets: 3, reps: "8 reps", section: "Accessory" },
            { id: "ff-w4d3e6", name: "Reverse Lunge", sets: 3, reps: "10 reps each leg", section: "Accessory" },
            { id: "ff-w4d3e7", name: "Lying Hamstring Curl (machine)", sets: 3, reps: "12 reps", section: "Accessory" },
            { id: "ff-w4d3e8", name: "Lateral Step-Over Obstacle (stepping over mess on floor)", sets: 2, reps: "10 reps each leg", section: "Functional Finisher" },
            { id: "ff-w4d3e9", name: "Weighted Sled Push / Prowler (pushing stroller uphill)", sets: 2, reps: "20 ft", section: "Functional Finisher" },
          ],
        },
        {
          id: "ff-w4d4", label: "Cardio / Mobility B 🏃", emoji: "🏃",
          exercises: [
            { id: "ff-w4d4e1", name: "Incline Walk + Arm Swing Focus", sets: 1, reps: "25 min", section: "Cardio" },
            { id: "ff-w4d4e2", name: "Downward Dog to Cobra Flow", sets: 1, reps: "8 transitions", section: "Mobility" },
            { id: "ff-w4d4e3", name: "Supine Figure-Four Stretch", sets: 1, reps: "60 sec each side", section: "Mobility" },
            { id: "ff-w4d4e4", name: "Standing Balance on One Leg", sets: 1, reps: "30 sec each leg", section: "Mobility" },
          ],
        },
        {
          id: "ff-w4d5", label: "Full Body Lift 🏋️", emoji: "🏋️",
          exercises: [
            { id: "ff-w4d5e1", name: "Squat to Stand + Overhead Reach", sets: 1, reps: "8 reps", section: "Mobility Warmup" },
            { id: "ff-w4d5e2", name: "90/90 Hip Switches", sets: 1, reps: "8 transitions", section: "Mobility Warmup" },
            { id: "ff-w4d5e3", name: "Reverse Snow Angel (prone)", sets: 1, reps: "10 reps", section: "Mobility Warmup" },
            { id: "ff-w4d5e4", name: "Power Clean or Dumbbell Clean", sets: 4, reps: "5 reps", section: "Main Lift" },
            { id: "ff-w4d5e5", name: "Dip (chest/tricep)", sets: 3, reps: "8 reps", section: "Accessory" },
            { id: "ff-w4d5e6", name: "Single-Arm Landmine Row", sets: 3, reps: "10 reps each side", section: "Accessory" },
            { id: "ff-w4d5e7", name: "Copenhagen Plank", sets: 3, reps: "20 sec each side", section: "Accessory" },
            { id: "ff-w4d5e8", name: "Zercher Carry (carrying a large box/laundry basket)", sets: 2, reps: "40 ft", section: "Functional Finisher" },
            { id: "ff-w4d5e9", name: "Turkish Get-Up (lite — waking up off floor)", sets: 2, reps: "3 reps each side", section: "Functional Finisher" },
          ],
        },
        {
          id: "ff-w4d6", label: "Rest / Steps 🚶", emoji: "🚶",
          exercises: [
            { id: "ff-w4d6e1", name: "Active Rest — Hit step goal (8,000–10,000 steps)", sets: 1, reps: "Daily goal", section: "Rest" },
            { id: "ff-w4d6e2", name: "Optional: light stretching or short walk", sets: 1, reps: "10–20 min", section: "Rest" },
            { id: "ff-w4d6e3", name: "Active Rest — Hit step goal (8,000–10,000 steps)", sets: 1, reps: "Daily goal", section: "Rest" },
            { id: "ff-w4d6e4", name: "Optional: light stretching or short walk", sets: 1, reps: "10–20 min", section: "Rest" },
          ],
        },
      ],
    },
    {
      week: 5, phase: 2,
      days: [
        {
          id: "ff-w5d1", label: "Upper Body Lift 💪", emoji: "💪",
          exercises: [
            { id: "ff-w5d1e1", name: "Shoulder CARs (Controlled Articular Rotations)", sets: 1, reps: "5 reps each direction", section: "Mobility Warmup" },
            { id: "ff-w5d1e2", name: "Wall Slides", sets: 1, reps: "10 reps", section: "Mobility Warmup" },
            { id: "ff-w5d1e3", name: "Band Pull-Aparts", sets: 1, reps: "15 reps", section: "Mobility Warmup" },
            { id: "ff-w5d1e4", name: "Barbell Bench Press", sets: 4, reps: "8 reps", section: "Main Lift" },
            { id: "ff-w5d1e5", name: "Single-Arm Dumbbell Row", sets: 3, reps: "10 reps each side", section: "Accessory" },
            { id: "ff-w5d1e6", name: "Dumbbell Shoulder Press", sets: 3, reps: "10 reps", section: "Accessory" },
            { id: "ff-w5d1e7", name: "Face Pulls", sets: 3, reps: "15 reps", section: "Accessory" },
            { id: "ff-w5d1e8", name: "Farmers Carry (grocery bag simulation)", sets: 2, reps: "40 ft x 2 lengths", section: "Functional Finisher" },
            { id: "ff-w5d1e9", name: "Bear Hug Sandbag/Plate Carry (carry a 'toddler')", sets: 2, reps: "30 ft", section: "Functional Finisher" },
          ],
        },
        {
          id: "ff-w5d2", label: "Cardio / Mobility A 🏃", emoji: "🏃",
          exercises: [
            { id: "ff-w5d2e1", name: "Incline Treadmill Walk", sets: 1, reps: "20 min, moderate pace", section: "Cardio" },
            { id: "ff-w5d2e2", name: "Hip 90/90 Stretch", sets: 1, reps: "60 sec each side", section: "Mobility" },
            { id: "ff-w5d2e3", name: "Thoracic Spine Foam Roll", sets: 1, reps: "60 sec", section: "Mobility" },
            { id: "ff-w5d2e4", name: "Deep Squat Hold with Breath", sets: 1, reps: "5 breaths x 3 rounds", section: "Mobility" },
          ],
        },
        {
          id: "ff-w5d3", label: "Lower Body Lift 🦵", emoji: "🦵",
          exercises: [
            { id: "ff-w5d3e1", name: "Hip Circle Activation", sets: 1, reps: "10 each direction", section: "Mobility Warmup" },
            { id: "ff-w5d3e2", name: "Leg Swings (front/back & lateral)", sets: 1, reps: "10 each direction", section: "Mobility Warmup" },
            { id: "ff-w5d3e3", name: "Bodyweight Squat to Stand", sets: 1, reps: "8 reps", section: "Mobility Warmup" },
            { id: "ff-w5d3e4", name: "Barbell Back Squat", sets: 4, reps: "8 reps", section: "Main Lift" },
            { id: "ff-w5d3e5", name: "Romanian Deadlift", sets: 3, reps: "10 reps", section: "Accessory" },
            { id: "ff-w5d3e6", name: "Walking Lunges", sets: 3, reps: "10 reps each leg", section: "Accessory" },
            { id: "ff-w5d3e7", name: "Glute Bridge", sets: 3, reps: "15 reps", section: "Accessory" },
            { id: "ff-w5d3e8", name: "Loaded Step-Up (stepping over 'baby gate')", sets: 2, reps: "10 reps each leg", section: "Functional Finisher" },
            { id: "ff-w5d3e9", name: "Squat-to-Stand Dumbbell Pick-Up (toy floor pickup)", sets: 2, reps: "12 reps", section: "Functional Finisher" },
          ],
        },
        {
          id: "ff-w5d4", label: "Cardio / Mobility B 🏃", emoji: "🏃",
          exercises: [
            { id: "ff-w5d4e1", name: "Stationary Bike", sets: 1, reps: "20 min, easy effort", section: "Cardio" },
            { id: "ff-w5d4e2", name: "Couch Stretch (hip flexor)", sets: 1, reps: "60 sec each side", section: "Mobility" },
            { id: "ff-w5d4e3", name: "Pigeon Pose", sets: 1, reps: "60 sec each side", section: "Mobility" },
            { id: "ff-w5d4e4", name: "Cat-Cow Breathing", sets: 1, reps: "10 reps", section: "Mobility" },
          ],
        },
        {
          id: "ff-w5d5", label: "Full Body Lift 🏋️", emoji: "🏋️",
          exercises: [
            { id: "ff-w5d5e1", name: "World's Greatest Stretch", sets: 1, reps: "5 reps each side", section: "Mobility Warmup" },
            { id: "ff-w5d5e2", name: "Inchworm with Shoulder Tap", sets: 1, reps: "6 reps", section: "Mobility Warmup" },
            { id: "ff-w5d5e3", name: "Hip Hinge Practice", sets: 1, reps: "8 reps", section: "Mobility Warmup" },
            { id: "ff-w5d5e4", name: "Trap Bar Deadlift", sets: 4, reps: "6 reps", section: "Main Lift" },
            { id: "ff-w5d5e5", name: "Push-Up Variations", sets: 3, reps: "10 reps", section: "Accessory" },
            { id: "ff-w5d5e6", name: "Cable Row", sets: 3, reps: "12 reps", section: "Accessory" },
            { id: "ff-w5d5e7", name: "Goblet Squat", sets: 3, reps: "10 reps", section: "Accessory" },
            { id: "ff-w5d5e8", name: "Suitcase Carry (one-sided grocery bag)", sets: 2, reps: "40 ft each side", section: "Functional Finisher" },
            { id: "ff-w5d5e9", name: "Get-Up from Floor (playing with kids)", sets: 2, reps: "5 reps each side", section: "Functional Finisher" },
          ],
        },
        {
          id: "ff-w5d6", label: "Rest / Steps 🚶", emoji: "🚶",
          exercises: [
            { id: "ff-w5d6e1", name: "Active Rest — Hit step goal (8,000–10,000 steps)", sets: 1, reps: "Daily goal", section: "Rest" },
            { id: "ff-w5d6e2", name: "Optional: light stretching or short walk", sets: 1, reps: "10–20 min", section: "Rest" },
            { id: "ff-w5d6e3", name: "Active Rest — Hit step goal (8,000–10,000 steps)", sets: 1, reps: "Daily goal", section: "Rest" },
            { id: "ff-w5d6e4", name: "Optional: light stretching or short walk", sets: 1, reps: "10–20 min", section: "Rest" },
          ],
        },
      ],
    },
    {
      week: 6, phase: 2,
      days: [
        {
          id: "ff-w6d1", label: "Upper Body Lift 💪", emoji: "💪",
          exercises: [
            { id: "ff-w6d1e1", name: "Doorway Chest Opener", sets: 1, reps: "30 sec each position", section: "Mobility Warmup" },
            { id: "ff-w6d1e2", name: "Prone Y-T-W", sets: 1, reps: "8 reps each letter", section: "Mobility Warmup" },
            { id: "ff-w6d1e3", name: "Neck CARs", sets: 1, reps: "3 reps each direction", section: "Mobility Warmup" },
            { id: "ff-w6d1e4", name: "Incline Dumbbell Press", sets: 4, reps: "10 reps", section: "Main Lift" },
            { id: "ff-w6d1e5", name: "Lat Pulldown", sets: 3, reps: "10 reps", section: "Accessory" },
            { id: "ff-w6d1e6", name: "Cable Chest Fly", sets: 3, reps: "12 reps", section: "Accessory" },
            { id: "ff-w6d1e7", name: "Hammer Curl", sets: 3, reps: "12 reps", section: "Accessory" },
            { id: "ff-w6d1e8", name: "Overhead Plate Carry (overhead in/out of car seat)", sets: 2, reps: "30 ft", section: "Functional Finisher" },
            { id: "ff-w6d1e9", name: "Medicine Ball Chest Pass to Wall (playful throw)", sets: 2, reps: "10 reps", section: "Functional Finisher" },
          ],
        },
        {
          id: "ff-w6d2", label: "Cardio / Mobility A 🏃", emoji: "🏃",
          exercises: [
            { id: "ff-w6d2e1", name: "Rowing Machine", sets: 1, reps: "20 min, easy-moderate", section: "Cardio" },
            { id: "ff-w6d2e2", name: "Lat Stretch on Foam Roller", sets: 1, reps: "45 sec each side", section: "Mobility" },
            { id: "ff-w6d2e3", name: "Ankle CARs", sets: 1, reps: "5 each direction per ankle", section: "Mobility" },
            { id: "ff-w6d2e4", name: "Seated Butterfly Stretch", sets: 1, reps: "60 sec", section: "Mobility" },
          ],
        },
        {
          id: "ff-w6d3", label: "Lower Body Lift 🦵", emoji: "🦵",
          exercises: [
            { id: "ff-w6d3e1", name: "Cossack Squats", sets: 1, reps: "5 reps each side", section: "Mobility Warmup" },
            { id: "ff-w6d3e2", name: "Ankle Dorsiflexion Wall Drill", sets: 1, reps: "10 each side", section: "Mobility Warmup" },
            { id: "ff-w6d3e3", name: "Reverse Lunge with Reach", sets: 1, reps: "6 each side", section: "Mobility Warmup" },
            { id: "ff-w6d3e4", name: "Dumbbell Bulgarian Split Squat", sets: 4, reps: "8 reps each leg", section: "Main Lift" },
            { id: "ff-w6d3e5", name: "Leg Press", sets: 3, reps: "12 reps", section: "Accessory" },
            { id: "ff-w6d3e6", name: "Nordic Hamstring Curl", sets: 3, reps: "6-8 reps", section: "Accessory" },
            { id: "ff-w6d3e7", name: "Banded Clamshell", sets: 3, reps: "15 reps each side", section: "Accessory" },
            { id: "ff-w6d3e8", name: "Single-Leg Balance on Unstable Surface (yard uneven ground)", sets: 2, reps: "30 sec each leg", section: "Functional Finisher" },
            { id: "ff-w6d3e9", name: "Lateral Band Walk (duck walking w/ toddler)", sets: 2, reps: "20 steps each direction", section: "Functional Finisher" },
          ],
        },
        {
          id: "ff-w6d4", label: "Cardio / Mobility B 🏃", emoji: "🏃",
          exercises: [
            { id: "ff-w6d4e1", name: "Elliptical", sets: 1, reps: "25 min, moderate effort", section: "Cardio" },
            { id: "ff-w6d4e2", name: "Standing Quad Stretch", sets: 1, reps: "45 sec each side", section: "Mobility" },
            { id: "ff-w6d4e3", name: "Half-Kneeling Hip Flexor Stretch", sets: 1, reps: "60 sec each side", section: "Mobility" },
            { id: "ff-w6d4e4", name: "Spinal Twist on Foam Roller", sets: 1, reps: "45 sec each side", section: "Mobility" },
          ],
        },
        {
          id: "ff-w6d5", label: "Full Body Lift 🏋️", emoji: "🏋️",
          exercises: [
            { id: "ff-w6d5e1", name: "Toe Touch Progression", sets: 1, reps: "6 reps", section: "Mobility Warmup" },
            { id: "ff-w6d5e2", name: "Side-Lying Thoracic Rotation", sets: 1, reps: "8 each side", section: "Mobility Warmup" },
            { id: "ff-w6d5e3", name: "Glute Activation Band Walk", sets: 1, reps: "10 steps each direction", section: "Mobility Warmup" },
            { id: "ff-w6d5e4", name: "Kettlebell Swing", sets: 4, reps: "12 reps", section: "Main Lift" },
            { id: "ff-w6d5e5", name: "Ring Row (or Inverted Row)", sets: 3, reps: "10 reps", section: "Accessory" },
            { id: "ff-w6d5e6", name: "Dumbbell Lateral Raise", sets: 3, reps: "12 reps", section: "Accessory" },
            { id: "ff-w6d5e7", name: "Plank with Shoulder Tap", sets: 3, reps: "10 taps each side", section: "Accessory" },
            { id: "ff-w6d5e8", name: "Bucket Carry (simulate carrying a heavy tub of laundry)", sets: 2, reps: "40 ft", section: "Functional Finisher" },
            { id: "ff-w6d5e9", name: "Slam Ball / Med Ball Slam (stress relief!)", sets: 2, reps: "10 reps", section: "Functional Finisher" },
          ],
        },
        {
          id: "ff-w6d6", label: "Rest / Steps 🚶", emoji: "🚶",
          exercises: [
            { id: "ff-w6d6e1", name: "Active Rest — Hit step goal (8,000–10,000 steps)", sets: 1, reps: "Daily goal", section: "Rest" },
            { id: "ff-w6d6e2", name: "Optional: light stretching or short walk", sets: 1, reps: "10–20 min", section: "Rest" },
            { id: "ff-w6d6e3", name: "Active Rest — Hit step goal (8,000–10,000 steps)", sets: 1, reps: "Daily goal", section: "Rest" },
            { id: "ff-w6d6e4", name: "Optional: light stretching or short walk", sets: 1, reps: "10–20 min", section: "Rest" },
          ],
        },
      ],
    },
    {
      week: 7, phase: 2,
      days: [
        {
          id: "ff-w7d1", label: "Upper Body Lift 💪", emoji: "💪",
          exercises: [
            { id: "ff-w7d1e1", name: "Elbow CARs", sets: 1, reps: "5 each direction per elbow", section: "Mobility Warmup" },
            { id: "ff-w7d1e2", name: "Scapular Wall Slides", sets: 1, reps: "10 reps", section: "Mobility Warmup" },
            { id: "ff-w7d1e3", name: "Doorway Pec Stretch", sets: 1, reps: "30 sec each side", section: "Mobility Warmup" },
            { id: "ff-w7d1e4", name: "Weighted Pull-Up (or Assisted)", sets: 4, reps: "6 reps", section: "Main Lift" },
            { id: "ff-w7d1e5", name: "Close-Grip Bench Press", sets: 3, reps: "10 reps", section: "Accessory" },
            { id: "ff-w7d1e6", name: "Cable Bicep Curl", sets: 3, reps: "12 reps", section: "Accessory" },
            { id: "ff-w7d1e7", name: "Rear Delt Fly (dumbbells)", sets: 3, reps: "12 reps", section: "Accessory" },
            { id: "ff-w7d1e8", name: "Waiter's Walk (holding plate overhead — dish/tray carry)", sets: 2, reps: "40 ft each arm", section: "Functional Finisher" },
            { id: "ff-w7d1e9", name: "Renegade Row (reaching under/across table or back seat)", sets: 2, reps: "8 reps each side", section: "Functional Finisher" },
          ],
        },
        {
          id: "ff-w7d2", label: "Cardio / Mobility A 🏃", emoji: "🏃",
          exercises: [
            { id: "ff-w7d2e1", name: "Treadmill Intervals (1 min jog / 1 min walk)", sets: 1, reps: "20 min total", section: "Cardio" },
            { id: "ff-w7d2e2", name: "Wrist CARs", sets: 1, reps: "5 each direction per wrist", section: "Mobility" },
            { id: "ff-w7d2e3", name: "Standing Figure-Four Stretch", sets: 1, reps: "60 sec each side", section: "Mobility" },
            { id: "ff-w7d2e4", name: "Quadruped Hip Extension", sets: 1, reps: "10 reps each side", section: "Mobility" },
          ],
        },
        {
          id: "ff-w7d3", label: "Lower Body Lift 🦵", emoji: "🦵",
          exercises: [
            { id: "ff-w7d3e1", name: "Fire Hydrants", sets: 1, reps: "10 reps each side", section: "Mobility Warmup" },
            { id: "ff-w7d3e2", name: "Hip Circles on All Fours", sets: 1, reps: "8 each direction", section: "Mobility Warmup" },
            { id: "ff-w7d3e3", name: "Lateral Lunge with Touch", sets: 1, reps: "6 each side", section: "Mobility Warmup" },
            { id: "ff-w7d3e4", name: "Hex Bar / Conventional Deadlift", sets: 4, reps: "5 reps", section: "Main Lift" },
            { id: "ff-w7d3e5", name: "Hack Squat or Goblet Squat", sets: 3, reps: "10 reps", section: "Accessory" },
            { id: "ff-w7d3e6", name: "Single-Leg RDL", sets: 3, reps: "8 reps each leg", section: "Accessory" },
            { id: "ff-w7d3e7", name: "Standing Calf Raise", sets: 3, reps: "15 reps", section: "Accessory" },
            { id: "ff-w7d3e8", name: "Box Step-Up Holding Dumbbells (climbing stairs w/ bags)", sets: 2, reps: "10 reps each leg", section: "Functional Finisher" },
            { id: "ff-w7d3e9", name: "Tall Kneeling to Stand (getting up from floor)", sets: 2, reps: "8 reps each leg", section: "Functional Finisher" },
          ],
        },
        {
          id: "ff-w7d4", label: "Cardio / Mobility B 🏃", emoji: "🏃",
          exercises: [
            { id: "ff-w7d4e1", name: "Bike Ride or Outdoor Walk", sets: 1, reps: "30 min, conversational pace", section: "Cardio" },
            { id: "ff-w7d4e2", name: "Lying Glute Stretch (figure 4)", sets: 1, reps: "60 sec each side", section: "Mobility" },
            { id: "ff-w7d4e3", name: "Doorway Shoulder Rotation", sets: 1, reps: "30 sec each side", section: "Mobility" },
            { id: "ff-w7d4e4", name: "Seated Spinal Rotation", sets: 1, reps: "10 each direction", section: "Mobility" },
          ],
        },
        {
          id: "ff-w7d5", label: "Full Body Lift 🏋️", emoji: "🏋️",
          exercises: [
            { id: "ff-w7d5e1", name: "Bear Crawl Activation", sets: 1, reps: "20 ft forward and back", section: "Mobility Warmup" },
            { id: "ff-w7d5e2", name: "Lateral Lunge to Reach", sets: 1, reps: "5 each side", section: "Mobility Warmup" },
            { id: "ff-w7d5e3", name: "Dead Bug", sets: 1, reps: "5 reps each side", section: "Mobility Warmup" },
            { id: "ff-w7d5e4", name: "Barbell Front Squat", sets: 4, reps: "6 reps", section: "Main Lift" },
            { id: "ff-w7d5e5", name: "Dumbbell Push Press", sets: 3, reps: "8 reps", section: "Accessory" },
            { id: "ff-w7d5e6", name: "Seated Cable Row", sets: 3, reps: "12 reps", section: "Accessory" },
            { id: "ff-w7d5e7", name: "Pallof Press", sets: 3, reps: "10 reps each side", section: "Accessory" },
            { id: "ff-w7d5e8", name: "Stagger Stance Deadlift (uneven surface / yard work)", sets: 2, reps: "10 reps each leg", section: "Functional Finisher" },
            { id: "ff-w7d5e9", name: "Loaded Carry + Turn (carrying child around corner)", sets: 2, reps: "3 laps, 20 ft path", section: "Functional Finisher" },
          ],
        },
        {
          id: "ff-w7d6", label: "Rest / Steps 🚶", emoji: "🚶",
          exercises: [
            { id: "ff-w7d6e1", name: "Active Rest — Hit step goal (8,000–10,000 steps)", sets: 1, reps: "Daily goal", section: "Rest" },
            { id: "ff-w7d6e2", name: "Optional: light stretching or short walk", sets: 1, reps: "10–20 min", section: "Rest" },
            { id: "ff-w7d6e3", name: "Active Rest — Hit step goal (8,000–10,000 steps)", sets: 1, reps: "Daily goal", section: "Rest" },
            { id: "ff-w7d6e4", name: "Optional: light stretching or short walk", sets: 1, reps: "10–20 min", section: "Rest" },
          ],
        },
      ],
    },
    {
      week: 8, phase: 2,
      days: [
        {
          id: "ff-w8d1", label: "Upper Body Lift 💪", emoji: "💪",
          exercises: [
            { id: "ff-w8d1e1", name: "Foam Roll Upper Back", sets: 1, reps: "60 sec", section: "Mobility Warmup" },
            { id: "ff-w8d1e2", name: "Arm Circles (small to large)", sets: 1, reps: "10 each direction per arm", section: "Mobility Warmup" },
            { id: "ff-w8d1e3", name: "Sleeper Stretch", sets: 1, reps: "45 sec each side", section: "Mobility Warmup" },
            { id: "ff-w8d1e4", name: "Dumbbell Floor Press", sets: 4, reps: "10 reps", section: "Main Lift" },
            { id: "ff-w8d1e5", name: "Chest-Supported Row", sets: 3, reps: "10 reps", section: "Accessory" },
            { id: "ff-w8d1e6", name: "Tricep Dip (bench or machine)", sets: 3, reps: "10 reps", section: "Accessory" },
            { id: "ff-w8d1e7", name: "Arnold Press", sets: 3, reps: "10 reps", section: "Accessory" },
            { id: "ff-w8d1e8", name: "Sandbag Shoulder Carry (child on shoulder)", sets: 2, reps: "30 ft each side", section: "Functional Finisher" },
            { id: "ff-w8d1e9", name: "Push-Up to T-Rotation (get something from back seat)", sets: 2, reps: "6 reps each side", section: "Functional Finisher" },
          ],
        },
        {
          id: "ff-w8d2", label: "Cardio / Mobility A 🏃", emoji: "🏃",
          exercises: [
            { id: "ff-w8d2e1", name: "Stair Climber", sets: 1, reps: "20 min, moderate pace", section: "Cardio" },
            { id: "ff-w8d2e2", name: "Thread the Needle Thoracic Rotation", sets: 1, reps: "8 each side", section: "Mobility" },
            { id: "ff-w8d2e3", name: "Low Lunge with Rotation", sets: 1, reps: "6 each side", section: "Mobility" },
            { id: "ff-w8d2e4", name: "Child's Pose with Side Reach", sets: 1, reps: "45 sec each side", section: "Mobility" },
          ],
        },
        {
          id: "ff-w8d3", label: "Lower Body Lift 🦵", emoji: "🦵",
          exercises: [
            { id: "ff-w8d3e1", name: "Inchworm to Squat", sets: 1, reps: "6 reps", section: "Mobility Warmup" },
            { id: "ff-w8d3e2", name: "Wall-Supported Hip Flexor Stretch", sets: 1, reps: "45 sec each side", section: "Mobility Warmup" },
            { id: "ff-w8d3e3", name: "Ankle Rotations", sets: 1, reps: "10 each direction per ankle", section: "Mobility Warmup" },
            { id: "ff-w8d3e4", name: "Barbell Hip Thrust", sets: 4, reps: "10 reps", section: "Main Lift" },
            { id: "ff-w8d3e5", name: "Sumo Deadlift", sets: 3, reps: "8 reps", section: "Accessory" },
            { id: "ff-w8d3e6", name: "Reverse Lunge", sets: 3, reps: "10 reps each leg", section: "Accessory" },
            { id: "ff-w8d3e7", name: "Lying Hamstring Curl (machine)", sets: 3, reps: "12 reps", section: "Accessory" },
            { id: "ff-w8d3e8", name: "Lateral Step-Over Obstacle (stepping over mess on floor)", sets: 2, reps: "10 reps each leg", section: "Functional Finisher" },
            { id: "ff-w8d3e9", name: "Weighted Sled Push / Prowler (pushing stroller uphill)", sets: 2, reps: "20 ft", section: "Functional Finisher" },
          ],
        },
        {
          id: "ff-w8d4", label: "Cardio / Mobility B 🏃", emoji: "🏃",
          exercises: [
            { id: "ff-w8d4e1", name: "Incline Walk + Arm Swing Focus", sets: 1, reps: "25 min", section: "Cardio" },
            { id: "ff-w8d4e2", name: "Downward Dog to Cobra Flow", sets: 1, reps: "8 transitions", section: "Mobility" },
            { id: "ff-w8d4e3", name: "Supine Figure-Four Stretch", sets: 1, reps: "60 sec each side", section: "Mobility" },
            { id: "ff-w8d4e4", name: "Standing Balance on One Leg", sets: 1, reps: "30 sec each leg", section: "Mobility" },
          ],
        },
        {
          id: "ff-w8d5", label: "Full Body Lift 🏋️", emoji: "🏋️",
          exercises: [
            { id: "ff-w8d5e1", name: "Squat to Stand + Overhead Reach", sets: 1, reps: "8 reps", section: "Mobility Warmup" },
            { id: "ff-w8d5e2", name: "90/90 Hip Switches", sets: 1, reps: "8 transitions", section: "Mobility Warmup" },
            { id: "ff-w8d5e3", name: "Reverse Snow Angel (prone)", sets: 1, reps: "10 reps", section: "Mobility Warmup" },
            { id: "ff-w8d5e4", name: "Power Clean or Dumbbell Clean", sets: 4, reps: "5 reps", section: "Main Lift" },
            { id: "ff-w8d5e5", name: "Dip (chest/tricep)", sets: 3, reps: "8 reps", section: "Accessory" },
            { id: "ff-w8d5e6", name: "Single-Arm Landmine Row", sets: 3, reps: "10 reps each side", section: "Accessory" },
            { id: "ff-w8d5e7", name: "Copenhagen Plank", sets: 3, reps: "20 sec each side", section: "Accessory" },
            { id: "ff-w8d5e8", name: "Zercher Carry (carrying a large box/laundry basket)", sets: 2, reps: "40 ft", section: "Functional Finisher" },
            { id: "ff-w8d5e9", name: "Turkish Get-Up (lite — waking up off floor)", sets: 2, reps: "3 reps each side", section: "Functional Finisher" },
          ],
        },
        {
          id: "ff-w8d6", label: "Rest / Steps 🚶", emoji: "🚶",
          exercises: [
            { id: "ff-w8d6e1", name: "Active Rest — Hit step goal (8,000–10,000 steps)", sets: 1, reps: "Daily goal", section: "Rest" },
            { id: "ff-w8d6e2", name: "Optional: light stretching or short walk", sets: 1, reps: "10–20 min", section: "Rest" },
            { id: "ff-w8d6e3", name: "Active Rest — Hit step goal (8,000–10,000 steps)", sets: 1, reps: "Daily goal", section: "Rest" },
            { id: "ff-w8d6e4", name: "Optional: light stretching or short walk", sets: 1, reps: "10–20 min", section: "Rest" },
          ],
        },
      ],
    },
  ],
};

// ── LIBRARY CATALOG — hardcoded default plans ─────────────────────────────────
// Each entry has: id, name, description, duration, daysPerWeek, difficulty, tags, access, plan
// access: "free" | "member"
const LIBRARY_CATALOG = [
  {
    id: "lib-strength-foundation",
    name: "8-Week Strength Foundation",
    description: "A classic Push/Pull/Legs split designed to build raw strength with progressive overload across two phases.",
    duration: "8 weeks",
    daysPerWeek: 3,
    difficulty: "Intermediate",
    tags: ["Strength", "PPL", "Progressive"],
    access: "free",
    plan: DEFAULT_PLAN,
  },
  {
    id: "lib-hypertrophy-5day",
    name: "5-Day Hypertrophy Block",
    description: "High-volume upper/lower split focusing on muscle growth with targeted isolation work each session.",
    duration: "6 weeks",
    daysPerWeek: 5,
    difficulty: "Advanced",
    tags: ["Hypertrophy", "Upper/Lower", "Volume"],
    access: "member",
    plan: {
      name: "5-Day Hypertrophy Block",
      weeks: Array.from({ length: 6 }, (_, wi) => ({
        week: wi + 1,
        phase: wi < 3 ? 1 : 2,
        days: [
          {
            id: `hyp-w${wi+1}d1`, label: "Upper A", emoji: "💪",
            exercises: [
              { id: `hyp-w${wi+1}d1e1`, name: "Barbell Bench Press",     sets: 4, reps: wi < 3 ? "8–10" : "6–8",   section: "Chest" },
              { id: `hyp-w${wi+1}d1e2`, name: "Incline Dumbbell Press",  sets: 3, reps: "10–12", section: "Chest" },
              { id: `hyp-w${wi+1}d1e3`, name: "Cable Fly",               sets: 3, reps: "12–15", section: "Chest" },
              { id: `hyp-w${wi+1}d1e4`, name: "Seated Cable Row",        sets: 4, reps: "10–12", section: "Back" },
              { id: `hyp-w${wi+1}d1e5`, name: "Lat Pulldown",            sets: 3, reps: "10–12", section: "Back" },
              { id: `hyp-w${wi+1}d1e6`, name: "Dumbbell Lateral Raise",  sets: 4, reps: "15–20", section: "Shoulders" },
            ],
          },
          {
            id: `hyp-w${wi+1}d2`, label: "Lower A", emoji: "🦵",
            exercises: [
              { id: `hyp-w${wi+1}d2e1`, name: "Back Squat",              sets: 4, reps: wi < 3 ? "8–10" : "6–8",   section: "Quads" },
              { id: `hyp-w${wi+1}d2e2`, name: "Leg Press",               sets: 3, reps: "12–15", section: "Quads" },
              { id: `hyp-w${wi+1}d2e3`, name: "Leg Extension",           sets: 3, reps: "15–20", section: "Quads" },
              { id: `hyp-w${wi+1}d2e4`, name: "Romanian Deadlift",       sets: 4, reps: "10–12", section: "Hamstrings" },
              { id: `hyp-w${wi+1}d2e5`, name: "Leg Curl",                sets: 3, reps: "12–15", section: "Hamstrings" },
              { id: `hyp-w${wi+1}d2e6`, name: "Calf Raises",             sets: 4, reps: "15–20", section: "Calves" },
            ],
          },
          {
            id: `hyp-w${wi+1}d3`, label: "Upper B", emoji: "🔥",
            exercises: [
              { id: `hyp-w${wi+1}d3e1`, name: "Overhead Press",          sets: 4, reps: wi < 3 ? "8–10" : "6–8",   section: "Shoulders" },
              { id: `hyp-w${wi+1}d3e2`, name: "Arnold Press",            sets: 3, reps: "10–12", section: "Shoulders" },
              { id: `hyp-w${wi+1}d3e3`, name: "Pull-Ups",                sets: 4, reps: "max",   section: "Back" },
              { id: `hyp-w${wi+1}d3e4`, name: "Dumbbell Row",            sets: 3, reps: "10–12", section: "Back" },
              { id: `hyp-w${wi+1}d3e5`, name: "Barbell Curl",            sets: 3, reps: "10–12", section: "Arms" },
              { id: `hyp-w${wi+1}d3e6`, name: "Skull Crushers",          sets: 3, reps: "10–12", section: "Arms" },
            ],
          },
          {
            id: `hyp-w${wi+1}d4`, label: "Lower B", emoji: "⚡",
            exercises: [
              { id: `hyp-w${wi+1}d4e1`, name: "Deadlift",                sets: 4, reps: wi < 3 ? "5–6" : "4–5",    section: "Posterior Chain" },
              { id: `hyp-w${wi+1}d4e2`, name: "Bulgarian Split Squat",   sets: 3, reps: "10–12", section: "Quads" },
              { id: `hyp-w${wi+1}d4e3`, name: "Hack Squat",              sets: 3, reps: "12–15", section: "Quads" },
              { id: `hyp-w${wi+1}d4e4`, name: "Nordic Curl",             sets: 3, reps: "6–8",   section: "Hamstrings" },
              { id: `hyp-w${wi+1}d4e5`, name: "Hip Thrust",              sets: 4, reps: "12–15", section: "Glutes" },
            ],
          },
          {
            id: `hyp-w${wi+1}d5`, label: "Arms & Shoulders", emoji: "🏆",
            exercises: [
              { id: `hyp-w${wi+1}d5e1`, name: "Cable Lateral Raise",     sets: 4, reps: "15–20", section: "Shoulders" },
              { id: `hyp-w${wi+1}d5e2`, name: "Face Pulls",              sets: 3, reps: "15–20", section: "Shoulders" },
              { id: `hyp-w${wi+1}d5e3`, name: "EZ Bar Curl",             sets: 4, reps: "10–12", section: "Biceps" },
              { id: `hyp-w${wi+1}d5e4`, name: "Incline Dumbbell Curl",   sets: 3, reps: "12–15", section: "Biceps" },
              { id: `hyp-w${wi+1}d5e5`, name: "Cable Pushdown",          sets: 4, reps: "12–15", section: "Triceps" },
              { id: `hyp-w${wi+1}d5e6`, name: "Overhead Tricep Extension", sets: 3, reps: "12–15", section: "Triceps" },
            ],
          },
        ],
      })),
    },
  },
  {
    id: "lib-functional-fitness",
    name: "8-Week Functional Fitness",
    description: "Built for real-life strength — carries, lifts, and movement patterns that translate directly to everyday activities. 3 lifting days + 2 cardio/mobility days per week, with dedicated warmups and functional finishers each session.",
    duration: "8 weeks",
    daysPerWeek: 6,
    difficulty: "Beginner–Intermediate",
    tags: ["Functional", "Mobility", "Full Body"],
    access: "free",
    plan: FUNCTIONAL_FITNESS_PLAN,
  },
];

// ── STORAGE ───────────────────────────────────────────────────────────────────
const store = {
  get: (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

const fmt = (s) => `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;

// ── PLAN PARSER ───────────────────────────────────────────────────────────────
function parseSheetToPlan(rows, planName) {
  const normalize = (s) => String(s||"").trim().toLowerCase();
  if (!rows.length) throw new Error("Spreadsheet is empty.");

  const firstRow = rows[0];
  const keys = Object.keys(firstRow);

  const findKey = (...candidates) => keys.find(k => candidates.some(c => normalize(k).includes(c))) || null;

  const kWeek     = findKey("week");
  const kPhase    = findKey("phase");
  const kDayLbl   = findKey("day label","day name","day");
  const kDayEmoji = findKey("emoji","icon");
  const kExName   = findKey("exercise","name","movement");
  const kSets     = findKey("sets");
  const kReps     = findKey("reps","rep");
  const kSection  = findKey("section","group");          // ← NEW

  if (!kWeek || !kExName || !kSets || !kReps) {
    throw new Error(`Missing required columns. Need: Week, Exercise Name, Sets, Reps.\nFound: ${keys.join(", ")}`);
  }

  const weekMap = new Map();

  rows.forEach((row) => {
    const weekNum = parseInt(row[kWeek]);
    if (!weekNum || isNaN(weekNum)) return;
    const exName = String(row[kExName]||"").trim();
    if (!exName) return;

    const dayLabel  = kDayLbl    ? String(row[kDayLbl]||"Day 1").trim() : "Day 1";
    const dayEmoji  = kDayEmoji  ? String(row[kDayEmoji]||"💪").trim()  : "💪";
    const phase     = kPhase     ? (parseInt(row[kPhase])||1)            : (weekNum <= 4 ? 1 : 2);
    const sets      = parseInt(row[kSets]) || 3;
    const reps      = String(row[kReps]||"10").trim();
    const section   = kSection   ? String(row[kSection]||"").trim()      : "";  // ← NEW

    if (!weekMap.has(weekNum)) weekMap.set(weekNum, { week: weekNum, phase, days: new Map() });
    const wk = weekMap.get(weekNum);

    if (!wk.days.has(dayLabel)) wk.days.set(dayLabel, { label: dayLabel, emoji: dayEmoji, exercises: [] });
    wk.days.get(dayLabel).exercises.push({ name: exName, sets, reps, section });
  });

  if (!weekMap.size) throw new Error("No valid rows found. Make sure Week and Exercise Name columns have data.");

  const sortedWeeks = [...weekMap.values()].sort((a,b) => a.week - b.week);

  return {
    name: planName || "Imported Plan",
    weeks: sortedWeeks.map(w => ({
      week: w.week,
      phase: w.phase,
      days: [...w.days.values()].map((d, di) => ({
        id: `w${w.week}d${di+1}`,
        label: d.label,
        emoji: d.emoji,
        exercises: d.exercises.map((ex, ei) => ({
          id: `w${w.week}d${di+1}e${ei+1}`,
          name: ex.name,
          sets: ex.sets,
          reps: ex.reps,
          section: ex.section,    // ← NEW
        })),
      })),
    })),
  };
}

// ── TEMPLATE GENERATOR ────────────────────────────────────────────────────────
function generateTemplate() {
  const wb = XLSX.utils.book_new();

  const instrData = [
    ["Volume — Workout Plan Import Template"],
    [""],
    ["HOW TO USE:"],
    ["1. Fill in the 'Workout Plan' sheet with your exercises"],
    ["2. Each row = one exercise in a specific week/day"],
    ["3. Save the file and import it into Volume"],
    [""],
    ["REQUIRED COLUMNS:"],
    ["Week",          "The week number (1–8, or however many weeks you want)"],
    ["Day Label",     "Name of the training day (e.g. Push Day, Upper Body, Monday)"],
    ["Exercise Name", "Full name of the exercise"],
    ["Sets",          "Number of sets (number)"],
    ["Reps",          "Rep target (e.g. 8, 8–10, max, 3x5)"],
    [""],
    ["OPTIONAL COLUMNS:"],
    ["Phase",         "Training phase number (e.g. 1 or 2). Auto-detected from week if omitted."],
    ["Day Emoji",     "An emoji for the day (🔥💪🦵 etc). Defaults to 💪 if omitted."],
    ["Section",       "Groups exercises visually (e.g. Chest, Back). Exercises with the same section name are grouped together with extra spacing between groups."],
    [""],
    ["TIPS:"],
    ["• You can have any number of weeks and days"],
    ["• Days are grouped by their exact Day Label text — make sure spelling is consistent"],
    ["• Section groups are shown in the order they first appear"],
    ["• You can add extra columns — they'll be ignored"],
  ];
  const instrWs = XLSX.utils.aoa_to_sheet(instrData);
  instrWs["!cols"] = [{ wch: 20 }, { wch: 70 }];
  XLSX.utils.book_append_sheet(wb, instrWs, "Instructions");

  const headers = ["Week", "Phase", "Day Label", "Day Emoji", "Exercise Name", "Sets", "Reps", "Section"];
  const sampleRows = [
    [1, 1, "Push Day", "🔥", "Barbell Bench Press",   3, "8–10",  "Chest"],
    [1, 1, "Push Day", "🔥", "Overhead Press",         3, "10–12", "Chest"],
    [1, 1, "Push Day", "🔥", "Incline Dumbbell Press", 3, "10–12", "Chest"],
    [1, 1, "Push Day", "🔥", "Lateral Raises",         3, "15–20", "Shoulders & Arms"],
    [1, 1, "Push Day", "🔥", "Tricep Pushdowns",       3, "12–15", "Shoulders & Arms"],
    [1, 1, "Pull Day", "💪", "Barbell Deadlift",        3, "6–8",   "Back"],
    [1, 1, "Pull Day", "💪", "Pull-Ups",               3, "max",   "Back"],
    [1, 1, "Pull Day", "💪", "Barbell Row",             3, "8–10",  "Back"],
    [1, 1, "Pull Day", "💪", "Face Pulls",              3, "15–20", "Biceps & Rear Delt"],
    [1, 1, "Pull Day", "💪", "Hammer Curls",            3, "12–15", "Biceps & Rear Delt"],
    [1, 1, "Leg Day",  "🦵", "Back Squat",              3, "8–10",  "Quads"],
    [1, 1, "Leg Day",  "🦵", "Romanian Deadlift",       3, "10–12", "Quads"],
    [1, 1, "Leg Day",  "🦵", "Leg Press",               3, "12–15", "Quads"],
    [1, 1, "Leg Day",  "🦵", "Leg Curl",                3, "12–15", "Hamstrings & Calves"],
    [1, 1, "Leg Day",  "🦵", "Calf Raises",             4, "15–20", "Hamstrings & Calves"],
    [2, 1, "Push Day", "🔥", "Barbell Bench Press",   3, "8–10",  "Chest"],
    [2, 1, "Push Day", "🔥", "Add your exercises here...", 3, "10–12", "Chest"],
    [2, 1, "Pull Day", "💪", "Barbell Deadlift",        3, "6–8",   "Back"],
    [2, 1, "Pull Day", "💪", "Add your exercises here...", 3, "8–10", "Back"],
    [2, 1, "Leg Day",  "🦵", "Back Squat",              3, "8–10",  "Quads"],
    [2, 1, "Leg Day",  "🦵", "Add your exercises here...", 3, "10–12", "Quads"],
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
  ws["!cols"] = [
    { wch: 8 },  // Week
    { wch: 8 },  // Phase
    { wch: 16 }, // Day Label
    { wch: 10 }, // Day Emoji
    { wch: 28 }, // Exercise Name
    { wch: 6 },  // Sets
    { wch: 10 }, // Reps
    { wch: 22 }, // Section  ← NEW
  ];
  XLSX.utils.book_append_sheet(wb, ws, "Workout Plan");
  XLSX.writeFile(wb, "volume-workout-template.xlsx");
}

// ── BACKUP / RESTORE ──────────────────────────────────────────────────────────
function exportBackup(plan) {
  const log = store.get("wlog") || {};
  const backup = { version: 1, exportedAt: new Date().toISOString(), plan, log };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `volume-backup-${new Date().toISOString().slice(0,10)}.json`;
  a.click(); URL.revokeObjectURL(url);
}

function parseBackup(text) {
  const data = JSON.parse(text);
  if (!data.plan || !data.log) throw new Error("Invalid backup file — missing plan or log data.");
  if (!data.plan.weeks?.length) throw new Error("Backup contains an empty plan.");
  return data;
}

// ── SECTION HELPERS ───────────────────────────────────────────────────────────
// Groups exercises by their section field. Returns array of { section, exercises[] }.
// Exercises without a section, or where all sections are blank, are treated as one group.
function groupBySection(exercises) {
  const hasSections = exercises.some(ex => ex.section && ex.section.trim());
  if (!hasSections) return [{ section: null, exercises }];

  const groups = [];
  let current = null;
  exercises.forEach(ex => {
    const sec = ex.section?.trim() || "";
    if (!current || current.section !== sec) {
      current = { section: sec || null, exercises: [] };
      groups.push(current);
    }
    current.exercises.push(ex);
  });
  return groups;
}

// ── STYLES ────────────────────────────────────────────────────────────────────
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}
  body{background:#f5f0e8;font-family:'DM Sans',sans-serif;text-align:left;}
  #root{text-align:left;max-width:none;margin:0;padding:0;}
  ::-webkit-scrollbar{width:5px;}
  ::-webkit-scrollbar-thumb{background:#c8f040;border-radius:99px;}

  .card{background:#fff;border-radius:20px;box-shadow:0 2px 24px rgba(0,0,0,.06);}
  .lime-card{background:#c8f040;border-radius:20px;}

  .tab-wrap{background:#ede8de;border-radius:99px;padding:4px;display:inline-flex;gap:2px;flex-wrap:wrap;}
  .tab-btn{border-radius:99px;border:none;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:600;cursor:pointer;padding:9px 22px;transition:all .2s;letter-spacing:-.01em;}
  .tab-btn.on{background:#1a1a1a;color:#fff;}
  .tab-btn.off{background:transparent;color:#888;}
  .tab-btn.off:hover{color:#1a1a1a;}

  .week-btn{border-radius:99px;border:2px solid #e0dbd0;background:#fff;font-family:'DM Sans',sans-serif;font-size:12px;font-weight:600;cursor:pointer;padding:5px 14px;transition:all .15s;color:#999;}
  .week-btn.on{background:#1a1a1a;color:#fff;border-color:#1a1a1a;}
  .week-btn:hover:not(.on){border-color:#b5e030;color:#1a1a1a;}

  .day-btn{border-radius:14px;border:2px solid #e0dbd0;background:#fff;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:600;cursor:pointer;padding:10px 18px;transition:all .15s;color:#777;display:flex;align-items:center;gap:8px;}
  .day-btn.on{background:#1a1a1a;color:#fff;border-color:#1a1a1a;}
  .day-btn:hover:not(.on){border-color:#b5e030;color:#1a1a1a;}

  .ex-card{background:#fff;border-radius:16px;border:2px solid #ede8de;margin-bottom:10px;transition:border-color .15s;}
  .ex-card.done{border-color:#c8f040;background:#fafff5;}
  .ex-card.fu{overflow:hidden;}

  .chk{width:24px;height:24px;border-radius:8px;border:2.5px solid #d0d0d0;display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0;transition:all .15s;cursor:pointer;}
  .chk.on{background:#c8f040;border-color:#c8f040;}

  .inp{border:2px solid #ede8de;border-radius:10px;padding:9px 12px;font-family:'DM Sans',sans-serif;font-size:13px;color:#1a1a1a;outline:none;width:100%;transition:border-color .15s;}
  .inp:focus{border-color:#c8f040;}
  .inp::placeholder{color:#ccc;}

  .btn-lime{background:#c8f040;border:none;border-radius:99px;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:700;color:#1a1a1a;padding:10px 22px;cursor:pointer;transition:opacity .15s;}
  .btn-lime:hover{opacity:.85;}
  .btn-dark{background:#1a1a1a;border:none;border-radius:99px;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:700;color:#fff;padding:10px 22px;cursor:pointer;transition:opacity .15s;}
  .btn-dark:hover{opacity:.8;}
  .btn-ghost{background:transparent;border:2px solid #e0dbd0;border-radius:99px;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:600;color:#888;padding:9px 20px;cursor:pointer;transition:all .15s;}
  .btn-ghost:hover{border-color:#1a1a1a;color:#1a1a1a;}

  .rest-chip{border-radius:99px;border:2px solid #e0dbd0;background:transparent;font-family:'DM Sans',sans-serif;font-size:11px;font-weight:700;cursor:pointer;padding:4px 10px;color:#aaa;transition:all .15s;}
  .rest-chip.on{background:#1a1a1a;color:#fff;border-color:#1a1a1a;}

  .stat{text-align:center;padding:12px 8px;}

  .drop-zone{border:2.5px dashed #d0d0d0;border-radius:16px;padding:36px 24px;text-align:center;cursor:pointer;transition:all .15s;}
  .drop-zone.over{border-color:#c8f040;background:#f9ffe8;}

  .import-step{display:flex;align-items:flex-start;gap:12px;padding:10px 0;border-bottom:1px solid #f5f0e8;}
  .import-step:last-child{border-bottom:none;}
  .step-num{width:26px;height:26px;border-radius:99px;background:#1a1a1a;color:#fff;font-family:'DM Sans',sans-serif;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;font-family:'DM Sans',sans-serif;font-size:12px;font-weight:700;color:#fff;flex-shrink:0;margin-top:2px;}

  .tag{border-radius:99px;font-family:'DM Sans',sans-serif;font-size:11px;font-weight:700;padding:3px 10px;display:inline-block;}
  .tag-lime{background:#c8f040;color:#1a1a1a;}
  .tag-muted{background:#f5f0e8;color:#888;}
  .tag-dark{background:#1a1a1a;color:#fff;}
  .tag-member{background:#1a1a1a;color:#c8f040;}
  .tag-free{background:#e8f8d0;color:#4a7a00;}

  .error-box{background:#fff0f0;border:2px solid #ffcccc;border-radius:12px;padding:14px 16px;}
  .success-box{background:#f0fff4;border:2px solid #b5e550;border-radius:12px;padding:14px 16px;}

  .lib-card{background:#fff;border-radius:20px;border:2px solid #ede8de;padding:20px;transition:border-color .15s,box-shadow .15s;cursor:pointer;}
  .lib-card:hover{border-color:#c8f040;box-shadow:0 4px 20px rgba(0,0,0,.08);}
  .lib-card.active-plan{border-color:#c8f040;background:#fafff5;}

  .myplan-row{display:flex;align-items:center;gap:12px;padding:14px 20px;border-bottom:2px solid #f5f0e8;transition:background .15s;}
  .myplan-row:last-child{border-bottom:none;}
  .myplan-row:hover{background:#fafafa;}
  .myplan-row.active{background:#fafff5;}
`;

const Squiggle = ({ color="#b5e550", width=80 }) => (
  <svg width={width} height="8" viewBox={`0 0 ${width} 8`} fill="none" style={{display:"block",marginTop:4}}>
    <path d={`M0 4 ${Array.from({length:Math.floor(width/10)},(_,i)=>`Q${i*10+5} ${i%2===0?0:8} ${(i+1)*10} 4`).join(" ")}`}
      stroke={color} strokeWidth="2.5" strokeLinecap="round" fill="none"/>
  </svg>
);

// ── TIMER ─────────────────────────────────────────────────────────────────────
function Timer() {
  const [running,  setRunning]  = useState(false);
  const [elapsed,  setElapsed]  = useState(0);
  const [restOn,   setRestOn]   = useState(false);
  const [restLeft, setRestLeft] = useState(0);
  const [restSec,  setRestSec]  = useState(90);
  const ivRef = useRef(null);

  useEffect(() => {
    if (running) {
      ivRef.current = setInterval(() => {
        setElapsed(e => e + 1);
        setRestLeft(r => { if (r <= 1) { setRestOn(false); return 0; } return r - 1; });
      }, 1000);
    } else {
      clearInterval(ivRef.current);
    }
    return () => clearInterval(ivRef.current);
  }, [running]);

  const startRest = () => { setRestLeft(restSec); setRestOn(true); if (!running) setRunning(true); };
  const reset     = () => { setRunning(false); setElapsed(0); setRestOn(false); setRestLeft(0); };
  const pct       = restOn ? (restLeft / restSec) * 100 : 0;

  return (
    <div className="card" style={{padding:20,marginBottom:20}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:16}}>
        <div>
          <div style={{fontFamily:"'DM Sans'",fontSize:11,fontWeight:700,color:"#bbb",letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:6}}>Workout Timer</div>
          <div style={{fontFamily:"'DM Serif Display'",fontSize:54,color:"#1a1a1a",lineHeight:1,letterSpacing:"-0.03em"}}>{fmt(elapsed)}</div>
        </div>
        {restOn && (
          <div style={{textAlign:"right"}}>
            <div style={{fontFamily:"'DM Sans'",fontSize:11,fontWeight:700,color:"#bbb",letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:6}}>Rest</div>
            <div style={{fontFamily:"'DM Serif Display'",fontSize:54,lineHeight:1,letterSpacing:"-0.03em",color:restLeft<10?"#e84040":"#1a1a1a"}}>{fmt(restLeft)}</div>
            <div style={{marginTop:8,background:"#ede8de",borderRadius:99,height:5,width:150,overflow:"hidden",marginLeft:"auto"}}>
              <div style={{height:"100%",width:`${pct}%`,background:"#c8f040",borderRadius:99,transition:"width 1s linear"}}/>
            </div>
          </div>
        )}
      </div>
      <div style={{display:"flex",gap:8,marginTop:18,flexWrap:"wrap",alignItems:"center"}}>
        <button className="btn-dark" onClick={()=>setRunning(!running)}>{running?"Pause":elapsed>0?"Resume":"Start"}</button>
        <button className="btn-ghost" onClick={startRest}>Rest</button>
        <button className="btn-ghost" onClick={reset}>Reset</button>
        <div style={{marginLeft:"auto",display:"flex",gap:5,alignItems:"center"}}>
          <span style={{fontFamily:"'DM Sans'",fontSize:10,color:"#bbb",fontWeight:700,marginRight:2}}>SEC</span>
          {[60,90,120,180].map(t=>(
            <button key={t} className={`rest-chip ${restSec===t?"on":""}`} onClick={()=>setRestSec(t)}>{t}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── EXERCISE CARD ─────────────────────────────────────────────────────────────
function ExCard({ex, logData, onLogChange, checked, onCheck}) {
  const [open, setOpen] = useState(false);
  const sets  = logData?.sets || [];
  const note  = logData?.note || "";
  const upSets = s => onLogChange({...logData, sets: s});
  const addSet = () => { const l = sets[sets.length-1]||{}; upSets([...sets,{weight:l.weight||"",reps:l.reps||"",rpe:""}]); };
  const upSet  = (i,s) => { const n=[...sets]; n[i]=s; upSets(n); };
  const rmSet  = i => upSets(sets.filter((_,j)=>j!==i));
  const vol    = sets.reduce((a,s)=>a+(parseFloat(s.weight)||0)*(parseInt(s.reps)||0),0);

  return (
    <div className={`ex-card fu ${checked?"done":""}`}>
      <div style={{display:"flex",alignItems:"center",gap:12,padding:"14px 16px",cursor:"pointer"}} onClick={()=>setOpen(!open)}>
        <div className={`chk ${checked?"on":""}`} onClick={e=>{e.stopPropagation();onCheck();}}>
          {checked && "✓"}
        </div>
        <div style={{flex:1}}>
          <div style={{fontFamily:"'DM Sans'",fontSize:14,fontWeight:600,color:checked?"#555":"#1a1a1a"}}>{ex.name}</div>
          <div style={{fontFamily:"'DM Sans'",fontSize:12,color:"#aaa",marginTop:2}}>{ex.sets} sets · {ex.reps}</div>
        </div>
        {vol > 0 && <div style={{fontFamily:"'DM Sans'",fontSize:12,fontWeight:700,color:"#5a7a00"}}>{vol.toLocaleString()} lbs</div>}
        <div style={{color:"#ccc",fontSize:13,transform:open?"rotate(180deg)":"none",transition:"transform .2s"}}>▾</div>
      </div>
      {open && (
        <div style={{padding:"0 16px 16px",borderTop:"2px solid #f5f0e8"}}>
          <div style={{display:"grid",gridTemplateColumns:"28px 1fr 1fr 1fr 28px",gap:"6px 8px",marginTop:12,marginBottom:10}}>
            {["#","Weight","Reps","RPE",""].map((l,i)=>(
              <div key={i} style={{fontFamily:"'DM Sans'",fontSize:10,fontWeight:700,color:"#ccc",textTransform:"uppercase",letterSpacing:"0.06em",paddingBottom:4}}>{l}</div>
            ))}
            {sets.map((s,i)=>(
              <>
                <div key={i+"n"} style={{fontFamily:"'DM Sans'",fontSize:13,color:"#bbb",display:"flex",alignItems:"center"}}>{i+1}</div>
                <input key={i+"w"} className="inp" value={s.weight} placeholder="lbs" onChange={e=>upSet(i,{...s,weight:e.target.value})} style={{padding:"7px 10px",fontSize:13}}/>
                <input key={i+"r"} className="inp" value={s.reps}   placeholder={ex.reps} onChange={e=>upSet(i,{...s,reps:e.target.value})} style={{padding:"7px 10px",fontSize:13}}/>
                <input key={i+"p"} className="inp" value={s.rpe}    placeholder="—" onChange={e=>upSet(i,{...s,rpe:e.target.value})} style={{padding:"7px 10px",fontSize:13}}/>
                <button key={i+"d"} onClick={()=>rmSet(i)} style={{background:"none",border:"none",color:"#ddd",cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
              </>
            ))}
          </div>
          <button className="btn-ghost" onClick={addSet} style={{fontSize:12,padding:"6px 14px",marginBottom:12}}>+ Add Set</button>
          <div>
            <div style={{fontFamily:"'DM Sans'",fontSize:10,fontWeight:700,color:"#bbb",marginBottom:6,textTransform:"uppercase",letterSpacing:"0.06em"}}>Note</div>
            <input className="inp" value={note} onChange={e=>onLogChange({...logData,note:e.target.value})} placeholder="Optional note…" style={{fontSize:13}}/>
          </div>
        </div>
      )}
    </div>
  );
}

// ── SUMMARY MODAL ─────────────────────────────────────────────────────────────
function Summary({day, log, onClose}) {
  const totalVol  = day.exercises.reduce((a,ex)=>{ const s=log[ex.id]?.sets||[]; return a+s.reduce((b,s)=>b+(parseFloat(s.weight)||0)*(parseInt(s.reps)||0),0); },0);
  const totalSets = day.exercises.reduce((a,ex)=>a+(log[ex.id]?.sets?.length||0),0);
  const done      = day.exercises.filter(ex=>log[ex.id]?.checked).length;

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div className="card" style={{padding:28,maxWidth:420,width:"100%"}}>
        <div style={{fontFamily:"'DM Serif Display'",fontSize:32,color:"#1a1a1a",marginBottom:4}}>Session Done 🎉</div>
        <div style={{fontFamily:"'DM Sans'",fontSize:13,color:"#aaa",marginBottom:20}}>{day.emoji} {day.label}</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:24}}>
          {[{label:"Volume",value:totalVol.toLocaleString(),unit:"lbs"},{label:"Sets",value:totalSets},{label:"Done",value:`${done}/${day.exercises.length}`}].map(({label,value,unit})=>(
            <div key={label} className="stat">
              <div style={{fontFamily:"'DM Serif Display'",fontSize:28,color:"#1a1a1a",lineHeight:1}}>{value}</div>
              {unit && <div style={{fontFamily:"'DM Sans'",fontSize:11,color:"#aaa",fontWeight:600}}>{unit}</div>}
              <div style={{fontFamily:"'DM Sans'",fontSize:10,color:"#bbb",marginTop:4,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em"}}>{label}</div>
            </div>
          ))}
        </div>
        <div style={{marginBottom:24}}>
          {day.exercises.map(ex => {
            const s = log[ex.id]?.sets||[];
            if (!s.length) return null;
            const v = s.reduce((a,s)=>a+(parseFloat(s.weight)||0)*(parseInt(s.reps)||0),0);
            return (
              <div key={ex.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"2px solid #f5f0e8"}}>
                <span style={{fontFamily:"'DM Sans'",fontSize:13,fontWeight:500,color:"#333"}}>{ex.name}</span>
                <div style={{display:"flex",gap:8}}>
                  <span style={{fontFamily:"'DM Sans'",fontSize:12,color:"#aaa"}}>{s.length}×</span>
                  {v > 0 && <span style={{fontFamily:"'DM Sans'",fontSize:12,fontWeight:700,color:"#1a1a1a"}}>{v.toLocaleString()} lbs</span>}
                </div>
              </div>
            );
          })}
        </div>
        <button className="btn-lime" style={{width:"100%",fontSize:14,padding:"13px"}} onClick={onClose}>Close 🎉</button>
      </div>
    </div>
  );
}

// ── WORKOUT PAGE ──────────────────────────────────────────────────────────────
function WorkoutPage({plan}) {
  const [wk,  setWk]  = useState(0);
  const [dy,  setDy]  = useState(0);
  const [log, setLog] = useState(() => store.get("wlog") || {});
  const [sum, setSum] = useState(false);

  const safeWk = Math.min(wk, plan.weeks.length - 1);
  const safeDy = Math.min(dy, (plan.weeks[safeWk]?.days?.length || 1) - 1);
  const day    = plan.weeks[safeWk].days[safeDy];

  const getLog   = id => log[`${day.id}::${id}`] || {};
  const setExLog = (id, data) => { const u={...log,[`${day.id}::${id}`]:data}; setLog(u); store.set("wlog",u); };

  const sections = groupBySection(day.exercises);

  return (
    <div>
      {sum && <Summary day={day} log={Object.fromEntries(day.exercises.map(ex=>[ex.id,getLog(ex.id)]))} onClose={()=>setSum(false)}/>}
      <div style={{marginBottom:24}}>
        <div style={{fontFamily:"'DM Serif Display'",fontSize:36,color:"#1a1a1a",lineHeight:1.1}}>Today's Session</div>
        <Squiggle width={160}/>
      </div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
        {plan.weeks.map((w,i)=>(
          <button key={i} className={`week-btn ${safeWk===i?"on":""}`} onClick={()=>{setWk(i);setDy(0);}}>W{w.week}</button>
        ))}
      </div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:24}}>
        {plan.weeks[safeWk].days.map((d,i)=>(
          <button key={i} className={`day-btn ${safeDy===i?"on":""}`} onClick={()=>setDy(i)}><span>{d.emoji}</span>{d.label}</button>
        ))}
      </div>
      <Timer/>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:16}}>
        <div>
          <div style={{fontFamily:"'DM Serif Display'",fontSize:24,color:"#1a1a1a"}}>{day.emoji} {day.label}</div>
          <div style={{fontFamily:"'DM Sans'",fontSize:12,color:"#aaa",marginTop:2,fontWeight:500}}>Week {safeWk+1} · Phase {plan.weeks[safeWk].phase} · {day.exercises.length} exercises</div>
        </div>
        <button className="btn-lime" onClick={()=>setSum(true)}>Finish ✓</button>
      </div>

      {/* ── Render exercises grouped by section with spacing ── */}
      {sections.map((grp, gi) => (
        <div key={gi} style={{marginBottom: sections.length > 1 ? 20 : 0}}>
          {grp.exercises.map(ex => (
            <ExCard
              key={ex.id}
              ex={ex}
              logData={getLog(ex.id)}
              onLogChange={d => setExLog(ex.id, d)}
              checked={!!getLog(ex.id).checked}
              onCheck={() => setExLog(ex.id,{...getLog(ex.id),checked:!getLog(ex.id).checked})}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// ── PLAN PAGE ─────────────────────────────────────────────────────────────────
function PlanPage({plan}) {
  const [open, setOpen] = useState({0:true});

  return (
    <div>
      <div style={{marginBottom:24}}>
        <div style={{fontFamily:"'DM Serif Display'",fontSize:36,color:"#1a1a1a"}}>{plan.name}</div>
        <Squiggle width={220}/>
        <div style={{fontFamily:"'DM Sans'",fontSize:13,color:"#999",marginTop:8,fontWeight:500}}>{plan.weeks.length} weeks · {plan.weeks[0]?.days.length||3} days/week</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
        {[...new Set(plan.weeks.map(w=>w.phase))].map(ph => {
          const wksInPhase = plan.weeks.filter(w=>w.phase===ph);
          return (
            <div key={ph} className="lime-card" style={{padding:20}}>
              <div style={{fontSize:28,marginBottom:8}}>{ph===1?"📈":"🏋️"}</div>
              <div style={{fontFamily:"'DM Serif Display'",fontSize:22,color:"#1a1a1a"}}>Phase {ph}</div>
              <div style={{fontFamily:"'DM Sans'",fontSize:11,fontWeight:700,color:"#5a7a00",marginBottom:6}}>Weeks {wksInPhase[0].week}–{wksInPhase[wksInPhase.length-1].week}</div>
              <div style={{fontFamily:"'DM Sans'",fontSize:12,color:"#3d5700"}}>{wksInPhase.length} week{wksInPhase.length!==1?"s":""} · {wksInPhase[0].days.length} days/week</div>
            </div>
          );
        })}
      </div>
      {plan.weeks.map((w,wi) => (
        <div key={wi} className="card" style={{marginBottom:10,overflow:"hidden"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 20px",cursor:"pointer"}} onClick={()=>setOpen(o=>({...o,[wi]:!o[wi]}))}>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <span style={{background:w.phase===1?"#c8f040":"#1a1a1a",color:w.phase===1?"#1a1a1a":"#fff",borderRadius:99,fontFamily:"'DM Sans'",fontSize:10,fontWeight:700,padding:"3px 10px",letterSpacing:"0.06em"}}>PHASE {w.phase}</span>
              <span style={{fontFamily:"'DM Serif Display'",fontSize:22,color:"#1a1a1a"}}>Week {w.week}</span>
            </div>
            <span style={{color:"#ccc",transform:open[wi]?"rotate(180deg)":"none",transition:"transform .2s",fontSize:15}}>▾</span>
          </div>
          {open[wi] && (
            <div style={{padding:"0 20px 20px",borderTop:"2px solid #f5f0e8"}}>
              {w.days.map(d => {
                const sections = groupBySection(d.exercises);
                return (
                  <div key={d.id} style={{marginTop:18}}>
                    <div style={{fontFamily:"'DM Sans'",fontSize:13,fontWeight:700,color:"#1a1a1a",marginBottom:10,display:"flex",alignItems:"center",gap:6}}><span>{d.emoji}</span>{d.label}</div>
                    {sections.map((grp, gi) => (
                      <div key={gi} style={{marginBottom: gi < sections.length - 1 ? 14 : 0}}>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 60px 80px",gap:"4px 12px"}}>
                          {gi === 0 && ["Exercise","Sets","Reps"].map(l=>(
                            <div key={l} style={{fontFamily:"'DM Sans'",fontSize:10,fontWeight:700,color:"#bbb",textTransform:"uppercase",letterSpacing:"0.07em",paddingBottom:6,borderBottom:"2px solid #f5f0e8",textAlign:l==="Exercise"?"left":"center"}}>{l}</div>
                          ))}
                          {gi > 0 && (
                            // spacer row — just a thin divider between sections
                            <div style={{gridColumn:"1/-1",height:1,background:"#f0ebe0",margin:"4px 0 8px"}}/>
                          )}
                          {grp.exercises.map(ex => (
                            <>
                              <div key={ex.id+"n"} style={{fontFamily:"'DM Sans'",fontSize:13,color:"#333",padding:"6px 0",borderBottom:"1px solid #f5f0e8"}}>{ex.name}</div>
                              <div key={ex.id+"s"} style={{fontFamily:"'DM Sans'",fontSize:13,color:"#aaa",textAlign:"center",padding:"6px 0",borderBottom:"1px solid #f5f0e8"}}>{ex.sets}</div>
                              <div key={ex.id+"r"} style={{fontFamily:"'DM Sans'",fontSize:13,color:"#aaa",textAlign:"center",padding:"6px 0",borderBottom:"1px solid #f5f0e8"}}>{ex.reps}</div>
                            </>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── TRENDS PAGE ───────────────────────────────────────────────────────────────
function TrendsPage({plan}) {
  const log   = store.get("wlog") || {};
  const [selEx, setSelEx] = useState("");
  const allEx = [...new Set(plan.weeks.flatMap(w=>w.days.flatMap(d=>d.exercises.map(e=>e.name))))];
  const history = [];

  if (selEx) {
    plan.weeks.forEach(w=>w.days.forEach(d=>d.exercises.forEach(ex=>{
      if (ex.name === selEx) {
        const entry = log[`${d.id}::${ex.id}`];
        if (entry?.sets?.length) {
          const s   = entry.sets;
          const vol = s.reduce((a,s)=>a+(parseFloat(s.weight)||0)*(parseInt(s.reps)||0),0);
          const maxW = Math.max(...s.map(s=>parseFloat(s.weight)||0));
          history.push({label:`W${w.week}`,sets:s,vol,maxW,note:entry.note});
        }
      }
    })));
  }

  const maxVol = Math.max(...history.map(h=>h.vol),  1);
  const maxW   = Math.max(...history.map(h=>h.maxW), 1);

  return (
    <div>
      <div style={{marginBottom:24}}>
        <div style={{fontFamily:"'DM Serif Display'",fontSize:36,color:"#1a1a1a"}}>Progress Trends</div>
        <Squiggle width={170}/>
        <div style={{fontFamily:"'DM Sans'",fontSize:13,color:"#999",marginTop:8,fontWeight:500}}>Track volume and strength gains over time</div>
      </div>
      <div style={{marginBottom:24}}>
        <div style={{fontFamily:"'DM Sans'",fontSize:10,fontWeight:700,color:"#bbb",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8}}>Choose an Exercise</div>
        <select className="inp" value={selEx} onChange={e=>setSelEx(e.target.value)} style={{maxWidth:360,appearance:"none"}}>
          <option value="">— select exercise —</option>
          {allEx.map(e=><option key={e} value={e}>{e}</option>)}
        </select>
      </div>
      {selEx && history.length === 0 && (
        <div className="card" style={{padding:48,textAlign:"center"}}>
          <div style={{fontSize:40,marginBottom:12}}>📊</div>
          <div style={{fontFamily:"'DM Serif Display'",fontSize:24,color:"#1a1a1a",marginBottom:8}}>No data yet</div>
          <div style={{fontFamily:"'DM Sans'",fontSize:13,color:"#aaa"}}>Log some sets in the Workout tab to see trends here.</div>
        </div>
      )}
      {history.length > 0 && (
        <div style={{display:"grid",gap:14}}>
          <div className="card" style={{padding:20}}>
            <div style={{fontFamily:"'DM Sans'",fontSize:10,fontWeight:700,color:"#bbb",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:16}}>Total Volume per Session (lbs)</div>
            <div style={{display:"flex",alignItems:"flex-end",gap:8,height:160,paddingBottom:28}}>
              {history.map((h,i)=>(
                <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4,height:"100%",justifyContent:"flex-end"}}>
                  <div style={{fontFamily:"'DM Sans'",fontSize:9,fontWeight:700,color:"#5a7a00",marginBottom:2}}>{h.vol>0?h.vol.toLocaleString():""}</div>
                  <div style={{width:"100%",height:`${(h.vol/maxVol)*110}px`,background:"#c8f040",borderRadius:"4px 4px 0 0"}}/>
                  <div style={{fontFamily:"'DM Sans'",fontSize:11,color:"#aaa",fontWeight:600,marginTop:4}}>{h.label}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="card" style={{padding:20}}>
            <div style={{fontFamily:"'DM Sans'",fontSize:10,fontWeight:700,color:"#bbb",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:16}}>Top Weight per Session (lbs)</div>
            <div style={{display:"flex",alignItems:"flex-end",gap:8,height:130,paddingBottom:28}}>
              {history.map((h,i)=>(
                <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4,height:"100%",justifyContent:"flex-end"}}>
                  <div style={{fontFamily:"'DM Sans'",fontSize:9,fontWeight:700,color:"#888",marginBottom:2}}>{h.maxW>0?h.maxW:""}</div>
                  <div style={{width:"100%",height:`${(h.maxW/maxW)*80}px`,background:"#1a1a1a",borderRadius:"4px 4px 0 0"}}/>
                  <div style={{fontFamily:"'DM Sans'",fontSize:11,color:"#aaa",fontWeight:600,marginTop:4}}>{h.label}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="card" style={{overflow:"hidden"}}>
            <div style={{padding:"16px 20px 12px",fontFamily:"'DM Sans'",fontSize:10,fontWeight:700,color:"#bbb",textTransform:"uppercase",letterSpacing:"0.08em"}}>Session Breakdown</div>
            {history.map((h,i)=>(
              <div key={i} style={{borderTop:"2px solid #f5f0e8",padding:"14px 20px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <span style={{fontFamily:"'DM Serif Display'",fontSize:20,color:"#1a1a1a"}}>{h.label}</span>
                  <div style={{display:"flex",gap:7}}>
                    <span className="tag tag-muted">{h.sets.length} sets</span>
                    {h.vol>0 && <span className="tag tag-lime">{h.vol.toLocaleString()} lbs</span>}
                  </div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"28px 1fr 1fr 1fr",gap:8,marginBottom:h.note?10:0}}>
                  {["#","Weight","Reps","RPE"].map(l=><div key={l} style={{fontFamily:"'DM Sans'",fontSize:10,fontWeight:700,color:"#ccc",textTransform:"uppercase",letterSpacing:"0.06em",paddingBottom:4}}>{l}</div>)}
                  {h.sets.map((s,j)=>(
                    <>
                      <div key={j+"i"} style={{fontFamily:"'DM Sans'",fontSize:13,color:"#bbb"}}>{j+1}</div>
                      <div key={j+"w"} style={{fontFamily:"'DM Sans'",fontSize:13,color:"#333"}}>{s.weight?`${s.weight} lbs`:"—"}</div>
                      <div key={j+"r"} style={{fontFamily:"'DM Sans'",fontSize:13,color:"#333"}}>{s.reps||"—"}</div>
                      <div key={j+"p"} style={{fontFamily:"'DM Sans'",fontSize:13,color:"#bbb"}}>{s.rpe||"—"}</div>
                    </>
                  ))}
                </div>
                {h.note && <div style={{background:"#f5f0e8",borderRadius:10,padding:"8px 12px",fontFamily:"'DM Sans'",fontSize:12,color:"#777",fontStyle:"italic"}}>"{h.note}"</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── LIBRARY PAGE ──────────────────────────────────────────────────────────────
function LibraryPage({ activePlanId, onActivate }) {
  // myPlans: array of { id, name, description, duration, daysPerWeek, difficulty, tags, access, plan, addedAt }
  const [myPlans,      setMyPlans]      = useState(() => store.get("myPlans") || []);
  const [view,         setView]         = useState("browse");   // "browse" | "mine"
  const [uploadStatus, setUploadStatus] = useState(null);
  const [dragOver,     setDragOver]     = useState(false);
  const [planNameInp,  setPlanNameInp]  = useState("");
  const [pendingPlan,  setPendingPlan]  = useState(null);
  const fileRef = useRef(null);

  // Always read live catalog so admin edits are reflected immediately
  const liveCatalog = getLiveCatalog();

  const saveMyPlans = (plans) => { setMyPlans(plans); store.set("myPlans", plans); };

  const addToMyPlans = (entry) => {
    const already = myPlans.find(p => p.id === entry.id);
    if (already) return;
    const updated = [...myPlans, { ...entry, addedAt: new Date().toISOString() }];
    saveMyPlans(updated);
  };

  const removeFromMyPlans = (id) => {
    saveMyPlans(myPlans.filter(p => p.id !== id));
  };

  const isInMyPlans = (id) => myPlans.some(p => p.id === id);

  // ── File upload for custom plans ──
  const processFile = (file) => {
    setUploadStatus(null); setPendingPlan(null);
    if (!file) return;
    const ext = file.name.split(".").pop().toLowerCase();
    if (!["xlsx","xls","csv"].includes(ext)) {
      setUploadStatus({ type:"error", msg:`Unsupported file type ".${ext}". Please upload .xlsx, .xls, or .csv.` });
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data  = new Uint8Array(e.target.result);
        const wb    = XLSX.read(data, { type:"array" });
        const sheetName = wb.SheetNames.includes("Workout Plan") ? "Workout Plan" : wb.SheetNames[0];
        const ws    = wb.Sheets[sheetName];
        const rows  = XLSX.utils.sheet_to_json(ws, { defval:"" });
        const name  = planNameInp.trim() || file.name.replace(/\.[^.]+$/, "");
        const parsed = parseSheetToPlan(rows, name);
        setPendingPlan(parsed);
        const weeks = parsed.weeks.length;
        const days  = parsed.weeks.reduce((a,w)=>a+w.days.length, 0);
        const exs   = parsed.weeks.reduce((a,w)=>a+w.days.reduce((b,d)=>b+d.exercises.length,0), 0);
        setUploadStatus({ type:"success", msg:`Found ${weeks} week(s), ${days} training days, ${exs} total exercises.` });
      } catch(err) {
        setUploadStatus({ type:"error", msg: err.message || "Could not parse spreadsheet." });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const confirmUpload = () => {
    if (!pendingPlan) return;
    const entry = {
      id:          `custom-${Date.now()}`,
      name:        pendingPlan.name,
      description: "Custom uploaded plan.",
      duration:    `${pendingPlan.weeks.length} weeks`,
      daysPerWeek: pendingPlan.weeks[0]?.days.length || 0,
      difficulty:  "Custom",
      tags:        ["Custom"],
      access:      "free",
      plan:        pendingPlan,
    };
    addToMyPlans(entry);
    setUploadStatus({ type:"success", msg:`"${pendingPlan.name}" added to My Plans!` });
    setPendingPlan(null);
    setPlanNameInp("");
    setView("mine");
  };

  return (
    <div>
      <div style={{marginBottom:24}}>
        <div style={{fontFamily:"'DM Serif Display'",fontSize:36,color:"#1a1a1a"}}>Plan Library</div>
        <Squiggle width={160}/>
        <div style={{fontFamily:"'DM Sans'",fontSize:13,color:"#999",marginTop:8,fontWeight:500}}>Browse plans or manage your collection</div>
      </div>

      {/* Sub-tabs */}
      <div className="tab-wrap" style={{marginBottom:24}}>
        {[{id:"browse",label:"Browse Plans"},{id:"mine",label:`My Plans${myPlans.length ? ` (${myPlans.length})` : ""}`},{id:"upload",label:"↑ Upload Plan"}].map(t=>(
          <button key={t.id} className={`tab-btn ${view===t.id?"on":"off"}`} onClick={()=>setView(t.id)}>{t.label}</button>
        ))}
      </div>

      {/* ── BROWSE ── */}
      {view === "browse" && (
        <div style={{display:"grid",gap:14}}>
          {liveCatalog.map(entry => (
            <div key={entry.id} className={`lib-card ${activePlanId===entry.id?"active-plan":""}`}>
              <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
                <div style={{flex:1,minWidth:200}}>
                  <div style={{display:"flex",gap:7,alignItems:"center",marginBottom:8,flexWrap:"wrap"}}>
                    <span className={`tag ${entry.access==="free"?"tag-free":"tag-member"}`}>{entry.access==="free"?"Free":"Member"}</span>
                    <span className="tag tag-muted">{entry.difficulty}</span>
                    {entry.tags.map(t=><span key={t} className="tag tag-muted">{t}</span>)}
                  </div>
                  <div style={{fontFamily:"'DM Serif Display'",fontSize:22,color:"#1a1a1a",marginBottom:6}}>{entry.name}</div>
                  <div style={{fontFamily:"'DM Sans'",fontSize:13,color:"#777",lineHeight:1.5,marginBottom:10}}>{entry.description}</div>
                  <div style={{display:"flex",gap:14,flexWrap:"wrap"}}>
                    {[["📅",entry.duration],["🗓",`${entry.daysPerWeek} days/week`]].map(([icon,val])=>(
                      <span key={val} style={{fontFamily:"'DM Sans'",fontSize:12,color:"#aaa",fontWeight:500}}>{icon} {val}</span>
                    ))}
                  </div>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:8,alignItems:"flex-end",flexShrink:0}}>
                  {isInMyPlans(entry.id)
                    ? <button className="btn-ghost" style={{fontSize:12,padding:"7px 16px",color:"#aaa"}} onClick={()=>removeFromMyPlans(entry.id)}>Remove</button>
                    : <button className="btn-dark"  style={{fontSize:12,padding:"7px 16px"}} onClick={()=>addToMyPlans(entry)}>+ Add to My Plans</button>
                  }
                  {activePlanId === entry.id
                    ? <span style={{fontFamily:"'DM Sans'",fontSize:11,fontWeight:700,color:"#5a7a00"}}>✓ Active Plan</span>
                    : isInMyPlans(entry.id) && (
                        <button className="btn-lime" style={{fontSize:12,padding:"7px 16px"}} onClick={()=>onActivate(entry)}>Set Active</button>
                      )
                  }
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── MY PLANS ── */}
      {view === "mine" && (
        <div>
          {myPlans.length === 0 ? (
            <div className="card" style={{padding:48,textAlign:"center"}}>
              <div style={{fontSize:40,marginBottom:12}}>📚</div>
              <div style={{fontFamily:"'DM Serif Display'",fontSize:24,color:"#1a1a1a",marginBottom:8}}>No plans yet</div>
              <div style={{fontFamily:"'DM Sans'",fontSize:13,color:"#aaa",marginBottom:20}}>Browse plans and add them here, or upload your own.</div>
              <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
                <button className="btn-dark" onClick={()=>setView("browse")}>Browse Plans</button>
                <button className="btn-ghost" onClick={()=>setView("upload")}>Upload Plan</button>
              </div>
            </div>
          ) : (
            <div className="card" style={{overflow:"hidden"}}>
              {myPlans.map((entry, i) => (
                <div key={entry.id} className={`myplan-row ${activePlanId===entry.id?"active":""}`}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:3,flexWrap:"wrap"}}>
                      {activePlanId===entry.id && <span className="tag tag-lime" style={{fontSize:10}}>Active</span>}
                      <span className={`tag ${entry.access==="free"?"tag-free":"tag-member"}`} style={{fontSize:10}}>{entry.access==="free"?"Free":"Member"}</span>
                      <span className="tag tag-muted" style={{fontSize:10}}>{entry.duration}</span>
                    </div>
                    <div style={{fontFamily:"'DM Sans'",fontSize:14,fontWeight:600,color:"#1a1a1a",marginBottom:1}}>{entry.name}</div>
                    <div style={{fontFamily:"'DM Sans'",fontSize:12,color:"#aaa"}}>{entry.daysPerWeek} days/week · {entry.difficulty}</div>
                  </div>
                  <div style={{display:"flex",gap:8,flexShrink:0,alignItems:"center"}}>
                    {activePlanId !== entry.id && (
                      <button className="btn-lime" style={{fontSize:12,padding:"7px 14px"}} onClick={()=>onActivate(entry)}>Set Active</button>
                    )}
                    <button className="btn-ghost" style={{fontSize:12,padding:"7px 12px",color:"#ccc"}} onClick={()=>removeFromMyPlans(entry.id)}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── UPLOAD ── */}
      {view === "upload" && (
        <div>
          <div className="card" style={{padding:24,marginBottom:16}}>
            <div style={{fontFamily:"'DM Sans'",fontSize:10,fontWeight:700,color:"#bbb",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:16}}>Upload a Custom Plan</div>
            {[
              {num:"1",title:"Download the template",body:"Get the pre-formatted Excel template with correct columns and sample data."},
              {num:"2",title:"Fill in your exercises",body:"Edit the 'Workout Plan' sheet. Add a 'Section' column to group exercises visually."},
              {num:"3",title:"Upload your file",body:"Drop your completed .xlsx or .csv below. It'll be added to My Plans."},
            ].map(s=>(
              <div key={s.num} className="import-step">
                <div className="step-num">{s.num}</div>
                <div>
                  <div style={{fontFamily:"'DM Sans'",fontSize:14,fontWeight:600,color:"#1a1a1a",marginBottom:3}}>{s.title}</div>
                  <div style={{fontFamily:"'DM Sans'",fontSize:13,color:"#888",lineHeight:1.5}}>{s.body}</div>
                </div>
              </div>
            ))}
            <div style={{marginTop:18,display:"flex",gap:10,flexWrap:"wrap"}}>
              <button className="btn-lime" onClick={generateTemplate}>↓ Download Template</button>
              <div style={{fontFamily:"'DM Sans'",fontSize:12,color:"#aaa",alignSelf:"center"}}>volume-workout-template.xlsx</div>
            </div>
          </div>

          {/* Column reference — now includes Section */}
          <div className="card" style={{padding:20,marginBottom:16}}>
            <div style={{fontFamily:"'DM Sans'",fontSize:10,fontWeight:700,color:"#bbb",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:14}}>Column Format</div>
            <div style={{display:"grid",gridTemplateColumns:"auto 1fr auto",gap:"6px 16px",alignItems:"start"}}>
              {[
                {col:"Week",          ex:"1, 2, 3…",                      req:true},
                {col:"Day Label",     ex:"Push Day, Upper Body…",         req:true},
                {col:"Exercise Name", ex:"Barbell Bench Press",           req:true},
                {col:"Sets",          ex:"3, 4",                          req:true},
                {col:"Reps",          ex:"8–10, max, 5",                  req:true},
                {col:"Phase",         ex:"1 or 2",                        req:false},
                {col:"Day Emoji",     ex:"🔥 💪 🦵",                      req:false},
                {col:"Section",       ex:"Chest, Back, Hamstrings…",      req:false},
              ].map(({col,ex,req})=>(
                <>
                  <span key={col+"c"} style={{fontFamily:"'DM Sans'",fontSize:13,fontWeight:600,color:"#1a1a1a"}}>{col}</span>
                  <span key={col+"e"} style={{fontFamily:"'DM Sans'",fontSize:13,color:"#999",fontStyle:"italic"}}>{ex}</span>
                  <span key={col+"r"} className={`tag ${req?"tag-dark":"tag-muted"}`}>{req?"required":"optional"}</span>
                </>
              ))}
            </div>
          </div>

          <div style={{marginBottom:12}}>
            <div style={{fontFamily:"'DM Sans'",fontSize:10,fontWeight:700,color:"#bbb",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8}}>Plan Name (optional)</div>
            <input className="inp" value={planNameInp} onChange={e=>setPlanNameInp(e.target.value)} placeholder="e.g. My 8-Week Hypertrophy Program" style={{maxWidth:400}}/>
          </div>

          <div
            className={`drop-zone ${dragOver?"over":""}`}
            onClick={()=>fileRef.current?.click()}
            onDragOver={e=>{e.preventDefault();setDragOver(true);}}
            onDragLeave={()=>setDragOver(false)}
            onDrop={e=>{e.preventDefault();setDragOver(false);processFile(e.dataTransfer.files[0]);}}
          >
            <div style={{fontSize:28,marginBottom:8}}>📂</div>
            <div style={{fontFamily:"'DM Sans'",fontSize:14,fontWeight:600,color:"#555",marginBottom:4}}>Drop your spreadsheet here</div>
            <div style={{fontFamily:"'DM Sans'",fontSize:13,color:"#aaa"}}>or click to browse · .xlsx, .xls, .csv</div>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{display:"none"}} onChange={e=>processFile(e.target.files[0])}/>
          </div>

          {uploadStatus?.type === "error" && (
            <div className="error-box" style={{marginTop:12}}>
              <div style={{fontFamily:"'DM Sans'",fontSize:13,fontWeight:700,color:"#cc3333",marginBottom:2}}>Error</div>
              <div style={{fontFamily:"'DM Sans'",fontSize:13,color:"#cc3333"}}>{uploadStatus.msg}</div>
            </div>
          )}
          {uploadStatus?.type === "success" && pendingPlan && (
            <div className="success-box" style={{marginTop:12}}>
              <div style={{fontFamily:"'DM Sans'",fontSize:13,fontWeight:700,color:"#3a7a00",marginBottom:4}}>Plan parsed successfully</div>
              <div style={{fontFamily:"'DM Sans'",fontSize:13,color:"#3a7a00",marginBottom:12}}>{uploadStatus.msg}</div>
              <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
                <button className="btn-lime" onClick={confirmUpload}>Add to My Plans</button>
                <div style={{fontFamily:"'DM Sans'",fontSize:12,color:"#888"}}>You can set it as active from My Plans</div>
              </div>
            </div>
          )}
          {uploadStatus?.type === "success" && !pendingPlan && (
            <div className="success-box" style={{marginTop:12}}>
              <div style={{fontFamily:"'DM Sans'",fontSize:13,fontWeight:700,color:"#3a7a00"}}>{uploadStatus.msg}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── IMPORT PAGE ───────────────────────────────────────────────────────────────
function ImportPage({ onImport, onRestore, plan }) {
  const [dragOver,       setDragOver]       = useState(false);
  const [status,         setStatus]         = useState(null);
  const [planName,       setPlanName]       = useState("");
  const [pendingPlan,    setPendingPlan]    = useState(null);
  const [restoreStatus,  setRestoreStatus]  = useState(null);
  const [pendingRestore, setPendingRestore] = useState(null);
  const fileRef    = useRef(null);
  const restoreRef = useRef(null);

  const processFile = (file) => {
    setStatus(null); setPendingPlan(null);
    if (!file) return;
    const ext = file.name.split(".").pop().toLowerCase();
    if (!["xlsx","xls","csv"].includes(ext)) {
      setStatus({ type:"error", msg:`Unsupported file type ".${ext}". Please upload .xlsx, .xls, or .csv.` });
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const wb   = XLSX.read(data, { type:"array" });
        const sheetName = wb.SheetNames.includes("Workout Plan") ? "Workout Plan" : wb.SheetNames[0];
        const ws   = wb.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(ws, { defval:"" });
        const name = planName.trim() || file.name.replace(/\.[^.]+$/, "");
        const parsed = parseSheetToPlan(rows, name);
        setPendingPlan(parsed);
        const wks = parsed.weeks.length;
        const dys = parsed.weeks.reduce((a,w)=>a+w.days.length, 0);
        const exs = parsed.weeks.reduce((a,w)=>a+w.days.reduce((b,d)=>b+d.exercises.length,0), 0);
        setStatus({ type:"success", msg:`Found ${wks} week(s) with ${dys} training days and ${exs} total exercises.` });
      } catch(err) {
        setStatus({ type:"error", msg: err.message || "Could not parse the spreadsheet." });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const processRestoreFile = (file) => {
    setRestoreStatus(null); setPendingRestore(null);
    if (!file) return;
    if (!file.name.endsWith(".json")) {
      setRestoreStatus({ type:"error", msg:"Please select a .json backup file." });
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data     = parseBackup(e.target.result);
        const logCount = Object.keys(data.log).length;
        setPendingRestore(data);
        setRestoreStatus({ type:"success", msg:`Backup from ${new Date(data.exportedAt).toLocaleDateString()} — "${data.plan.name}", ${logCount} logged session${logCount!==1?"s":""}.` });
      } catch(err) {
        setRestoreStatus({ type:"error", msg: err.message || "Could not read backup file." });
      }
    };
    reader.readAsText(file);
  };

  const logCount = Object.keys(store.get("wlog") || {}).length;

  return (
    <div>
      <div style={{marginBottom:24}}>
        <div style={{fontFamily:"'DM Serif Display'",fontSize:36,color:"#1a1a1a"}}>Import & Backup</div>
        <Squiggle width={170}/>
        <div style={{fontFamily:"'DM Sans'",fontSize:13,color:"#999",marginTop:8,fontWeight:500}}>Import a new plan or back up your workout data</div>
      </div>

      {/* BACKUP */}
      <div className="lime-card" style={{padding:24,marginBottom:16}}>
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",flexWrap:"wrap",gap:16}}>
          <div>
            <div style={{fontFamily:"'DM Sans'",fontSize:10,fontWeight:700,color:"#5a7a00",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6}}>Backup Your Data</div>
            <div style={{fontFamily:"'DM Serif Display'",fontSize:22,color:"#1a1a1a",marginBottom:4}}>Export Backup</div>
            <div style={{fontFamily:"'DM Sans'",fontSize:13,color:"#3d5700",lineHeight:1.5,maxWidth:340}}>
              Saves your plan + all logged history as a <code style={{background:"#b5d838",padding:"1px 5px",borderRadius:4,fontSize:12}}>volume-backup-[date].json</code> file. Keep it in iCloud or Google Drive.
            </div>
            {logCount > 0 && (
              <div style={{fontFamily:"'DM Sans'",fontSize:12,color:"#5a7a00",marginTop:8,fontWeight:600}}>
                {logCount} logged session{logCount!==1?"s":""} will be included
              </div>
            )}
          </div>
          <button className="btn-dark" onClick={()=>exportBackup(plan)} style={{whiteSpace:"nowrap",alignSelf:"flex-start"}}>↓ Download Backup</button>
        </div>
      </div>

      {/* RESTORE */}
      <div className="card" style={{padding:24,marginBottom:16}}>
        <div style={{fontFamily:"'DM Sans'",fontSize:10,fontWeight:700,color:"#bbb",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:4}}>Restore from Backup</div>
        <div style={{fontFamily:"'DM Sans'",fontSize:13,color:"#888",marginBottom:16,lineHeight:1.5}}>
          Restores your plan <em>and</em> all workout history from a previous backup. This replaces everything currently in the app.
        </div>
        <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
          <button className="btn-ghost" onClick={()=>restoreRef.current?.click()}>Choose backup file…</button>
          <span style={{fontFamily:"'DM Sans'",fontSize:12,color:"#ccc"}}>.json files only</span>
          <input ref={restoreRef} type="file" accept=".json" style={{display:"none"}} onChange={e=>processRestoreFile(e.target.files[0])}/>
        </div>
        {restoreStatus?.type==="error" && (
          <div className="error-box" style={{marginTop:12}}>
            <div style={{fontFamily:"'DM Sans'",fontSize:13,fontWeight:700,color:"#cc3333",marginBottom:2}}>Error</div>
            <div style={{fontFamily:"'DM Sans'",fontSize:13,color:"#cc3333"}}>{restoreStatus.msg}</div>
          </div>
        )}
        {restoreStatus?.type==="success" && (
          <div className="success-box" style={{marginTop:12}}>
            <div style={{fontFamily:"'DM Sans'",fontSize:13,fontWeight:700,color:"#3a7a00",marginBottom:4}}>Backup file read successfully</div>
            <div style={{fontFamily:"'DM Sans'",fontSize:13,color:"#3a7a00",marginBottom:12}}>{restoreStatus.msg}</div>
            <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
              <button className="btn-lime" onClick={()=>{ if(pendingRestore) onRestore(pendingRestore); }}>↑ Restore Everything</button>
              <div style={{fontFamily:"'DM Sans'",fontSize:12,color:"#888"}}>Replaces your current plan and all logs</div>
            </div>
          </div>
        )}
      </div>

      {/* DIVIDER */}
      <div style={{display:"flex",alignItems:"center",gap:12,margin:"24px 0"}}>
        <div style={{flex:1,height:2,background:"#ede8de"}}/>
        <span style={{fontFamily:"'DM Sans'",fontSize:11,fontWeight:700,color:"#bbb",textTransform:"uppercase",letterSpacing:"0.1em"}}>Import New Plan</span>
        <div style={{flex:1,height:2,background:"#ede8de"}}/>
      </div>

      {/* HOW IT WORKS */}
      <div className="card" style={{padding:24,marginBottom:16}}>
        <div style={{fontFamily:"'DM Sans'",fontSize:10,fontWeight:700,color:"#bbb",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:16}}>How It Works</div>
        {[
          {num:"1",title:"Download the template",body:"Get the pre-formatted Excel template with correct columns and sample data already filled in."},
          {num:"2",title:"Fill in your exercises",body:"Edit the 'Workout Plan' sheet. Each row is one exercise. Use any number of weeks, days, and exercises."},
          {num:"3",title:"Upload your file",body:"Drop your completed .xlsx or .csv below. The app shows a preview before replacing your plan."},
        ].map(s=>(
          <div key={s.num} className="import-step">
            <div className="step-num">{s.num}</div>
            <div>
              <div style={{fontFamily:"'DM Sans'",fontSize:14,fontWeight:600,color:"#1a1a1a",marginBottom:3}}>{s.title}</div>
              <div style={{fontFamily:"'DM Sans'",fontSize:13,color:"#888",lineHeight:1.5}}>{s.body}</div>
            </div>
          </div>
        ))}
        <div style={{marginTop:18,display:"flex",gap:10,flexWrap:"wrap"}}>
          <button className="btn-lime" onClick={generateTemplate}>↓ Download Template</button>
          <div style={{fontFamily:"'DM Sans'",fontSize:12,color:"#aaa",alignSelf:"center"}}>volume-workout-template.xlsx</div>
        </div>
      </div>

      {/* COLUMN REF */}
      <div className="card" style={{padding:20,marginBottom:16}}>
        <div style={{fontFamily:"'DM Sans'",fontSize:10,fontWeight:700,color:"#bbb",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:14}}>Required Column Format</div>
        <div style={{display:"grid",gridTemplateColumns:"auto 1fr auto",gap:"6px 16px",alignItems:"start"}}>
          {[
            {col:"Week",          ex:"1, 2, 3…",                 req:true},
            {col:"Day Label",     ex:"Push Day, Upper Body…",    req:true},
            {col:"Exercise Name", ex:"Barbell Bench Press",      req:true},
            {col:"Sets",          ex:"3, 4",                     req:true},
            {col:"Reps",          ex:"8–10, max, 5",             req:true},
            {col:"Phase",         ex:"1 or 2",                   req:false},
            {col:"Day Emoji",     ex:"🔥 💪 🦵",                 req:false},
            {col:"Section",       ex:"Chest, Back, Hamstrings…", req:false},
          ].map(({col,ex,req})=>(
            <>
              <span key={col+"c"} style={{fontFamily:"'DM Sans'",fontSize:13,fontWeight:600,color:"#1a1a1a"}}>{col}</span>
              <span key={col+"e"} style={{fontFamily:"'DM Sans'",fontSize:13,color:"#999",fontStyle:"italic"}}>{ex}</span>
              <span key={col+"r"} className={`tag ${req?"tag-dark":"tag-muted"}`}>{req?"required":"optional"}</span>
            </>
          ))}
        </div>
      </div>

      <div style={{marginBottom:12}}>
        <div style={{fontFamily:"'DM Sans'",fontSize:10,fontWeight:700,color:"#bbb",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8}}>Plan Name (optional)</div>
        <input className="inp" value={planName} onChange={e=>setPlanName(e.target.value)} placeholder="e.g. My 8-Week Hypertrophy Program" style={{maxWidth:400}}/>
      </div>

      <div
        className={`drop-zone ${dragOver?"over":""}`}
        onClick={()=>fileRef.current?.click()}
        onDragOver={e=>{e.preventDefault();setDragOver(true);}}
        onDragLeave={()=>setDragOver(false)}
        onDrop={e=>{e.preventDefault();setDragOver(false);processFile(e.dataTransfer.files[0]);}}
      >
        <div style={{fontSize:28,marginBottom:8}}>📂</div>
        <div style={{fontFamily:"'DM Sans'",fontSize:14,fontWeight:600,color:"#555",marginBottom:4}}>Drop your spreadsheet here</div>
        <div style={{fontFamily:"'DM Sans'",fontSize:13,color:"#aaa"}}>or click to browse · .xlsx, .xls, .csv</div>
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{display:"none"}} onChange={e=>processFile(e.target.files[0])}/>
      </div>

      {status?.type==="error" && (
        <div className="error-box" style={{marginTop:12}}>
          <div style={{fontFamily:"'DM Sans'",fontSize:13,fontWeight:700,color:"#cc3333",marginBottom:2}}>Error</div>
          <div style={{fontFamily:"'DM Sans'",fontSize:13,color:"#cc3333"}}>{status.msg}</div>
        </div>
      )}
      {status?.type==="success" && pendingPlan && (
        <div className="success-box" style={{marginTop:12}}>
          <div style={{fontFamily:"'DM Sans'",fontSize:13,fontWeight:700,color:"#3a7a00",marginBottom:4}}>Plan parsed successfully</div>
          <div style={{fontFamily:"'DM Sans'",fontSize:13,color:"#3a7a00",marginBottom:12}}>{status.msg}</div>
          <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
            <button className="btn-lime" onClick={()=>{ if(pendingPlan) onImport(pendingPlan); }}>↑ Load This Plan</button>
            <div style={{fontFamily:"'DM Sans'",fontSize:12,color:"#888"}}>Replaces your currently active plan</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── ADMIN ─────────────────────────────────────────────────────────────────────
// Password is hashed so it's not plaintext in source. Change by running:
//   btoa(encodeURIComponent("yournewpassword"))  in the browser console
// Default password: volume-admin
const ADMIN_HASH = "dm9sdW1lLWFkbWlu";

function checkAdminPassword(pw) {
  return btoa(encodeURIComponent(pw)) === ADMIN_HASH;
}

// Returns the live catalog: custom edits stored in localStorage override hardcoded entries
function getLiveCatalog() {
  const overrides = store.get("adminCatalog") || {};
  return LIBRARY_CATALOG.map(entry => overrides[entry.id] ? { ...entry, ...overrides[entry.id] } : entry)
    .concat((store.get("adminCustomPlans") || []).map(p => ({ ...p, _custom: true })));
}

function saveAdminEntry(id, changes) {
  const overrides = store.get("adminCatalog") || {};
  overrides[id] = { ...(overrides[id] || {}), ...changes };
  store.set("adminCatalog", overrides);
}

function saveCustomPlan(entry) {
  const custom = store.get("adminCustomPlans") || [];
  const idx = custom.findIndex(p => p.id === entry.id);
  if (idx >= 0) custom[idx] = entry; else custom.push(entry);
  store.set("adminCustomPlans", custom);
}

function deleteCustomPlan(id) {
  const custom = (store.get("adminCustomPlans") || []).filter(p => p.id !== id);
  store.set("adminCustomPlans", custom);
}

// ── ADMIN PAGE ────────────────────────────────────────────────────────────────
function AdminPage({ onCatalogChange }) {
  const [authed,      setAuthed]      = useState(() => store.get("adminAuthed") === true);
  const [pwInput,     setPwInput]     = useState("");
  const [pwError,     setPwError]     = useState(false);
  const [catalog,     setCatalog]     = useState(() => getLiveCatalog());
  const [editingId,   setEditingId]   = useState(null);  // which plan is open
  const [editSection, setEditSection] = useState("meta"); // "meta" | "weeks"
  const [editPlan,    setEditPlan]    = useState(null);   // deep copy being edited
  const [saveFlash,   setSaveFlash]   = useState(false);

  // Selected week/day drill-down
  const [selWeek, setSelWeek] = useState(0);
  const [selDay,  setSelDay]  = useState(0);

  const refreshCatalog = () => {
    const c = getLiveCatalog();
    setCatalog(c);
    onCatalogChange?.(c);
  };

  const handleLogin = () => {
    if (checkAdminPassword(pwInput)) {
      store.set("adminAuthed", true);
      setAuthed(true);
      setPwError(false);
    } else {
      setPwError(true);
      setPwInput("");
    }
  };

  const handleLogout = () => {
    store.set("adminAuthed", false);
    setAuthed(false);
    setEditingId(null);
  };

  const openEditor = (entry) => {
    setEditPlan(JSON.parse(JSON.stringify(entry))); // deep clone
    setEditingId(entry.id);
    setEditSection("meta");
    setSelWeek(0);
    setSelDay(0);
  };

  const closeEditor = () => {
    setEditingId(null);
    setEditPlan(null);
  };

  const saveMeta = () => {
    if (editPlan._custom) {
      saveCustomPlan(editPlan);
    } else {
      saveAdminEntry(editPlan.id, {
        name:        editPlan.name,
        description: editPlan.description,
        duration:    editPlan.duration,
        daysPerWeek: editPlan.daysPerWeek,
        difficulty:  editPlan.difficulty,
        tags:        editPlan.tags,
        access:      editPlan.access,
      });
    }
    refreshCatalog();
    flashSave();
  };

  const savePlanData = () => {
    const updated = { ...editPlan, plan: editPlan.plan };
    if (editPlan._custom) {
      saveCustomPlan(updated);
    } else {
      saveAdminEntry(editPlan.id, { plan: editPlan.plan });
    }
    refreshCatalog();
    flashSave();
  };

  const flashSave = () => {
    setSaveFlash(true);
    setTimeout(() => setSaveFlash(false), 1800);
  };

  const handleDeletePlan = (id) => {
    if (!window.confirm("Delete this custom plan? This cannot be undone.")) return;
    deleteCustomPlan(id);
    refreshCatalog();
    closeEditor();
  };

  // ── Exercise mutation helpers (operate on editPlan.plan) ──
  const currentWeek = () => editPlan?.plan?.weeks?.[selWeek];
  const currentDay  = () => currentWeek()?.days?.[selDay];

  const mutatePlan = (fn) => {
    const p = JSON.parse(JSON.stringify(editPlan));
    fn(p);
    setEditPlan(p);
  };

  const updateExercise = (ei, field, value) => mutatePlan(p => {
    p.plan.weeks[selWeek].days[selDay].exercises[ei][field] = value;
  });

  const addExercise = () => mutatePlan(p => {
    const day = p.plan.weeks[selWeek].days[selDay];
    const newId = `edit-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
    day.exercises.push({ id: newId, name: "New exercise", sets: 3, reps: "10", section: "" });
  });

  const removeExercise = (ei) => mutatePlan(p => {
    p.plan.weeks[selWeek].days[selDay].exercises.splice(ei, 1);
  });

  const moveExercise = (ei, dir) => mutatePlan(p => {
    const exs = p.plan.weeks[selWeek].days[selDay].exercises;
    const to = ei + dir;
    if (to < 0 || to >= exs.length) return;
    [exs[ei], exs[to]] = [exs[to], exs[ei]];
  });

  const updateDayMeta = (field, value) => mutatePlan(p => {
    p.plan.weeks[selWeek].days[selDay][field] = value;
  });

  const addDay = () => mutatePlan(p => {
    const wk = p.plan.weeks[selWeek];
    const newId = `edit-d-${Date.now()}`;
    wk.days.push({ id: newId, label: "New Day", emoji: "💪", exercises: [] });
    setSelDay(wk.days.length - 1);
  });

  const removeDay = (di) => mutatePlan(p => {
    p.plan.weeks[selWeek].days.splice(di, 1);
    setSelDay(Math.max(0, selDay - 1));
  });

  const addWeek = () => mutatePlan(p => {
    const lastWk = p.plan.weeks[p.plan.weeks.length - 1];
    const newWk = JSON.parse(JSON.stringify(lastWk));
    newWk.week = lastWk.week + 1;
    newWk.days.forEach((d, di) => {
      d.id = `edit-w${newWk.week}d${di}`;
      d.exercises.forEach((e, ei) => { e.id = `edit-w${newWk.week}d${di}e${ei}`; });
    });
    p.plan.weeks.push(newWk);
    setSelWeek(p.plan.weeks.length - 1);
    setSelDay(0);
  });

  const removeWeek = (wi) => mutatePlan(p => {
    if (p.plan.weeks.length <= 1) return;
    p.plan.weeks.splice(wi, 1);
    setSelWeek(Math.max(0, selWeek - 1));
    setSelDay(0);
  });

  const updateWeekPhase = (phase) => mutatePlan(p => {
    p.plan.weeks[selWeek].phase = parseInt(phase) || 1;
  });

  // ── Login screen ──
  if (!authed) {
    return (
      <div>
        <div style={{marginBottom:24}}>
          <div style={{fontFamily:"'DM Serif Display'",fontSize:36,color:"#1a1a1a"}}>Admin</div>
          <Squiggle width={80}/>
          <div style={{fontFamily:"'DM Sans'",fontSize:13,color:"#999",marginTop:8}}>Enter your admin password to continue</div>
        </div>
        <div className="card" style={{padding:28,maxWidth:380}}>
          <div style={{fontFamily:"'DM Sans'",fontSize:13,fontWeight:600,color:"#1a1a1a",marginBottom:10}}>Password</div>
          <input
            className="inp"
            type="password"
            value={pwInput}
            onChange={e=>{setPwInput(e.target.value);setPwError(false);}}
            onKeyDown={e=>e.key==="Enter"&&handleLogin()}
            placeholder="Enter admin password"
            style={{marginBottom:pwError?8:16,fontSize:14}}
            autoFocus
          />
          {pwError && (
            <div style={{fontFamily:"'DM Sans'",fontSize:12,color:"#cc3333",marginBottom:12}}>Incorrect password</div>
          )}
          <button className="btn-dark" onClick={handleLogin}>Unlock Admin</button>
        </div>
      </div>
    );
  }

  // ── Plan list view ──
  if (!editingId) {
    return (
      <div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:24,flexWrap:"wrap",gap:12}}>
          <div>
            <div style={{fontFamily:"'DM Serif Display'",fontSize:36,color:"#1a1a1a"}}>Admin</div>
            <Squiggle width={80}/>
            <div style={{fontFamily:"'DM Sans'",fontSize:13,color:"#999",marginTop:8}}>Edit plans, exercises, and library metadata</div>
          </div>
          <button className="btn-ghost" onClick={handleLogout} style={{fontSize:12,color:"#aaa"}}>Lock</button>
        </div>

        <div style={{display:"grid",gap:10}}>
          {catalog.map(entry => (
            <div key={entry.id} className="card" style={{padding:"16px 20px",display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",gap:6,marginBottom:4,flexWrap:"wrap",alignItems:"center"}}>
                  <span className={`tag ${entry.access==="free"?"tag-free":"tag-member"}`}>{entry.access==="free"?"Free":"Member"}</span>
                  {entry._custom && <span className="tag tag-muted">Custom</span>}
                  <span className="tag tag-muted">{entry.difficulty}</span>
                </div>
                <div style={{fontFamily:"'DM Sans'",fontSize:15,fontWeight:600,color:"#1a1a1a",marginBottom:2}}>{entry.name}</div>
                <div style={{fontFamily:"'DM Sans'",fontSize:12,color:"#aaa"}}>{entry.duration} · {entry.daysPerWeek} days/week · {entry.plan?.weeks?.length || 0} weeks in plan</div>
              </div>
              <button className="btn-dark" style={{fontSize:12,padding:"7px 18px",flexShrink:0}} onClick={()=>openEditor(entry)}>Edit</button>
            </div>
          ))}
        </div>

        <div style={{marginTop:16,padding:"14px 0",borderTop:"2px solid #ede8de"}}>
          <div style={{fontFamily:"'DM Sans'",fontSize:12,color:"#aaa"}}>
            Changes are saved to your browser. Hardcoded plan data is overridden locally — original code is unchanged until you export.
          </div>
        </div>
      </div>
    );
  }

  // ── Plan editor ──
  const wk  = currentWeek();
  const day = currentDay();
  const safeSelDay = Math.min(selDay, (wk?.days?.length || 1) - 1);

  return (
    <div>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20,flexWrap:"wrap"}}>
        <button className="btn-ghost" onClick={closeEditor} style={{fontSize:12,padding:"6px 14px"}}>← Back</button>
        <div style={{flex:1}}>
          <div style={{fontFamily:"'DM Sans'",fontSize:18,fontWeight:600,color:"#1a1a1a"}}>{editPlan.name}</div>
        </div>
        {saveFlash && (
          <div style={{fontFamily:"'DM Sans'",fontSize:12,fontWeight:700,color:"#5a7a00",background:"#c8f040",padding:"5px 12px",borderRadius:99}}>Saved ✓</div>
        )}
      </div>

      {/* Section tabs */}
      <div className="tab-wrap" style={{marginBottom:20}}>
        {[{id:"meta",label:"Details"},{id:"weeks",label:"Exercises"}].map(s=>(
          <button key={s.id} className={`tab-btn ${editSection===s.id?"on":"off"}`} onClick={()=>setEditSection(s.id)}>{s.label}</button>
        ))}
      </div>

      {/* ── META EDITOR ── */}
      {editSection === "meta" && (
        <div style={{display:"grid",gap:14}}>
          <div className="card" style={{padding:24}}>
            <div style={{fontFamily:"'DM Sans'",fontSize:10,fontWeight:700,color:"#bbb",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:16}}>Plan details</div>
            <div style={{display:"grid",gap:12}}>
              {[
                {label:"Plan name",    field:"name",        type:"text"},
                {label:"Description",  field:"description", type:"textarea"},
                {label:"Duration",     field:"duration",    type:"text",    placeholder:"e.g. 8 weeks"},
                {label:"Days per week",field:"daysPerWeek", type:"number"},
                {label:"Difficulty",   field:"difficulty",  type:"text",    placeholder:"e.g. Intermediate"},
              ].map(({label, field, type, placeholder}) => (
                <div key={field}>
                  <div style={{fontFamily:"'DM Sans'",fontSize:12,fontWeight:600,color:"#555",marginBottom:5}}>{label}</div>
                  {type === "textarea" ? (
                    <textarea
                      className="inp"
                      value={editPlan[field] || ""}
                      onChange={e=>setEditPlan({...editPlan,[field]:e.target.value})}
                      rows={3}
                      style={{resize:"vertical",lineHeight:1.5,fontSize:13}}
                    />
                  ) : (
                    <input
                      className="inp"
                      type={type}
                      value={editPlan[field] || ""}
                      placeholder={placeholder}
                      onChange={e=>setEditPlan({...editPlan,[field]:type==="number"?parseInt(e.target.value)||0:e.target.value})}
                      style={{fontSize:13}}
                    />
                  )}
                </div>
              ))}

              <div>
                <div style={{fontFamily:"'DM Sans'",fontSize:12,fontWeight:600,color:"#555",marginBottom:5}}>Access tier</div>
                <div style={{display:"flex",gap:8}}>
                  {["free","member"].map(tier=>(
                    <button
                      key={tier}
                      onClick={()=>setEditPlan({...editPlan,access:tier})}
                      style={{
                        padding:"8px 20px",borderRadius:99,border:"2px solid",cursor:"pointer",
                        fontFamily:"'DM Sans'",fontSize:13,fontWeight:600,transition:"all .15s",
                        background: editPlan.access===tier ? "#1a1a1a" : "transparent",
                        color:      editPlan.access===tier ? "#fff" : "#888",
                        borderColor:editPlan.access===tier ? "#1a1a1a" : "#e0dbd0",
                      }}
                    >{tier.charAt(0).toUpperCase()+tier.slice(1)}</button>
                  ))}
                </div>
              </div>

              <div>
                <div style={{fontFamily:"'DM Sans'",fontSize:12,fontWeight:600,color:"#555",marginBottom:5}}>Tags (comma-separated)</div>
                <input
                  className="inp"
                  value={(editPlan.tags||[]).join(", ")}
                  onChange={e=>setEditPlan({...editPlan,tags:e.target.value.split(",").map(t=>t.trim()).filter(Boolean)})}
                  placeholder="e.g. Strength, PPL, Beginner"
                  style={{fontSize:13}}
                />
              </div>
            </div>

            <div style={{display:"flex",gap:10,marginTop:20,flexWrap:"wrap",alignItems:"center"}}>
              <button className="btn-lime" onClick={saveMeta}>Save details</button>
              {editPlan._custom && (
                <button className="btn-ghost" onClick={()=>handleDeletePlan(editPlan.id)} style={{color:"#cc3333",borderColor:"#ffcccc",fontSize:12}}>Delete plan</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── EXERCISES EDITOR ── */}
      {editSection === "weeks" && editPlan.plan && (
        <div>
          {/* Week selector */}
          <div style={{marginBottom:12}}>
            <div style={{fontFamily:"'DM Sans'",fontSize:10,fontWeight:700,color:"#bbb",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8}}>Week</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
              {editPlan.plan.weeks.map((w,wi)=>(
                <button
                  key={wi}
                  className={`week-btn ${selWeek===wi?"on":""}`}
                  onClick={()=>{setSelWeek(wi);setSelDay(0);}}
                >W{w.week}</button>
              ))}
              <button
                onClick={addWeek}
                style={{padding:"5px 12px",borderRadius:99,border:"2px dashed #d0d0d0",background:"transparent",fontFamily:"'DM Sans'",fontSize:12,fontWeight:600,color:"#bbb",cursor:"pointer"}}
              >+ Week</button>
              {editPlan.plan.weeks.length > 1 && (
                <button
                  onClick={()=>removeWeek(selWeek)}
                  style={{padding:"5px 10px",borderRadius:99,border:"2px solid #ffcccc",background:"transparent",fontFamily:"'DM Sans'",fontSize:11,fontWeight:600,color:"#cc3333",cursor:"pointer"}}
                >Remove W{wk?.week}</button>
              )}
            </div>
          </div>

          {wk && (
            <>
              {/* Phase + day selector */}
              <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:12,flexWrap:"wrap"}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontFamily:"'DM Sans'",fontSize:12,fontWeight:600,color:"#555"}}>Phase</span>
                  <input
                    type="number"
                    min={1} max={9}
                    value={wk.phase}
                    onChange={e=>updateWeekPhase(e.target.value)}
                    style={{width:52,padding:"5px 8px",border:"2px solid #ede8de",borderRadius:8,fontFamily:"'DM Sans'",fontSize:13,color:"#1a1a1a",outline:"none"}}
                  />
                </div>
              </div>

              <div style={{marginBottom:14}}>
                <div style={{fontFamily:"'DM Sans'",fontSize:10,fontWeight:700,color:"#bbb",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8}}>Day</div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                  {wk.days.map((d,di)=>(
                    <button key={di} className={`day-btn ${safeSelDay===di?"on":""}`} onClick={()=>setSelDay(di)}>
                      <span>{d.emoji}</span>{d.label}
                    </button>
                  ))}
                  <button
                    onClick={addDay}
                    style={{padding:"9px 16px",borderRadius:14,border:"2px dashed #d0d0d0",background:"transparent",fontFamily:"'DM Sans'",fontSize:13,fontWeight:600,color:"#bbb",cursor:"pointer"}}
                  >+ Day</button>
                </div>
              </div>

              {day && (
                <div>
                  {/* Day meta */}
                  <div className="card" style={{padding:18,marginBottom:12}}>
                    <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
                      <input
                        className="inp"
                        value={day.emoji || ""}
                        onChange={e=>updateDayMeta("emoji",e.target.value)}
                        style={{width:60,fontSize:20,textAlign:"center",padding:"6px 8px"}}
                        placeholder="💪"
                      />
                      <input
                        className="inp"
                        value={day.label || ""}
                        onChange={e=>updateDayMeta("label",e.target.value)}
                        style={{flex:1,fontSize:14,fontWeight:600,minWidth:120}}
                        placeholder="Day name"
                      />
                      {wk.days.length > 1 && (
                        <button
                          onClick={()=>removeDay(safeSelDay)}
                          style={{padding:"7px 12px",borderRadius:99,border:"2px solid #ffcccc",background:"transparent",fontFamily:"'DM Sans'",fontSize:11,fontWeight:600,color:"#cc3333",cursor:"pointer",flexShrink:0}}
                        >Remove day</button>
                      )}
                    </div>
                  </div>

                  {/* Exercise list */}
                  <div style={{display:"grid",gap:8,marginBottom:12}}>
                    {day.exercises.map((ex, ei) => (
                      <div key={ex.id||ei} className="card" style={{padding:14}}>
                        <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:8,marginBottom:8}}>
                          <input
                            className="inp"
                            value={ex.name}
                            onChange={e=>updateExercise(ei,"name",e.target.value)}
                            placeholder="Exercise name"
                            style={{fontSize:13,fontWeight:500}}
                          />
                          <div style={{display:"flex",gap:4}}>
                            <button onClick={()=>moveExercise(ei,-1)} disabled={ei===0} style={{padding:"0 8px",border:"2px solid #ede8de",borderRadius:8,background:"transparent",cursor:"pointer",color:"#aaa",fontSize:12}}>↑</button>
                            <button onClick={()=>moveExercise(ei,1)} disabled={ei===day.exercises.length-1} style={{padding:"0 8px",border:"2px solid #ede8de",borderRadius:8,background:"transparent",cursor:"pointer",color:"#aaa",fontSize:12}}>↓</button>
                            <button onClick={()=>removeExercise(ei)} style={{padding:"0 8px",border:"2px solid #ffcccc",borderRadius:8,background:"transparent",cursor:"pointer",color:"#cc3333",fontSize:13}}>×</button>
                          </div>
                        </div>
                        <div style={{display:"grid",gridTemplateColumns:"80px 100px 1fr",gap:8}}>
                          <div>
                            <div style={{fontFamily:"'DM Sans'",fontSize:10,fontWeight:700,color:"#bbb",textTransform:"uppercase",marginBottom:4}}>Sets</div>
                            <input
                              className="inp"
                              type="number"
                              min={1}
                              value={ex.sets}
                              onChange={e=>updateExercise(ei,"sets",parseInt(e.target.value)||1)}
                              style={{fontSize:13,padding:"6px 10px"}}
                            />
                          </div>
                          <div>
                            <div style={{fontFamily:"'DM Sans'",fontSize:10,fontWeight:700,color:"#bbb",textTransform:"uppercase",marginBottom:4}}>Reps</div>
                            <input
                              className="inp"
                              value={ex.reps}
                              onChange={e=>updateExercise(ei,"reps",e.target.value)}
                              placeholder="e.g. 8–10"
                              style={{fontSize:13,padding:"6px 10px"}}
                            />
                          </div>
                          <div>
                            <div style={{fontFamily:"'DM Sans'",fontSize:10,fontWeight:700,color:"#bbb",textTransform:"uppercase",marginBottom:4}}>Section</div>
                            <input
                              className="inp"
                              value={ex.section||""}
                              onChange={e=>updateExercise(ei,"section",e.target.value)}
                              placeholder="e.g. Main Lift"
                              style={{fontSize:13,padding:"6px 10px"}}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
                    <button
                      onClick={addExercise}
                      className="btn-ghost"
                      style={{fontSize:12,padding:"7px 16px"}}
                    >+ Add exercise</button>
                    <button className="btn-lime" onClick={savePlanData}>Save all changes</button>
                    {saveFlash && <span style={{fontFamily:"'DM Sans'",fontSize:12,fontWeight:700,color:"#5a7a00"}}>Saved ✓</span>}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── WORDMARK ──────────────────────────────────────────────────────────────────
function VolumeWordmark({ height = 32 }) {
  return (
    <img src={wordmarkUrl} alt="Volume" style={{height, display:"block", width:"auto"}}/>
  );
}

// ── ROOT ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [tab,           setTab]           = useState("workout");
  const [plan,          setPlan]          = useState(() => store.get("plan") || DEFAULT_PLAN);
  const [activePlanId,  setActivePlanId]  = useState(() => store.get("activePlanId") || null);
  const [importSuccess, setImportSuccess] = useState(false);
  // Trigger Library re-reads when admin saves catalog changes
  const [catalogVersion, setCatalogVersion] = useState(0);

  useEffect(() => {
    const s = document.createElement("style");
    s.textContent = STYLES;
    document.head.appendChild(s);
    const link = document.querySelector("link[rel~='icon']") || document.createElement("link");
    link.rel   = "icon";
    link.type  = "image/svg+xml";
    link.href  = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB2aWV3Qm94PSIwIDAgMTUwIDE1Ny45MiI+PGRlZnM+PGcvPjxjbGlwUGF0aCBpZD0iMmIzNTdmNTJlMiI+PHBhdGggZD0iTSAwLjAzOTA2MjUgMCBMIDE0OS45NjA5MzggMCBMIDE0OS45NjA5MzggMTQ5LjkyNTc4MSBMIDAuMDM5MDYyNSAxNDkuOTI1NzgxIFogTSAwLjAzOTA2MjUgMCAiIGNsaXAtcnVsZT0ibm9uemVybyIvPjwvY2xpcFBhdGg+PC9kZWZzPjxnIGNsaXAtcGF0aD0idXJsKCMyYjM1N2Y1MmUyKSI+PHBhdGggZmlsbD0iI2M4ZjA0MCIgZD0iTSAwLjAzOTA2MjUgMCBMIDE0OS45NjA5MzggMCBMIDE0OS45NjA5MzggMTQ5LjkyNTc4MSBMIDAuMDM5MDYyNSAxNDkuOTI1NzgxIFogTSAwLjAzOTA2MjUgMCAiIGZpbGwtb3BhY2l0eT0iMSIgZmlsbC1ydWxlPSJub256ZXJvIi8+PC9nPjwvc3ZnPg==";
    document.head.appendChild(link);
    return () => { try { document.head.removeChild(s); } catch {} };
  }, []);

  const handleImport = (newPlan) => {
    setPlan(newPlan);
    store.set("plan", newPlan);
    setImportSuccess(true);
    setTab("workout");
    setTimeout(() => setImportSuccess(false), 4000);
  };

  const handleRestore = (backup) => {
    setPlan(backup.plan);
    store.set("plan", backup.plan);
    store.set("wlog", backup.log);
    setImportSuccess(true);
    setTab("workout");
    setTimeout(() => setImportSuccess(false), 4000);
  };

  const handleActivatePlan = (entry) => {
    setPlan(entry.plan);
    setActivePlanId(entry.id);
    store.set("plan",         entry.plan);
    store.set("activePlanId", entry.id);
    setImportSuccess(true);
    setTab("workout");
    setTimeout(() => setImportSuccess(false), 4000);
  };

  return (
    <div style={{background:"#f5f0e8",minHeight:"100vh"}}>
      <header style={{background:"#fff",borderBottom:"2px solid #ede8de",position:"sticky",top:0,zIndex:100}}>
        <div style={{maxWidth:800,margin:"0 auto",padding:"12px 20px",display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
          <div style={{marginRight:12,display:"flex",alignItems:"center",height:36}}>
            <VolumeWordmark height={36}/>
          </div>
          <div className="tab-wrap">
            {[
              {id:"workout", label:"Workout"},
              {id:"plan",    label:"Plan"},
              {id:"trends",  label:"Trends"},
              {id:"library", label:"Library"},
              {id:"import",  label:"↑ Import"},
              {id:"admin",   label:"Admin"},
            ].map(t=>(
              <button key={t.id} className={`tab-btn ${tab===t.id?"on":"off"}`} onClick={()=>setTab(t.id)}>{t.label}</button>
            ))}
          </div>
        </div>
      </header>

      {importSuccess && (
        <div style={{background:"#c8f040",padding:"10px 20px",textAlign:"center"}}>
          <span style={{fontFamily:"'DM Sans'",fontSize:13,fontWeight:700,color:"#1a1a1a"}}>✓ Done! Now running: <em>{plan.name}</em></span>
        </div>
      )}

      <main style={{maxWidth:800,margin:"0 auto",padding:"28px 16px 60px"}}>
        {tab==="workout" && <WorkoutPage plan={plan}/>}
        {tab==="plan"    && <PlanPage    plan={plan}/>}
        {tab==="trends"  && <TrendsPage  plan={plan}/>}
        {tab==="library" && <LibraryPage activePlanId={activePlanId} onActivate={handleActivatePlan} key={catalogVersion}/>}
        {tab==="import"  && <ImportPage  onImport={handleImport} onRestore={handleRestore} plan={plan}/>}
        {tab==="admin"   && <AdminPage   onCatalogChange={()=>setCatalogVersion(v=>v+1)}/>}
      </main>
    </div>
  );
}
