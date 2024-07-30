;; Do something with recursion!
(def start (now))
(def pi 3.141592653589793)

;; How much infinity b4 my (bad) interpreter hits javascript
;; recursion limit (lol)
(def INFINITY_LOL 1000)


;; Make the canvas
(def w 1024)
(def h 1024)
(def cnvs (make-canvas w h 'main-canvas))
(cnvs.rect 0 0 w h "rgb(30, 35, 30)")

;; Remap helper function
(defn remap (val minIn maxIn minOut maxOut)
  (+ (* (/ (- val minIn) (- maxIn minIn)) (- maxOut minOut)) minOut))

;; Make some random params
(def growth-factor (remap (rand) 0 1  1.001 1.003))
(def x-freq        (remap (rand) 0 1 -10    10))
(def y-freq        (remap (rand) 0 1 -10    10))

(def col "rgba(230, 230, 230, 0.15)")

(defn do-circle (iter size x y)
  (if (> iter INFINITY_LOL)
    ()
    (_ (cnvs.ellipseStroke x y size size col)
       (def next-x (+ x (* 3 (sin (* pi (* x-freq (/ 1 iter) INFINITY_LOL))))))
       (def next-y (+ y (* 3 (cos (* pi (* y-freq (/ 1 iter) INFINITY_LOL))))))
       (do-circle (+ iter 1) (* size growth-factor) next-x next-y))))


(do-circle 1 80 (* .5 w) (* .5 h))

;; Add some grain
(cnvs.noise 10)

;; Plop the canvas on the viewport
(viewport.clear)
(view cnvs)
(viewport.draw)

;; Optionally open the canvas in a new tab
;(open-new cnvs)
(print (growth-factor x-freq y-freq))
(join "sketch took " (/ (- (now) start) 1000) " seconds")