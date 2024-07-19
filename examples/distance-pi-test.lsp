(def pi 3.141592653589793)
(defn dtor (d) (* d pi  (/ 1 180)))
(defn rtod (r) (* r 180 (/ 1 pi )))

(print (rtod ( / pi 3 )))

(~viewport.clear)

(def w 500)
(def h 500)
(def A (canvas w h 'canvas-a))

(~A.rect 0 0 500 500 'yellowgreen)
(~A.ellipse 250 250 200 200 'green)
(~A.ellipse 250 250 50 50 'yellowgreen)

(view A)
(~viewport.draw)

(defn x (p) (first p))
(defn y (p) (first (rest p)))

(defn dist2 (p1 p2)
   (def dx (- (x p1) (x p2)))
   (def dy (- (y p1) (y p2)))
   (+ (* dx dx) (* dy dy)))

(defn dist (p1 p2) (sqrt (dist2 p1 p2)))

(dist (4 4) (8 8))







