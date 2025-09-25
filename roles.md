# Trouble Brewing Roles – Admin Guide

This guide explains the **roles in Blood on the Clocktower (Trouble Brewing edition)** from an **admin perspective**. It’s meant to help you manage the game smoothly when running it online.

---

## 📌 General Admin Tips

* Always track **who knows what**. Hidden info is central to BOTC.
* If a role requires information at night, prompt them in the correct order.
* Use clear, consistent signals (e.g., private messages, UI prompts).
* Record all player claims and cross-check with known role abilities.

---

## 🛡️ Townsfolk Roles

### Washerwoman

* Learns that **one of two players is a specific Townsfolk**.
* **Admin task**: Randomly pick a Townsfolk, then choose them + 1 decoy. Reveal both names + role info.

### Librarian

* Learns that **one of two players is a specific Outsider**, or none are.
* **Admin task**: Same as Washerwoman but with Outsiders.

### Investigator

* Learns that **one of two players is a Minion**.
* **Admin task**: Choose a Minion, pair with a random innocent.

### Chef

* Learns if there are **0, 1, or 2+ pairs of evil neighbors**.
* **Admin task**: Count adjacent pairs (seating order matters).

### Empath

* Each night, learns how many of their **two alive neighbors are evil**.
* **Admin task**: Check seating neighbors, deliver number.

### Fortune Teller

* Chooses two players at night, learns if **at least one is the Demon** (but may get a false positive from the red herring).
* **Admin task**: Assign a hidden red herring at game start. Each night, check chosen pair.

### Undertaker

* Each night, learns the true role of the **executed player**.
* **Admin task**: Reveal role of most recent execution.

### Monk

* Chooses one player to **protect from Demon kills**.
* **Admin task**: Mark them as safe for that night’s Demon attack (but not from Poison/Execution).

### Ravenkeeper

* If killed by the Demon, learns one player’s role.
* **Admin task**: Upon Demon kill, prompt for target, reveal exact role.

### Virgin

* If **nominated by a Townsfolk**, that nominator is executed immediately.
* **Admin task**: Track nominations. If Virgin is nominated, check nominator’s alignment. Apply effect if eligible.

### Slayer

* Once per game, can publicly choose someone. If it’s the Demon, they die instantly.
* **Admin task**: Track Slayer usage. Resolve kill immediately if correct.

### Soldier

* Cannot be killed by the Demon at night.
* **Admin task**: If targeted by Demon, prevent death.

### Mayor

* If alive at final 3, town wins if no execution occurs. May redirect Demon kills.
* **Admin task**: If Demon attacks Mayor, redirect randomly to another.

---

## 👥 Outsider Roles

### Butler

* Must pick a **Master** each night. Can only vote if Master is voting.
* **Admin task**: Track chosen Master, enforce voting rules.

### Drunk

* Believes they are a Townsfolk, but ability gives false info.
* **Admin task**: Secretly mark them as Drunk. Their “role ability” produces nonsense results.

### Recluse

* Registers as evil/Minion/Demon when checked, even though Town.
* **Admin task**: Randomize how they appear to investigative roles.

### Saint

* If executed, evil team instantly wins.
* **Admin task**: Track execution votes carefully.

---

## 😈 Minion Roles

### Poisoner

* Poisons one player per night. Their ability malfunctions.
* **Admin task**: Track poison target and apply faulty results.

### Spy

* Learns the Grimoire (all roles) every night. Registers as good.
* **Admin task**: Provide them full role list privately. Let them appear innocent.

### Scarlet Woman

* If Demon dies and 5+ players remain, she becomes the Demon.
* **Admin task**: Watch for Demon death with enough players alive. Promote Scarlet Woman.

### Baron

* Adds 2 Outsiders to the game.
* **Admin task**: Adjust setup at game start (don’t reveal to players).

---

## 👹 Demon Role

### Imp

* Kills one player each night. If killed, may pass Demonhood to Minion.
* **Admin task**: Resolve kills nightly. If Imp chooses to suicide, promote Minion.

---

## 📝 Night Order (Admin Reference)

1. Spy (learns Grimoire)
2. Washerwoman / Librarian / Investigator
3. Chef
4. Fortune Teller
5. Butler
6. Poisoner
7. Monk
8. Ravenkeeper (if killed)
9. Demon (Imp)
10. Empath / Undertaker / Other info roles

---

## 🔑 Key Admin Principles

* **Track state**: Poison, drunk, recluse misreads.
* **Control info flow**: Players only see what their role allows.
* **Resolve night in order** to avoid contradictions.
* **Stay consistent**: Once false info is given, stick with it.

---

This .md should serve as a quick **admin handbook** for running Trouble Brewing roles fairly and smoothly.
