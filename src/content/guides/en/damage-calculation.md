---
title: How Damage Is Calculated (Weakness, Resistance and Modifiers)
description: The official order for calculating attack damage in the Pokémon TCG, including Weakness ×2, Resistance −30, and effects on the attacking and Defending Pokémon.
order: 5
updated: 2026-10-20
---

Calculating damage in the wrong order is one of the most common errors in Pokémon TCG matches. The rulebook gives a fixed order, and once you know it, almost every interaction becomes simple.

## The order

1. **Start with the attack's base damage**, the number printed next to the attack. If the attack says something like "×" or "+", work that out first using the attack's own text.
2. **Apply effects on the attacking Pokémon.** For example, a Tool card or an Ability that says "attacks used by this Pokémon do 30 more damage".
3. **Apply Weakness.** If the Defending Pokémon is weak to the attacker's type, the damage is **doubled (×2)**.
4. **Apply Resistance.** If the Defending Pokémon resists the attacker's type, **subtract 30**.
5. **Apply effects on the Defending Pokémon.** For example, "this Pokémon takes 30 less damage from attacks".

The result is the damage you put on the Defending Pokémon, as damage counters (one counter per 10 damage). If the result is 0 or less, no damage is done.

## Worked example

Your attack does 90. Your Pokémon holds a Tool that adds 30. The Defending Pokémon is weak to your type and has an effect that reduces damage by 20.

- Base: 90
- Attacker effect: 90 + 30 = 120
- Weakness: 120 × 2 = 240
- Resistance: none
- Defender effect: 240 − 20 = **220**

If you had applied the −20 first, you would have got 200 instead, so the order really does change outcomes.

## Weakness and Resistance only apply to the Active Pokémon

Damage to Benched Pokémon from attacks does **not** apply Weakness or Resistance, unless the attack says so. Placing damage counters (instead of "doing damage") also ignores Weakness, Resistance and most damage-reducing effects, because counters are not damage from an attack.

## Damage versus damage counters

- "Does 50 damage" goes through all five steps above.
- "Put 5 damage counters" skips them entirely: just place 50 worth of counters.

Poison, Burn and the self-damage from Confusion are also placed as damage counters during Pokémon Checkup or the coin flip, so they are not affected by Weakness or Resistance.

## Recording the result

On PTCG Companion, add the final number with the **+100**, **+50** and **+10** buttons. For 220, tap +100 twice and +10 twice. When the total reaches or passes the Pokémon's HP it is Knocked Out: tap **KO**, take your Prize cards, then select the Benched Pokémon that moves up and tap **⇄**. If the attack also damages the Bench, select that Bench slot (B1–B5) first and add its damage the same way; remember Weakness and Resistance do not apply there.
