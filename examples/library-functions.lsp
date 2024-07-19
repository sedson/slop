(defn flr (n) (- n (% n 1)))
(defn cil (n)
  (if (= (% n 1) 0)
      n
      (+ 1 (flr n))))

(defn rnd (n)
  (if (>= (% n 1) 0.5)
      (cil n)
      (flr n)))