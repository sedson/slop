;; Make a flower
(def start (now))

;; get a random hex color
(defn rand-col ()
  (def chan (fn ()
    (def n (hex (floor (* (rand) (** 2 8)))))
      (if (= ~n.length 1)
          (join '0 n)
          n)))
  (join '# (chan) (chan) (chan)))

(def bg (rand-col))
(def fg (rand-col))

(def pi 3.141592653589793)
(def w 1024)
(def h 1024)

(def cnv (~Canvas.new w h 'MAIN))

(print cnv)

(~cnv.fill bg)

;; Ring of circles
(defn ring (count rMaj rMin col)
  (for i (0 count)
    (def theta (* 2 pi i (/ 1 count)))
    (def x (* (cos theta) rMaj))
    (def y (* (sin theta) rMaj))
    (~cnv.ellipse ( + x (/ w 2)) (+ y (/ h 2)) rMin rMin col)))


(def count (+ (floor (* (rand) 6)) 4))
(ring count 240 180 fg)

(~cnv.ellipse (/ w 2) (/ h 2) 160 160 bg)

(~viewport.clear)
(view cnv)
(~viewport.draw)

(join "eval sketch in " (- (now) start) " ms")