;; Core - fn, defn, if, cond, for, set

(def start (now))

;; map val from [minIn:maxIn] to [minOut:maxOut]
(defn remap (val minIn maxIn minOut maxOut)
  (+ (* (/ (- val minIn) (- maxIn minIn)) (- maxOut minOut)) minOut))

;; random rgb string
(defn chan () (floor (* (rand) 256)))
(defn rand-col ()
  (join "rgb(" (chan) ', (chan) ', (chan) ")"))
;; fill a canvas with a color

(defn fill (cnv col)
  (~cnv.rect 0 0 ~cnv.w ~cnv.h col)
  cnv)

;; main canvas
(def cnv (make-canvas 512 512))
(fill cnv (rand-col))

;; concentric circles
(def count 13)
(for-each (.. 0 count) (fn (i)
  (def radius (remap i 0 count ~cnv.w 10))
  (~cnv.ellipseStroke (* .5 ~cnv.w) (* .5 ~cnv.h) radius radius (rand-col) 30)))


(~viewport.clear)
(view cnv)
(~viewport.draw)

(join "evaled sketch in " (- (now) start) " ms.")




