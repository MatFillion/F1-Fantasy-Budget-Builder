# Price Change Algorithm

This document explains how F1 Fantasy calculates price changes for drivers and constructors after each race, and how this app uses that formula to show the points needed for each price tier.

## Overview

After each race, every driver and constructor's price can go up or down based on their recent performance. The system uses a metric called **AvgPPM** (Average Points Per Million) to classify performance, then applies a price change based on the asset's current price tier.

## Step 1: Calculate AvgPPM

```
AvgPPM = average(last 3 race points) / current_price
```

- Uses the **most recent 3 races** (or fewer if the season just started)
- Rounded to 3 decimal places
- Example: A driver priced at 20M who scored 25, 30, 20 in the last 3 races:
  - Average = (25 + 30 + 20) / 3 = 25
  - AvgPPM = 25 / 20 = **1.250**

## Step 2: Classify Performance Tier

| Performance | AvgPPM Range        |
|-------------|---------------------|
| **Great**   | ≥ 1.195             |
| **Good**    | ≥ 0.900 and < 1.195 |
| **Poor**    | ≥ 0.605 and < 0.900 |
| **Terrible**| < 0.605             |

Using the example above: AvgPPM 1.250 ≥ 1.195 → **Great**

## Step 3: Determine Price Tier

Assets are split into two price tiers with different price change magnitudes:

| Price Tier | Condition     | Rationale |
|------------|---------------|-----------|
| **Tier A** | Price ≥ 18.5M | Premium assets — smaller price swings |
| **Tier B** | Price < 18.5M | Budget assets — larger price swings |

## Step 4: Apply Price Change

| Performance | Tier A (≥ 18.5M) | Tier B (< 18.5M) |
|-------------|-------------------|-------------------|
| **Great**   | **+0.3M**         | **+0.6M**         |
| **Good**    | **+0.1M**         | **+0.2M**         |
| **Poor**    | **−0.1M**         | **−0.2M**         |
| **Terrible**| **−0.3M**         | **−0.6M**         |

### Full Example

Max Verstappen: Price = 30.0M, Last 3 races: 25, 30, 20 points

1. AvgPPM = (25 + 30 + 20) / 3 / 30.0 = **0.833**
2. Performance: 0.833 ≥ 0.605 and < 0.900 → **Poor**
3. Price tier: 30.0M ≥ 18.5M → **Tier A**
4. Price change: Tier A + Poor = **−0.1M**
5. New price: 30.0 − 0.1 = **29.9M**

## "Points Needed Next Race" Calculation

The Prices tab shows how many points a driver/constructor needs **in the next race** to reach each price change threshold. This is the app's most valuable feature.

### Formula

```
points_needed = threshold × price × window_size − sum_of_previous_races_in_window
```

Where:
- `threshold` = the AvgPPM boundary (1.195, 0.900, 0.605, or 0)
- `price` = current price in millions
- `window_size` = min(races_completed + 1, 3) — the 3-race rolling window
- `sum_of_previous_races_in_window` = total points from the other races in the window

### Example

Driver priced at 15.0M (Tier B), has scored [18, 22] in the last 2 races.

Window size = min(2 + 1, 3) = 3. Sum of last 2 = 40.

| Target      | Threshold | Calculation              | Points Needed |
|-------------|-----------|--------------------------|---------------|
| +0.6 (Great)| 1.195     | 1.195 × 15 × 3 − 40     | **14** pts    |
| +0.2 (Good) | 0.900     | 0.900 × 15 × 3 − 40     | **1** pt      |
| −0.2 (Poor) | 0.605     | 0.605 × 15 × 3 − 40     | **−13** pts   |
| −0.6 (Terr.)| 0.000     | 0.000 × 15 × 3 − 40     | **−40** pts   |

Reading the table:
- Score **14+** next race → price goes up by 0.6M
- Score **1+** next race → price goes up by 0.2M
- Score **below −13** → price drops by 0.2M (unlikely but possible with penalties)
- Score **below −40** → price drops by 0.6M (virtually impossible)

### Color Coding

- **Green**: Positive price change columns where the target is achievable (< 20 points)
- **Yellow**: Achievable but ambitious (20–40 points)
- **Red**: Difficult to achieve (> 40 points) or negative price change columns

### Edge Cases

- **Season start (0 races)**: Window size = 1, so points needed = threshold × price
- **After 1 race**: Window size = 2, uses the 1 previous race + the upcoming one
- **Negative points**: Drivers can score negative points (e.g., penalties). A "points needed" value of 0 or negative does **not** mean the price change is guaranteed — a bad enough result can always push a driver below a threshold. The number simply means "no additional positive scoring is needed *if* the driver scores zero."
- **Values ≤ 0 in positive columns**: Means the driver's recent form is strong enough that scoring 0 would still trigger that price rise. But negative scoring could still prevent it.

## Source

This algorithm is based on community reverse-engineering of the official F1 Fantasy game mechanics. See [this Reddit analysis](https://www.reddit.com/r/fantasyF1/comments/1dqnbjx/my_analysis_of_the_price_change_algorithm/) for the original research.
