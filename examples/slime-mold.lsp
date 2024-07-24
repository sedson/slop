(def start (now))
(~viewport.clear)

(def w 1024)
(def h 1024)

(def w2 (/ w 2))
(def h2 (/ h 2))

(def C (~Canvas.new w h))

(def bg 'black)
(def fg "rgba(180, 180, 180, 1)")

(~C.fill bg)

(def attractors empty)

;; map val from [minIn:maxIn] to [minOut:maxOut]
(defn remap (val minIn maxIn minOut maxOut)
  (+ (* (/ (- val minIn) (- maxIn minIn)) (- maxOut minOut)) minOut))

;; make a point
(defn pt2d (x y) { 'x x 'y y })

(defn dist (a b)
   (def dx (- ~a.x ~b.x))
   (def dy (- ~a.y ~b.y))
   (sqrt (+ (* dx dx) (* dy dy))))

(defn rand-attractor (debug)
  (def x (remap (rand) 0 1 0 w))
  (def y (remap (rand) 0 1 0 h))
  (push attractors (pt2d x y))
  (~C.ellipse x y 4 4 fg 1))

(defn make-attractors (count)
  (for i (0 count)
  (rand-attractor true)))


(make-attractors 30)







(view C)
(~viewport.draw)

(join "sketch ran in " (- (now) start) " ms")