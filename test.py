import re

def tokenize(code):
    return code.replace('(', ' ( ').replace(')', ' ) ').split()

def parse(tokens):
    if len(tokens) == 0:
        raise SyntaxError('Unexpected EOF')
    token = tokens.pop(0)
    if token == '(':
        L = []
        while tokens[0] != ')':
            L.append(parse(tokens))
        tokens.pop(0)  # pop off ')'
        return L
    elif token == ')':
        raise SyntaxError('Unexpected )')
    else:
        return atom(token)

def atom(token):
    try:
        return int(token)
    except ValueError:
        try:
            return float(token)
        except ValueError:
            return str(token)

def to_js(exp):
    if isinstance(exp, list):
        if exp[0] in ['+', '-', '*', '/']:
            return f"({to_js(exp[1])} {exp[0]} {to_js(exp[2])})"
        elif exp[0] in ['sin', 'cos', 'tan', 'log', 'exp']:
            return f"Math.{exp[0]}({to_js(exp[1])})"
        elif exp[0] == 'expt':
            return f"Math.pow({to_js(exp[1])}, {to_js(exp[2])})"
        elif exp[0] == 'sqrt':
            return f"Math.sqrt({to_js(exp[1])})"
        elif exp[0] == 'abs':
            return f"Math.abs({to_js(exp[1])})"
        elif exp[0] == 'max':
            args = ', '.join(to_js(arg) for arg in exp[1:])
            return f"Math.max({args})"
        elif exp[0] == 'min':
            args = ', '.join(to_js(arg) for arg in exp[1:])
            return f"Math.min({args})"
        else:
            raise ValueError(f"Unknown function: {exp[0]}")
    else:
        return str(exp)

def lisp_to_js(code):
    tokens = tokenize(code)
    parsed = parse(tokens)
    return to_js(parsed)

# Example usage
lisp_code = "(+ (* 2 (sin x)) (/ y 3))"
js_code = lisp_to_js(lisp_code)
print(f"Lisp: {lisp_code}")
print(f"JavaScript: {js_code}")

# More examples
examples = [
    "(expt x 2)",
    "(sqrt (+ (expt x 2) (expt y 2)))",
    "(max 1 2 3 4 5)",
    "(min x y z)",
    "(abs (- x y))",
    "(log (+ 1 (exp x)))"
]

for example in examples:
    print(f"\nLisp: {example}")
    print(f"JavaScript: {lisp_to_js(example)}")
