export type RepRange = '6-8' | '8-12' | '15-20'

export interface Client {
  id: string
  name: string
  date_of_birth: string | null
  phone: string | null
  primary_goal: string | null
  secondary_goal: string | null
  limitations: string | null
  movements_to_avoid: string | null
  movements_to_include_carefully: string | null
  trainer_notes: string | null
  favorite_exercises: string | null
  exercises_to_avoid: string | null
  created_at: string
}

export interface Exercise {
  id: string
  name: string
  equipment_type: string | null
  main_muscle_group: string | null
  secondary_muscle_group: string | null
  movement_type: string | null
  difficulty: string | null
  notes: string | null
  avoid_if: string | null
  created_at: string
}

export interface Session {
  id: string
  client_id: string
  session_date: string
  focus: string | null
  notes: string | null
  created_at: string
}

export interface SessionExercise {
  id: string
  session_id: string
  client_id: string
  exercise_id: string
  rep_range: RepRange
  weight: number | null
  effort: string | null
  form: string | null
  pain: string | null
  status: string | null
  notes: string | null
  created_at: string
  exercises?: Exercise
  sessions?: Session
  exercise_sets?: ExerciseSet[]
}

export interface ExerciseSet {
  id: string
  session_exercise_id: string
  set_number: number
  reps: number | null
  weight: number | null
  created_at: string
}

export interface Recommendation {
  recommendedWeight: number | null
  status: 'Increase' | 'Hold' | 'Reduce' | 'Underloaded' | 'Establish Baseline'
  reason: string
  lastUsed: number | null
  bestRecent: string | null
}

export interface LogEntry {
  sets: { reps: string; weight: string }[]
  effort: string
  form: string
  pain: string
  notes: string
}
