/* eslint-disable */

/*
 * CDarkOverlay is used to render a dark overlay around an OLE object when selected
 */

class CDarkOverlay {

    private overlay: CanvasOverlay;
    private rectangles: CRectangle[] = [];

    constructor(canvasOverlay : CanvasOverlay) {
        this.overlay = canvasOverlay;
    }

    private invertOleBounds(oleBounds: oxool.Bounds) {
        var rectanglesBounds = [];

        var minWidth = 0;
        var minHeight = 0;
        var fullWidth = 1000000;
        var fullHeight = 1000000;

        rectanglesBounds.push(new oxool.Bounds(new oxool.Point(minWidth, minHeight), new oxool.Point(fullWidth, oleBounds.min.y)));
        rectanglesBounds.push(new oxool.Bounds(new oxool.Point(minWidth, oleBounds.min.y), oleBounds.getBottomLeft()));
        rectanglesBounds.push(new oxool.Bounds(oleBounds.getTopRight(), new oxool.Point(fullWidth, oleBounds.max.y)));
        rectanglesBounds.push(new oxool.Bounds(new oxool.Point(minWidth, oleBounds.max.y), new oxool.Point(fullWidth, fullHeight)));

        return rectanglesBounds;
    }

    private createRectangles(rectanglesBounds: oxool.Bounds[]){
        for (var i = 0; i < rectanglesBounds.length; i++){
            this.rectangles.push(new CRectangle(rectanglesBounds[i], {
                pointerEvents: 'none',
                fillColor: 'black',
                fillOpacity: 0.25,
                weight: 0,
                opacity: 0.25
            }));
        }
    }

    hasObjectFocusDarkOverlay() : boolean{
        return this.rectangles.length > 0;
    }

    show(oleBounds: oxool.Bounds){
        var rectanglesBounds = this.invertOleBounds(oleBounds);
        this.createRectangles(rectanglesBounds);

        for (var i = 0; i < this.rectangles.length; i++){
            this.overlay.initPath(this.rectangles[i]);
        }
    }

    remove(){
        for (var i = 0; i < this.rectangles.length; i++){
            this.overlay.removePath(this.rectangles[i]);
        }
        this.rectangles = [];
    }
}