# 📶 @dpsignal/react

This library is meant to expand on Preact's new `Signal` primitive to make it a viable state management solution at the scale of a full
state management system by wrapping the built in primitive with a new `DeepSignal` model. This package is intended for use with React 
applications only.

## Installation

```sh
# npm
npm i @dpsignal/react @preact/signals-react
# yarn
yarn add @dpsignal/react @preact/signals-react
# pnpm
pnpm add @dpsignal/react @preact/signals-react
```

This package also requires `@preact/signals-react` as peer dependencies, as well as `react` itself (although the commands above assume you have `react` already installed).

## Why use `@dpsignal/react`?

In a current React application you would be easily tempted to use a state management solution from the React ecosystem which relies
on the VDOM. If you use a library like this then then your application wide state updates could be causing full VDOM rerenders. Signals
provide us an escape from that on the scale of micro-state, but this library aims to scale that solution for larger applications.

## How it works

Very simply, the library just takes an arbitrary object of any scale or shape, and recursively turns all properties into signals. The objects
themselves each turn into a `DeepSignal` which contains a `value` getter & setter as well as a `peek` method just like regular `Signal`
instances. However, if you assign a new value to a `DeepSignal`, the setter method will recursively find every true `Signal` inside the object
and assign them to a new value. So if you subscribe to a `Signal` in a component, you can guarantee that it will be updated no matter what level
of the store gets reassigned.

So a simple example like this

```ts
import { deepSignal } from "@dpsignal/react";

const userStore = deepSignal({
  name: {
    first: "Thor",
    last: "Odinson"
  },
  email: "thor@avengers.org"
});
```

...is equivalent to this code...

```ts
import { signal, batch } from "@preact/signals-react";

const userStore = {
  name: {
    first: signal("Thor"),
    last: signal("Odinson"),
    get value(): { first: string, last: string } {
      return {
        first: this.first.value,
        last: this.last.value
      }
    },
    set value(payload: { first: string, last: string }) {
      batch(() => {
        this.first.value = payload.first;
        this.last.value = payload.last;
      });
    },
    peek(): { first: string, last: string } {
      return {
        first: this.first.peek(),
        last: this.last.peek()
      }
    },
  },
  email: signal("thor@avengers.org"),
  get value(): { name: { first: string, last: string }, email: string } {
    return {
      name: {
        first: this.name.first.value,
        last: this.name.last.value
      },
      email: this.email.value
    }
  },
  set value(payload: { name: { first: string, last: string }, email: string }) {
    batch(() => {
      this.name.first.value = payload.name.first;
      this.name.last.value = payload.name.last;
      this.email.value = payload.email;
    });
  },
  peek(): { name: { first: string, last: string }, email: string } {
    return {
      name: {
        first: this.name.first.peek(),
        last: this.name.last.peek()
      },
      email: this.email.peek()
    }
  },
};
```

#### Side note for "How it works"

This example is now somewhat antiquated. Starting with version 4.0.0, part of the DeepSignal model tracks it's own structural shape. This way you can store modifiable records of nested DeepSignals & Signals. The example above is still the most simple representation of the most common use case for DeepSignals. However, it is not a perfect representation of all of it's capabilities.

### Using `DeepSignal` in a local context

By utilizing `useDeepSignal` you can get a local state DX that's very similar to class components while continuing to have the performance
advantages of signals.

```tsx
import { useDeepSignal } from "@dpsignal/react";

const UserRegistrationForm = () => {
  const user = useDeepSignal(() => ({
    name: {
      first: "",
      last: ""
    },
    email: ""
  }));

  const submitRegistration = (event) => {
    event.preventDefault();
    fetch(
      "/register",
      { method: "POST", body: JSON.stringify(user.peek()) }
    );
  }

  return (
    <form onSubmit={submitRegistration}>
      <label>
        First name
        <input value={user.name.first}
          onInput={e => user.name.first.value = e.currentTarget.value} />
      </label>
      <label>
        Last name
        <input value={user.name.last}
          onInput={e => user.name.last.value = e.currentTarget.value} />
      </label>
      <label>
        Email
        <input value={user.email}
          onInput={e => user.email.value = e.currentTarget.value} />
      </label>
      <button>Submit</button>
    </form>
  );
}
```

### TypeScript support

The API for `deepStore` and `useDeepStore` will handle dynamic typing for arbitrary input! It will also help you avoid a case like this

```ts
import { deepSignal } from "@dpsignal/react";

const userStore = deepSignal({
  name: {
    first: "Thor",
    last: "Odinson"
  },
  email: "thor@avengers.org"
});

// TS error: Cannot assign to 'email' because it is a read-only property.
userStore.value.email = "another@email.com"
```

## Recipes

### Zustand style method actions

When I look to Zustand for the API it provides, it seems like a lot of their API (as much as I admire it) is based around supporting the
functional context. But the output of `@dpsignal/react` is very openly dynamic and writing to it inside or outside of a component 
ends up being the same. So you can take Zustand's basic example...

```ts
import create from "zustand";

export const useBearStore = create((set) => ({
  bears: 0,
  increasePopulation: () => set((state) => ({ bears: state.bears + 1 })),
  removeAllBears: () => set({ bears: 0 }),
}))
```

...and create an effectively equivalent version with `@dpsignal/react` like this...

```ts
import { deepSignal } from "@dpsignal/react";

export const bearStore = {
  data: deepSignal({
    bears: 0
  }),
  increasePopulation() {
    this.data.bears.value++;
  },
  removeAllBears() {
    this.data.bears.value = 0
  }
};
```

### Storing and fetching from localStorage

Because the `value` getter on a `DeepSignal` effectively calls the `value` getter on each underlying `Signal`, calling the `DeepSignal`'s
getter will properly subscribe to each underlying signal. So if you wanted to manage the side effects of any level of a `DeepSignal` you
just need to call `effect` from `@preact/signals-react` and call `DeepSignal.value`

```ts
import { deepSignal } from "@dpsignal/react";
import { effect } from "@preact/signals";

type UserStore = {
  name: {
    first: string;
    last: string;
  };
  email: string;
}

const getInitialUserStore = (): UserStore => {
  const storedUserStore = localStorage.getItem("USER_STORE_KEY");
  if (storedUserStore) {
    // you should probably validate this 🤷‍♂️
    return JSON.parse(storedUserStore);
  } else {
    return {
      name: {
        first: "",
        last: ""
      },
      email: ""
    };
  }
}

const userStore = deepSignal(getInitialUserStore());

effect(() => localStorage.setItem("USER_STORE_KEY", JSON.stringify(userStore.value)));
```

This would also work for any level of the `DeepSignal`.

```ts
import { deepSignal } from "@dpsignal/react";
import { effect } from "@preact/signals-react";

type UserNameStore = {
  first: string;
  last: string;
};

const getInitialUserNameStore = (): UserNameStore => {
  const storedUserStore = localStorage.getItem("USER_NAME_STORE_KEY");

  // you should probably validate this too 🤷‍♂️
  return storedUserStore ? JSON.parse(storedUserStore) : { first: "", last: "" },
}

const userStore = deepSignal({
  name: getInitialUserNameStore(),
  email: ""
});

effect(() => localStorage.setItem("USER_NAME_STORE_KEY", JSON.stringify(userStore.name.value)));
```

This should fulfill most needs for middleware or plugins. If this fails to meet your needs, please file an
issue and I will address the particular ask.

### Modifiable Structure, new in 4.0.0

New in 4.0.0, you can now have DeepSignals that represent modifiable data structures. If you wanted to create a DeepSignal as a record, it could be modified using the following example.

```tsx
import { DeepSignalType, useDeepSignal } from "@dpsignal/react";
import { memo } from "react";

export const TodoList = () => {
  const store = useDeepSignal(() => ({
    newItemName: "",
    items: {} as Record<string, { name: string }>,
  }));

  return (
    <>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          store.items.value = {
            ...store.items.peek(),
            [Math.random().toString()]: { name: store.newItemName.peek() },
          };
          store.newItemName.value = "";
        }}
      >
        <input
          value={store.newItemName.value}
          onChange={(e) => (store.newItemName.value = e.currentTarget.value)}
        />
        <button>Add new item</button>
      </form>
      <ul>
        {Object.keys(store.items.value).map((id) => (
          <TodoItem key={id} id={id} store={store} />
        ))}
      </ul>
    </>
  );
};

const TodoItem = memo(
  ({
    id,
    store,
  }: {
    id: string;
    store: DeepSignalType<{ items: Record<string, { name: string }> }>;
  }) => {
    return (
      <li>
        <>{store.items[id].name}</>
        <button
          onClick={() => {
            const items = { ...store.items.peek() };
            delete items[id];
            store.items.value = items;
          }}
          aria-label="Delete item"
        >
          ❌
        </button>
      </li>
    );
  }
);
```

#### Possible footguns

It may appear that if you iterate over `Object.keys(store.items)` here, you can avoid unnecessary rerenders. However, you need to rely on rerenders to get updates to iterative mappings so you must map over `Object.keys(store.items.value)` and accept the VDOM rerenders. And thus, there isn't necessarily a huge gain in performance by storing data this way _unless_ you only pass the key & store down to the iterated component and then memoize it to avoid unecessary rerenders.