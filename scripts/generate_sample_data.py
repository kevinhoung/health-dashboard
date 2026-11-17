#!/usr/bin/env python3
"""Generate fictional dashboard data; no external packages or inputs are used."""
import argparse
import datetime as dt
import json
import random


def positive(value):
    value = int(value)
    if value < 1:
        raise argparse.ArgumentTypeError('must be at least 1')
    return value


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--seed', type=int, default=42)
    parser.add_argument('--days', type=positive, default=540)
    parser.add_argument('--end', type=dt.date.fromisoformat, default=dt.date.today())
    parser.add_argument('--out', default='data.json')
    args = parser.parse_args()
    rng = random.Random(args.seed)
    dates = [(args.end - dt.timedelta(days=i)).isoformat() for i in reversed(range(args.days))]
    daily = {key: [] for key in ('d', 'steps', 'activeKcal', 'exerciseMin', 'distanceMi', 'flights', 'restingHR', 'hrv', 'walkingHR', 'respRate', 'spo2', 'vo2')}
    body, sleep, workouts, vitality, mood = [], [], [], [], []
    for i, day in enumerate(dates):
        steps = rng.randint(3500, 12000)
        daily['d'].append(day)
        values = (steps, rng.randint(250, 750), rng.randint(10, 75), round(steps / 2100, 2), rng.randint(2, 18), rng.randint(52, 65), rng.randint(34, 60), rng.randint(90, 115), round(rng.uniform(13, 17), 1), round(rng.uniform(96, 100), 1), round(rng.uniform(36, 45), 1))
        for key, value in zip(list(daily)[1:], values):
            daily[key].append(value)
        if i % 5 == 0:
            weight = round(180 + rng.uniform(-2, 2), 1)
            fat = round(rng.uniform(18, 23), 1)
            body.append({'d': day, 'src': 'Sample Scale', 'weight': weight, 'bodyFat': fat, 'leanMass': round(weight * (1-fat/100), 1)})
        total = rng.randint(390, 510)
        deep, rem, awake = rng.randint(65, 100), rng.randint(75, 115), rng.randint(15, 40)
        sleep.append({'d': day, 'total': total, 'inBed': total + awake, 'deep': deep, 'rem': rem, 'core': total-deep-rem, 'awake': awake, 'score': rng.randint(65, 95), 'src': 'Sample Sleep Tracker'})
        if i % 2 == 0:
            workouts.append({'d': day, 'type': 'Sample Walk', 'min': rng.randint(20, 60), 'mi': round(rng.uniform(1, 4), 2), 'kcal': rng.randint(100, 400), 'hr': None if i % 4 == 0 else rng.randint(95, 140)})
        vitality.append({'d': day, 'vitality': round(rng.uniform(55, 85), 1), 'recovery': round(rng.uniform(55, 85), 1), 'fitness': round(rng.uniform(55, 85), 1)})
        if i % 30 == 0:
            mood.append({'d': day, 'kind': 'Daily Mood', 'valence': round(rng.uniform(-0.5, 0.8), 2), 'label': 'Sample mood', 'emotions': 'Sample emotion'})
    data = {'generated': args.end.isoformat() + 'T00:00:00Z', 'primaryScale': 'Sample Scale', 'sample': True, 'daily': daily, 'body': body, 'sleep': sleep, 'workouts': workouts, 'vitality': vitality,
            'meds': [{'ref': 'sample-med-a', 'name': 'Sample Med A', 'archived': False, 'scheduled': True, 'first': dates[0], 'last': dates[-1], 'days': dates, 'effects': {'steps': [7000, 7500], 'restingHR': [60, 58], 'hrv': [42, 45]}}],
            'mood': mood, 'insights': [{'tone': 'good', 'section': 'activity', 'text': 'Sample insight: activity varies in this fictional data.'}]}
    with open(args.out, 'w', encoding='utf-8') as output:
        json.dump(data, output, separators=(',', ':'), allow_nan=False)
        output.write('\n')


if __name__ == '__main__':
    main()
