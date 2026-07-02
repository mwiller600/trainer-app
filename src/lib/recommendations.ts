import type { ExerciseSet, SessionExercise, Recommendation, RepRange } from '../types'

const LOWER_BODY_MACHINES = [
  'leg press', 'leg extension', 'leg curl', 'glute press',
  'hip abductor', 'hip adductor', 'calf raise', 'hack squat'
]

const SMALL_DUMBBELL = [
  'lateral raise', 'front raise', 'biceps curl', 'triceps kickback',
  'reverse fly', 'wrist curl'
]

function getWeightIncrement(exerciseName: string, equipmentType: string | null): number {
  const name = exerciseName.toLowerCase()
  const equip = (equipmentType || '').toLowerCase()

  if (equip === 'machine' || equip === 'cable') {
    if (LOWER_BODY_MACHINES.some(m => name.includes(m))) return 10
    return 5
  }
  if (equip === 'dumbbell') {
    if (SMALL_DUMBBELL.some(m => name.includes(m))) return 2.5
    return 5
  }
  if (equip === 'barbell') return 5
  return 5
}

interface RangeConfig {
  min: number
  max: number
  increaseAt: number
  underloadedAt: number
}

const RANGE_CONFIG: Record<RepRange, RangeConfig> = {
  '6-8':   { min: 6,  max: 8,  increaseAt: 8,  underloadedAt: 10 },
  '8-12':  { min: 8,  max: 12, increaseAt: 12, underloadedAt: 15 },
  '15-20': { min: 15, max: 20, increaseAt: 20, underloadedAt: 25 },
}

export function calculateRecommendation(
  history: (SessionExercise & { exercise_sets: ExerciseSet[] })[],
  repRange: RepRange,
  exerciseName: string,
  equipmentType: string | null
): Recommendation {
  if (!history || history.length === 0) {
    return {
      recommendedWeight: null,
      status: 'Establish Baseline',
      reason: 'No history for this exercise and rep range. Start with a comfortable weight.',
      lastUsed: null,
      bestRecent: null,
    }
  }

  const sorted = [...history].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  const latest = sorted[0]
  const latestSets = latest.exercise_sets || []
  const latestWeight = latest.weight || latestSets[0]?.weight || 0
  const latestReps = latestSets.map(s => s.reps || 0)

  const increment = getWeightIncrement(exerciseName, equipmentType)
  const config = RANGE_CONFIG[repRange]

  // Best recent: highest weight session
  const bestSession = sorted.reduce((best, cur) => {
    const w = cur.weight || cur.exercise_sets?.[0]?.weight || 0
    const bw = best.weight || best.exercise_sets?.[0]?.weight || 0
    return w > bw ? cur : best
  }, sorted[0])
  const bestSets = bestSession.exercise_sets || []
  const bestWeight = bestSession.weight || bestSets[0]?.weight || 0
  const bestRepsStr = bestSets.map(s => s.reps).join(', ')
  const bestRecent = bestWeight ? `${bestWeight} lbs × ${bestRepsStr}` : null

  // Pain / form / effort overrides
  if (latest.pain && latest.pain !== 'No pain') {
    return {
      recommendedWeight: Math.max(latestWeight - increment, 0),
      status: 'Reduce',
      reason: `Pain was reported last session. Reduce weight and monitor carefully.`,
      lastUsed: latestWeight,
      bestRecent,
    }
  }
  if (latest.form === 'Broke down') {
    return {
      recommendedWeight: Math.max(latestWeight - increment, 0),
      status: 'Reduce',
      reason: 'Form broke down last session. Drop weight to rebuild technique.',
      lastUsed: latestWeight,
      bestRecent,
    }
  }
  if (latest.effort === 'Too hard') {
    return {
      recommendedWeight: Math.max(latestWeight - increment, 0),
      status: 'Reduce',
      reason: 'Last session was too hard. Reduce weight for a better training stimulus.',
      lastUsed: latestWeight,
      bestRecent,
    }
  }

  if (latestReps.length === 0) {
    return {
      recommendedWeight: latestWeight,
      status: 'Hold',
      reason: 'No set data from last session. Hold and re-evaluate.',
      lastUsed: latestWeight,
      bestRecent,
    }
  }

  const mostSetsUnderloaded = latestReps.filter(r => r >= config.underloadedAt).length > latestReps.length / 2
  const allSetsHitTop = latestReps.every(r => r >= config.increaseAt)
  const anySetsUnderMin = latestReps.some(r => r < config.min)

  if (mostSetsUnderloaded) {
    return {
      recommendedWeight: latestWeight + increment,
      status: 'Underloaded',
      reason: `Most sets exceeded ${config.underloadedAt} reps — weight is too light. Increase now.`,
      lastUsed: latestWeight,
      bestRecent,
    }
  }

  if (allSetsHitTop) {
    return {
      recommendedWeight: latestWeight + increment,
      status: 'Increase',
      reason: `Client completed ${latestReps.join(', ')} reps at ${latestWeight} lbs with ${latest.form || 'good'} form and ${latest.pain || 'no pain'}.`,
      lastUsed: latestWeight,
      bestRecent,
    }
  }

  if (anySetsUnderMin) {
    return {
      recommendedWeight: Math.max(latestWeight - increment, 0),
      status: 'Reduce',
      reason: `A set dropped below ${config.min} reps. Reduce weight to stay in the ${repRange} rep range.`,
      lastUsed: latestWeight,
      bestRecent,
    }
  }

  return {
    recommendedWeight: latestWeight,
    status: 'Hold',
    reason: `Reps were in range but not all sets hit ${config.increaseAt}. Hold at ${latestWeight} lbs and push for ${config.increaseAt} reps on all sets.`,
    lastUsed: latestWeight,
    bestRecent,
  }
}
