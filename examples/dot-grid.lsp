;; Fill a canvas with a color
(defn fill-canvas (cnvs color)
    (cnvs.rect 0 0 cnvs.w cnvs.h color))

;; Fill a canvas with gridded dots
(defn dot-grid (cnvs x-count y-count radius color)
    (for x (0 x-count)
        (for y (0 y-count)
            (def cx (+ (* cnvs.w x (/ 1 x-count)) (/ cnvs.w x-count 2)))
            (def cy (+ (* cnvs.h y (/ 1 y-count)) (/ cnvs.h y-count 2)))
            (cnvs.ellipse cx cy radius radius color))))


(viewport.clear)

(def cnvs (canvas 1024 1024))
(def cnvs2 (canvas 1024 1024))

(fill-canvas cnvs "hotpink")

(def scale 2)

(dot-grid cnvs (* scale 4) (* scale 4) 30 "red")
(dot-grid cnvs 4 4 70 "hotpink")
(dot-grid cnvs 4 4 60 "teal")
(view cnvs)


(fill-canvas cnvs2 "lime")
(dot-grid cnvs2 8 8 50 "green")
(view cnvs2 (+ 1024 64) 0)

(def out (blend "overlay" cnvs cnvs2 1))

(out.noise 20 false)
(view out 0 (+ 1024 64))

(viewport.draw)
"done"
