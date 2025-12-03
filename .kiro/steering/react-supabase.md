# Getting Started

## Installation

```zsh
bun add react-supabase @supabase/supabase-js
```

## Quick Start

Create a Supabase client and pass it to the Provider:

import { createClient } from '@supabase/supabase-js'
import { Provider } from 'react-supabase'

const client = createClient('https://xyzcompany.supabase.co', 'public-anon-key')

```tsx
const App = () => (
  <Provider value={client}>
    <YourRoutes />
  </Provider>
);
```

Now every component inside and under the Provider can use the Supabase client and hooks:

```tsx
import { useRealtime } from "react-supabase";

const Todos = () => {
  const [result, reexecute] = useRealtime("todos");

  const { data, fetching, error } = result;

  if (fetching) return <p>Loading...</p>;
  if (error) return <p>Oh no... {error.message}</p>;

  return (
    <ul>
      {data.map((todo) => (
        <li key={todo.id}>{todo.title}</li>
      ))}
    </ul>
  );
};
```

# Provider

In order to use a Supabase client, you need to provide it via the Context API. This may be done with the help of the Provider export.

```tsx
import { createClient } from "@supabase/supabase-js";
import { Provider } from "react-supabase";

const client = createClient(
  "https://xyzcompany.supabase.co",
  "public-anon-key"
);

const App = () => (
  <Provider value={client}>
    <YourRoutes />
  </Provider>
);
```

All examples and code snippets from now on assume that they are wrapped in a Provider.

# useClient

Allows you to access the Supabase client directly, which is useful for use cases not covered by existing hooks or other customer behavoir.

```tsx
import { useClient } from 'react-supabase'

function Page() {
  const client = useClient()

  // Interact with client normally
  // client.from('todos').filter(...)

  return ...
}
```

Most of the time, you probably want to use the existing hooks for auth, data fetching/mutation, subscriptions, and storage.

# useAuthStateChange

Receive a notification every time an auth event happens. Composed in the useAuth recipe.

```tsx
import { useAuthStateChange } from 'react-supabase'

function Page() {
  useAuthStateChange((event, session) => {
    console.log(`Supabase auth event: ${event}`, session)
  })

  return ...
}
```

Note: Auth listener is automatically cleaned up during the hook’s cleanup phase.

# useResetPassword

Sends reset request to email address.

```tsx
import { useResetPassword } from 'react-supabase'

function Page() {
  const [{ error, fetching }, resetPassword] = useResetPassword()

  async function onClickResetPassword() {
    const { error } = await resetPassword('user@example.com')
  }

  if (error) return <div>Error sending email</div>
  if (fetching) return <div>Sending reset email</div>

  return ...
}
```

## Passing options

During hook initialization:

```tsx
const [{ error, fetching }, resetPassword] = useResetPassword({
  options: {
    redirectTo: "https://example.com/welcome",
  },
});
```

Or execute function:

```tsx
const { error } = await resetPassword("user@example.com", {
  redirectTo: "https://example.com/reset",
});
```

# useSignIn

Log in existing user, or login via a third-party provider.

```tsx
import { useSignIn } from 'react-supabase'

function Page() {
  const [{ error, fetching, session, user }, signIn] = useSignIn()

  async function onClickSignIn() {
    const { error, session, user } = await signIn({
      email: 'user@example.com',
      password: 'foobarbaz',
    })
  }

  if (error) return <div>Error signing in</div>
  if (fetching) return <div>Signing in</div>
  if (user) return <div>Logged in</div>

  return ...
}
```

## Passing options

During hook initialization:

```tsx
const [{ error, fetching, session, user }, signIn] = useSignIn({
  options: {
    redirectTo: "https://example.com/dashboard",
  },
});
```

Or the execute function:

```tsx
const { error, session, user } = await signIn(
  {
    email: "user@example.com",
    password: "foobarbaz",
  },
  {
    redirectTo: "https://example.com/account",
  }
);
```

## Magic links

Omit password from the execute function:

```tsx
const { error, session, user } = await signIn({ email: "user@example.com" });
```

## Third-party providers

Either pass a provider (and scopes) during hook initialization:

```tsx
const [{ error, fetching, user, session }, signIn] = useSignIn({
  provider: "github",
  options: {
    scopes: "repo gist notifications",
  },
});
```

Or execute function:

```tsx
const { error, session, user } = await signIn(
  { provider: "github" },
  { scopes: "repo gist notifications" }
);
```

# useSignOut

Remove logged in user and trigger a SIGNED_OUT event.

```tsx
import { useSignOut } from 'react-supabase'

function Page() {
  const [{ error, fetching }, signOut] = useSignOut()

  async function onClickSignOut() {
    const { error } = await signOut()
  }

  if (error) return <div>Error signing out</div>
  if (fetching) return <div>Signing out</div>

  return ...
}
```

# useSignUp

Creates new user.

```tsx
import { useSignUp } from 'react-supabase'

function Page() {
  const [{ error, fetching, session, user }, signUp] = useSignUp()

  async function onClickSignUp() {
    const { error, session, user } = await signUp({
      email: 'user@example.com',
      password: 'foobarbaz',
    })
  }

  if (error) return <div>Error signing up</div>
  if (fetching) return <div>Signing up</div>
  if (user) return <div>Welcome user</div>

  return ...
}
```

## Passing options

During hook initialization:

```tsx
const [{ error, fetching, session, user }, signUp] = useSignUp({
  options: {
    redirectTo: "https://example.com/dashboard",
  },
});
```

Or execute function:

```tsx
const { error, session, user } = await signUp(
  {
    email: "user@example.com",
    password: "foobarbaz",
  },
  {
    redirectTo: "https://example.com/welcome",
  }
);
```

# useDelete

Performs DELETE on table.

```tsx
import { useDelete } from 'react-supabase'

function Page() {
  const [{ count, data, error, fetching }, execute] = useDelete('todos')

  async function onClickDelete(id) {
    const { count, data, error } = await deleteTodos(
      (query) => query.eq('id', id),
    )
  }

  return ...
}
```

Throws error during execute if a filter is not passed during hook initialization or execute method.

## Passing options

During hook initialization:

```tsx
const [{ count, data, error, fetching }, execute] = useDelete("todos", {
  filter: (query) => query.eq("status", "completed"),
  options: {
    returning: "represenation",
    count: "exact",
  },
});
```

Or execute function:

```tsx
const { count, data, error } = await execute((query) => query.eq("id", id), {
  returning: "minimal",
  count: "estimated",
});
```

# useFilter

Creates dynamic filter for using with other hooks.

```tsx
import { useFilter, useSelect } from 'react-supabase'

function Page() {
  const filter = useFilter(
    (query) =>
      query
        .eq('status', status)
        .textSearch('name', `'exercise' & 'shopping'`)
        .limit(10),
    [status],
  )
  // Pass filter to other hooks
  const [{ data }] = useSelect('todos', { filter })

  return ...
}
```

For an example, see useSelect "Dynamic Filtering".

# useInsert

Performs INSERT into table.

```tsx
import { useInsert } from 'react-supabase'

function Page() {
  const [{ count, data, error, fetching }, execute] = useInsert('todos')

  async function onClickInsert(name) {
    const { count, data, error } = await insertTodos({
      name,
    })
  }

  return ...
}
```

## Passing options

During hook initialization:

```tsx
const [{ count, data, error, fetching }, execute] = useInsert("todos", {
  options: {
    returning: "represenation",
    count: "exact",
  },
});
```

Or execute function:

```tsx
const { count, data, error } = await execute(
  { name: "Buy more cheese" },
  {
    count: "estimated",
    returning: "minimal",
  }
);
```

# useSelect

Performs vertical filtering with SELECT.

```tsx
import { useSelect } from 'react-supabase'

function Page() {
  const [{ count, data, error, fetching }, reexecute] = useSelect('todos')

  if (error) return <div>{error.message}</div>
  if (fetching) return <div>Loading todos</div>
  if (data?.length === 0) return <div>No todos</div>

  return ...
}
```

## Passing options

During hook initialization:

```tsx
const [{ count, data, error, fetching }, reexecute] = useSelect("todos", {
  columns: "id, name, description",
  filter: (query) => query.eq("status", "completed"),
  options: {
    count: "exact",
    head: false,
  },
  pause: false,
});
```

## Dynamic filtering

When using dynamic filters, you must make sure filters aren’t recreated every render. Otherwise, your request can get stuck in an infinite loop.

The easiest way to avoid this is to create dynamic filters with the useFilter hook:

```tsx
import { useState } from 'react'
import { useFilter, useSelect } from 'react-supabase'

function Page() {
  const [status, setStatus] = useState('completed')
  const filter = useFilter(
    (query) => query.eq('status', status),
    [status],
  )
  const [result, reexecute] = useSelect('todos', { filter })

  return ...
}
```

## Pausing useSelect

In some cases, we may want useSelect to execute when a pre-condition has been met, and not execute otherwise. For instance, we may be building a form and want validation to only take place when a field has been filled out.

We can do this by setting the pause option to true:

```tsx
import { useState } from "react";
import { useFilter, useSelect } from "react-supabase";

function Page() {
  const [username, setUsername] = useState(null);
  const filter = useFilter(
    (query) => query.eq("username", username),
    [username]
  );
  const [result, reexecute] = useSelect("users", {
    filter,
    pause: !username,
  });

  return (
    <form>
      <label>Enter a username</label>
      <input onChange={(e) => setUsername(e.target.value)} />
      {result.data && <div>Username is taken</div>}
    </form>
  );
}
```

# useUpdate

Performs UPDATE on table.

```tsx
import { useUpdate } from 'react-supabase'

function Page() {
  const [{ count, data, error, fetching }, execute] = useUpdate('todos')

  async function onClickMarkAllComplete() {
    const { count, data, error } = await execute(
      { completed: true },
      (query) => query.eq('completed', false),
    )
  }

  return ...
}
```

Throws error during execute if a filter is not passed during hook initialization or execute method.

## Passing options

During hook initialization:

```tsx
const [{ count, data, error, fetching }, execute] = useUpdate("todos", {
  filter: (query) => query.eq("completed", false),
  options: {
    returning: "represenation",
    count: "exact",
  },
});
```

Or execute function:

```tsx
const { count, data, error } = await execute(
  { completed: true },
  (query) => query.eq("completed", false),
  {
    count: "estimated",
    returning: "minimal",
  }
);
```

# useUpsert

Performs INSERT or UPDATE on table.

```tsx
import { useUpsert } from 'react-supabase'

function Page() {
  const [{ count, data, error, fetching }, execute] = useUpsert('users')

  async function onClickMarkAllComplete() {
    const { count, data, error } = await execute(
      { completed: true },
      { onConflict: 'username' },
      (query) => query.eq('completed', false),
    )
  }

  return ...
}
```

Notes

    By specifying the onConflict option, you can make UPSERT work on a column(s) that has a UNIQUE constraint.
    Primary keys should to be included in the data payload in order for an update to work correctly.
    Primary keys must be natural, not surrogate. There are however, workarounds for surrogate primary keys.
    Param filter makes sense only when operation is update
    Upsert supports sending array of elements, just like useInsert

## Passing options

During hook initialization:

```tsx
const [{ count, data, error, fetching }, execute] = useUpsert("users", {
  filter: (query) => query.eq("completed", false),
  options: {
    returning: "represenation",
    onConflict: "username",
    count: "exact",
  },
});
```

Or execute function:

```tsx
const { count, data, error } = await execute(
  { completed: true },
  {
    count: "estimated",
    onConflict: "username",
    returning: "minimal",
  },
  (query) => query.eq("completed", false)
);
```

# useSubscription

Subscribe to database changes in realtime.

```tsx
import { useSubscription } from 'react-supabase'

function Page() {
  useSubscription((payload) => {
      console.log('Change received!', payload)
  })

  return ...
}
```

## Passing options

During hook initialization:

```tsx
useSubscription(
  (payload) => {
    console.log("Change received!", payload);
  },
  {
    event: "INSERT",
    table: "todos",
  }
);
```

# useRealtime

Fetch table and listen for changes.

```tsx
import { useRealtime } from 'react-supabase'

function Page() {
const [{ data, error, fetching }, reexecute] = useRealtime('todos')

return ...
}
```

## Compare function

You can pass a function for comparing subscription event changes. By default, the compare function checks the id field.

When using your own compare function, you typically want to compare unique values:

```tsx
import { useRealtime } from 'react-supabase'

function Page() {
  const [result, reexecute] = useRealtime(
    'todos',
    { select: { columns:'id, username' } },
    (data, payload) => data.username === payload.username,
  )

  return ...
}
```

## Initial selection of records

When initializing the component you might need to filter your data appropriately. You can pass the options directly to the useSelect hook.

First argument can be either a string table name or useSelect options with table property.

```tsx
import { useRealtime } from 'react-supabase'

function Page() {
  const [result, reexecute] = useRealtime(
    'todos',
    {
      select: {
        columns: 'id, username, description',
        filter: (query) => query.eq('completed', false),
      }
    },
    (data, payload) => data.username === payload.username,
  )

  return ...
}
```

# Recipes

## useAuth

Keep track of the authenticated session with the Context API and useAuthStateChange hook. First, create a new React Context:

```tsx
import { createContext, useEffect, useState } from "react";
import { useAuthStateChange, useClient } from "react-supabase";

const initialState = { session: null, user: null };
export const AuthContext = createContext(initialState);

export function AuthProvider({ children }) {
  const client = useClient();
  const [state, setState] = useState(initialState);

  useEffect(() => {
    const session = client.auth.session();
    setState({ session, user: session?.user ?? null });
  }, []);

  useAuthStateChange((event, session) => {
    console.log(`Supabase auth event: ${event}`, session);
    setState({ session, user: session?.user ?? null });
  });

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}
```

And auth hook:

```tsx
import { AuthContext } from "path/to/auth/context";

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined)
    throw Error("useAuth must be used within AuthProvider");
  return context;
}
```

Then, wrap your app in AuthProvider and use the useAuth hook in your components:

```tsx
import { useAuth } from "path/to/auth/hook";

function Page() {
  const { session, user } = useAuth();

  if (!session) return <div>Hello, stranger</div>;

  return <div>Welcome back, {user.email}</div>;
}
```
