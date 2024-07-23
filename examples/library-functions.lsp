;; Floor
(defn flr (n) (- n (% n 1)))

;; Ciel
(defn cil (n)
  (if (= (% n 1) 0)
      n
      (+ 1 (flr n))))

;; Round
(defn rnd (n)
  (if (>= (% n 1) 0.5)
      (cil n)
      (flr n)))

;; Power helper
(defn __pow (base cur exp)
  (if (<= exp 1)
      cur
      (__pow base (* cur base) (- exp 1))))

;; power of a base to a positive integer
(defn pow (base exp)
  (__pow base base exp))