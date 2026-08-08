# Movie-return runtime observation

This document defines the first controlled runtime observation for movie returns.
The observation schema exists, but the runtime collector has not been implemented, so these steps are not runnable today.

## Goal

The first observation checks deterministic behavior already recovered from the game packages.

- A new in-game day moves every movie from the rented queue to the ready-to-return queue and clears the rented queue.
- A movie selector returns only movies that were in the ready-to-return queue.
- One selector result contains no duplicates and no more than four movies.
- A successful customer return adds every selected movie to that customer's inventory and removes it from the ready-to-return queue.
- A failed selection leaves the customer without a movie return and does not remove a movie from the ready-to-return queue.

One observation cannot establish the selector's probability values.
Probability validation requires a separate repeated-trial design and is outside this first observation.

## Operating boundary

The collector must be purpose-specific and source-built against the user's licensed game installation.
Its temporary files and outputs must remain outside version control.

The collector may:

- Observe the naturally loaded rental manager and customer involved in the test.
- Record the named queues, selector input and result, and the tested customer's inventory changes.
- Write one versioned JSON observation and its SHA-256 hash to an ignored local directory.

The collector must not:

- Launch or close the game or Steam.
- Add or change Steam launch arguments.
- Move window focus, send input, or automate gameplay.
- Edit, replace, or delete a save.
- Force-load unrelated packages or enumerate the full Unreal object set.
- Serialize unrestricted objects, complete saves, screenshots, game assets, or extracted text.
- Record player names, store names, Steam identifiers, account identifiers, or unrelated customer data.
- Send observation data over the network.

## Responsibilities

The person using the computer controls every visible game action.
They choose when the test starts, launch the game, load a save, perform the gameplay, and close the game normally.

The tooling may prepare files only while the game is closed.
It must show the exact game-directory files that would be added before installation and wait for explicit approval.
It must not remove any file unless the game is closed and the file is proven to belong to this collector run.

## Required observation record

The observation uses [`movie-return-observation.v1.schema.json`](../projects/game-data-exporter/schemas/runtime/movie-return-observation.v1.schema.json).
That versioned JSON shape is owned by `projects/game-data-exporter/schemas/runtime`.
The generated record belongs under `projects/game-data-exporter/.local/runtime/<Steam build ID>/<UTC run ID>/`.

Each record must contain:

- The Steam application ID and build ID.
- The filename, size, SHA-256 hash, artifact type, and schema version of the private movie-return mechanics artifact being checked.
- The runtime collector version and observation schema version.
- A UTC run ID and ordered event sequence numbers.
- The stable class, object, and function paths used by each event.
- Only the relevant pre-state, input, result, and post-state for the tested mechanic.
- A final status of `complete`, `aborted`, or `failed` with a reason when it is not complete.

Movie references must use stable runtime object paths when available.
If stable paths are unavailable, the collector must assign run-local opaque identifiers that cannot be used outside that observation.

The collector must write to a temporary filename, close the file, validate it against the schema, calculate its SHA-256 hash, and then rename it to the final filename.
An interrupted run must retain an `aborted` or `failed` record when enough metadata exists to explain the interruption.

## User-operated run

Do not begin this run until the collector, schema, build instructions, and cleanup instructions exist.

1. Close the game before preparing or installing the collector.
2. Review the exact temporary files and destinations proposed for the game directory.
3. Approve or reject that installation separately from building the collector.
4. Launch the game normally yourself without custom launch arguments.
5. Load a save that you are comfortable using for ordinary gameplay.
6. Wait until the rental manager is naturally available.
7. Arrange at least one rented movie through normal gameplay.
8. Advance to the next in-game day through normal gameplay.
9. Continue normal gameplay until a customer attempts the relevant return path.
10. Tell the tooling when the observation is finished.
11. Close the game normally yourself.
12. Validate and copy the private observation only after the game has closed.
13. Review the exact collector-owned files before approving their removal from the game directory.

The run may stop at any time if it interferes with normal computer use.
Closing the game normally is the only default stop action.

## Acceptance checks

The first observation is complete only when all applicable checks can be evaluated from one ordered record.

- The readiness event starts with at least one rented movie.
- Every pre-event rented movie appears in the post-event ready queue.
- The post-event rented queue is empty.
- Every selected movie existed in the selector's pre-call ready queue.
- The selected list contains no duplicates and contains at most four movies.
- The selector's found flag agrees with whether its result list is empty.
- A successful customer path adds every selected movie to the tested customer's inventory.
- A successful customer path removes every selected movie from the ready queue.
- A failed customer path does not remove an unselected movie.

The observation must remain marked incomplete when a required event was not reached or a required state could not be read.
A runtime mismatch must be retained as evidence and must not be rewritten to match the static artifact.
The `@neonretrorewind/validator` package checks event ordering, time bounds, queue transfer, selector membership, and customer inventory and queue transitions after schema validation.
It returns `passed`, `incomplete`, or `mismatch` with bounded issue codes and does not write or alter the observation.

## Evidence effect

A passing run supports only the deterministic claims exercised by that run and its exact game build.
The normalized artifact remains `decompiled-blueprint` until its schema can reference a validated runtime observation.
The probability values remain supported by typed Blueprint evidence until a separate statistical validation is designed and completed.
