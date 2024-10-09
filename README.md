# 📶 deepsignal

This repo is a collection of libraries that wrap Preact's Signal model to make it a full state management solution, alongside some other DX 
pattern niceties. This is a monorepo which mimics the patterns laid out by the [preactjs/signals repo](https://github.com/preactjs/signals).

## `@dpsignal/core`

The `core` package has all the base functionality and utilizes `@preact/signals-core`.

## `@dpsignal/react`

The `react` package adds a React specific hook and otherwise utilizes `@preact/signals-react` and exports key functionality from `@dpsignal/core`.
