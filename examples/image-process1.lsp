(def start (now))

(~viewport.clear)

(def img (load-img (nth files)))
(def w ~img.w)
(def h ~img.h)

(defn h-stripe (cnvs width color)
  (def count (/ ~cnvs.h width 2))
  (for i (0 count)
    (def y (* i 2 width))
      (~cnvs.rect 0 y ~cnvs.w width color)))

(defn v-stripe (cnvs width color)
  (def count (/ ~cnvs.w width 2))
  (for i (0 count)
    (def x (* i 2 width))
      (~cnvs.rect x 0 width ~cnvs.h color)))


(def stripe-size 3)

(def a (~Canvas.new w h))
(~a.fill 'white)
(h-stripe a stripe-size 'black)

(def b (~Canvas.new w h))
(~b.fill 'white)
(v-stripe b stripe-size 'black)

(view img)
(~img.grayscale 0)
(view a 0 (+ h 20))
(view b (+ w 20) (+ h 20))


(-> (a b)
    (fn (c) (~c.blur 1)))


(def mixer { mode 'overlay opacity 1 })

(def blended
  (blend ~mixer.mode (blend ~mixer.mode img a ~mixer.opacity) b ~mixer.opacity))


; (~blended.noise 30)
; (~blended.threshold 100)

(view blended (+ ~img.w 20) 0)

(~viewport.draw)

(join "elapsed: " (- (now) start) " ms")