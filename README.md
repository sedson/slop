# Slop

Slop is a Lisp-inspired tool for creative coding. It combines a custom Lisp dialect with a web-based environment for live graphics programming.

![SLOP1](https://github.com/user-attachments/assets/75bc62cd-be3a-4a91-a344-688946c66786)

## Can I try it?

#### Online

Slop is – as of now – a personal exploration and a work in progress. If you *really* want to mess with Slop, a live version of the playground is available at [slop.seamus.website](https://slop.seamus.website) – though I definitely wouldn't call it "polished" or "easy to use" quite yet. There is a bare-bones [language reference](#language-reference) at the bottom of this readme.

#### Locally

Run a local server at the project root! Right now, Slop is all client-side ES6 modules. This is nice because there's no build step, but might not work across all browsers.

#### Keymap

| key | action |
|---|---|
| `Meta+Enter` | eval current script |
| `Meta+/` | comment/uncomment current selection or line |

where `Meta` is `Cmd` on MacOs and `Ctrl` elsewhere.

## More

This project started as a smallish idea about writing some sort of "S-expressions for compositing images DSL." Then things kept popping up like: "Well, if I can load and composite image files, it sure would be nice to be able to draw a circle into one of them, and it sure would be nice to position that circle using some math." This led me to create a full Lisp interpreter – which was a ton of fun. 

For me this project is about building a DIY, specific, personal tool that supports drawing and compositing procedural images with images-from-files.

Slop is *heavily* inspired by Hundred Rabbits' [Ronin]. Mary Rose Cook's [Little Lisp Interpreter](https://maryrosecook.com/blog/post/little-lisp-interpreter) was also a huge source of inspiration and help. Baku Hashimoto's [Glisp](https://glisp.app/commit:e7fbaae/) is an insanely cool Lisp for graphics.

# Language Reference 

### Lisp Core
```
(def symb value-expr)
  # Creates a binding: binds the result of evaluating value-expr to the symbol symb.
  # Cannot be reset with set.

(var symb value-expr)
  # Creates a variable binding: binds the result of evaluating value-expr to the symbol symb.
  # Can be reset with set.

(set symb value-expr)
  # Sets the value of an existing variable to the result of evaluating value-expr.
  # Can only be used on variables defined with var.
  # Note that a dict defined with def cannot have its properties altered with set.

(fn params & body)
  # Creates an anonymous function with the given params and body.
  # Returns a function object.

(fx & body)
  # Shorthand for creating a function with a single parameter 'x'.
  # Equivalent to (fn [x] & body).

(defn name params & body)
  # Defines a named function.
  # Combines def and fn to create and bind a function to the given name.

(macro params & body)
  # Creates a macro with the given params and body.
  # Returns a macro object.

(defmacro name params & body)
  # Defines a named macro.
  # Combines def and macro to create and bind a macro to the given name.

(let [bindings*] & body)
  # Creates a new lexical scope with the given bindings.
  # Evaluates the body in this new scope and returns the result of the last expression.

(do & exprs)
  # Evaluates expressions in order and returns the value of the last one.
  # Creates a new lexical scope.

(upscope & exprs)
  # Similar to do, but evaluates expressions in the current scope without creating a new one.

(for [var start end ?step] & body)
  # Iterates over a range of numbers, binding each to var in turn.
  # Evaluates body for each iteration.
  # Returns the result of the last evaluation of body.

(if predicate then-expr else-expr)
  # Evaluates predicate. If truthy, evaluates and returns then-expr, otherwise else-expr.

(cond & clauses)
  # Takes a set of test/expression pairs.
  # Evaluates each test one at a time until a truthy value is found, then evaluates and returns the corresponding expression.

(type expr)
  # Returns the type of the result of evaluating expr.

(symbol expr)
  # Converts the result of evaluating expr into a symbol.

(list & exprs)
  # Creates a list containing the results of evaluating the given expressions.

(vec & exprs)
  # Creates a vector containing the results of evaluating the given expressions.

(eval expr)
  # Evaluates expr twice: first to get a form, then evaluates that form.

(quote form)
  # Returns the unevaluated form.

(splice expr)
  # Evaluates expr and marks the result for splicing into a surrounding list or vector.

(quasi form)
  # Similar to quote, but allows selective evaluation using unquote and splice-unquote within the form.

(unquote expr)
  # Within a quasiquote, evaluates expr and inserts the result.

(splice-unquote expr)
  # Within a quasiquote, evaluates expr (which must yield a list) and splice
```

### Predicates
```
(nil? form)
  # Returns true if form is nil, false otherwise.

(num? form)
  # Returns true if form is a number, false otherwise.

(vec? form)
  # Returns true if form is a vector, false otherwise.

(list? form)
  # Returns true if form is a list, false otherwise.

(dict? form)
  # Returns true if form is a dictionary, false otherwise.

(list-like? form)
  # Returns true if form is list-like (list or vector), false otherwise.

(fn? form)
  # Returns true if form is a function, false otherwise.

(key? form)
  # Returns true if form is a key, false otherwise.

(bool? form)
  # Returns true if form is a boolean, false otherwise.

(symbol? form)
  # Returns true if form is a symbol, false otherwise.

(string? form)
  # Returns true if form is a string, false otherwise.

# PRNG (Pseudo-Random Number Generator)
(seed num)
  # Sets the seed for the pseudo-random number generator.

(rand)
  # Returns a pseudo-random number between 0 and 1.
```

### Utilities
```
(join & args)
  # Joins all arguments into a single string. If a single array is provided, joins its elements.

(join-c separator & args)
  # Joins all arguments into a string using the specified separator. If a single array is provided, joins its elements.

(print & args)
  # Prints all arguments to the console.

(len & args)
  # Returns the length of the first argument if it's a collection, or the number of arguments otherwise.

(_ & args)
  # Returns the last argument or null if no arguments are provided.

(ls & args)
  # Returns a list of all provided arguments.

(call fn args)
  # Calls the function fn with the provided args array as arguments.

(key a)
  # Converts a to a key by prepending ':'.

(console/log & args)
  # Logs all arguments to the console.

(str/split str [separator])
  # Splits the string str by the separator (or by each character if no separator is provided).

(gensym)
  # Generates a unique symbol.
```

### Math operations
```
(* & args)
  # Multiplies all arguments together.

(+ & args)
  # Adds all arguments together.

(- & args)
  # Subtracts all arguments from the first, or negates the single argument.

(/ & args)
  # Divides the first argument by all subsequent arguments.

(max & args)
  # Returns the maximum value among all arguments.

(min & args)
  # Returns the minimum value among all arguments.

(clamp a [min max])
  # Clamps a between min (default 0) and max (default 1).

(abs a)
  # Returns the absolute value of a.

(sin a)
  # Returns the sine of a.

(cos a)
  # Returns the cosine of a.

(sqrt a)
  # Returns the square root of a.

(floor a)
  # Returns the largest integer less than or equal to a.

(round a)
  # Rounds a to the nearest integer.

(ceil a)
  # Returns the smallest integer greater than or equal to a.

(% a b)
  # Returns the remainder of a divided by b.

(= a b)
  # Returns true if a is equal to b, false otherwise.

(> a b)
  # Returns true if a is greater than b, false otherwise.

(< a b)
  # Returns true if a is less than b, false otherwise.

(<= a b)
  # Returns true if a is less than or equal to b, false otherwise.

(>= a b)
  # Returns true if a is greater than or equal to b, false otherwise.

(hex a)
  # Converts a to a hexadecimal string.

(<< a b)
  # Left shifts a by b bits.

(>> a b)
  # Right shifts a by b bits.

(& a b)
  # Performs bitwise AND on a and b.

(| a b)
  # Performs bitwise OR on a and b.

(** a b)
  # Raises a to the power of b.

(and & args)
  # Returns true if all arguments are truthy, false otherwise.

(or & args)
  # Returns true if any argument is truthy, false otherwise.
```

### List-like operations
```
(range a b)
  # Returns a list of integers from a (inclusive) to b (exclusive).

(.. a b)
  # Alias for range.

(map ls fn)
  # Applies fn to each element of ls and returns the results as a list.

(for-each ls fn)
  # Applies fn to each element of ls for side effects.

(filter ls fn)
  # Returns a list of elements from ls for which fn returns true.

(list-join ls [delimiter])
  # Joins the elements of ls into a string, using delimiter (default space) between elements.

(fold ls fn init)
  # Folds ls from left to right using fn and init as the initial value.

(fold-self ls fn)
  # Folds ls from left to right using fn and the first element as the initial value.

(push ls val)
  # Adds val to the end of ls and returns val.

(sum ls)
  # Returns the sum of all elements in ls.

(first ls)
  # Returns the first element of ls, or null if ls is empty.

(last ls)
  # Returns the last element of ls, or null if ls is empty.

(rest ls)
  # Returns a list of all elements in ls except the first.

(nth ls n)
  # Returns the nth element of ls (0-indexed). Negative indices count from the end.

(has ls member)
  # Returns true if member is in ls, false otherwise.

(fill-with len val)
  # Returns a list of length len filled with val.

(-> data & functions)
  # Threads data through a series of functions, applying each function to the result of the previous one.

(keys dct)
  # Returns a list of all keys in dct.

(values dct)
  # Returns a list of all values in dct.

(entries dct)
  # Returns a list of key-value pairs from dct.

(get dct key)
  # Returns the value associated with key in dct.

(dset dct key val)
  # Sets the value of key in dct to val and returns val.

(put dct key val)
  # Sets the value of key in dct to val, logs the operation, and returns val.

(zip-dict keys vals [default])
  # Creates a dictionary from keys and vals lists. If vals is shorter, uses default (0) for missing values.
```
